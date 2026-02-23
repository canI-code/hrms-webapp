import Message from '../models/Message.js';
import User from '../models/User.js';
import { createNotification } from '../utils/notificationHelper.js';

// @desc    Get inbox messages
// @route   GET /api/messages/inbox
export const getInbox = async (req, res) => {
  try {
    const { page = 1, limit = 20, unreadOnly } = req.query;
    const filter = { recipient: req.user._id, recipientDeleted: false };
    if (unreadOnly === 'true') filter.read = false;

    const total = await Message.countDocuments(filter);
    const messages = await Message.find(filter)
      .populate('sender', 'name email role')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({ messages, total, pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get sent messages
// @route   GET /api/messages/sent
export const getSent = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const filter = { sender: req.user._id, senderDeleted: false };

    const total = await Message.countDocuments(filter);
    const messages = await Message.find(filter)
      .populate('recipient', 'name email role')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({ messages, total, pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single message
// @route   GET /api/messages/:id
export const getMessage = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id)
      .populate('sender', 'name email role')
      .populate('recipient', 'name email role')
      .populate('parentMessage');

    if (!message) return res.status(404).json({ message: 'Message not found' });

    // Only sender or recipient can view
    const userId = req.user._id.toString();
    if (message.sender._id.toString() !== userId && message.recipient._id.toString() !== userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Mark as read if recipient is viewing
    if (message.recipient._id.toString() === userId && !message.read) {
      message.read = true;
      message.readAt = new Date();
      await message.save();
    }

    res.json(message);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Send a message
// @route   POST /api/messages
export const sendMessage = async (req, res) => {
  try {
    const { recipientId, subject, body, parentMessage } = req.body;

    if (!recipientId || !subject || !body) {
      return res.status(400).json({ message: 'Recipient, subject and body are required' });
    }

    const recipient = await User.findById(recipientId);
    if (!recipient) return res.status(404).json({ message: 'Recipient not found' });

    if (recipientId === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot send message to yourself' });
    }

    const message = await Message.create({
      sender: req.user._id,
      recipient: recipientId,
      subject,
      body,
      parentMessage: parentMessage || undefined
    });

    await message.populate('sender', 'name email role');
    await message.populate('recipient', 'name email role');

    // Notify the recipient about the new message
    await createNotification({
      recipientId: recipientId,
      type: 'message_received',
      title: 'New Message',
      message: `${req.user.name} sent you a message: "${subject}"`,
      link: '/messages'
    });

    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Mark message as read
// @route   PUT /api/messages/:id/read
export const markAsRead = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ message: 'Message not found' });

    if (message.recipient.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    message.read = true;
    message.readAt = new Date();
    await message.save();

    res.json({ message: 'Marked as read' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Mark all messages as read
// @route   PUT /api/messages/read-all
export const markAllAsRead = async (req, res) => {
  try {
    await Message.updateMany(
      { recipient: req.user._id, read: false },
      { $set: { read: true, readAt: new Date() } }
    );
    res.json({ message: 'All messages marked as read' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete message (soft delete for current user)
// @route   DELETE /api/messages/:id
export const deleteMessage = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ message: 'Message not found' });

    const userId = req.user._id.toString();
    if (message.sender.toString() === userId) {
      message.senderDeleted = true;
    } else if (message.recipient.toString() === userId) {
      message.recipientDeleted = true;
    } else {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Hard delete if both parties deleted
    if (message.senderDeleted && message.recipientDeleted) {
      await message.deleteOne();
    } else {
      await message.save();
    }

    res.json({ message: 'Message deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get unread message count
// @route   GET /api/messages/unread-count
export const getUnreadCount = async (req, res) => {
  try {
    const count = await Message.countDocuments({ recipient: req.user._id, read: false, recipientDeleted: false });
    res.json({ count });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get users list for composing messages
// @route   GET /api/messages/users
export const getMessageUsers = async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.user._id }, isActive: { $ne: false } })
      .select('name email role')
      .sort({ name: 1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
