import Performance from '../models/Performance.js';
import Employee from '../models/Employee.js';
import { createAuditLog } from '../utils/auditHelper.js';
import { createNotification, notifyByRole } from '../utils/notificationHelper.js';

// @desc    Get performance reviews (filtered by role)
// @route   GET /api/performance
export const getPerformanceReviews = async (req, res) => {
  try {
    const { year, period, status, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (year) filter.year = parseInt(year);
    if (period) filter.period = period;
    if (status) filter.status = status;

    if (req.user.role === 'manager') {
      const managerEmp = await Employee.findOne({ user: req.user._id });
      if (!managerEmp) return res.status(404).json({ message: 'Manager profile not found' });
      const teamIds = await Employee.find({ manager: managerEmp._id }).distinct('_id');
      filter.$or = [
        { reviewer: managerEmp._id },
        { employee: { $in: teamIds } },
        { employee: managerEmp._id }
      ];
    } else if (req.user.role === 'employee') {
      const emp = await Employee.findOne({ user: req.user._id });
      if (!emp) return res.status(404).json({ message: 'Employee profile not found' });
      filter.employee = emp._id;
    }

    const total = await Performance.countDocuments(filter);
    const reviews = await Performance.find(filter)
      .populate('employee', 'firstName lastName employeeId designation department')
      .populate({ path: 'employee', populate: { path: 'department', select: 'name' } })
      .populate('reviewer', 'firstName lastName employeeId')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({ reviews, total, pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single performance review
// @route   GET /api/performance/:id
export const getPerformanceReview = async (req, res) => {
  try {
    const review = await Performance.findById(req.params.id)
      .populate('employee', 'firstName lastName employeeId designation department')
      .populate({ path: 'employee', populate: { path: 'department', select: 'name' } })
      .populate('reviewer', 'firstName lastName employeeId');

    if (!review) return res.status(404).json({ message: 'Review not found' });

    // Employees can only view their own reviews
    if (req.user.role === 'employee') {
      const emp = await Employee.findOne({ user: req.user._id });
      if (!emp || review.employee._id.toString() !== emp._id.toString()) {
        return res.status(403).json({ message: 'Not authorized' });
      }
    }

    res.json(review);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create performance review
// @route   POST /api/performance
export const createPerformanceReview = async (req, res) => {
  try {
    const { employeeId, period, year, kpis, overallRating, strengths, improvements, managerComments, recommendation } = req.body;

    const employee = await Employee.findById(employeeId);
    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    // The reviewer is the currently logged-in manager/HR
    const reviewerEmp = await Employee.findOne({ user: req.user._id });
    if (!reviewerEmp) return res.status(404).json({ message: 'Reviewer profile not found' });

    // Check if review already exists for this employee/period/year
    const existing = await Performance.findOne({ employee: employeeId, period, year });
    if (existing) {
      return res.status(400).json({ message: `Review for ${period} ${year} already exists for this employee` });
    }

    const review = await Performance.create({
      employee: employeeId,
      reviewer: reviewerEmp._id,
      reviewerUser: req.user._id,
      period,
      year,
      kpis: kpis || [],
      overallRating,
      strengths,
      improvements,
      managerComments,
      recommendation: recommendation || 'None',
      status: 'Draft'
    });

    await review.populate('employee', 'firstName lastName employeeId');
    await review.populate('reviewer', 'firstName lastName employeeId');

    await createAuditLog({
      userId: req.user._id,
      action: 'CREATE',
      module: 'Performance',
      description: `Created performance review for ${employee.firstName} ${employee.lastName} - ${period} ${year}`,
      ipAddress: req.ip
    });

    res.status(201).json(review);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update performance review
// @route   PUT /api/performance/:id
export const updatePerformanceReview = async (req, res) => {
  try {
    const review = await Performance.findById(req.params.id);
    if (!review) return res.status(404).json({ message: 'Review not found' });

    if (review.status === 'Closed') {
      return res.status(400).json({ message: 'Cannot edit a closed review' });
    }

    const updates = req.body;
    Object.assign(review, updates);
    await review.save();

    await review.populate('employee', 'firstName lastName employeeId designation department');
    await review.populate('reviewer', 'firstName lastName employeeId');

    await createAuditLog({
      userId: req.user._id,
      action: 'UPDATE',
      module: 'Performance',
      description: `Updated performance review ${req.params.id}`,
      ipAddress: req.ip
    });

    res.json(review);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Submit review (manager finalizes)
// @route   PUT /api/performance/:id/submit
export const submitReview = async (req, res) => {
  try {
    const review = await Performance.findById(req.params.id);
    if (!review) return res.status(404).json({ message: 'Review not found' });

    if (review.status !== 'Draft') {
      return res.status(400).json({ message: 'Only draft reviews can be submitted' });
    }

    review.status = 'Submitted';
    await review.save();

    // Notify the employee
    const employee = await Employee.findById(review.employee);
    if (employee?.user) {
      await createNotification({
        recipientId: employee.user,
        type: 'performance_review',
        title: 'Performance Review Submitted',
        message: `Your ${review.period} ${review.year} performance review has been submitted. Please review and acknowledge.`,
        link: '/performance'
      });
    }

    res.json({ message: 'Review submitted', review });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Employee acknowledges review
// @route   PUT /api/performance/:id/acknowledge
export const acknowledgeReview = async (req, res) => {
  try {
    const review = await Performance.findById(req.params.id);
    if (!review) return res.status(404).json({ message: 'Review not found' });

    // Verify this employee owns the review
    const emp = await Employee.findOne({ user: req.user._id });
    if (!emp || review.employee.toString() !== emp._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (review.status !== 'Submitted') {
      return res.status(400).json({ message: 'Only submitted reviews can be acknowledged' });
    }

    review.employeeComments = req.body.employeeComments || review.employeeComments;
    review.status = 'Acknowledged';
    await review.save();

    // Notify the reviewer that the employee acknowledged
    const reviewer = await Employee.findById(review.reviewer);
    if (reviewer?.user) {
      const ackEmp = await Employee.findById(review.employee);
      await createNotification({
        recipientId: reviewer.user,
        type: 'performance_acknowledged',
        title: 'Review Acknowledged',
        message: `${ackEmp?.firstName} ${ackEmp?.lastName} has acknowledged their ${review.period} ${review.year} performance review`,
        link: '/performance'
      });
    }

    res.json({ message: 'Review acknowledged', review });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Close review (HR/Admin)
// @route   PUT /api/performance/:id/close
export const closeReview = async (req, res) => {
  try {
    const review = await Performance.findById(req.params.id);
    if (!review) return res.status(404).json({ message: 'Review not found' });

    review.status = 'Closed';
    await review.save();

    // Notify both employee and reviewer
    const closedEmp = await Employee.findById(review.employee);
    const closedReviewer = await Employee.findById(review.reviewer);
    if (closedEmp?.user) {
      await createNotification({
        recipientId: closedEmp.user,
        type: 'performance_closed',
        title: 'Performance Review Closed',
        message: `Your ${review.period} ${review.year} performance review has been closed`,
        link: '/performance'
      });
    }
    if (closedReviewer?.user) {
      await createNotification({
        recipientId: closedReviewer.user,
        type: 'performance_closed',
        title: 'Performance Review Closed',
        message: `Performance review for ${closedEmp?.firstName} ${closedEmp?.lastName} (${review.period} ${review.year}) has been closed`,
        link: '/performance'
      });
    }

    await createAuditLog({
      userId: req.user._id,
      action: 'UPDATE',
      module: 'Performance',
      description: `Closed performance review ${req.params.id}`,
      ipAddress: req.ip
    });

    res.json({ message: 'Review closed', review });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete performance review
// @route   DELETE /api/performance/:id
export const deletePerformanceReview = async (req, res) => {
  try {
    const review = await Performance.findById(req.params.id);
    if (!review) return res.status(404).json({ message: 'Review not found' });

    if (review.status !== 'Draft') {
      return res.status(400).json({ message: 'Only draft reviews can be deleted' });
    }

    await review.deleteOne();

    await createAuditLog({
      userId: req.user._id,
      action: 'DELETE',
      module: 'Performance',
      description: `Deleted performance review ${req.params.id}`,
      ipAddress: req.ip
    });

    res.json({ message: 'Review deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
