import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import {
  getJobPostingsAPI, createJobPostingAPI, updateJobPostingAPI, deleteJobPostingAPI,
  getCandidatesAPI, createCandidateAPI, updateCandidateAPI, deleteCandidateAPI,
  addInterviewAPI, getRecruitmentStatsAPI, getDepartmentsAPI
} from '../../api/axios';
import { FiPlus, FiBriefcase, FiUsers, FiEdit2, FiTrash2, FiX, FiChevronRight, FiStar, FiCalendar } from 'react-icons/fi';

const statusColors = {
  Applied: 'bg-gray-100 text-gray-700',
  Screening: 'bg-blue-100 text-blue-700',
  Interview: 'bg-yellow-100 text-yellow-700',
  Offered: 'bg-purple-100 text-purple-700',
  Hired: 'bg-green-100 text-green-700',
  Rejected: 'bg-red-100 text-red-700',
  Withdrawn: 'bg-gray-200 text-gray-500'
};

const jobStatusColors = {
  Open: 'bg-green-100 text-green-700',
  'On Hold': 'bg-yellow-100 text-yellow-700',
  Closed: 'bg-gray-100 text-gray-700',
  Filled: 'bg-blue-100 text-blue-700'
};

const candidateStatuses = ['Applied', 'Screening', 'Interview', 'Offered', 'Hired', 'Rejected', 'Withdrawn'];
const interviewTypes = ['Phone', 'Video', 'In-Person', 'Technical', 'HR'];

