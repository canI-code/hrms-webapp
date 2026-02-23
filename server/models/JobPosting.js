import mongoose from 'mongoose';

const jobPostingSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  description: { type: String, required: true },
  requirements: { type: String },
  location: { type: String, default: 'On-site' },
  employmentType: {
    type: String,
    enum: ['Full-time', 'Part-time', 'Contract', 'Intern'],
    default: 'Full-time'
  },
  salaryRange: {
    min: Number,
    max: Number
  },
  openings: { type: Number, default: 1 },
  status: {
    type: String,
    enum: ['Open', 'On Hold', 'Closed', 'Filled'],
    default: 'Open'
  },
  postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  closingDate: { type: Date }
}, { timestamps: true });

export default mongoose.model('JobPosting', jobPostingSchema);
