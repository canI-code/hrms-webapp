import AuditLog from '../models/AuditLog.js';

// @desc    Get audit logs
// @route   GET /api/audit
export const getAuditLogs = async (req, res) => {
  try {
    const { module, action, userId, startDate, endDate, page = 1, limit = 50 } = req.query;
    const filter = {};

    if (module) filter.module = module;
    if (action) filter.action = action;
    if (userId) filter.user = userId;
    if (startDate && endDate) {
      filter.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    const total = await AuditLog.countDocuments(filter);
    const logs = await AuditLog.find(filter)
      .populate('user', 'name email role')
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({ logs, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
