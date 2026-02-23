import mongoose from 'mongoose';

const payrollSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  month: { type: Number, required: true, min: 1, max: 12 },
  year: { type: Number, required: true },
  basicSalary: { type: Number, default: 0 },
  hra: { type: Number, default: 0 },
  allowances: { type: Number, default: 0 },
  grossSalary: { type: Number, default: 0 },
  deductions: {
    pf: { type: Number, default: 0 },
    esi: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    other: { type: Number, default: 0 }
  },
  totalDeductions: { type: Number, default: 0 },
  netSalary: { type: Number, default: 0 },
  overtime: {
    hours: { type: Number, default: 0 },
    amount: { type: Number, default: 0 }
  },
  leaveDaysDeducted: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['Draft', 'Processed', 'Paid'],
    default: 'Draft'
  },
  processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  processedDate: { type: Date },
  payslipUrl: { type: String },
}, { timestamps: true });

payrollSchema.index({ employee: 1, month: 1, year: 1 }, { unique: true });

export default mongoose.model('Payroll', payrollSchema);
