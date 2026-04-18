import Payroll from '../models/Payroll.js';
import Employee from '../models/Employee.js';
import Attendance from '../models/Attendance.js';
import PayrollConfig from '../models/PayrollConfig.js';
import PDFDocument from 'pdfkit';
import { createAuditLog } from '../utils/auditHelper.js';
import { createNotification } from '../utils/notificationHelper.js';
import { calculateMonthlyTax } from '../utils/taxCalculator.js';

// @desc    Process payroll for a month
// @route   POST /api/payroll/process
export const processPayroll = async (req, res) => {
  try {
    const { month, year } = req.body;
    if (!month || !year) {
      return res.status(400).json({ message: 'Month and year are required' });
    }

    const employees = await Employee.find({ status: 'Active' });
    const config = await PayrollConfig.getConfig();
    const results = [];

    for (const emp of employees) {
      // Check if already processed
      const existing = await Payroll.findOne({ employee: emp._id, month, year });
      if (existing) {
        results.push({ employeeId: emp.employeeId, status: 'already_processed' });
        continue;
      }

      const grossSalary = (emp.salary.basic || 0) + (emp.salary.hra || 0) + (emp.salary.allowances || 0);

      // Auto-calculate deductions using payroll config
      const pfAmount = Math.round((emp.salary.basic || 0) * (config.pfPercentage / 100));
      const esiAmount = grossSalary <= config.esiGrossLimit
        ? Math.round(grossSalary * (config.esiPercentage / 100))
        : 0;

      // Auto-calculate tax from tax slabs if TDS enabled, else use employee's stored tax
      let taxAmount;
      if (config.tdsEnabled) {
        const annualGross = grossSalary * 12;
        taxAmount = calculateMonthlyTax(annualGross);
      } else {
        taxAmount = emp.salary.tax || 0;
      }

      const otherDeductions = emp.salary.deductions || 0;
      const totalDeductions = pfAmount + esiAmount + taxAmount + otherDeductions;
      const netSalary = grossSalary - totalDeductions;

      // Get overtime from attendance
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      const attendances = await Attendance.find({
        employee: emp._id,
        date: { $gte: startDate, $lte: endDate }
      });
      const totalOvertime = attendances.reduce((sum, a) => sum + (a.overtime || 0), 0);
      const overtimeAmount = Math.round(totalOvertime * (emp.salary.basic / 176) * (config.overtimeMultiplier || 1.5));

      const payroll = await Payroll.create({
        employee: emp._id,
        month,
        year,
        basicSalary: emp.salary.basic,
        hra: emp.salary.hra,
        allowances: emp.salary.allowances,
        grossSalary,
        deductions: {
          pf: pfAmount,
          esi: esiAmount,
          tax: taxAmount,
          other: otherDeductions
        },
        totalDeductions,
        netSalary: netSalary + overtimeAmount,
        overtime: { hours: totalOvertime, amount: overtimeAmount },
        status: 'Processed',
        processedBy: req.user._id,
        processedDate: new Date()
      });

      results.push({ employeeId: emp.employeeId, status: 'processed', netSalary: payroll.netSalary });

      // Notify employee about payroll
      if (emp.user) {
        await createNotification({
          recipientId: emp.user,
          type: 'payroll_processed',
          title: 'Payroll Processed',
          message: `Your payroll for ${new Date(2000, month - 1).toLocaleString('default', { month: 'long' })} ${year} has been processed. Net: ₹${payroll.netSalary.toLocaleString()}`,
          link: '/payroll'
        });
      }
    }

    await createAuditLog({
      userId: req.user._id,
      action: 'PROCESS',
      module: 'Payroll',
      description: `Payroll processed for ${month}/${year} - ${results.filter(r => r.status === 'processed').length} employees`,
      ipAddress: req.ip
    });

    res.json({ message: 'Payroll processed', results });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get payroll records
// @route   GET /api/payroll
export const getPayroll = async (req, res) => {
  try {
    const { month, year, status, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (req.user.role === 'employee') {
      const emp = await Employee.findOne({ user: req.user._id });
      if (emp) filter.employee = emp._id;
    }

    if (month) filter.month = parseInt(month);
    if (year) filter.year = parseInt(year);
    if (status) filter.status = status;

    const total = await Payroll.countDocuments(filter);
    const payrolls = await Payroll.find(filter)
      .populate({
        path: 'employee',
        select: 'firstName lastName employeeId department designation',
        populate: { path: 'department', select: 'name' }
      })
      .populate('processedBy', 'name')
      .sort('-year -month')
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({ payrolls, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get payslip for employee
// @route   GET /api/payroll/:id/payslip
export const getPayslip = async (req, res) => {
  try {
    const payroll = await Payroll.findById(req.params.id)
      .populate({
        path: 'employee',
        select: 'firstName lastName employeeId department designation bankDetails',
        populate: { path: 'department', select: 'name' }
      });

    if (!payroll) return res.status(404).json({ message: 'Payroll record not found' });

    // Employee can only view their own payslip
    if (req.user.role === 'employee') {
      const emp = await Employee.findOne({ user: req.user._id });
      if (!emp || emp._id.toString() !== payroll.employee._id.toString()) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    res.json(payroll);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get payroll summary
// @route   GET /api/payroll/summary
export const getPayrollSummary = async (req, res) => {
  try {
    const { year } = req.query;
    const currentYear = year || new Date().getFullYear();

    const summary = await Payroll.aggregate([
      { $match: { year: parseInt(currentYear) } },
      {
        $group: {
          _id: '$month',
          totalGross: { $sum: '$grossSalary' },
          totalDeductions: { $sum: '$totalDeductions' },
          totalNet: { $sum: '$netSalary' },
          employeeCount: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json(summary);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Download payslip as PDF
// @route   GET /api/payroll/:id/pdf
export const downloadPayslipPDF = async (req, res) => {
  try {
    const payroll = await Payroll.findById(req.params.id)
      .populate({
        path: 'employee',
        select: 'firstName lastName employeeId department designation bankDetails',
        populate: { path: 'department', select: 'name' }
      });

    if (!payroll) return res.status(404).json({ message: 'Payroll record not found' });

    // Access check
    if (req.user.role === 'employee') {
      const emp = await Employee.findOne({ user: req.user._id });
      if (!emp || emp._id.toString() !== payroll.employee._id.toString()) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    const emp = payroll.employee;
    const monthName = new Date(2000, payroll.month - 1).toLocaleString('default', { month: 'long' });

    const doc = new PDFDocument({ size: 'A4', margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Payslip_${emp.employeeId}_${monthName}_${payroll.year}.pdf`);
    doc.pipe(res);

    // Header
    doc.fontSize(20).font('Helvetica-Bold').text('PAYSLIP', { align: 'center' });
    doc.fontSize(10).font('Helvetica').text(`${monthName} ${payroll.year}`, { align: 'center' });
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#cccccc');
    doc.moveDown(0.5);

    // Employee details
    doc.fontSize(11).font('Helvetica-Bold').text('Employee Details');
    doc.moveDown(0.3);
    doc.fontSize(9).font('Helvetica');
    const detailsTop = doc.y;
    doc.text(`Name: ${emp.firstName} ${emp.lastName}`, 50, detailsTop);
    doc.text(`Employee ID: ${emp.employeeId}`, 50, detailsTop + 14);
    doc.text(`Department: ${emp.department?.name || 'N/A'}`, 300, detailsTop);
    doc.text(`Designation: ${emp.designation || 'N/A'}`, 300, detailsTop + 14);
    doc.moveDown(2.5);

    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#cccccc');
    doc.moveDown(0.5);

    // Earnings
    const drawRow = (label, value, bold = false) => {
      if (bold) doc.font('Helvetica-Bold'); else doc.font('Helvetica');
      const rowY = doc.y;
      doc.text(label, 60, rowY);
      doc.text(`₹ ${Number(value || 0).toLocaleString()}`, 400, rowY, { width: 130, align: 'right' });
      doc.moveDown(0.6);
    };

    doc.fontSize(11).font('Helvetica-Bold').text('Earnings');
    doc.moveDown(0.3);
    doc.fontSize(9);
    drawRow('Basic Salary', payroll.basicSalary);
    drawRow('HRA', payroll.hra);
    drawRow('Allowances', payroll.allowances);
    if (payroll.overtime?.amount > 0) {
      drawRow(`Overtime (${payroll.overtime.hours?.toFixed(1)} hrs)`, payroll.overtime.amount);
    }
    drawRow('Gross Salary', payroll.grossSalary, true);
    doc.moveDown(0.5);

    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#cccccc');
    doc.moveDown(0.5);

    // Deductions
    doc.fontSize(11).font('Helvetica-Bold').text('Deductions');
    doc.moveDown(0.3);
    doc.fontSize(9);
    drawRow('Provident Fund (PF)', payroll.deductions.pf);
    drawRow('ESI', payroll.deductions.esi);
    drawRow('Professional Tax', payroll.deductions.tax);
    if (payroll.deductions.other > 0) {
      drawRow('Other Deductions', payroll.deductions.other);
    }
    drawRow('Total Deductions', payroll.totalDeductions, true);
    doc.moveDown(0.5);

    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#cccccc');
    doc.moveDown(0.8);

    // Net Salary
    doc.fontSize(14).font('Helvetica-Bold').text(`Net Salary: ₹ ${payroll.netSalary.toLocaleString()}`, { align: 'center' });
    doc.moveDown(1.5);

    // Bank details
    if (emp.bankDetails?.bankName) {
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#cccccc');
      doc.moveDown(0.5);
      doc.fontSize(9).font('Helvetica').fillColor('#666666');
      doc.text(`Bank: ${emp.bankDetails.bankName} | A/C: ${emp.bankDetails.accountNumber || 'N/A'} | IFSC: ${emp.bankDetails.ifscCode || 'N/A'}`, { align: 'center' });
    }

    // Footer
    doc.moveDown(2);
    doc.fontSize(8).fillColor('#999999').text('This is a computer-generated document. No signature is required.', { align: 'center' });

    doc.end();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
