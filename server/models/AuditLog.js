import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, required: true },
  module: {
    type: String,
    enum: ['Auth', 'Employee', 'Leave', 'Payroll', 'Attendance', 'Department', 'Announcement', 'Document', 'Holiday', 'Settings'],
    required: true
  },
  description: { type: String, required: true },
  targetId: { type: mongoose.Schema.Types.ObjectId },
  targetModel: { type: String },
  changes: { type: mongoose.Schema.Types.Mixed },
  ipAddress: { type: String },
}, { timestamps: true });

auditLogSchema.index({ createdAt: -1 });

export default mongoose.model('AuditLog', auditLogSchema);
