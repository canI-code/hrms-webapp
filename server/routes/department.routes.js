import { Router } from 'express';
import {
  getDepartments, createDepartment, updateDepartment, deleteDepartment
} from '../controllers/department.controller.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();

router.get('/', protect, getDepartments);
router.post('/', protect, authorize('super_admin', 'hr'), createDepartment);
router.put('/:id', protect, authorize('super_admin', 'hr'), updateDepartment);
router.delete('/:id', protect, authorize('super_admin', 'hr'), deleteDepartment);

export default router;
