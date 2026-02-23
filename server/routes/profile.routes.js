import { Router } from 'express';
import { getProfile, completeProfile, updateProfile, getLoginLogs, uploadProfileAvatar, getMyDocuments } from '../controllers/profile.controller.js';
import { protect } from '../middleware/auth.js';
import { uploadProfile } from '../middleware/upload.js';

const router = Router();

router.get('/', protect, getProfile);
router.put('/complete', protect, completeProfile);
router.put('/', protect, updateProfile);
router.get('/login-logs', protect, getLoginLogs);
router.post('/avatar', protect, uploadProfile.single('avatar'), uploadProfileAvatar);
router.get('/documents', protect, getMyDocuments);

export default router;
