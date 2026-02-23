import User from '../models/User.js';
import Employee from '../models/Employee.js';
import LoginLog from '../models/LoginLog.js';
import { generateToken } from '../middleware/auth.js';
import { createAuditLog } from '../utils/auditHelper.js';
import { createNotification, notifyByRole } from '../utils/notificationHelper.js';

// @desc    Check if any super admin exists
// @route   GET /api/auth/check-setup
export const checkSuperAdmin = async (req, res) => {
  try {
    const count = await User.countDocuments({ role: 'super_admin' });
    res.json({ setupRequired: count === 0 });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Initial super admin signup (only works when no super admin exists)
// @route   POST /api/auth/initial-setup
export const initialSetup = async (req, res) => {
  try {
    const existingAdmin = await User.countDocuments({ role: 'super_admin' });
    if (existingAdmin > 0) {
      return res.status(403).json({ message: 'Setup already completed. Super Admin exists.' });
    }

    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please provide name, email and password' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    const user = await User.create({ name, email, password, role: 'super_admin' });
    const token = generateToken(user._id);

    // Record login log for initial setup
    await LoginLog.create({
      user: user._id,
      action: 'LOGIN',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || '',
    });

    await createAuditLog({
      userId: user._id,
      action: 'CREATE',
      module: 'Auth',
      description: `Initial Super Admin account created: ${user.name}`,
      ipAddress: req.ip
    });

    res.status(201).json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profileCompleted: user.profileCompleted,
        systemId: user.systemId,
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(401).json({ message: 'Your account has been deactivated. Please contact the Super Admin for reactivation.' });
    }

    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    const token = generateToken(user._id);

    // Record login log
    await LoginLog.create({
      user: user._id,
      action: 'LOGIN',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || '',
    });

    await createAuditLog({
      userId: user._id,
      action: 'LOGIN',
      module: 'Auth',
      description: `User ${user.name} logged in`,
      ipAddress: req.ip
    });

    res.json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        employee: user.employee,
        profileCompleted: user.profileCompleted,
        systemId: user.systemId,
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('employee');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Register user (Super Admin only can create HR, Manager accounts)
// @route   POST /api/auth/register
export const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Only super_admin can create hr/manager, hr can create employee accounts
    if (req.user) {
      if (req.user.role === 'super_admin' && !['hr', 'manager'].includes(role)) {
        return res.status(403).json({ message: 'Super Admin can only create HR or Manager accounts' });
      }
      if (req.user.role === 'hr' && role !== 'employee') {
        return res.status(403).json({ message: 'HR can only create employee accounts' });
      }
      if (req.user.role === 'manager') {
        return res.status(403).json({ message: 'Managers cannot create user accounts' });
      }
    }

    const user = await User.create({ name, email, password, role: role || 'employee' });
    const token = generateToken(user._id);

    await createAuditLog({
      userId: req.user ? req.user._id : user._id,
      action: 'CREATE',
      module: 'Auth',
      description: `New user account created: ${user.name} (${user.role})`,
      targetId: user._id,
      targetModel: 'User',
      ipAddress: req.ip
    });

    // Notify the new user
    await createNotification({
      recipientId: user._id,
      type: 'account_created',
      title: 'Welcome!',
      message: `Your ${user.role} account has been created. Please complete your profile.`,
      link: '/profile'
    });

    // Notify admins about the new account
    await notifyByRole({
      roles: ['super_admin', 'hr'],
      type: 'account_created',
      title: 'New Account Created',
      message: `New ${user.role} account created: ${user.name} (${user.email})`,
      link: '/employees'
    });

    res.status(201).json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update password
// @route   PUT /api/auth/password
export const updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select('+password');

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    const token = generateToken(user._id);
    res.json({ token, message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all users (Super Admin)
// @route   GET /api/auth/users
export const getUsers = async (req, res) => {
  try {
    const { role, isActive } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const users = await User.find(filter).select('-password').sort('-createdAt');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Logout user (record logout log)
// @route   POST /api/auth/logout
export const logout = async (req, res) => {
  try {
    await LoginLog.create({
      user: req.user._id,
      action: 'LOGOUT',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || '',
    });

    await createAuditLog({
      userId: req.user._id,
      action: 'LOGOUT',
      module: 'Auth',
      description: `User ${req.user.name} logged out`,
      ipAddress: req.ip,
    });

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Toggle user active status
// @route   PUT /api/auth/users/:id/toggle
export const toggleUserStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.isActive = !user.isActive;
    await user.save({ validateBeforeSave: false });

    // Sync Employee status with user active state
    const empRecord = await Employee.findOne({ user: user._id });
    if (empRecord) {
      const newStatus = user.isActive ? 'Active' : 'Deactivated';
      await Employee.findByIdAndUpdate(empRecord._id, { status: newStatus });
    }

    await createAuditLog({
      userId: req.user._id,
      action: user.isActive ? 'ACTIVATE' : 'DEACTIVATE',
      module: 'Auth',
      description: `User ${user.name} ${user.isActive ? 'activated' : 'deactivated'}`,
      targetId: user._id,
      targetModel: 'User',
      ipAddress: req.ip
    });

    // Notify the affected user
    await createNotification({
      recipientId: user._id,
      type: 'account_toggled',
      title: `Account ${user.isActive ? 'Activated' : 'Deactivated'}`,
      message: user.isActive
        ? 'Your account has been activated. You can now log in.'
        : 'Your account has been deactivated. Contact admin for more info.',
      link: '/'
    });

    res.json({ message: `User ${user.isActive ? 'activated' : 'deactivated'}`, user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
