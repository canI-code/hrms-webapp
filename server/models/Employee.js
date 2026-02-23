import mongoose from 'mongoose';

const employeeSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  employeeId: { type: String, unique: true, required: true },
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true },
  phone: { type: String, trim: true },
  dateOfBirth: { type: Date },
  gender: { type: String, enum: ['male', 'female', 'other', ''], set: v => v ? v.toLowerCase() : v },
  maritalStatus: { type: String, enum: ['Single', 'Married', 'Divorced', 'Widowed'] },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: { type: String, default: 'India' }
  },
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  designation: { type: String, trim: true },
  manager: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  dateOfJoining: { type: Date, required: true },
  dateOfLeaving: { type: Date },
  employmentType: {
    type: String,
    enum: ['Full-time', 'Part-time', 'Contract', 'Intern'],
    default: 'Full-time'
  },
  status: {
    type: String,
    enum: ['Active', 'Resigned', 'Terminated', 'On Leave', 'Deactivated'],
    default: 'Active'
  },
  salary: {
    basic: { type: Number, default: 0 },
    hra: { type: Number, default: 0 },
    allowances: { type: Number, default: 0 },
    deductions: { type: Number, default: 0 },
    pf: { type: Number, default: 0 },
    esi: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    netSalary: { type: Number, default: 0 }
  },
  bankDetails: {
    bankName: String,
    accountNumber: String,
    ifscCode: String
  },
  emergencyContact: {
    name: String,
    relation: String,
    phone: String
  },
  documents: [{
    name: String,
    url: String,
    publicId: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  profileImage: { type: String, default: '' },
  profileImagePublicId: { type: String, default: '' },
}, { timestamps: true });

// Normalize gender to lowercase (fix legacy data)
employeeSchema.pre('validate', function (next) {
  if (this.gender && typeof this.gender === 'string') {
    this.gender = this.gender.toLowerCase();
  }
  next();
});

// Auto-calculate net salary before save
employeeSchema.pre('save', function (next) {
  if (this.salary) {
    const gross = (this.salary.basic || 0) + (this.salary.hra || 0) + (this.salary.allowances || 0);
    const totalDeductions = (this.salary.deductions || 0) + (this.salary.pf || 0) +
      (this.salary.esi || 0) + (this.salary.tax || 0);
    this.salary.netSalary = gross - totalDeductions;
  }
  next();
});

employeeSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

employeeSchema.set('toJSON', { virtuals: true });
employeeSchema.set('toObject', { virtuals: true });

export default mongoose.model('Employee', employeeSchema);
