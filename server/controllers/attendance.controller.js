import Attendance from '../models/Attendance.js';
import Employee from '../models/Employee.js';
import Leave from '../models/Leave.js';
import { createAuditLog } from '../utils/auditHelper.js';
import { createNotification } from '../utils/notificationHelper.js';

// Time slot boundaries (in hours, 24h format)
const MORNING_START = 9;   // 9:00 AM
const MORNING_END = 12;    // 12:00 PM
const AFTERNOON_START = 12; // 12:00 PM (lunch break handled by gap)
const AFTERNOON_END = 17;   // 5:00 PM

function getSessionAndLate(now) {
  const h = now.getHours();
  const m = now.getMinutes();
  const totalMin = h * 60 + m;

  // Morning session: 9:00 AM - 12:00 PM
  if (totalMin < AFTERNOON_START * 60) {
    const lateMin = totalMin > MORNING_START * 60 ? totalMin - MORNING_START * 60 : 0;
    return { session: 'morning', lateMinutes: lateMin };
  }
  // Afternoon session: 12:00 PM - 5:00 PM
  if (totalMin < AFTERNOON_END * 60) {
    // Late if checking in after 1:00 PM (grace: 1 hour lunch)
    const lateMin = totalMin > 13 * 60 ? totalMin - 13 * 60 : 0;
    return { session: 'afternoon', lateMinutes: lateMin };
  }
  // After 5 PM — still allow but mark as late for afternoon
  const lateMin = totalMin - 13 * 60;
  return { session: 'afternoon', lateMinutes: lateMin };
}

