import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  getPerformanceReviews,
  getPerformanceReview,
  createPerformanceReview,
  updatePerformanceReview,
  submitReview,
  acknowledgeReview,
  closeReview,
  deletePerformanceReview
} from '../controllers/performance.controller.js';

const router = express.Router();

router.use(protect);

router.get('/', getPerformanceReviews);
router.get('/:id', getPerformanceReview);
router.post('/', authorize('super_admin', 'hr', 'manager'), createPerformanceReview);
router.put('/:id', authorize('super_admin', 'hr', 'manager'), updatePerformanceReview);
router.put('/:id/submit', authorize('super_admin', 'hr', 'manager'), submitReview);
router.put('/:id/acknowledge', acknowledgeReview);
router.put('/:id/close', authorize('super_admin', 'hr'), closeReview);
router.delete('/:id', authorize('super_admin', 'hr', 'manager'), deletePerformanceReview);

export default router;
