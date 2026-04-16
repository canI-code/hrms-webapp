import Leave from '../models/Leave.js';
import LeaveType from '../models/LeaveType.js';
import LeaveBalance from '../models/LeaveBalance.js';
import Employee from '../models/Employee.js';
import User from '../models/User.js';
import Holiday from '../models/Holiday.js';
import { createAuditLog } from '../utils/auditHelper.js';
import { createNotification, notifyByRole } from '../utils/notificationHelper.js';

// Helper: count working days between two dates (excluding weekends and holidays)
const countWorkingDays = async (startDate, endDate) => {
  const holidays = await Holiday.find({
    date: { $gte: startDate, $lte: endDate },
    isActive: true
  });
  const holidayDates = new Set(holidays.map(h => h.date.toISOString().split('T')[0]));

  let count = 0;
  const current = new Date(startDate);
  while (current <= endDate) {
    const day = current.getDay();
    const dateStr = current.toISOString().split('T')[0];
    if (day !== 0 && day !== 6 && !holidayDates.has(dateStr)) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  return count;
};

// @desc    Apply for leave
// @route   POST /api/leaves
export const applyLeave = async (req, res) => {
  try {
    // Super admin cannot apply for leave
    if (req.user.role === 'super_admin') {
      return res.status(403).json({ message: 'Super admin cannot apply for leave' });
    }

    const { leaveType, startDate, endDate, reason } = req.body;
    const employee = await Employee.findOne({ user: req.user._id }).populate('manager');
    if (!employee) return res.status(404).json({ message: 'Employee profile not found' });

    // Calculate total working days (exclude weekends & holidays)
    const start = new Date(startDate);
    const end = new Date(endDate);
    const totalDays = await countWorkingDays(start, end);

    if (totalDays === 0) {
      return res.status(400).json({ message: 'No working days in the selected date range (all weekends/holidays)' });
    }

    // Check leave balance
    const year = start.getFullYear();
    const balance = await LeaveBalance.findOne({
      employee: employee._id, leaveType, year
    });

    if (balance && balance.remaining < totalDays) {
      return res.status(400).json({
        message: `Insufficient leave balance. Available: ${balance.remaining}, Requested: ${totalDays}`
      });
    }

    // Determine approval flow based on applicant's role
    // Employee: Pending → Manager approves → HR final approval
    // Manager: skip manager step → HR approves directly
    // HR: special handling based on available approvers
    const applicantRole = req.user.role;
    let initialStatus = 'Pending';
    let managerApprovalData = { status: 'Pending' };

    if (applicantRole === 'manager') {
      // Managers skip the manager approval step — goes directly to HR
      initialStatus = 'Approved_By_Manager';
      managerApprovalData = { status: 'Approved', comment: 'Auto-skipped (applicant is a manager)' };
    } else if (applicantRole === 'hr') {
      // Check if peer HR exists (another active HR user who can approve)
      const peerHRCount = await User.countDocuments({
        role: 'hr', isActive: true, _id: { $ne: req.user._id }
      });

      if (employee.manager) {
        // HR with a manager assigned → manager approves first
        initialStatus = 'Pending';
        managerApprovalData = { status: 'Pending' };
      } else if (peerHRCount > 0) {
        // HR without manager but peer HR exists → skip manager, peer HR approves
        initialStatus = 'Approved_By_Manager';
        managerApprovalData = { status: 'Approved', comment: 'Auto-skipped (no manager assigned)' };
      } else {
        // Only HR in the system with no manager → any manager can approve
        initialStatus = 'Pending';
        managerApprovalData = { status: 'Pending' };
      }
    }
    // Employee role: stays as Pending (standard two-level flow)

    const leave = await Leave.create({
      employee: employee._id,
      leaveType,
      startDate: start,
      endDate: end,
      totalDays,
      reason,
      appliedBy: req.user._id,
      status: initialStatus,
      managerApproval: managerApprovalData
    });

    await createAuditLog({
      userId: req.user._id,
      action: 'CREATE',
      module: 'Leave',
      description: `Leave applied for ${totalDays} days`,
      targetId: leave._id,
      targetModel: 'Leave',
      ipAddress: req.ip
    });

    const populated = await Leave.findById(leave._id)
      .populate('employee', 'firstName lastName employeeId')
      .populate('leaveType', 'name');

    const empName = `${populated.employee.firstName} ${populated.employee.lastName}`;
    const typeName = populated.leaveType?.name || 'Leave';

    // Send notifications based on approval flow
    if (initialStatus === 'Pending') {
      if (employee.manager?.user) {
        // Notify the direct manager
        await createNotification({
          recipientId: employee.manager.user,
          type: 'leave_applied',
          title: 'New Leave Request',
          message: `${empName} applied for ${totalDays} day(s) of ${typeName}`,
          link: '/leaves/approvals'
        });
      } else {
        // HR or employee with no manager — notify all managers so someone can approve
        const allManagers = await User.find({ role: 'manager', isActive: true });
        for (const mgr of allManagers) {
          await createNotification({
            recipientId: mgr._id,
            type: 'leave_applied',
            title: 'Leave Request (No Direct Manager)',
            message: `${empName} applied for ${totalDays} day(s) of ${typeName} — needs manager approval`,
            link: '/leaves/approvals'
          });
        }
      }
    } else {
      // Goes directly to HR step — notify HR users (exclude self if applicant is HR)
      const hrUsers = await User.find({
        role: 'hr',
        isActive: true,
        _id: { $ne: req.user._id }
      });
      for (const hr of hrUsers) {
        await createNotification({
          recipientId: hr._id,
          type: 'leave_applied',
          title: applicantRole === 'manager' ? 'Manager Leave Request' : 'HR Peer Leave Request',
          message: `${empName} applied for ${totalDays} day(s) of ${typeName} — needs your approval`,
          link: '/leaves/approvals'
        });
      }
    }

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get leaves based on role
// @route   GET /api/leaves
export const getLeaves = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (req.user.role === 'employee') {
      const employee = await Employee.findOne({ user: req.user._id });
      if (employee) filter.employee = employee._id;
    } else if (req.user.role === 'manager') {
      const managerEmp = await Employee.findOne({ user: req.user._id });
      if (managerEmp) {
        // Get direct team members
        const teamMembers = await Employee.find({ manager: managerEmp._id }).select('_id');
        const teamIds = teamMembers.map(m => m._id);
        teamIds.push(managerEmp._id); // include own leaves

        // Also include HR employees' Pending leaves (HR has no manager or manager is this person)
        // so managers can approve HR leaves
        const hrUsers = await User.find({ role: 'hr', isActive: true }).select('_id');
        const hrEmployees = await Employee.find({
          user: { $in: hrUsers.map(u => u._id) },
          $or: [
            { manager: managerEmp._id }, // HR reporting to this manager
            { manager: { $exists: false } }, // HR with no manager
            { manager: null }
          ]
        }).select('_id');
        const hrIds = hrEmployees.map(e => e._id);

        // Combine: team members + HR employees this manager can approve
        const allIds = [...new Set([...teamIds.map(id => id.toString()), ...hrIds.map(id => id.toString())])];
        filter.employee = { $in: allIds };
      }
    }
    // HR and super_admin see all

    if (status) filter.status = status;

    const total = await Leave.countDocuments(filter);
    const leaves = await Leave.find(filter)
      .populate('employee', 'firstName lastName employeeId department')
      .populate('leaveType', 'name')
      .populate('managerApproval.by', 'name')
      .populate('hrApproval.by', 'name')
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({ leaves, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Manager approve/reject leave
// @route   PUT /api/leaves/:id/manager-action
export const managerAction = async (req, res) => {
  try {
    const { action, comment } = req.body; // action: 'Approved' or 'Rejected'
    const leave = await Leave.findById(req.params.id);
    if (!leave) return res.status(404).json({ message: 'Leave not found' });

    // Cannot approve/reject own leave
    if (leave.appliedBy.toString() === req.user._id.toString()) {
      return res.status(403).json({ message: 'You cannot approve or reject your own leave request' });
    }

    // Only pending leaves can have manager action
    if (leave.status !== 'Pending') {
      return res.status(400).json({ message: 'This leave is not pending manager approval' });
    }

    // Verify the approver is the direct manager OR any manager can approve HR/unassigned leaves
    const managerEmp = await Employee.findOne({ user: req.user._id });
    const leaveEmployee = await Employee.findById(leave.employee).populate({ path: 'user', select: 'role' });
    const isDirectManager = managerEmp && leaveEmployee?.manager && leaveEmployee.manager.toString() === managerEmp._id.toString();
    const applicantIsHR = leaveEmployee?.user?.role === 'hr';
    const hasNoManager = !leaveEmployee?.manager;

    // Allow action if: direct manager, OR applicant is HR/has no manager (any manager can step in)
    if (!isDirectManager && !applicantIsHR && !hasNoManager) {
      return res.status(403).json({ message: 'You are not the direct manager of this employee' });
    }

    leave.managerApproval = {
      status: action,
      by: req.user._id,
      date: new Date(),
      comment
    };

    if (action === 'Approved') {
      // Check if peer HR exists that can do final approval
      const peerHRCount = await User.countDocuments({
        role: 'hr', isActive: true, _id: { $ne: leave.appliedBy }
      });

      if (applicantIsHR && peerHRCount === 0) {
        // No peer HR available — manager's approval is final for HR leaves
        leave.status = 'Approved';
        leave.hrApproval = {
          status: 'Approved',
          comment: 'Auto-approved (no peer HR available, manager approval is final)',
          date: new Date()
        };
        // Update leave balance
        const year = leave.startDate.getFullYear();
        await LeaveBalance.findOneAndUpdate(
          { employee: leave.employee, leaveType: leave.leaveType, year },
          { $inc: { used: leave.totalDays, remaining: -leave.totalDays } }
        );
      } else {
        leave.status = 'Approved_By_Manager';
      }
    } else {
      leave.status = 'Rejected';
    }

    await leave.save();

    // Notify the employee about manager's decision
    if (leaveEmployee?.user) {
      const isFinal = leave.status === 'Approved';
      await createNotification({
        recipientId: leaveEmployee.user._id || leaveEmployee.user,
        type: action === 'Approved' ? 'leave_approved' : 'leave_rejected',
        title: isFinal ? `Leave ${action} (Final)` : `Leave ${action} by Manager`,
        message: action === 'Approved'
          ? (isFinal 
              ? 'Your leave request has been fully approved!'
              : 'Your leave request has been approved by your manager. Awaiting HR final approval.')
          : `Your leave request has been rejected by your manager.${comment ? ' Reason: ' + comment : ''}`,
        link: '/leaves'
      });
    }

    // If approved and needs HR step, notify HR (exclude the leave applicant)
    if (action === 'Approved' && leave.status === 'Approved_By_Manager') {
      const hrUsers = await User.find({
        role: 'hr',
        isActive: true,
        _id: { $ne: leave.appliedBy }
      });
      for (const hr of hrUsers) {
        await createNotification({
          recipientId: hr._id,
          type: 'leave_applied',
          title: 'Leave Awaiting HR Approval',
          message: `${leaveEmployee?.firstName} ${leaveEmployee?.lastName}'s leave approved by manager, needs HR final approval`,
          link: '/leaves/approvals'
        });
      }
    }

    await createAuditLog({
      userId: req.user._id,
      action: action === 'Approved' ? 'APPROVE' : 'REJECT',
      module: 'Leave',
      description: `Leave ${action.toLowerCase()} by manager${leave.status === 'Approved' ? ' (final - no peer HR)' : ''}`,
      targetId: leave._id,
      targetModel: 'Leave',
      ipAddress: req.ip
    });

    res.json(leave);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    HR final approve/reject leave
// @route   PUT /api/leaves/:id/hr-action
export const hrAction = async (req, res) => {
  try {
    const { action, comment } = req.body;
    const leave = await Leave.findById(req.params.id);
    if (!leave) return res.status(404).json({ message: 'Leave not found' });

    // Cannot approve/reject own leave
    if (leave.appliedBy.toString() === req.user._id.toString()) {
      return res.status(403).json({ message: 'You cannot approve or reject your own leave request' });
    }

    // Only Approved_By_Manager or Pending (HR override) leaves can be acted on
    if (!['Pending', 'Approved_By_Manager'].includes(leave.status)) {
      return res.status(400).json({ message: 'This leave is not awaiting approval' });
    }

    // If leave is still Pending (HR override — bypassing manager step)
    if (leave.status === 'Pending') {
      leave.managerApproval = {
        status: 'Approved',
        comment: 'Overridden by HR',
        date: new Date()
      };
    }

    leave.hrApproval = {
      status: action,
      by: req.user._id,
      date: new Date(),
      comment
    };

    if (action === 'Approved') {
      leave.status = 'Approved';
      // Update leave balance
      const year = leave.startDate.getFullYear();
      await LeaveBalance.findOneAndUpdate(
        { employee: leave.employee, leaveType: leave.leaveType, year },
        { $inc: { used: leave.totalDays, remaining: -leave.totalDays } }
      );
    } else {
      leave.status = 'Rejected';
    }

    await leave.save();

    // Notify the employee about HR's final decision
    const hrLeaveEmp = await Employee.findById(leave.employee);
    if (hrLeaveEmp?.user) {
      await createNotification({
        recipientId: hrLeaveEmp.user,
        type: action === 'Approved' ? 'leave_approved' : 'leave_rejected',
        title: `Leave ${action} (Final)`,
        message: action === 'Approved'
          ? 'Your leave request has been fully approved!'
          : `Your leave request has been rejected by HR.${comment ? ' Reason: ' + comment : ''}`,
        link: '/leaves'
      });
    }

    await createAuditLog({
      userId: req.user._id,
      action: action === 'Approved' ? 'APPROVE' : 'REJECT',
      module: 'Leave',
      description: `Leave ${action.toLowerCase()} by HR (final)`,
      targetId: leave._id,
      targetModel: 'Leave',
      ipAddress: req.ip
    });

    res.json(leave);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Cancel leave
// @route   PUT /api/leaves/:id/cancel
export const cancelLeave = async (req, res) => {
  try {
    const leave = await Leave.findById(req.params.id);
    if (!leave) return res.status(404).json({ message: 'Leave not found' });

    // Only not-yet-fully-approved leaves can be cancelled
    if (!['Pending', 'Approved_By_Manager'].includes(leave.status)) {
      return res.status(400).json({ message: 'Only pending or partially approved leaves can be cancelled' });
    }

    leave.status = 'Cancelled';
    await leave.save();

    // Notify the employee's manager about cancellation
    const cancelEmp = await Employee.findById(leave.employee).populate('manager');
    if (cancelEmp?.manager?.user) {
      await createNotification({
        recipientId: cancelEmp.manager.user,
        type: 'leave_cancelled',
        title: 'Leave Cancelled',
        message: `${cancelEmp.firstName} ${cancelEmp.lastName} has cancelled their leave request`,
        link: '/leaves/approvals'
      });
    }
    // Notify HR about cancellation
    await notifyByRole({
      roles: ['hr'],
      type: 'leave_cancelled',
      title: 'Leave Cancelled',
      message: `${cancelEmp?.firstName} ${cancelEmp?.lastName} has cancelled their leave request`,
      link: '/leaves/approvals'
    });

    res.json({ message: 'Leave cancelled', leave });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    End approved leave early (truncate to yesterday, refund remaining days)
// @route   PUT /api/leaves/:id/end-early
export const endLeaveEarly = async (req, res) => {
  try {
    const leave = await Leave.findById(req.params.id).populate('leaveType', 'name');
    if (!leave) return res.status(404).json({ message: 'Leave not found' });

    // Must be an approved leave
    if (leave.status !== 'Approved') {
      return res.status(400).json({ message: 'Only fully approved leaves can be ended early' });
    }

    // Must be currently active (today falls within the leave period)
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (today < new Date(leave.startDate) || today > new Date(leave.endDate)) {
      return res.status(400).json({ message: 'This leave is not currently active' });
    }

    // Only the leave owner can end their own leave early
    const emp = await Employee.findById(leave.employee);
    if (!emp || emp.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the leave owner can end their leave early' });
    }

    // Calculate how many working days are being returned
    // New end date = yesterday (or start date if today IS the start date)
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const originalTotalDays = leave.totalDays;
    let newEndDate, newTotalDays;

    if (today.getTime() <= new Date(leave.startDate).getTime()) {
      // Ending on the very first day — cancel entirely
      leave.status = 'Cancelled';
      leave.endDate = leave.startDate;
      newTotalDays = 0;
      newEndDate = leave.startDate;
    } else {
      // Truncate: leave ends yesterday
      newEndDate = yesterday;
      newTotalDays = await countWorkingDays(new Date(leave.startDate), yesterday);
      leave.endDate = yesterday;
      leave.totalDays = newTotalDays;
    }

    const refundedDays = originalTotalDays - newTotalDays;

    await leave.save();

    // Refund leave balance
    if (refundedDays > 0) {
      const year = new Date(leave.startDate).getFullYear();
      const balance = await LeaveBalance.findOne({
        employee: leave.employee,
        leaveType: leave.leaveType._id || leave.leaveType,
        year
      });
      if (balance) {
        balance.used = Math.max(0, balance.used - refundedDays);
        balance.remaining = balance.remaining + refundedDays;
        await balance.save();
      }
    }

    // Audit log
    await createAuditLog({
      userId: req.user._id,
      action: 'UPDATE',
      module: 'Leave',
      description: `Leave ended early. Returned ${refundedDays} day(s) to balance.`,
      targetId: leave._id,
      targetModel: 'Leave',
      ipAddress: req.ip
    });

    // Notify manager and HR
    const leaveEmp = await Employee.findById(leave.employee).populate('manager');
    const empName = `${leaveEmp.firstName} ${leaveEmp.lastName}`;
    if (leaveEmp?.manager?.user) {
      await createNotification({
        recipientId: leaveEmp.manager.user,
        type: 'leave_ended_early',
        title: 'Leave Ended Early',
        message: `${empName} has ended their leave early and is returning to work`,
        link: '/leaves'
      });
    }
    await notifyByRole({
      roles: ['hr'],
      type: 'leave_ended_early',
      title: 'Leave Ended Early',
      message: `${empName} has ended their ${leave.leaveType?.name || ''} leave early. ${refundedDays} day(s) refunded.`,
      link: '/leaves'
    });

    res.json({
      message: `Leave ended early. ${refundedDays} day(s) refunded to your balance.`,
      leave,
      refundedDays
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get leave types
// @route   GET /api/leaves/types
export const getLeaveTypes = async (req, res) => {
  try {
    const types = await LeaveType.find({ isActive: true });
    res.json(types);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create leave type
// @route   POST /api/leaves/types
export const createLeaveType = async (req, res) => {
  try {
    const type = await LeaveType.create(req.body);
    res.status(201).json(type);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update leave type
// @route   PUT /api/leaves/types/:id
export const updateLeaveType = async (req, res) => {
  try {
    const type = await LeaveType.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!type) return res.status(404).json({ message: 'Leave type not found' });
    res.json(type);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete leave type (soft delete)
// @route   DELETE /api/leaves/types/:id
export const deleteLeaveType = async (req, res) => {
  try {
    const type = await LeaveType.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!type) return res.status(404).json({ message: 'Leave type not found' });
    res.json({ message: 'Leave type deactivated' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get leave balance
// @route   GET /api/leaves/balance
export const getLeaveBalance = async (req, res) => {
  try {
    let employeeId;
    if (req.query.employeeId) {
      // Only super_admin can view any employee's balance
      if (req.user.role === 'super_admin') {
        employeeId = req.query.employeeId;
      } else if (req.user.role === 'manager') {
        // Manager can only view team members' balance
        const managerEmp = await Employee.findOne({ user: req.user._id });
        const teamMembers = await Employee.find({ manager: managerEmp?._id }).select('_id');
        const teamIds = teamMembers.map(m => m._id.toString());
        if (!teamIds.includes(req.query.employeeId.toString())) {
          return res.status(403).json({ message: 'Access denied: not your team member' });
        }
        employeeId = req.query.employeeId;
      } else if (req.user.role === 'hr') {
        // HR can only view their own balance, not other employees
        const hrEmp = await Employee.findOne({ user: req.user._id });
        if (!hrEmp || hrEmp._id.toString() !== req.query.employeeId.toString()) {
          return res.status(403).json({ message: 'Access denied: HR can only view their own balance' });
        }
        employeeId = req.query.employeeId;
      } else {
        return res.status(403).json({ message: 'Access denied' });
      }
    } else {
      const emp = await Employee.findOne({ user: req.user._id });
      if (!emp) return res.status(404).json({ message: 'Employee not found' });
      employeeId = emp._id;
    }

    const year = req.query.year || new Date().getFullYear();
    const balances = await LeaveBalance.find({ employee: employeeId, year })
      .populate('leaveType', 'name daysPerYear');

    res.json(balances);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Adjust leave balance (HR only)
// @route   PUT /api/leaves/balance
export const adjustLeaveBalance = async (req, res) => {
  try {
    const { employeeId, leaveTypeId, year, allocated } = req.body;
    if (!employeeId || !leaveTypeId || !year || allocated === undefined) {
      return res.status(400).json({ message: 'employeeId, leaveTypeId, year, and allocated are required' });
    }

    let balance = await LeaveBalance.findOne({ employee: employeeId, leaveType: leaveTypeId, year });
    if (balance) {
      const diff = allocated - balance.allocated;
      balance.allocated = allocated;
      balance.remaining = Math.max(0, balance.remaining + diff);
      await balance.save();
    } else {
      balance = await LeaveBalance.create({
        employee: employeeId, leaveType: leaveTypeId, year,
        allocated, used: 0, remaining: allocated
      });
    }

    await createAuditLog({
      userId: req.user._id,
      action: 'UPDATE',
      module: 'LeaveBalance',
      description: `Leave balance adjusted for employee ${employeeId}: allocated=${allocated}`,
      targetId: balance._id,
      targetModel: 'LeaveBalance',
      ipAddress: req.ip
    });

    // Notify the employee about balance adjustment
    const balEmp = await Employee.findById(employeeId);
    if (balEmp?.user) {
      const lt = await LeaveType.findById(leaveTypeId);
      await createNotification({
        recipientId: balEmp.user,
        type: 'leave_balance_adjusted',
        title: 'Leave Balance Updated',
        message: `Your ${lt?.name || 'leave'} balance for ${year} has been adjusted to ${allocated} days`,
        link: '/leaves'
      });
    }

    const populated = await LeaveBalance.findById(balance._id).populate('leaveType', 'name daysPerYear');
    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
