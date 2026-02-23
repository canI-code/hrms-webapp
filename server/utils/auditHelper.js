import AuditLog from '../models/AuditLog.js';

export const createAuditLog = async ({
  userId, action, module, description, targetId, targetModel, changes, ipAddress
}) => {
  try {
    await AuditLog.create({
      user: userId,
      action,
      module,
      description,
      targetId,
      targetModel,
      changes,
      ipAddress
    });
  } catch (error) {
    console.error('Audit log error:', error.message);
  }
};
