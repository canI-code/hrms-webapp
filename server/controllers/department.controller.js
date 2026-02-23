import Department from '../models/Department.js';
import { createAuditLog } from '../utils/auditHelper.js';
import { notifyByRole } from '../utils/notificationHelper.js';

// @desc    Get all departments
export const getDepartments = async (req, res) => {
  try {
    const departments = await Department.find()
      .populate('head', 'firstName lastName')
      .sort('name');
    res.json(departments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create department
export const createDepartment = async (req, res) => {
  try {
    const { name, description, head } = req.body;
    const exists = await Department.findOne({ name });
    if (exists) return res.status(400).json({ message: 'Department already exists' });

    const department = await Department.create({ name, description, head });

    await createAuditLog({
      userId: req.user._id,
      action: 'CREATE',
      module: 'Department',
      description: `Department "${name}" created`,
      targetId: department._id,
      targetModel: 'Department',
      ipAddress: req.ip
    });

    await notifyByRole({
      roles: ['super_admin', 'hr'],
      type: 'department_created',
      title: 'New Department',
      message: `Department "${name}" has been created`,
      link: '/departments'
    });

    res.status(201).json(department);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update department
export const updateDepartment = async (req, res) => {
  try {
    const department = await Department.findByIdAndUpdate(
      req.params.id, req.body, { new: true, runValidators: true }
    ).populate('head', 'firstName lastName');

    if (!department) return res.status(404).json({ message: 'Department not found' });

    await createAuditLog({
      userId: req.user._id,
      action: 'UPDATE',
      module: 'Department',
      description: `Department "${department.name}" updated`,
      targetId: department._id,
      targetModel: 'Department',
      ipAddress: req.ip
    });

    await notifyByRole({
      roles: ['super_admin', 'hr'],
      type: 'department_updated',
      title: 'Department Updated',
      message: `Department "${department.name}" has been updated`,
      link: '/departments'
    });

    res.json(department);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete department
export const deleteDepartment = async (req, res) => {
  try {
    const department = await Department.findByIdAndDelete(req.params.id);
    if (!department) return res.status(404).json({ message: 'Department not found' });

    await createAuditLog({
      userId: req.user._id,
      action: 'DELETE',
      module: 'Department',
      description: `Department "${department.name}" deleted`,
      targetId: department._id,
      targetModel: 'Department',
      ipAddress: req.ip
    });

    await notifyByRole({
      roles: ['super_admin', 'hr'],
      type: 'department_deleted',
      title: 'Department Deleted',
      message: `Department "${department.name}" has been deleted`,
      link: '/departments'
    });

    res.json({ message: 'Department deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
