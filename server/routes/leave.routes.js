import { Router } from 'express';
import {
  applyLeave, getLeaves, managerAction, hrAction, cancelLeave, endLeaveEarly,
  getLeaveTypes, createLeaveType, updateLeaveType, deleteLeaveType,
  getLeaveBalance, adjustLeaveBalance
} from '../controllers/leave.controller.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();

router.get('/types', protect, getLeaveTypes);
router.post('/types', protect, authorize('super_admin', 'hr'), createLeaveType);
router.get('/balance', protect, getLeaveBalance);
router.put('/balance', protect, authorize('super_admin'), adjustLeaveBalance);
router.put('/types/:id', protect, authorize('super_admin', 'hr'), updateLeaveType);
router.delete('/types/:id', protect, authorize('super_admin', 'hr'), deleteLeaveType);
router.get('/', protect, getLeaves);
router.post('/', protect, authorize('employee', 'manager'), applyLeave);
router.put('/:id/manager-action', protect, authorize('manager'), managerAction);
router.put('/:id/hr-action', protect, authorize('hr'), hrAction);
router.put('/:id/cancel', protect, cancelLeave);
router.put('/:id/end-early', protect, endLeaveEarly);

export default router;
