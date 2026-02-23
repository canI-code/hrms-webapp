import mongoose from 'mongoose';

const loginLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  action: { type: String, enum: ['LOGIN', 'LOGOUT'], required: true },
  ipAddress: { type: String, default: '' },
  userAgent: { type: String, default: '' },
  timestamp: { type: Date, default: Date.now },
});

loginLogSchema.index({ user: 1, timestamp: -1 });

export default mongoose.model('LoginLog', loginLogSchema);
