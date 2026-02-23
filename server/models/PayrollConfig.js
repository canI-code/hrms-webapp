import mongoose from 'mongoose';

const payrollConfigSchema = new mongoose.Schema({
  pfPercentage: { type: Number, default: 12 }, // % of basic
  esiPercentage: { type: Number, default: 1.75 }, // % of gross if gross <= 21000
  esiGrossLimit: { type: Number, default: 21000 }, // ESI applicable if gross <= this
  professionalTax: { type: Number, default: 200 }, // flat per month
  tdsEnabled: { type: Boolean, default: true }, // auto-calculate income tax
  overtimeMultiplier: { type: Number, default: 1.5 }, // 1.5x hourly rate
  hraPercentage: { type: Number, default: 40 }, // default HRA % of basic for new employees
  allowancesPercentage: { type: Number, default: 10 }, // default allowances % of basic
}, { timestamps: true });

// Singleton
payrollConfigSchema.statics.getConfig = async function () {
  let config = await this.findOne();
  if (!config) config = await this.create({});
  return config;
};

export default mongoose.model('PayrollConfig', payrollConfigSchema);