const Recruitment = () => {
  const [tab, setTab] = useState('jobs'); // 'jobs' | 'candidates' | 'pipeline'
  const [jobs, setJobs] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [stats, setStats] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showJobModal, setShowJobModal] = useState(false);
  const [editJob, setEditJob] = useState(null);
  const [jobForm, setJobForm] = useState({ title: '', department: '', description: '', requirements: '', location: 'On-site', employmentType: 'Full-time', salaryRange: { min: '', max: '' }, openings: 1, closingDate: '' });

  const [showCandidateModal, setShowCandidateModal] = useState(false);
  const [editCandidate, setEditCandidate] = useState(null);
  const [candidateForm, setCandidateForm] = useState({ jobPosting: '', name: '', email: '', phone: '', experience: 0, currentCompany: '', skills: '', notes: '' });

  const [selectedJob, setSelectedJob] = useState('');
  const [showInterviewModal, setShowInterviewModal] = useState(null);
  const [interviewForm, setInterviewForm] = useState({ date: '', type: 'In-Person', interviewer: '', notes: '', result: 'Pending' });

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [jobsRes, statsRes, deptRes] = await Promise.all([
        getJobPostingsAPI({ limit: 100 }),
        getRecruitmentStatsAPI(),
        getDepartmentsAPI()
      ]);
      setJobs(jobsRes.data.jobs || []);
      setStats(statsRes.data);
      setDepartments(deptRes.data || []);
    } catch (err) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const fetchCandidates = async (jobId) => {
    try {
      const params = {};
      if (jobId) params.jobPosting = jobId;
      const { data } = await getCandidatesAPI(params);
      setCandidates(data.candidates || []);
    } catch (err) {
      toast.error('Failed to load candidates');
    }
  };

  useEffect(() => {
    if (tab === 'candidates') fetchCandidates(selectedJob);
  }, [tab, selectedJob]);

  // ── Job CRUD ──
  const resetJobForm = () => {
    setJobForm({ title: '', department: '', description: '', requirements: '', location: 'On-site', employmentType: 'Full-time', salaryRange: { min: '', max: '' }, openings: 1, closingDate: '' });
    setEditJob(null);
  };

  const openEditJob = (job) => {
    setJobForm({
      title: job.title,
      department: job.department?._id || '',
      description: job.description,
      requirements: job.requirements || '',
      location: job.location || 'On-site',
      employmentType: job.employmentType || 'Full-time',
      salaryRange: { min: job.salaryRange?.min || '', max: job.salaryRange?.max || '' },
      openings: job.openings || 1,
      closingDate: job.closingDate ? job.closingDate.slice(0, 10) : '',
      status: job.status
    });
    setEditJob(job);
    setShowJobModal(true);
  };

  const handleJobSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...jobForm };
      if (!payload.department) delete payload.department;
      if (!payload.closingDate) delete payload.closingDate;

      if (editJob) {
        await updateJobPostingAPI(editJob._id, payload);
        toast.success('Job updated');
      } else {
        await createJobPostingAPI(payload);
        toast.success('Job created');
      }
      setShowJobModal(false);
      resetJobForm();
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const handleDeleteJob = async (id) => {
    if (!confirm('Delete this job posting and all its candidates?')) return;
    try {
      await deleteJobPostingAPI(id);
      toast.success('Job deleted');
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  // ── Candidate CRUD ──
  const resetCandidateForm = () => {
    setCandidateForm({ jobPosting: '', name: '', email: '', phone: '', experience: 0, currentCompany: '', skills: '', notes: '' });
    setEditCandidate(null);
  };

  const openEditCandidate = (c) => {
    setCandidateForm({
      jobPosting: c.jobPosting?._id || '',
      name: c.name,
      email: c.email,
      phone: c.phone || '',
      experience: c.experience || 0,
      currentCompany: c.currentCompany || '',
      skills: c.skills || '',
      notes: c.notes || '',
      status: c.status,
      rating: c.rating || ''
    });
    setEditCandidate(c);
    setShowCandidateModal(true);
  };

  const handleCandidateSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editCandidate) {
        await updateCandidateAPI(editCandidate._id, candidateForm);
        toast.success('Candidate updated');
      } else {
        await createCandidateAPI(candidateForm);
        toast.success('Candidate added');
      }
      setShowCandidateModal(false);
      resetCandidateForm();
      fetchCandidates(selectedJob);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const handleDeleteCandidate = async (id) => {
    if (!confirm('Delete this candidate?')) return;
    try {
      await deleteCandidateAPI(id);
      toast.success('Candidate deleted');
      fetchCandidates(selectedJob);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await updateCandidateAPI(id, { status });
      toast.success(`Status updated to ${status}`);
      fetchCandidates(selectedJob);
      fetchAll();
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  // ── Interview ──
  const handleInterviewSubmit = async (e) => {
    e.preventDefault();
    try {
      await addInterviewAPI(showInterviewModal, interviewForm);
      toast.success('Interview scheduled');
      setShowInterviewModal(null);
      setInterviewForm({ date: '', type: 'In-Person', interviewer: '', notes: '', result: 'Pending' });
      fetchCandidates(selectedJob);
    } catch (err) {
      toast.error('Failed to schedule interview');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Recruitment</h1>
        <div className="flex gap-2">
          {['jobs', 'candidates', 'pipeline'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                tab === t ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t === 'jobs' ? 'Job Postings' : t === 'candidates' ? 'Candidates' : 'Pipeline'}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <div className="text-2xl font-bold text-primary-600">{stats.openJobs}</div>
            <div className="text-sm text-gray-500">Open Positions</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.totalCandidates}</div>
            <div className="text-sm text-gray-500">Total Candidates</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <div className="text-2xl font-bold text-yellow-600">{stats.pipeline?.Interview || 0}</div>
            <div className="text-sm text-gray-500">In Interview</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <div className="text-2xl font-bold text-green-600">{stats.pipeline?.Hired || 0}</div>
            <div className="text-sm text-gray-500">Hired</div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : (
        <>
          {/* ── Job Postings Tab ── */}
          {tab === 'jobs' && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <button onClick={() => { resetJobForm(); setShowJobModal(true); }} className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 text-sm">
                  <FiPlus /> Post Job
                </button>
              </div>
              {jobs.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl shadow-sm border">
                  <FiBriefcase className="mx-auto text-4xl text-gray-300 mb-3" />
                  <p className="text-gray-500">No job postings yet</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {jobs.map(job => (
                    <div key={job._id} className="bg-white rounded-xl shadow-sm border p-5 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-semibold text-gray-900">{job.title}</h3>
                          <p className="text-sm text-gray-500">{job.department?.name} • {job.employmentType} • {job.location}</p>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full font-medium ${jobStatusColors[job.status]}`}>{job.status}</span>
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2 mb-3">{job.description}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1"><FiUsers size={14} /> {job.candidateCount} candidates</span>
                          <span>{job.openings} opening{job.openings > 1 ? 's' : ''}</span>
                          {job.salaryRange?.min && <span>₹{(job.salaryRange.min / 1000).toFixed(0)}k - ₹{(job.salaryRange.max / 1000).toFixed(0)}k</span>}
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => openEditJob(job)} className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"><FiEdit2 size={14} /></button>
                          <button onClick={() => handleDeleteJob(job._id)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"><FiTrash2 size={14} /></button>
                          <button onClick={() => { setSelectedJob(job._id); setTab('candidates'); }} className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded"><FiChevronRight size={14} /></button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Candidates Tab ── */}
          {tab === 'candidates' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <select
                  value={selectedJob}
                  onChange={e => setSelectedJob(e.target.value)}
                  className="border rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">All Jobs</option>
                  {jobs.map(j => <option key={j._id} value={j._id}>{j.title}</option>)}
                </select>
                <button onClick={() => { resetCandidateForm(); setCandidateForm(f => ({ ...f, jobPosting: selectedJob })); setShowCandidateModal(true); }} className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 text-sm">
                  <FiPlus /> Add Candidate
                </button>
              </div>

              {candidates.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl shadow-sm border">
                  <FiUsers className="mx-auto text-4xl text-gray-300 mb-3" />
                  <p className="text-gray-500">No candidates found</p>
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                          <th className="text-left px-4 py-3 font-medium text-gray-600">Job</th>
                          <th className="text-left px-4 py-3 font-medium text-gray-600">Experience</th>
                          <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                          <th className="text-left px-4 py-3 font-medium text-gray-600">Interviews</th>
                          <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {candidates.map(c => (
                          <tr key={c._id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <div className="font-medium text-gray-900">{c.name}</div>
                              <div className="text-xs text-gray-500">{c.email}</div>
                            </td>
                            <td className="px-4 py-3 text-gray-600">{c.jobPosting?.title || '—'}</td>
                            <td className="px-4 py-3 text-gray-600">{c.experience} yrs</td>
                            <td className="px-4 py-3">
                              <select
                                value={c.status}
                                onChange={e => handleStatusChange(c._id, e.target.value)}
                                className={`text-xs rounded-full px-2 py-1 font-medium border-0 ${statusColors[c.status]}`}
                              >
                                {candidateStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                            </td>
                            <td className="px-4 py-3 text-gray-600">{c.interviews?.length || 0}</td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex justify-end gap-1">
                                <button onClick={() => setShowInterviewModal(c._id)} className="p-1.5 text-gray-500 hover:text-yellow-600 hover:bg-yellow-50 rounded" title="Schedule Interview">
                                  <FiCalendar size={14} />
                                </button>
                                <button onClick={() => openEditCandidate(c)} className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"><FiEdit2 size={14} /></button>
                                <button onClick={() => handleDeleteCandidate(c._id)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"><FiTrash2 size={14} /></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Pipeline Tab ── */}
          {tab === 'pipeline' && stats && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                {candidateStatuses.map(status => (
                  <div key={status} className="bg-white rounded-xl shadow-sm border p-4 text-center">
                    <div className="text-2xl font-bold text-gray-900">{stats.pipeline?.[status] || 0}</div>
                    <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${statusColors[status]}`}>{status}</span>
                  </div>
                ))}
              </div>
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Pipeline Funnel</h3>
                <div className="space-y-2">
                  {candidateStatuses.map(status => {
                    const count = stats.pipeline?.[status] || 0;
                    const max = stats.totalCandidates || 1;
                    return (
                      <div key={status} className="flex items-center gap-3">
                        <span className="text-sm text-gray-600 w-24">{status}</span>
                        <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              status === 'Hired' ? 'bg-green-500' :
                              status === 'Rejected' ? 'bg-red-400' :
                              status === 'Withdrawn' ? 'bg-gray-400' :
                              'bg-primary-500'
                            }`}
                            style={{ width: `${(count / max) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-700 w-8 text-right">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Job Modal ── */}
      {showJobModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-lg font-bold">{editJob ? 'Edit Job Posting' : 'New Job Posting'}</h2>
              <button onClick={() => { setShowJobModal(false); resetJobForm(); }} className="text-gray-400 hover:text-gray-600"><FiX size={20} /></button>
            </div>
            <form onSubmit={handleJobSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                  <input required value={jobForm.title} onChange={e => setJobForm(f => ({ ...f, title: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                  <select value={jobForm.department} onChange={e => setJobForm(f => ({ ...f, department: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm">
                    <option value="">Select</option>
                    {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Employment Type</label>
                  <select value={jobForm.employmentType} onChange={e => setJobForm(f => ({ ...f, employmentType: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm">
                    {['Full-time', 'Part-time', 'Contract', 'Intern'].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <select value={jobForm.location} onChange={e => setJobForm(f => ({ ...f, location: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm">
                    {['On-site', 'Remote', 'Hybrid'].map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Salary Min</label>
                  <input type="number" value={jobForm.salaryRange.min} onChange={e => setJobForm(f => ({ ...f, salaryRange: { ...f.salaryRange, min: e.target.value } }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Salary Max</label>
                  <input type="number" value={jobForm.salaryRange.max} onChange={e => setJobForm(f => ({ ...f, salaryRange: { ...f.salaryRange, max: e.target.value } }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Openings</label>
                  <input type="number" min={1} value={jobForm.openings} onChange={e => setJobForm(f => ({ ...f, openings: parseInt(e.target.value) }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Closing Date</label>
                  <input type="date" value={jobForm.closingDate} onChange={e => setJobForm(f => ({ ...f, closingDate: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              {editJob && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select value={jobForm.status} onChange={e => setJobForm(f => ({ ...f, status: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm">
                    {['Open', 'On Hold', 'Closed', 'Filled'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                <textarea required value={jobForm.description} onChange={e => setJobForm(f => ({ ...f, description: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" rows={3} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Requirements</label>
                <textarea value={jobForm.requirements} onChange={e => setJobForm(f => ({ ...f, requirements: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" rows={3} />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => { setShowJobModal(false); resetJobForm(); }} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700">{editJob ? 'Update' : 'Post'} Job</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Candidate Modal ── */}
      {showCandidateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-lg font-bold">{editCandidate ? 'Edit Candidate' : 'Add Candidate'}</h2>
              <button onClick={() => { setShowCandidateModal(false); resetCandidateForm(); }} className="text-gray-400 hover:text-gray-600"><FiX size={20} /></button>
            </div>
            <form onSubmit={handleCandidateSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Job Posting *</label>
                  <select required value={candidateForm.jobPosting} onChange={e => setCandidateForm(f => ({ ...f, jobPosting: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm">
                    <option value="">Select job</option>
                    {jobs.map(j => <option key={j._id} value={j._id}>{j.title}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input required value={candidateForm.name} onChange={e => setCandidateForm(f => ({ ...f, name: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input required type="email" value={candidateForm.email} onChange={e => setCandidateForm(f => ({ ...f, email: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input value={candidateForm.phone} onChange={e => setCandidateForm(f => ({ ...f, phone: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Experience (years)</label>
                  <input type="number" min={0} value={candidateForm.experience} onChange={e => setCandidateForm(f => ({ ...f, experience: parseInt(e.target.value) }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Current Company</label>
                  <input value={candidateForm.currentCompany} onChange={e => setCandidateForm(f => ({ ...f, currentCompany: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Skills</label>
                  <input value={candidateForm.skills} onChange={e => setCandidateForm(f => ({ ...f, skills: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="React, Node.js, MongoDB..." />
                </div>
              </div>
              {editCandidate && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select value={candidateForm.status} onChange={e => setCandidateForm(f => ({ ...f, status: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm">
                      {candidateStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Rating</label>
                    <select value={candidateForm.rating} onChange={e => setCandidateForm(f => ({ ...f, rating: parseInt(e.target.value) || '' }))} className="w-full border rounded-lg px-3 py-2 text-sm">
                      <option value="">No rating</option>
                      {[1, 2, 3, 4, 5].map(r => <option key={r} value={r}>{r} Star{r > 1 ? 's' : ''}</option>)}
                    </select>
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea value={candidateForm.notes} onChange={e => setCandidateForm(f => ({ ...f, notes: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => { setShowCandidateModal(false); resetCandidateForm(); }} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700">{editCandidate ? 'Update' : 'Add'} Candidate</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Interview Modal ── */}
      {showInterviewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-lg font-bold">Schedule Interview</h2>
              <button onClick={() => setShowInterviewModal(null)} className="text-gray-400 hover:text-gray-600"><FiX size={20} /></button>
            </div>
            <form onSubmit={handleInterviewSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date & Time *</label>
                <input required type="datetime-local" value={interviewForm.date} onChange={e => setInterviewForm(f => ({ ...f, date: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select value={interviewForm.type} onChange={e => setInterviewForm(f => ({ ...f, type: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm">
                  {interviewTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Interviewer</label>
                <input value={interviewForm.interviewer} onChange={e => setInterviewForm(f => ({ ...f, interviewer: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea value={interviewForm.notes} onChange={e => setInterviewForm(f => ({ ...f, notes: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Result</label>
                <select value={interviewForm.result} onChange={e => setInterviewForm(f => ({ ...f, result: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm">
                  {['Pending', 'Passed', 'Failed'].map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowInterviewModal(null)} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700">Schedule</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Recruitment;
