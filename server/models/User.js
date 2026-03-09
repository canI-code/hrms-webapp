import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// Generate a unique system ID like "SA-XXXXXX" or "USR-XXXXXX"
const generateSystemId = (role) => {
  const prefix = role === 'super_admin' ? 'SA' : role === 'hr' ? 'HR' : role === 'manager' ? 'MGR' : 'USR';
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${random}`;
};

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 6, select: false },
  role: {
    type: String,
    enum: ['super_admin', 'hr', 'manager', 'employee'],
    default: 'employee'
  },
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  avatar: { type: String, default: '' },
  avatarPublicId: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
  lastLogin: { type: Date },

  // Profile completion fields
  systemId: { type: String, unique: true },
  profileCompleted: { type: Boolean, default: false },
  phone: { type: String, trim: true, default: '' },
  alternateEmail: { type: String, lowercase: true, trim: true, default: '' },
  dateOfBirth: { type: Date },
  gender: { type: String, enum: ['male', 'female', 'other', ''], default: '' },
  address: {
    street: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    zipCode: { type: String, default: '' },
    country: { type: String, default: '' },
  },
  emergencyContact: {
    name: { type: String, default: '' },
    relationship: { type: String, default: '' },
    phone: { type: String, default: '' },
  },
  bio: { type: String, default: '', maxlength: 500 },

  // OTP for password reset
  resetOtp: { type: String },
  resetOtpExpires: { type: Date },
}, { timestamps: true });

// Auto-generate systemId before save
userSchema.pre('save', async function (next) {
  if (!this.systemId) {
    this.systemId = generateSystemId(this.role);
  }
  next();
});

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

export default mongoose.model('User', userSchema);
