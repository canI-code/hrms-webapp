import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  date: { type: Date, required: true },
  // Morning session (9:00 AM - 12:00 PM)
  morningCheckIn: { type: Date },
  morningCheckOut: { type: Date },
  morningLateMinutes: { type: Number, default: 0 },
  // Afternoon session (12:00 PM - 5:00 PM)
  afternoonCheckIn: { type: Date },
  afternoonCheckOut: { type: Date },
  afternoonLateMinutes: { type: Number, default: 0 },
  // Legacy / combined fields
  checkIn: { type: Date },
  checkOut: { type: Date },
  status: {
    type: String,
    enum: ['Present', 'Absent', 'Half Day', 'Late', 'On Leave', 'Holiday'],
    default: 'Present'
  },
  totalLateMinutes: { type: Number, default: 0 },
  workingHours: { type: Number, default: 0 },
  overtime: { type: Number, default: 0 },
  notes: { type: String },
  markedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

// Calculate working hours, overtime, and late status before save
attendanceSchema.pre('save', function (next) {
  let totalMs = 0;

  // Calculate morning session hours
  if (this.morningCheckIn && this.morningCheckOut) {
    totalMs += this.morningCheckOut - this.morningCheckIn;
  }
  // Calculate afternoon session hours
  if (this.afternoonCheckIn && this.afternoonCheckOut) {
    totalMs += this.afternoonCheckOut - this.afternoonCheckIn;
  }
  // Fallback: legacy single check-in/out
  if (!this.morningCheckIn && this.checkIn && this.checkOut) {
    totalMs = this.checkOut - this.checkIn;
  }

  if (totalMs > 0) {
    const hours = totalMs / (1000 * 60 * 60);
    this.workingHours = Math.round(hours * 100) / 100;
    this.overtime = hours > 8 ? Math.round((hours - 8) * 100) / 100 : 0;
  }

  // Total late minutes
  this.totalLateMinutes = (this.morningLateMinutes || 0) + (this.afternoonLateMinutes || 0);

  // Set status based on late minutes
  if (this.totalLateMinutes > 0 && this.status === 'Present') {
    this.status = 'Late';
  }

  // Set combined checkIn/checkOut for backward compatibility
  if (this.morningCheckIn && !this.checkIn) {
    this.checkIn = this.morningCheckIn;
  }
  if (this.afternoonCheckOut) {
    this.checkOut = this.afternoonCheckOut;
  } else if (this.morningCheckOut && !this.afternoonCheckIn) {
    this.checkOut = this.morningCheckOut;
  }

  next();
});

export default mongoose.model('Attendance', attendanceSchema);
