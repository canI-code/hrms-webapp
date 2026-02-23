import mongoose from 'mongoose';

const interviewSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  type: { type: String, enum: ['Phone', 'Video', 'In-Person', 'Technical', 'HR'], default: 'In-Person' },
  interviewer: { type: String },
  notes: String,
  result: { type: String, enum: ['Pending', 'Passed', 'Failed'], default: 'Pending' }
});

const candidateSchema = new mongoose.Schema({
  jobPosting: { type: mongoose.Schema.Types.ObjectId, ref: 'JobPosting', required: true },
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true },
  phone: { type: String, trim: true },
  resumeUrl: { type: String },
  resumePublicId: { type: String },
  experience: { type: Number, default: 0 },
  currentCompany: { type: String },
  skills: { type: String },
  status: {
    type: String,
    enum: ['Applied', 'Screening', 'Interview', 'Offered', 'Hired', 'Rejected', 'Withdrawn'],
    default: 'Applied'
  },
  interviews: [interviewSchema],
  notes: { type: String },
  rating: { type: Number, min: 1, max: 5 },
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

candidateSchema.index({ jobPosting: 1, status: 1 });
candidateSchema.index({ email: 1 });

export default mongoose.model('Candidate', candidateSchema);
