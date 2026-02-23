import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema({
  companyName: { type: String, default: 'My Company' },
  companyLogo: { type: String, default: '' },
  email: { type: String, default: '' },
  phone: { type: String, default: '' },
  address: { type: String, default: '' },
  website: { type: String, default: '' },
  workingHoursPerDay: { type: Number, default: 8 },
  workingDaysPerWeek: { type: Number, default: 5 },
  currency: { type: String, default: 'INR' },
  financialYearStart: { type: Number, default: 4, min: 1, max: 12 }, // April
  dateFormat: { type: String, default: 'DD/MM/YYYY' },
  leaveApprovalFlow: {
    type: String,
    enum: ['manager_then_hr', 'hr_only', 'manager_only'],
    default: 'manager_then_hr'
  },
}, { timestamps: true });

// Singleton — only one settings doc
settingsSchema.statics.getSettings = async function () {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

export default mongoose.model('Settings', settingsSchema);
