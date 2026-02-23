import PayrollConfig from '../models/PayrollConfig.js';
import { createAuditLog } from '../utils/auditHelper.js';
import { notifyByRole } from '../utils/notificationHelper.js';

// @desc    Get payroll config
// @route   GET /api/payroll/config
export const getPayrollConfig = async (req, res) => {
  try {
    const config = await PayrollConfig.getConfig();
    res.json(config);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update payroll config
// @route   PUT /api/payroll/config
export const updatePayrollConfig = async (req, res) => {
  try {
    let config = await PayrollConfig.findOne();
    if (!config) config = new PayrollConfig();

    const fields = [
      'pfPercentage', 'esiPercentage', 'esiGrossLimit', 'professionalTax',
      'tdsEnabled', 'overtimeMultiplier', 'hraPercentage', 'allowancesPercentage'
    ];
    fields.forEach(f => { if (req.body[f] !== undefined) config[f] = req.body[f]; });

    await config.save();

    await createAuditLog({
      userId: req.user._id,
      action: 'UPDATE',
      module: 'PayrollConfig',
      description: 'Payroll configuration updated',
      targetId: config._id,
      targetModel: 'PayrollConfig',
      ipAddress: req.ip
    });

    await notifyByRole({
      roles: ['super_admin', 'hr'],
      type: 'payroll_config_updated',
      title: 'Payroll Config Updated',
      message: 'Payroll configuration settings have been updated',
      link: '/payroll'
    });

    res.json(config);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
