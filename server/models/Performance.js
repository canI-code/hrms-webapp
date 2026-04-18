import mongoose from 'mongoose';

const kpiSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  target: { type: String },
  achieved: { type: String },
  rating: { type: Number, min: 1, max: 5 },
  weight: { type: Number, default: 1, min: 0 }
});

const performanceSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  reviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  reviewerUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  period: {
    type: String,
    enum: ['Q1', 'Q2', 'Q3', 'Q4', 'H1', 'H2', 'Annual'],
    required: true
  },
  year: { type: Number, required: true },
  kpis: [kpiSchema],
  overallRating: { type: Number, min: 1, max: 5 },
  strengths: { type: String },
  improvements: { type: String },
  managerComments: { type: String },
  employeeComments: { type: String },
  recommendation: {
    type: String,
    enum: ['None', 'Promotion', 'Salary Increment', 'Training', 'PIP', 'Recognition'],
    default: 'None'
  },
  status: {
    type: String,
    enum: ['Draft', 'Submitted', 'Acknowledged', 'Closed'],
    default: 'Draft'
  }
}, { timestamps: true });

performanceSchema.index({ employee: 1, period: 1, year: 1 });
performanceSchema.index({ reviewer: 1 });

export default mongoose.model('Performance', performanceSchema);
