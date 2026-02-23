import Employee from '../models/Employee.js';
import Leave from '../models/Leave.js';
import Attendance from '../models/Attendance.js';
import Payroll from '../models/Payroll.js';

// @desc    Get comprehensive reports
// @route   GET /api/reports
export const getReports = async (req, res) => {
  try {
    const { year } = req.query;
    const currentYear = parseInt(year) || new Date().getFullYear();

    // Employee growth (monthly joins)
    const employeeGrowth = await Employee.aggregate([
      {
        $match: {
          dateOfJoining: {
            $gte: new Date(`${currentYear}-01-01`),
            $lte: new Date(`${currentYear}-12-31`)
          }
        }
      },
      { $group: { _id: { $month: '$dateOfJoining' }, count: { $sum: 1 } } },
      { $sort: { '_id': 1 } }
    ]);

    // Department distribution
    const departmentDistribution = await Employee.aggregate([
      { $match: { status: 'Active' } },
      { $group: { _id: '$department', count: { $sum: 1 } } },
      {
        $lookup: {
          from: 'departments', localField: '_id', foreignField: '_id', as: 'dept'
        }
      },
      { $unwind: { path: '$dept', preserveNullAndEmptyArrays: true } },
      { $project: { name: { $ifNull: ['$dept.name', 'Unassigned'] }, count: 1 } },
      { $sort: { count: -1 } }
    ]);

    // Leave trends (monthly)
    const leaveTrends = await Leave.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(`${currentYear}-01-01`),
            $lte: new Date(`${currentYear}-12-31`)
          }
        }
      },
      {
        $group: {
          _id: { month: { $month: '$createdAt' }, status: '$status' },
          count: { $sum: 1 },
          totalDays: { $sum: '$totalDays' }
        }
      },
      { $sort: { '_id.month': 1 } }
    ]);

    // Attendance trends (monthly avg)
    const attendanceTrends = await Attendance.aggregate([
      {
        $match: {
          date: {
            $gte: new Date(`${currentYear}-01-01`),
            $lte: new Date(`${currentYear}-12-31`)
          }
        }
      },
      {
        $group: {
          _id: { $month: '$date' },
          totalPresent: { $sum: { $cond: [{ $eq: ['$status', 'Present'] }, 1, 0] } },
          totalLate: { $sum: { $cond: [{ $eq: ['$status', 'Late'] }, 1, 0] } },
          totalAbsent: { $sum: { $cond: [{ $eq: ['$status', 'Absent'] }, 1, 0] } },
          totalRecords: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Payroll expenses (monthly)
    const payrollExpenses = await Payroll.aggregate([
      { $match: { year: currentYear } },
      {
        $group: {
          _id: '$month',
          totalGross: { $sum: '$grossSalary' },
          totalNet: { $sum: '$netSalary' },
          totalDeductions: { $sum: '$totalDeductions' },
          employeeCount: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Summary counts
    const totalEmployees = await Employee.countDocuments({ status: 'Active' });
    const totalLeaves = await Leave.countDocuments({
      createdAt: { $gte: new Date(`${currentYear}-01-01`), $lte: new Date(`${currentYear}-12-31`) }
    });
    const totalPayrollCost = payrollExpenses.reduce((s, p) => s + p.totalNet, 0);

    res.json({
      year: currentYear,
      summary: { totalEmployees, totalLeaves, totalPayrollCost },
      employeeGrowth,
      departmentDistribution,
      leaveTrends,
      attendanceTrends,
      payrollExpenses
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
