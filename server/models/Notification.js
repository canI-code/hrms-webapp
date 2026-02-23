import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: [
      'leave_applied',
      'leave_approved',
      'leave_rejected',
      'leave_cancelled',
      'leave_balance_adjusted',
      'attendance_checkin',
      'attendance_checkout',
      'attendance_marked',
      'payroll_processed',
      'payroll_config_updated',
      'announcement',
      'announcement_updated',
      'employee_added',
      'employee_updated',
      'employee_deleted',
      'password_changed',
      'department_created',
      'department_updated',
      'department_deleted',
      'document_uploaded',
      'document_deleted',
      'holiday_created',
      'holiday_updated',
      'holiday_deleted',
      'message_received',
      'performance_review',
      'performance_acknowledged',
      'performance_closed',
      'recruitment_update',
      'account_created',
      'account_toggled',
      'settings_updated',
      'general'
    ],
    default: 'general'
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  link: { type: String, default: '' },
  isRead: { type: Boolean, default: false },
  data: { type: mongoose.Schema.Types.Mixed }
}, { timestamps: true });

// Auto-delete notifications older than 30 days
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export default mongoose.model('Notification', notificationSchema);
