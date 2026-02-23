import { Router } from 'express';
import { getSettings, updateSettings } from '../controllers/settings.controller.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();

router.get('/', protect, getSettings);
router.put('/', protect, authorize('super_admin'), updateSettings);

export default router;
