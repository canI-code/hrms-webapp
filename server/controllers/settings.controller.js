import Settings from '../models/Settings.js';
import { createAuditLog } from '../utils/auditHelper.js';
import { notifyByRole } from '../utils/notificationHelper.js';

// @desc    Get company settings
// @route   GET /api/settings
export const getSettings = async (req, res) => {
  try {
    const settings = await Settings.getSettings();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update company settings
// @route   PUT /api/settings
export const updateSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) settings = new Settings();

    const fields = [
      'companyName', 'companyLogo', 'email', 'phone', 'address', 'website',
      'workingHoursPerDay', 'workingDaysPerWeek', 'currency', 'financialYearStart',
      'dateFormat', 'leaveApprovalFlow'
    ];
    fields.forEach(f => { if (req.body[f] !== undefined) settings[f] = req.body[f]; });

    await settings.save();

    await createAuditLog({
      userId: req.user._id,
      action: 'UPDATE',
      module: 'Settings',
      description: 'Company settings updated',
      targetId: settings._id,
      targetModel: 'Settings',
      ipAddress: req.ip
    });

    await notifyByRole({
      roles: ['super_admin', 'hr'],
      type: 'settings_updated',
      title: 'Settings Updated',
      message: 'Company settings have been updated',
      link: '/settings'
    });

    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
