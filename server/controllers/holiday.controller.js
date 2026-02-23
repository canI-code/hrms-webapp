import Holiday from '../models/Holiday.js';
import { createAuditLog } from '../utils/auditHelper.js';
import { notifyByRole } from '../utils/notificationHelper.js';

// @desc    Get holidays
export const getHolidays = async (req, res) => {
  try {
    const { year } = req.query;
    const filter = { isActive: true };
    if (year) {
      filter.date = {
        $gte: new Date(`${year}-01-01`),
        $lte: new Date(`${year}-12-31`)
      };
    }
    const holidays = await Holiday.find(filter).sort('date');
    res.json(holidays);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create holiday
export const createHoliday = async (req, res) => {
  try {
    const holiday = await Holiday.create(req.body);

    await createAuditLog({
      userId: req.user._id,
      action: 'CREATE',
      module: 'Holiday',
      description: `Holiday "${holiday.name}" created`,
      targetId: holiday._id,
      targetModel: 'Holiday',
      ipAddress: req.ip
    });

    await notifyByRole({
      roles: ['super_admin', 'hr', 'manager', 'employee'],
      type: 'holiday_created',
      title: 'New Holiday Added',
      message: `"${holiday.name}" on ${new Date(holiday.date).toLocaleDateString()} has been added to the calendar`,
      link: '/holidays'
    });

    res.status(201).json(holiday);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update holiday
export const updateHoliday = async (req, res) => {
  try {
    const holiday = await Holiday.findByIdAndUpdate(
      req.params.id, req.body, { new: true }
    );
    if (!holiday) return res.status(404).json({ message: 'Holiday not found' });

    await notifyByRole({
      roles: ['super_admin', 'hr', 'manager', 'employee'],
      type: 'holiday_updated',
      title: 'Holiday Updated',
      message: `Holiday "${holiday.name}" has been updated`,
      link: '/holidays'
    });

    res.json(holiday);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete holiday
export const deleteHoliday = async (req, res) => {
  try {
    const holiday = await Holiday.findByIdAndDelete(req.params.id);
    if (!holiday) return res.status(404).json({ message: 'Holiday not found' });

    await notifyByRole({
      roles: ['super_admin', 'hr', 'manager', 'employee'],
      type: 'holiday_deleted',
      title: 'Holiday Removed',
      message: `Holiday "${holiday.name}" has been removed from the calendar`,
      link: '/holidays'
    });

    res.json({ message: 'Holiday deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
