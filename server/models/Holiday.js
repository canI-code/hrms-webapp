import mongoose from 'mongoose';

const holidaySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  date: { type: Date, required: true },
  type: {
    type: String,
    enum: ['National', 'Regional', 'Company', 'Optional'],
    default: 'Company'
  },
  description: { type: String },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model('Holiday', holidaySchema);
