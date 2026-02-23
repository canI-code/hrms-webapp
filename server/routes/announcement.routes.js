import { Router } from 'express';
import {
  getAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement
} from '../controllers/announcement.controller.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();

router.get('/', protect, getAnnouncements);
router.post('/', protect, authorize('super_admin', 'hr'), createAnnouncement);
router.put('/:id', protect, authorize('super_admin', 'hr'), updateAnnouncement);
router.delete('/:id', protect, authorize('super_admin', 'hr'), deleteAnnouncement);

export default router;
