import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import Employee from '../models/Employee.js';
import Leave from '../models/Leave.js';
import Attendance from '../models/Attendance.js';
import Payroll from '../models/Payroll.js';
import { sendExcel } from '../utils/excelHelper.js';

const router = Router();

// Export employees
router.get('/employees', protect, authorize('super_admin', 'hr'), async (req, res) => {
  try {
    const employees = await Employee.find({ status: 'Active' })
      .populate('department', 'name')
      .lean();
    const data = employees.map(e => ({
      'Employee ID': e.employeeId,
      'First Name': e.firstName,
      'Last Name': e.lastName,
      'Email': e.email,
      'Phone': e.phone || '',
      'Department': e.department?.name || '',
      'Designation': e.designation || '',
      'Date of Joining': e.dateOfJoining ? new Date(e.dateOfJoining).toLocaleDateString() : '',
      'Status': e.status,
      'Employment Type': e.employmentType || '',
      'Basic Salary': e.salary?.basic || 0,
      'Net Salary': e.salary?.netSalary || 0,
    }));
    sendExcel(res, data, 'employees.xlsx', 'Employees');
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Export payroll
router.get('/payroll', protect, authorize('super_admin', 'hr'), async (req, res) => {
  try {
    const { month, year } = req.query;
    const filter = {};
    if (month) filter.month = parseInt(month);
    if (year) filter.year = parseInt(year);

    const payrolls = await Payroll.find(filter)
      .populate({ path: 'employee', select: 'firstName lastName employeeId department', populate: { path: 'department', select: 'name' } })
      .lean();

    const data = payrolls.map(p => ({
      'Employee ID': p.employee?.employeeId || '',
      'Name': `${p.employee?.firstName || ''} ${p.employee?.lastName || ''}`,
      'Department': p.employee?.department?.name || '',
      'Month': p.month,
      'Year': p.year,
      'Basic': p.basicSalary,
      'HRA': p.hra,
      'Allowances': p.allowances,
      'Gross': p.grossSalary,
      'PF': p.deductions?.pf || 0,
      'ESI': p.deductions?.esi || 0,
      'Tax': p.deductions?.tax || 0,
      'Total Deductions': p.totalDeductions,
      'Net Salary': p.netSalary,
      'Status': p.status,
    }));
    sendExcel(res, data, `payroll_${month || 'all'}_${year || 'all'}.xlsx`, 'Payroll');
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Export attendance report
router.get('/attendance', protect, authorize('super_admin', 'hr', 'manager'), async (req, res) => {
  try {
    const { month, year } = req.query;
    const filter = {};
    if (month && year) {
      const start = new Date(parseInt(year), parseInt(month) - 1, 1);
      const end = new Date(parseInt(year), parseInt(month), 0);
      filter.date = { $gte: start, $lte: end };
    }

    const records = await Attendance.find(filter)
      .populate('employee', 'firstName lastName employeeId')
      .sort('date')
      .lean();

    const data = records.map(r => ({
      'Employee ID': r.employee?.employeeId || '',
      'Name': `${r.employee?.firstName || ''} ${r.employee?.lastName || ''}`,
      'Date': new Date(r.date).toLocaleDateString(),
      'Status': r.status,
      'Check In': r.sessions?.[0]?.checkIn ? new Date(r.sessions[0].checkIn).toLocaleTimeString() : '',
      'Check Out': r.sessions?.[0]?.checkOut ? new Date(r.sessions[0].checkOut).toLocaleTimeString() : '',
      'Total Hours': r.totalHours?.toFixed(2) || '0',
      'Overtime': r.overtime?.toFixed(2) || '0',
    }));
    sendExcel(res, data, `attendance_${month || 'all'}_${year || 'all'}.xlsx`, 'Attendance');
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Export leaves
router.get('/leaves', protect, authorize('super_admin', 'hr'), async (req, res) => {
  try {
    const leaves = await Leave.find()
      .populate('employee', 'firstName lastName employeeId')
      .populate('leaveType', 'name')
      .sort('-createdAt')
      .lean();

    const data = leaves.map(l => ({
      'Employee ID': l.employee?.employeeId || '',
      'Name': `${l.employee?.firstName || ''} ${l.employee?.lastName || ''}`,
      'Leave Type': l.leaveType?.name || '',
      'Start Date': new Date(l.startDate).toLocaleDateString(),
      'End Date': new Date(l.endDate).toLocaleDateString(),
      'Total Days': l.totalDays,
      'Status': l.status,
      'Reason': l.reason || '',
      'Applied On': new Date(l.createdAt).toLocaleDateString(),
    }));
    sendExcel(res, data, 'leaves.xlsx', 'Leaves');
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
