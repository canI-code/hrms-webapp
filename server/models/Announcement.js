import mongoose from 'mongoose';

const announcementSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  content: { type: String, required: true },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Urgent'],
    default: 'Medium'
  },
  targetRoles: [{
    type: String,
    enum: ['super_admin', 'hr', 'manager', 'employee']
  }],
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isActive: { type: Boolean, default: true },
  expiresAt: { type: Date },
}, { timestamps: true });

export default mongoose.model('Announcement', announcementSchema);
