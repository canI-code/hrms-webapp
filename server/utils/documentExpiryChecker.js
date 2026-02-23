import Document from '../models/Document.js';
import Employee from '../models/Employee.js';
import { createNotification, notifyByRole } from './notificationHelper.js';

/**
 * Check for documents expiring within the next 30 days.
 * Creates notifications for the document owner and HR.
 * Should be called periodically (e.g., daily via startup or cron).
 */
export const checkDocumentExpiry = async () => {
  try {
    const now = new Date();
    const thirtyDaysLater = new Date();
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);

    // Find documents expiring in the next 30 days that are still in the future
    const expiringDocs = await Document.find({
      expiryDate: { $gte: now, $lte: thirtyDaysLater }
    }).populate('employee', 'firstName lastName user employeeId');

    let notified = 0;
    for (const doc of expiringDocs) {
      if (!doc.employee) continue;

      const daysLeft = Math.ceil((doc.expiryDate - now) / (1000 * 60 * 60 * 24));
      const empName = `${doc.employee.firstName} ${doc.employee.lastName}`;

      // Notify the employee
      if (doc.employee.user) {
        await createNotification({
          recipientId: doc.employee.user,
          type: 'document_expiry',
          title: 'Document Expiring Soon',
          message: `Your document "${doc.name}" (${doc.type}) expires in ${daysLeft} day(s).`,
          link: `/employees/${doc.employee._id}`
        });
      }

      // Notify HR
      await notifyByRole({
        roles: ['hr'],
        type: 'document_expiry',
        title: 'Document Expiring',
        message: `${empName}'s "${doc.name}" (${doc.type}) expires in ${daysLeft} day(s).`,
        link: `/employees/${doc.employee._id}`
      });

      notified++;
    }

    console.log(`Document expiry check: ${notified} notifications sent`);
    return notified;
  } catch (error) {
    console.error('Document expiry check failed:', error.message);
  }
};
