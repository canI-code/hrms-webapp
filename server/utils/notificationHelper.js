import Notification from '../models/Notification.js';
import User from '../models/User.js';

/**
 * Create a notification for a specific user
 */
export const createNotification = async ({ recipientId, type, title, message, link = '', data = {} }) => {
  try {
    await Notification.create({ recipient: recipientId, type, title, message, link, data });
  } catch (err) {
    console.error('Failed to create notification:', err.message);
  }
};

/**
 * Notify all users with specific roles
 */
export const notifyByRole = async ({ roles, type, title, message, link = '', data = {} }) => {
  try {
    const users = await User.find({ role: { $in: roles }, isActive: true }).select('_id');
    const notifications = users.map(u => ({
      recipient: u._id, type, title, message, link, data
    }));
    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }
  } catch (err) {
    console.error('Failed to notify by role:', err.message);
  }
};
