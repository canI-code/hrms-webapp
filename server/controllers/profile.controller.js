import User from '../models/User.js';
import Employee from '../models/Employee.js';
import Document from '../models/Document.js';
import LoginLog from '../models/LoginLog.js';
import cloudinary from '../config/cloudinary.js';
import { createAuditLog } from '../utils/auditHelper.js';

// @desc    Get full profile of current user
// @route   GET /api/profile
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('employee').select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    const userObj = user.toObject();

    // Merge Employee data into profile if User fields are empty
    if (user.role !== 'super_admin') {
      const employee = await Employee.findOne({ user: user._id });
      if (employee) {
        if (!userObj.phone && employee.phone) userObj.phone = employee.phone;
        if (!userObj.gender && employee.gender) userObj.gender = employee.gender;
        if (!userObj.dateOfBirth && employee.dateOfBirth) userObj.dateOfBirth = employee.dateOfBirth;
        if ((!userObj.address || !userObj.address.street) && employee.address) userObj.address = employee.address;
        if ((!userObj.emergencyContact || !userObj.emergencyContact.name) && employee.emergencyContact) {
          userObj.emergencyContact = {
            name: employee.emergencyContact.name || '',
            relationship: employee.emergencyContact.relation || employee.emergencyContact.relationship || '',
            phone: employee.emergencyContact.phone || ''
          };
        }
      }
    }

    res.json(userObj);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Complete / update profile
// @route   PUT /api/profile/complete
export const completeProfile = async (req, res) => {
  try {
    const {
      phone, alternateEmail, dateOfBirth, gender,
      address, emergencyContact, bio
    } = req.body;

    // Validation
    if (!phone) {
      return res.status(400).json({ message: 'Phone number is required' });
    }
    if (phone && !/^\+?[\d\s\-()]{7,20}$/.test(phone)) {
      return res.status(400).json({ message: 'Invalid phone number format' });
    }
    if (alternateEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(alternateEmail)) {
      return res.status(400).json({ message: 'Invalid alternate email format' });
    }
    if (alternateEmail && alternateEmail.toLowerCase() === req.user.email) {
      return res.status(400).json({ message: 'Alternate email must be different from primary email' });
    }
    if (!gender) {
      return res.status(400).json({ message: 'Gender is required' });
    }
    if (!emergencyContact?.name || !emergencyContact?.phone) {
      return res.status(400).json({ message: 'Emergency contact name and phone are required' });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        phone,
        alternateEmail: alternateEmail || '',
        dateOfBirth: dateOfBirth || undefined,
        gender,
        address: address || {},
        emergencyContact: emergencyContact || {},
        bio: bio || '',
        profileCompleted: true,
      },
      { new: true, runValidators: true }
    ).select('-password');

    await createAuditLog({
      userId: req.user._id,
      action: 'UPDATE',
      module: 'Profile',
      description: `${user.name} completed their profile`,
      ipAddress: req.ip,
    });

    res.json({ message: 'Profile completed successfully', user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update profile (after completion)
// @route   PUT /api/profile
export const updateProfile = async (req, res) => {
  try {
    const allowedFields = [
      'phone', 'alternateEmail', 'dateOfBirth', 'gender',
      'address', 'emergencyContact', 'bio'
    ];
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (updates.phone && !/^\+?[\d\s\-()]{7,20}$/.test(updates.phone)) {
      return res.status(400).json({ message: 'Invalid phone number format' });
    }
    if (updates.alternateEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(updates.alternateEmail)) {
      return res.status(400).json({ message: 'Invalid alternate email format' });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true, runValidators: true }
    ).select('-password');

    await createAuditLog({
      userId: req.user._id,
      action: 'UPDATE',
      module: 'Profile',
      description: `${user.name} updated their profile`,
      ipAddress: req.ip,
    });

    res.json({ message: 'Profile updated successfully', user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get login/logout logs for the current user
// @route   GET /api/profile/login-logs
export const getLoginLogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      LoginLog.find({ user: req.user._id })
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      LoginLog.countDocuments({ user: req.user._id }),
    ]);

    res.json({
      logs,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Upload profile avatar for current user
// @route   POST /api/profile/avatar
export const uploadProfileAvatar = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Delete old avatar from Cloudinary
    if (user.avatarPublicId) {
      await cloudinary.uploader.destroy(user.avatarPublicId).catch(() => {});
    }

    // Update user avatar
    user.avatar = req.file.path;
    user.avatarPublicId = req.file.filename;
    await user.save();

    // Also update Employee profile image if exists
    const employee = await Employee.findOne({ user: user._id });
    if (employee) {
      if (employee.profileImagePublicId && employee.profileImagePublicId !== req.file.filename) {
        await cloudinary.uploader.destroy(employee.profileImagePublicId).catch(() => {});
      }
      employee.profileImage = req.file.path;
      employee.profileImagePublicId = req.file.filename;
      await employee.save();
    }

    await createAuditLog({
      userId: req.user._id,
      action: 'UPDATE',
      module: 'Profile',
      description: `${user.name} updated their profile picture`,
      ipAddress: req.ip,
    });

    res.json({ url: req.file.path, message: 'Profile picture updated' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get documents for the current user
// @route   GET /api/profile/documents
export const getMyDocuments = async (req, res) => {
  try {
    const employee = await Employee.findOne({ user: req.user._id });
    if (!employee) return res.json([]);

    const documents = await Document.find({ employee: employee._id })
      .populate('uploadedBy', 'name')
      .sort('-createdAt');

    res.json(documents);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
