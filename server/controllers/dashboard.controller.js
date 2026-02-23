import Employee from '../models/Employee.js';
import Leave from '../models/Leave.js';
import Payroll from '../models/Payroll.js';
import Attendance from '../models/Attendance.js';
import Department from '../models/Department.js';
import Announcement from '../models/Announcement.js';
import Holiday from '../models/Holiday.js';
import LeaveBalance from '../models/LeaveBalance.js';

// @desc    Get dashboard data based on role
// @route   GET /api/dashboard
export const getDashboard = async (req, res) => {
  try {
    const role = req.user.role;
    let data = {};

    if (role === 'super_admin') {
      data = await getSuperAdminDashboard();
    } else if (role === 'hr') {
      data = await getHRDashboard();
    } else if (role === 'manager') {
      data = await getManagerDashboard(req.user._id);
    } else {
      data = await getEmployeeDashboard(req.user._id);
    }

    // Common: recent announcements
    data.announcements = await Announcement.find({ isActive: true })
      .sort('-createdAt')
      .limit(5)
      .populate('postedBy', 'name');

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

async function getSuperAdminDashboard() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [totalEmployees, activeEmployees, departments, pendingLeaves] = await Promise.all([
    Employee.countDocuments(),
    Employee.countDocuments({ status: 'Active' }),
    Department.countDocuments({ isActive: true }),
    Leave.countDocuments({ status: 'Pending' })
  ]);

  // Employees on leave today
  const leavesToday = await Leave.find({
    status: 'Approved',
    startDate: { $lte: now },
    endDate: { $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) }
  }).populate({ path: 'employee', select: 'firstName lastName designation department', populate: { path: 'department', select: 'name' } });

  const onLeaveToday = leavesToday.length;
  const employeesOnLeave = leavesToday.map(l => ({
    name: `${l.employee?.firstName} ${l.employee?.lastName}`,
    designation: l.employee?.designation,
    department: l.employee?.department?.name,
    endDate: l.endDate
  }));

  // Payroll summary for current year
  const payrollSummary = await Payroll.aggregate([
    { $match: { year: now.getFullYear() } },
    {
      $group: {
        _id: '$month',
        totalNet: { $sum: '$netSalary' },
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  // Department-wise employee count
  const departmentStats = await Employee.aggregate([
    { $match: { status: 'Active' } },
    { $group: { _id: '$department', count: { $sum: 1 } } },
    {
      $lookup: {
        from: 'departments', localField: '_id', foreignField: '_id', as: 'dept'
      }
    },
    { $unwind: { path: '$dept', preserveNullAndEmptyArrays: true } },
    { $project: { name: { $ifNull: ['$dept.name', 'Unassigned'] }, count: 1 } }
  ]);

  return {
    stats: { totalEmployees, activeEmployees, departments, pendingLeaves, onLeaveToday },
    payrollSummary,
    departmentStats,
    employeesOnLeave
  };
}

async function getHRDashboard() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const [totalEmployees, pendingLeaves, todayAttendance, todayLate, onLeaveToday, totalDepartments] = await Promise.all([
    Employee.countDocuments({ status: 'Active' }),
    Leave.countDocuments({ status: { $in: ['Pending', 'Approved_By_Manager'] } }),
    Attendance.countDocuments({ date: { $gte: today, $lt: new Date(today.getTime() + 86400000) } }),
    Attendance.countDocuments({ date: { $gte: today, $lt: new Date(today.getTime() + 86400000) }, status: 'Late' }),
    Leave.countDocuments({ status: 'Approved', startDate: { $lte: now }, endDate: { $gte: today } }),
    Department.countDocuments({ isActive: true })
  ]);

  // Employees on leave today (detailed list)
  const leavesToday = await Leave.find({
    status: 'Approved',
    startDate: { $lte: now },
    endDate: { $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) }
  }).populate({ path: 'employee', select: 'firstName lastName designation department', populate: { path: 'department', select: 'name' } });

  const employeesOnLeave = leavesToday.map(l => ({
    name: `${l.employee?.firstName} ${l.employee?.lastName}`,
    designation: l.employee?.designation,
    department: l.employee?.department?.name,
    endDate: l.endDate
  }));

  // Recent hires (last 30 days)
  const recentHires = await Employee.find({ createdAt: { $gte: new Date(now - 30 * 86400000) } })
    .select('firstName lastName employeeId designation createdAt')
    .sort('-createdAt').limit(5);

  // Monthly attendance summary (present / late / absent ratio)
  const monthAttendanceSummary = await Attendance.aggregate([
    { $match: { date: { $gte: monthStart, $lte: monthEnd } } },
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);

  // Recent payroll
  const recentPayroll = await Payroll.find()
    .sort('-year -month')
    .limit(5)
    .populate('employee', 'firstName lastName employeeId');

  // Upcoming holidays (next 30 days)
  const upcomingHolidays = await Holiday.find({ date: { $gte: today, $lte: new Date(now.getTime() + 30 * 86400000) } })
    .sort('date').limit(5);

  // Payroll monthly trend for current year
  const payrollTrend = await Payroll.aggregate([
    { $match: { year: now.getFullYear() } },
    { $group: { _id: '$month', totalNet: { $sum: '$netSalary' }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ]);

  // Employee count by role
  const employeesByRole = await Employee.aggregate([
    { $match: { status: 'Active' } },
    { $lookup: { from: 'users', localField: 'user', foreignField: '_id', as: 'u' } },
    { $unwind: '$u' },
    { $group: { _id: '$u.role', count: { $sum: 1 } } }
  ]);

  return {
    stats: { totalEmployees, pendingLeaves, todayAttendance, todayLate, onLeaveToday, totalDepartments },
    recentPayroll,
    recentHires,
    monthAttendanceSummary,
    upcomingHolidays,
    payrollTrend,
    employeesByRole,
    employeesOnLeave
  };
}

async function getManagerDashboard(userId) {
  const managerEmp = await Employee.findOne({ user: userId });
  if (!managerEmp) return { stats: {} };

  const teamMembers = await Employee.find({ manager: managerEmp._id })
    .populate('department', 'name');
  const teamIds = teamMembers.map(m => m._id);
  // Include the manager themselves in all attendance/leave queries
  const allIds = [...teamIds, managerEmp._id];

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const [pendingLeaves, todayAttendance, todayLate] = await Promise.all([
    Leave.countDocuments({ employee: { $in: allIds }, status: 'Pending' }),
    Attendance.countDocuments({
      employee: { $in: allIds },
      date: { $gte: today, $lt: new Date(today.getTime() + 86400000) }
    }),
    Attendance.countDocuments({
      employee: { $in: allIds },
      date: { $gte: today, $lt: new Date(today.getTime() + 86400000) },
      status: 'Late'
    })
  ]);

  // Team on leave today
  const teamOnLeave = await Leave.find({
    employee: { $in: allIds },
    status: 'Approved',
    startDate: { $lte: now },
    endDate: { $gte: today }
  }).populate('employee', 'firstName lastName');

  // Team attendance this month
  const teamMonthAttendance = await Attendance.aggregate([
    { $match: { employee: { $in: allIds }, date: { $gte: monthStart, $lte: monthEnd } } },
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);

  // Upcoming team leaves
  const upcomingLeaves = await Leave.find({
    employee: { $in: allIds },
    status: 'Approved',
    startDate: { $gte: today }
  }).populate('employee', 'firstName lastName').sort('startDate').limit(5);

  // Upcoming holidays
  const upcomingHolidays = await Holiday.find({ date: { $gte: today } }).sort('date').limit(3);

  // Recent leave requests
  const recentLeaveRequests = await Leave.find({
    employee: { $in: allIds },
    status: 'Pending'
  }).populate('employee', 'firstName lastName').sort('-createdAt').limit(5);

  return {
    stats: {
      teamSize: teamMembers.length + 1,
      pendingLeaves,
      todayAttendance,
      todayLate,
      onLeaveToday: teamOnLeave.length
    },
    teamMembers: teamMembers.map(m => {
      const isOnLeave = teamOnLeave.some(l => l.employee?._id?.toString() === m._id.toString());
      return {
        _id: m._id,
        name: `${m.firstName} ${m.lastName}`,
        designation: m.designation,
        department: m.department?.name,
        status: isOnLeave ? 'On Leave' : m.status
      };
    }),
    teamOnLeave: teamOnLeave.map(l => ({ name: `${l.employee?.firstName} ${l.employee?.lastName}`, endDate: l.endDate })),
    teamMonthAttendance,
    upcomingLeaves,
    upcomingHolidays,
    recentLeaveRequests
  };
}

async function getEmployeeDashboard(userId) {
  const emp = await Employee.findOne({ user: userId })
    .populate('department', 'name')
    .populate('manager', 'firstName lastName');
  if (!emp) return { stats: {} };

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const today = new Date(year, now.getMonth(), now.getDate());
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0);

  const [pendingLeaves, latestPayroll, monthAttendance, leaveBalance] = await Promise.all([
    Leave.countDocuments({ employee: emp._id, status: 'Pending' }),
    Payroll.findOne({ employee: emp._id }).sort('-year -month'),
    Attendance.find({ employee: emp._id, date: { $gte: monthStart, $lte: monthEnd } }),
    LeaveBalance.find({ employee: emp._id, year }).populate('leaveType', 'name')
  ]);

  // Attendance stats for this month
  const presentDays = monthAttendance.filter(a => ['Present', 'Late'].includes(a.status)).length;
  const lateDays = monthAttendance.filter(a => a.status === 'Late').length;
  const absentDays = monthAttendance.filter(a => a.status === 'Absent').length;
  const totalLateMinutes = monthAttendance.reduce((s, a) => s + (a.totalLateMinutes || 0), 0);
  const totalWorkingHours = monthAttendance.reduce((s, a) => s + (a.workingHours || 0), 0);

  // Today's attendance
  const todayAttendance = monthAttendance.find(a => new Date(a.date).toDateString() === today.toDateString());

  // Recent leaves
  const recentLeaves = await Leave.find({ employee: emp._id })
    .sort('-createdAt').limit(5)
    .populate('leaveType', 'name');

  // Upcoming holidays
  const upcomingHolidays = await Holiday.find({ date: { $gte: today } }).sort('date').limit(5);

  // Last 5 payslips summary
  const payslipHistory = await Payroll.find({ employee: emp._id })
    .sort('-year -month').limit(5)
    .select('month year netSalary grossSalary status');

  return {
    stats: {
      pendingLeaves,
      presentDays,
      lateDays,
      absentDays,
      totalLateMinutes,
      totalWorkingHours: Math.round(totalWorkingHours * 10) / 10,
      lastSalary: latestPayroll?.netSalary || 0,
      department: emp.department?.name || 'N/A',
      designation: emp.designation,
      manager: emp.manager ? `${emp.manager.firstName} ${emp.manager.lastName}` : null
    },
    employee: emp,
    todayAttendance,
    leaveBalance: leaveBalance.map(lb => ({
      type: lb.leaveType?.name || 'Unknown',
      total: lb.allocated,
      used: lb.used,
      remaining: lb.remaining
    })),
    recentLeaves,
    upcomingHolidays,
    payslipHistory
  };
}
