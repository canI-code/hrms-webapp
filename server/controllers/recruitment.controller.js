import JobPosting from '../models/JobPosting.js';
import Candidate from '../models/Candidate.js';
import { createAuditLog } from '../utils/auditHelper.js';
import { notifyByRole } from '../utils/notificationHelper.js';

// ── Job Postings ──

export const getJobPostings = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const total = await JobPosting.countDocuments(filter);
    const jobs = await JobPosting.find(filter)
      .populate('department', 'name')
      .populate('postedBy', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    // Get candidate counts per job
    const jobIds = jobs.map(j => j._id);
    const candidateCounts = await Candidate.aggregate([
      { $match: { jobPosting: { $in: jobIds } } },
      { $group: { _id: '$jobPosting', total: { $sum: 1 } } }
    ]);
    const countMap = {};
    candidateCounts.forEach(c => { countMap[c._id.toString()] = c.total; });

    const jobsWithCounts = jobs.map(j => ({
      ...j.toObject(),
      candidateCount: countMap[j._id.toString()] || 0
    }));

    res.json({ jobs: jobsWithCounts, total, pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getJobPosting = async (req, res) => {
  try {
    const job = await JobPosting.findById(req.params.id)
      .populate('department', 'name')
      .populate('postedBy', 'name');
    if (!job) return res.status(404).json({ message: 'Job posting not found' });
    res.json(job);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createJobPosting = async (req, res) => {
  try {
    const job = await JobPosting.create({ ...req.body, postedBy: req.user._id });
    await job.populate('department', 'name');

    await createAuditLog({
      userId: req.user._id,
      action: 'CREATE',
      module: 'Recruitment',
      description: `Created job posting: ${job.title}`,
      ipAddress: req.ip
    });

    await notifyByRole({
      roles: ['super_admin', 'hr'],
      type: 'recruitment_update',
      title: 'New Job Posting',
      message: `New job posting created: "${job.title}"`,
      link: '/recruitment'
    });

    res.status(201).json(job);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateJobPosting = async (req, res) => {
  try {
    const job = await JobPosting.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
      .populate('department', 'name');
    if (!job) return res.status(404).json({ message: 'Job posting not found' });

    await createAuditLog({
      userId: req.user._id,
      action: 'UPDATE',
      module: 'Recruitment',
      description: `Updated job posting: ${job.title}`,
      ipAddress: req.ip
    });

    await notifyByRole({
      roles: ['super_admin', 'hr'],
      type: 'recruitment_update',
      title: 'Job Posting Updated',
      message: `Job posting updated: "${job.title}"`,
      link: '/recruitment'
    });

    res.json(job);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteJobPosting = async (req, res) => {
  try {
    const job = await JobPosting.findById(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job posting not found' });

    // Delete associated candidates
    await Candidate.deleteMany({ jobPosting: job._id });
    await job.deleteOne();

    await createAuditLog({
      userId: req.user._id,
      action: 'DELETE',
      module: 'Recruitment',
      description: `Deleted job posting: ${job.title}`,
      ipAddress: req.ip
    });

    await notifyByRole({
      roles: ['super_admin', 'hr'],
      type: 'recruitment_update',
      title: 'Job Posting Deleted',
      message: `Job posting deleted: "${job.title}"`,
      link: '/recruitment'
    });

    res.json({ message: 'Job posting and associated candidates deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── Candidates ──

export const getCandidates = async (req, res) => {
  try {
    const { jobPosting, status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (jobPosting) filter.jobPosting = jobPosting;
    if (status) filter.status = status;

    const total = await Candidate.countDocuments(filter);
    const candidates = await Candidate.find(filter)
      .populate('jobPosting', 'title')
      .populate('addedBy', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({ candidates, total, pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getCandidate = async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.params.id)
      .populate('jobPosting', 'title department')
      .populate('addedBy', 'name');
    if (!candidate) return res.status(404).json({ message: 'Candidate not found' });
    res.json(candidate);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createCandidate = async (req, res) => {
  try {
    const candidate = await Candidate.create({ ...req.body, addedBy: req.user._id });
    await candidate.populate('jobPosting', 'title');

    await createAuditLog({
      userId: req.user._id,
      action: 'CREATE',
      module: 'Recruitment',
      description: `Added candidate: ${candidate.name} for ${candidate.jobPosting?.title}`,
      ipAddress: req.ip
    });

    await notifyByRole({
      roles: ['super_admin', 'hr'],
      type: 'recruitment_update',
      title: 'New Candidate Added',
      message: `Candidate "${candidate.name}" added for position: ${candidate.jobPosting?.title}`,
      link: '/recruitment'
    });

    res.status(201).json(candidate);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateCandidate = async (req, res) => {
  try {
    const candidate = await Candidate.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
      .populate('jobPosting', 'title');
    if (!candidate) return res.status(404).json({ message: 'Candidate not found' });

    await createAuditLog({
      userId: req.user._id,
      action: 'UPDATE',
      module: 'Recruitment',
      description: `Updated candidate: ${candidate.name} — status: ${candidate.status}`,
      ipAddress: req.ip
    });

    await notifyByRole({
      roles: ['super_admin', 'hr'],
      type: 'recruitment_update',
      title: 'Candidate Updated',
      message: `Candidate "${candidate.name}" status changed to: ${candidate.status}`,
      link: '/recruitment'
    });

    res.json(candidate);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteCandidate = async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.params.id);
    if (!candidate) return res.status(404).json({ message: 'Candidate not found' });

    await candidate.deleteOne();

    await createAuditLog({
      userId: req.user._id,
      action: 'DELETE',
      module: 'Recruitment',
      description: `Deleted candidate: ${candidate.name}`,
      ipAddress: req.ip
    });

    res.json({ message: 'Candidate deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add interview to candidate
// @route   POST /api/recruitment/candidates/:id/interviews
export const addInterview = async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.params.id);
    if (!candidate) return res.status(404).json({ message: 'Candidate not found' });

    candidate.interviews.push(req.body);
    if (candidate.status === 'Applied' || candidate.status === 'Screening') {
      candidate.status = 'Interview';
    }
    await candidate.save();
    await candidate.populate('jobPosting', 'title');

    await notifyByRole({
      roles: ['super_admin', 'hr'],
      type: 'recruitment_update',
      title: 'Interview Scheduled',
      message: `Interview scheduled for "${candidate.name}" — ${candidate.jobPosting?.title}`,
      link: '/recruitment'
    });

    res.json(candidate);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get recruitment pipeline stats
// @route   GET /api/recruitment/stats
export const getRecruitmentStats = async (req, res) => {
  try {
    const openJobs = await JobPosting.countDocuments({ status: 'Open' });
    const totalCandidates = await Candidate.countDocuments();
    const pipeline = await Candidate.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const pipelineMap = {};
    pipeline.forEach(p => { pipelineMap[p._id] = p.count; });

    res.json({
      openJobs,
      totalCandidates,
      pipeline: pipelineMap
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
