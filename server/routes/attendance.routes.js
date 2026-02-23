import { Router } from 'express';
import {
  checkIn, checkOut, getAttendance, markAttendance, getAttendanceReport
} from '../controllers/attendance.controller.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();

router.post('/checkin', protect, checkIn);
router.put('/checkout', protect, checkOut);
router.get('/', protect, getAttendance);
router.get('/report', protect, authorize('super_admin', 'hr', 'manager'), getAttendanceReport);
router.post('/mark', protect, authorize('hr'), markAttendance);

export default router;
