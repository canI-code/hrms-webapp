import Announcement from '../models/Announcement.js';
import { createAuditLog } from '../utils/auditHelper.js';
import { notifyByRole } from '../utils/notificationHelper.js';

// @desc    Get announcements
export const getAnnouncements = async (req, res) => {
  try {
    const filter = { isActive: true };

    // Filter by role
    if (req.user.role !== 'super_admin') {
      filter.$or = [
        { targetRoles: { $size: 0 } },
        { targetRoles: req.user.role }
      ];
    }

    const announcements = await Announcement.find(filter)
      .populate('postedBy', 'name')
      .populate('department', 'name')
      .sort('-createdAt');

    res.json(announcements);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create announcement
export const createAnnouncement = async (req, res) => {
  try {
    const announcement = await Announcement.create({
      ...req.body,
      postedBy: req.user._id
    });

    await createAuditLog({
      userId: req.user._id,
      action: 'CREATE',
      module: 'Announcement',
      description: `Announcement "${announcement.title}" created`,
      targetId: announcement._id,
      targetModel: 'Announcement',
      ipAddress: req.ip
    });

    const populated = await Announcement.findById(announcement._id)
      .populate('postedBy', 'name');

    // Notify targeted roles (or all if empty)
    const targetRoles = announcement.targetRoles?.length > 0
      ? announcement.targetRoles
      : ['super_admin', 'hr', 'manager', 'employee'];
    await notifyByRole({
      roles: targetRoles,
      type: 'announcement',
      title: 'New Announcement',
      message: announcement.title,
      link: '/announcements'
    });

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update announcement
export const updateAnnouncement = async (req, res) => {
  try {
    const announcement = await Announcement.findByIdAndUpdate(
      req.params.id, req.body, { new: true }
    ).populate('postedBy', 'name');

    if (!announcement) return res.status(404).json({ message: 'Announcement not found' });

    // Notify targeted roles about the update
    const targetRoles = announcement.targetRoles?.length > 0
      ? announcement.targetRoles
      : ['super_admin', 'hr', 'manager', 'employee'];
    await notifyByRole({
      roles: targetRoles,
      type: 'announcement_updated',
      title: 'Announcement Updated',
      message: `Announcement "${announcement.title}" has been updated`,
      link: '/announcements'
    });

    res.json(announcement);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete announcement
export const deleteAnnouncement = async (req, res) => {
  try {
    const announcement = await Announcement.findByIdAndDelete(req.params.id);
    if (!announcement) return res.status(404).json({ message: 'Announcement not found' });
    res.json({ message: 'Announcement deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
