import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  getInbox,
  getSent,
  getMessage,
  sendMessage,
  markAsRead,
  markAllAsRead,
  deleteMessage,
  getUnreadCount,
  getMessageUsers
} from '../controllers/message.controller.js';

const router = express.Router();

router.use(protect);

router.get('/users', getMessageUsers);
router.get('/inbox', getInbox);
router.get('/sent', getSent);
router.get('/unread-count', getUnreadCount);
router.put('/read-all', markAllAsRead);
router.get('/:id', getMessage);
router.post('/', sendMessage);
router.put('/:id/read', markAsRead);
router.delete('/:id', deleteMessage);

export default router;
