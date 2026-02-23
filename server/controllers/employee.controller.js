import Employee from '../models/Employee.js';
import User from '../models/User.js';
import Department from '../models/Department.js';
import Leave from '../models/Leave.js';
import { createAuditLog } from '../utils/auditHelper.js';
import { createNotification, notifyByRole } from '../utils/notificationHelper.js';
import cloudinary from '../config/cloudinary.js';

// Helper: check if employee is currently on approved leave
const isOnLeaveToday = async (employeeId) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const count = await Leave.countDocuments({
    employee: employeeId,
    status: 'Approved',
    startDate: { $lte: now },
    endDate: { $gte: today }
  });
  return count > 0;
};

// @desc    Get all employees
// @route   GET /api/employees
export const getEmployees = async (req, res) => {
  try {
    const { department, status, search, page = 1, limit = 20 } = req.query;
    const filter = {};

    // Manager can only see their team
    if (req.user.role === 'manager') {
      const managerEmployee = await Employee.findOne({ user: req.user._id });
      if (managerEmployee) {
        filter.manager = managerEmployee._id;
      }
    }

    // Employee can only see themselves
    if (req.user.role === 'employee') {
      const emp = await Employee.findOne({ user: req.user._id });
      if (emp) filter._id = emp._id;
    }

    if (department) filter.department = department;
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Filter by user role if requested (e.g. role=manager or role=hr,manager)
    if (req.query.role) {
      const roles = req.query.role.includes(',') ? req.query.role.split(',') : [req.query.role];
      const usersWithRole = await User.find({ role: { $in: roles } }).distinct('_id');
      filter.user = { $in: usersWithRole };
    }

    const total = await Employee.countDocuments(filter);
    const employees = await Employee.find(filter)
      .populate('department', 'name')
      .populate('manager', 'firstName lastName')
      .populate('user', 'name email role isActive')
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    // Check which employees are currently on approved leave
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const onLeaveEmployeeIds = await Leave.distinct('employee', {
      status: 'Approved',
      startDate: { $lte: now },
      endDate: { $gte: todayStart }
    });
    const onLeaveSet = new Set(onLeaveEmployeeIds.map(id => id.toString()));

    const enriched = employees.map(emp => {
      const e = emp.toObject();
      if (e.status === 'Active' && onLeaveSet.has(e._id.toString())) {
        e.status = 'On Leave';
      }
      return e;
    });

    res.json({
      employees: enriched,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single employee
// @route   GET /api/employees/:id
export const getEmployee = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id)
      .populate('department', 'name')
      .populate('manager', 'firstName lastName')
      .populate('user', 'name email role isActive avatar');

    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    // Check access: employee can only see themselves
    if (req.user.role === 'employee') {
      const userEmp = await Employee.findOne({ user: req.user._id });
      if (!userEmp || userEmp._id.toString() !== employee._id.toString()) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    // Manager can only see their team
    if (req.user.role === 'manager') {
      const managerEmp = await Employee.findOne({ user: req.user._id });
      if (managerEmp && employee.manager?._id?.toString() !== managerEmp._id.toString() &&
        employee._id.toString() !== managerEmp._id.toString()) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    // Override status to 'On Leave' if employee has an active approved leave
    const empObj = employee.toObject();
    if (empObj.status === 'Active' && await isOnLeaveToday(employee._id)) {
      empObj.status = 'On Leave';
    }

    res.json(empObj);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create employee
// @route   POST /api/employees
export const createEmployee = async (req, res) => {
  try {
    const {
      firstName, lastName, email, phone, dateOfBirth, gender, maritalStatus,
      address, department, designation, manager, dateOfJoining, employmentType,
      salary, bankDetails, emergencyContact, password, role
    } = req.body;

    // Role-based creation restrictions
    const assignedRole = role || 'employee';

    if (req.user.role === 'super_admin') {
      // Super Admin can only create HR and Manager accounts
      if (!['hr', 'manager'].includes(assignedRole)) {
        return res.status(403).json({
          message: 'Super Admin can only create HR or Manager accounts. HR creates employees.'
        });
      }
    } else if (req.user.role === 'hr') {
      // HR can only create employee accounts
      if (assignedRole !== 'employee') {
        return res.status(403).json({
          message: 'HR can only create Employee accounts.'
        });
      }
    }

    // Generate role-based ID
    let idPrefix = 'EMP';
    if (assignedRole === 'hr') idPrefix = 'HR';
    else if (assignedRole === 'manager') idPrefix = 'MNG';
    const roleCount = await Employee.countDocuments({ user: { $exists: true } }).then(async () => {
      // Count by matching role through populated user, or simpler: count by prefix in existing IDs
      return Employee.countDocuments({ employeeId: { $regex: `^${idPrefix}` } });
    });
    const employeeId = `${idPrefix}${String(roleCount + 1).padStart(4, '0')}`;

    // Resolve department — if it's a name string (not an ObjectId), find or create the department
    let departmentId = department || undefined;
    if (department && !department.match(/^[0-9a-fA-F]{24}$/)) {
      let dept = await Department.findOne({ name: department });
      if (!dept) {
        dept = await Department.create({ name: department });
      }
      departmentId = dept._id;
    }

    // Create user account — mark profile as completed since admin filled details
    const user = await User.create({
      name: `${firstName} ${lastName}`,
      email,
      password: password || 'password123',
      role: role || 'employee',
      profileCompleted: true,
      phone: phone || undefined,
      gender: gender || undefined,
      dateOfBirth: dateOfBirth || undefined,
      address: address || undefined,
      emergencyContact: emergencyContact || undefined
    });

    const employee = await Employee.create({
      user: user._id,
      employeeId,
      firstName,
      lastName,
      email,
      phone,
      dateOfBirth: dateOfBirth || undefined,
      gender: gender || undefined,
      maritalStatus: maritalStatus || undefined,
      address,
      department: departmentId,
      designation: designation || undefined,
      manager: manager || undefined,
      dateOfJoining: dateOfJoining || new Date(),
      employmentType,
      salary,
      bankDetails,
      emergencyContact
    });

    // Link employee to user
    user.employee = employee._id;
    await user.save({ validateBeforeSave: false });

    await createAuditLog({
      userId: req.user._id,
      action: 'CREATE',
      module: 'Employee',
      description: `Employee ${firstName} ${lastName} (${employeeId}) created`,
      targetId: employee._id,
      targetModel: 'Employee',
      ipAddress: req.ip
    });

    // Notify the new employee
    await createNotification({
      recipientId: user._id,
      type: 'employee_added',
      title: 'Welcome to the Team!',
      message: `Your employee profile has been created (ID: ${employeeId}). Welcome aboard!`,
      link: '/profile'
    });

    // Notify HR & super_admin about the new employee
    await notifyByRole({
      roles: ['super_admin', 'hr'],
      type: 'employee_added',
      title: 'New Employee Added',
      message: `${firstName} ${lastName} (${employeeId}) has been added as ${assignedRole}`,
      link: '/employees'
    });

    const populated = await Employee.findById(employee._id)
      .populate('department', 'name')
      .populate('manager', 'firstName lastName')
      .populate('user', 'name email role');

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update employee
// @route   PUT /api/employees/:id
export const updateEmployee = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id).populate('user', 'role');
    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    // HR can only edit employees (not other HR or managers)
    if (req.user.role === 'hr' && employee.user?.role !== 'employee') {
      return res.status(403).json({ message: 'HR can only edit employees, not HR or managers' });
    }

    // Employee can only edit limited personal info
    if (req.user.role === 'employee') {
      const allowed = ['phone', 'address', 'emergencyContact'];
      const updates = {};
      allowed.forEach(field => {
        if (req.body[field] !== undefined) updates[field] = req.body[field];
      });
      Object.assign(employee, updates);
    } else {
      Object.assign(employee, req.body);
    }

    await employee.save();

    await createAuditLog({
      userId: req.user._id,
      action: 'UPDATE',
      module: 'Employee',
      description: `Employee ${employee.firstName} ${employee.lastName} updated`,
      targetId: employee._id,
      targetModel: 'Employee',
      changes: req.body,
      ipAddress: req.ip
    });

    // Notify the employee about profile update
    if (employee.user && employee.user._id?.toString() !== req.user._id.toString()) {
      await createNotification({
        recipientId: employee.user._id || employee.user,
        type: 'employee_updated',
        title: 'Profile Updated',
        message: `Your employee profile has been updated by ${req.user.role.toUpperCase()}`,
        link: '/profile'
      });
    }

    const populated = await Employee.findById(employee._id)
      .populate('department', 'name')
      .populate('manager', 'firstName lastName')
      .populate('user', 'name email role');

    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete employee
// @route   DELETE /api/employees/:id
export const deleteEmployee = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id).populate('user', 'role');
    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    // HR can only delete employees (not other HR or managers)
    if (req.user.role === 'hr' && employee.user?.role !== 'employee') {
      return res.status(403).json({ message: 'HR can only delete employees, not HR or managers' });
    }

    // Delete profile image from Cloudinary
    if (employee.profileImagePublicId) {
      await cloudinary.uploader.destroy(employee.profileImagePublicId);
    }

    // Deactivate user account (soft delete)
    await User.findByIdAndUpdate(employee.user, { isActive: false });
    await Employee.findByIdAndDelete(req.params.id);

    await createAuditLog({
      userId: req.user._id,
      action: 'DELETE',
      module: 'Employee',
      description: `Employee ${employee.firstName} ${employee.lastName} (${employee.employeeId}) deleted`,
      targetId: employee._id,
      targetModel: 'Employee',
      ipAddress: req.ip
    });

    // Notify HR & super_admin about the deletion
    await notifyByRole({
      roles: ['super_admin', 'hr'],
      type: 'employee_deleted',
      title: 'Employee Removed',
      message: `${employee.firstName} ${employee.lastName} (${employee.employeeId}) has been removed from the system`,
      link: '/employees'
    });

    res.json({ message: 'Employee deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Upload profile image
// @route   POST /api/employees/:id/avatar
export const uploadAvatar = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    // Only the account owner can upload their own profile image
    if (employee.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only upload your own profile picture' });
    }

    // Delete old image
    if (employee.profileImagePublicId) {
      await cloudinary.uploader.destroy(employee.profileImagePublicId);
    }

    employee.profileImage = req.file.path;
    employee.profileImagePublicId = req.file.filename;
    await employee.save();

    // Update user avatar too
    await User.findByIdAndUpdate(employee.user, {
      avatar: req.file.path,
      avatarPublicId: req.file.filename
    });

    res.json({ url: req.file.path, message: 'Image uploaded successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
