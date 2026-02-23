import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  getJobPostings, getJobPosting, createJobPosting, updateJobPosting, deleteJobPosting,
  getCandidates, getCandidate, createCandidate, updateCandidate, deleteCandidate,
  addInterview, getRecruitmentStats
} from '../controllers/recruitment.controller.js';

const router = express.Router();

router.use(protect);
router.use(authorize('super_admin', 'hr'));

// Stats
router.get('/stats', getRecruitmentStats);

// Job Postings
router.get('/jobs', getJobPostings);
router.get('/jobs/:id', getJobPosting);
router.post('/jobs', createJobPosting);
router.put('/jobs/:id', updateJobPosting);
router.delete('/jobs/:id', deleteJobPosting);

// Candidates
router.get('/candidates', getCandidates);
router.get('/candidates/:id', getCandidate);
router.post('/candidates', createCandidate);
router.put('/candidates/:id', updateCandidate);
router.delete('/candidates/:id', deleteCandidate);
router.post('/candidates/:id/interviews', addInterview);

export default router;
