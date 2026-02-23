import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  name: { type: String, required: true, trim: true },
  type: {
    type: String,
    enum: ['ID Proof', 'Address Proof', 'Resume', 'Certificate', 'Offer Letter', 'Contract', 'Payslip', 'Experience Letter', 'Educational Document', 'PAN Card', 'Aadhaar Card', 'Passport', 'Bank Statement', 'Other'],
    default: 'Other'
  },
  description: { type: String, trim: true, default: '' },
  url: { type: String, required: true },
  publicId: { type: String },
  fileSize: { type: Number },
  mimeType: { type: String },
  expiryDate: { type: Date },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

export default mongoose.model('Document', documentSchema);
