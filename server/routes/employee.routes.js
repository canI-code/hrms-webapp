import { Router } from 'express';
import {
  getEmployees, getEmployee, createEmployee, updateEmployee, deleteEmployee, uploadAvatar
} from '../controllers/employee.controller.js';
import { protect, authorize } from '../middleware/auth.js';
import { uploadProfile } from '../middleware/upload.js';

const router = Router();

router.get('/', protect, getEmployees);
router.get('/:id', protect, getEmployee);
router.post('/', protect, authorize('super_admin', 'hr'), createEmployee);
router.put('/:id', protect, updateEmployee);
router.delete('/:id', protect, authorize('super_admin', 'hr'), deleteEmployee);
router.post('/:id/avatar', protect, uploadProfile.single('avatar'), uploadAvatar);

export default router;
