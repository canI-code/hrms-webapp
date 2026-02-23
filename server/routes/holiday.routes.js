import { Router } from 'express';
import { getHolidays, createHoliday, updateHoliday, deleteHoliday } from '../controllers/holiday.controller.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();

router.get('/', protect, getHolidays);
router.post('/', protect, authorize('super_admin', 'hr'), createHoliday);
router.put('/:id', protect, authorize('super_admin', 'hr'), updateHoliday);
router.delete('/:id', protect, authorize('super_admin', 'hr'), deleteHoliday);

export default router;