// @desc    Check in (session-based)
// @route   POST /api/attendance/checkin
export const checkIn = async (req, res) => {
  try {
    const employee = await Employee.findOne({ user: req.user._id });
    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    // Block check-in if employee is on approved leave today
    const onLeave = await Leave.findOne({
      employee: employee._id,
      status: 'Approved',
      startDate: { $lte: now },
      endDate: { $gte: today }
    });
    if (onLeave) {
      return res.status(400).json({ message: 'You are on approved leave today. End your leave early if you wish to check in.' });
    }

    const { session, lateMinutes } = getSessionAndLate(now);

    let attendance = await Attendance.findOne({ employee: employee._id, date: today });

    if (!attendance) {
      // First check-in of the day
      attendance = new Attendance({
        employee: employee._id,
        date: today,
        status: 'Present',
        markedBy: req.user._id
      });
    }

    if (session === 'morning') {
      if (attendance.morningCheckIn) {
        return res.status(400).json({ message: 'Already checked in for morning session' });
      }
      attendance.morningCheckIn = now;
      attendance.morningLateMinutes = lateMinutes;
    } else {
      if (attendance.afternoonCheckIn) {
        return res.status(400).json({ message: 'Already checked in for afternoon session' });
      }
      attendance.afternoonCheckIn = now;
      attendance.afternoonLateMinutes = lateMinutes;
    }

    await attendance.save();

    const response = attendance.toObject();
    response.currentSession = session;
    response.sessionLateMinutes = lateMinutes;

    res.status(201).json(response);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Check out (session-based)
// @route   PUT /api/attendance/checkout
export const checkOut = async (req, res) => {
  try {
    const employee = await Employee.findOne({ user: req.user._id });
    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    const attendance = await Attendance.findOne({ employee: employee._id, date: today });
    if (!attendance) {
      return res.status(400).json({ message: 'No check-in found for today' });
    }

    const h = now.getHours();

    // Determine which session to check out from
    if (h < AFTERNOON_START) {
      // Morning checkout
      if (!attendance.morningCheckIn) {
        return res.status(400).json({ message: 'No morning check-in found' });
      }
      if (attendance.morningCheckOut) {
        return res.status(400).json({ message: 'Already checked out from morning session' });
      }
      attendance.morningCheckOut = now;
    } else {
      // Afternoon checkout
      if (attendance.afternoonCheckIn) {
        if (attendance.afternoonCheckOut) {
          return res.status(400).json({ message: 'Already checked out from afternoon session' });
        }
        attendance.afternoonCheckOut = now;
      } else if (attendance.morningCheckIn && !attendance.morningCheckOut) {
        // Still in morning session, checkout from morning
        attendance.morningCheckOut = now;
      } else {
        return res.status(400).json({ message: 'No active session to check out from' });
      }
    }

    await attendance.save();
    res.json(attendance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get attendance records
// @route   GET /api/attendance
export const getAttendance = async (req, res) => {
  try {
    const { employeeId, startDate, endDate, status, page = 1, limit = 31 } = req.query;
    const filter = {};

    if (req.user.role === 'employee') {
      const emp = await Employee.findOne({ user: req.user._id });
      if (emp) filter.employee = emp._id;
    } else if (req.user.role === 'manager') {
      const managerEmp = await Employee.findOne({ user: req.user._id });
      if (managerEmp) {
        const teamMembers = await Employee.find({ manager: managerEmp._id }).select('_id');
        const teamIds = teamMembers.map(m => m._id);
        teamIds.push(managerEmp._id);
        filter.employee = { $in: teamIds };
      }
    } else if (employeeId) {
      filter.employee = employeeId;
    }

    if (startDate && endDate) {
      filter.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    } else {
      // Default: current month
      const now = new Date();
      filter.date = {
        $gte: new Date(now.getFullYear(), now.getMonth(), 1),
        $lte: new Date(now.getFullYear(), now.getMonth() + 1, 0)
      };
    }

    if (status) filter.status = status;

    const total = await Attendance.countDocuments(filter);
    const attendance = await Attendance.find(filter)
      .populate('employee', 'firstName lastName employeeId user')
      .sort('-date')
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({ attendance, total, page: parseInt(page) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Mark attendance manually (HR/Admin)
// @route   POST /api/attendance/mark
export const markAttendance = async (req, res) => {
  try {
    const { employeeId, date, status, morningCheckIn, morningCheckOut, afternoonCheckIn, afternoonCheckOut, notes } = req.body;

    const dateObj = new Date(date);
    dateObj.setHours(0, 0, 0, 0);

    const data = {
      status,
      notes,
      markedBy: req.user._id,
      morningCheckIn: morningCheckIn ? new Date(morningCheckIn) : undefined,
      morningCheckOut: morningCheckOut ? new Date(morningCheckOut) : undefined,
      afternoonCheckIn: afternoonCheckIn ? new Date(afternoonCheckIn) : undefined,
      afternoonCheckOut: afternoonCheckOut ? new Date(afternoonCheckOut) : undefined,
    };

    const existing = await Attendance.findOne({ employee: employeeId, date: dateObj });
    if (existing) {
      Object.assign(existing, data);
      await existing.save();
      return res.json(existing);
    }

    const attendance = await Attendance.create({
      employee: employeeId,
      date: dateObj,
      ...data
    });

    await createAuditLog({
      userId: req.user._id,
      action: 'CREATE',
      module: 'Attendance',
      description: `Attendance marked manually for ${date}`,
      targetId: attendance._id,
      targetModel: 'Attendance',
      ipAddress: req.ip
    });

    // Notify the employee about manual attendance marking
    const emp = await Employee.findById(employeeId);
    if (emp?.user) {
      await createNotification({
        recipientId: emp.user,
        type: 'attendance_marked',
        title: 'Attendance Marked',
        message: `Your attendance for ${new Date(date).toLocaleDateString()} has been marked as ${status} by admin`,
        link: '/attendance'
      });
    }

    res.status(201).json(attendance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get monthly attendance report
// @route   GET /api/attendance/report
export const getAttendanceReport = async (req, res) => {
  try {
    const { month, year } = req.query;
    const m = parseInt(month) || new Date().getMonth() + 1;
    const y = parseInt(year) || new Date().getFullYear();

    const startDate = new Date(y, m - 1, 1);
    const endDate = new Date(y, m, 0);

    const report = await Attendance.aggregate([
      { $match: { date: { $gte: startDate, $lte: endDate } } },
      {
        $group: {
          _id: '$employee',
          present: { $sum: { $cond: [{ $eq: ['$status', 'Present'] }, 1, 0] } },
          absent: { $sum: { $cond: [{ $eq: ['$status', 'Absent'] }, 1, 0] } },
          late: { $sum: { $cond: [{ $eq: ['$status', 'Late'] }, 1, 0] } },
          halfDay: { $sum: { $cond: [{ $eq: ['$status', 'Half Day'] }, 1, 0] } },
          onLeave: { $sum: { $cond: [{ $eq: ['$status', 'On Leave'] }, 1, 0] } },
          totalHours: { $sum: '$workingHours' },
          totalOvertime: { $sum: '$overtime' },
          totalLateMinutes: { $sum: '$totalLateMinutes' }
        }
      },
      {
        $lookup: {
          from: 'employees',
          localField: '_id',
          foreignField: '_id',
          as: 'employee'
        }
      },
      { $unwind: '$employee' },
      {
        $project: {
          employeeId: '$employee.employeeId',
          firstName: '$employee.firstName',
          lastName: '$employee.lastName',
          present: 1, absent: 1, late: 1, halfDay: 1, onLeave: 1,
          totalHours: 1, totalOvertime: 1, totalLateMinutes: 1
        }
      }
    ]);

    res.json(report);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
