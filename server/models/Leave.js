import mongoose from 'mongoose';

const leaveSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  leaveType: { type: mongoose.Schema.Types.ObjectId, ref: 'LeaveType', required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  totalDays: { type: Number, required: true },
  reason: { type: String, required: true },
  status: {
    type: String,
    enum: ['Pending', 'Approved_By_Manager', 'Approved', 'Rejected', 'Cancelled'],
    default: 'Pending'
  },
  managerApproval: {
    status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    date: Date,
    comment: String
  },
  hrApproval: {
    status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    date: Date,
    comment: String
  },
  appliedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

export default mongoose.model('Leave', leaveSchema);
