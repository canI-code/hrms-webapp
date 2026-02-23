import { Router } from 'express';
import { login, getMe, register, updatePassword, getUsers, toggleUserStatus, checkSuperAdmin, initialSetup, logout } from '../controllers/auth.controller.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();

router.get('/check-setup', checkSuperAdmin);
router.post('/initial-setup', initialSetup);
router.post('/login', login);
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);
router.post('/register', protect, authorize('super_admin', 'hr'), register);
router.put('/password', protect, updatePassword);
router.get('/users', protect, authorize('super_admin'), getUsers);
router.put('/users/:id/toggle', protect, authorize('super_admin'), toggleUserStatus);

export default router;
