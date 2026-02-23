import { Router } from 'express';
import { getAuditLogs } from '../controllers/audit.controller.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();

router.get('/', protect, authorize('super_admin'), getAuditLogs);

export default router;
