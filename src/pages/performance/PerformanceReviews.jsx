import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import {
  getPerformanceReviewsAPI,
  createPerformanceReviewAPI,
  updatePerformanceReviewAPI,
  submitPerformanceReviewAPI,
  acknowledgePerformanceReviewAPI,
  closePerformanceReviewAPI,
  deletePerformanceReviewAPI,
  getEmployeesAPI
} from '../../api/axios';
import { FiPlus, FiStar, FiEdit2, FiTrash2, FiCheck, FiSend, FiLock, FiX } from 'react-icons/fi';

const ratingLabels = { 1: 'Poor', 2: 'Below Average', 3: 'Average', 4: 'Good', 5: 'Excellent' };
const periods = ['Q1', 'Q2', 'Q3', 'Q4', 'H1', 'H2', 'Annual'];
const recommendations = ['None', 'Promotion', 'Salary Increment', 'Training', 'PIP', 'Recognition'];

const StarRating = ({ value, onChange, readOnly = false }) => (
  <div className="flex gap-1">
    {[1, 2, 3, 4, 5].map((star) => (
      <button
        key={star}
        type="button"
        disabled={readOnly}
        onClick={() => onChange?.(star)}
        className={`${readOnly ? 'cursor-default' : 'cursor-pointer hover:scale-110'} transition-transform`}
      >
        <FiStar
          size={18}
          className={star <= (value || 0) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
        />
      </button>
    ))}
    {value > 0 && <span className="text-xs text-gray-500 ml-1">({ratingLabels[value]})</span>}
  </div>
);

const PerformanceReviews = () => {
  const { user } = useAuth();
  const role = user?.role;
  const canCreate = ['super_admin', 'hr', 'manager'].includes(role);

  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [filters, setFilters] = useState({ year: new Date().getFullYear(), period: '' });
  const [form, setForm] = useState({
    employeeId: '',
    period: 'Annual',
    year: new Date().getFullYear(),
    kpis: [{ name: '', target: '', achieved: '', rating: 3, weight: 1 }],
    overallRating: 3,
    strengths: '',
    improvements: '',
    managerComments: '',
    recommendation: 'None'
  });
  const [editId, setEditId] = useState(null);
  const [employeeComment, setEmployeeComment] = useState('');

  useEffect(() => {
    fetchReviews();
    if (canCreate) fetchEmployees();
  }, [filters]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filters.year) params.year = filters.year;
      if (filters.period) params.period = filters.period;
      const { data } = await getPerformanceReviewsAPI(params);
      setReviews(data.reviews || []);
    } catch (err) {
      toast.error('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const { data } = await getEmployeesAPI({ limit: 500 });
      setEmployees(data.employees || []);
    } catch (err) { /* ignore */ }
  };

  const resetForm = () => {
    setForm({
      employeeId: '',
      period: 'Annual',
      year: new Date().getFullYear(),
      kpis: [{ name: '', target: '', achieved: '', rating: 3, weight: 1 }],
      overallRating: 3,
      strengths: '',
      improvements: '',
      managerComments: '',
      recommendation: 'None'
    });
    setEditId(null);
  };

  const openCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const openEdit = (review) => {
    setForm({
      employeeId: review.employee?._id,
      period: review.period,
      year: review.year,
      kpis: review.kpis?.length > 0 ? review.kpis : [{ name: '', target: '', achieved: '', rating: 3, weight: 1 }],
      overallRating: review.overallRating || 3,
      strengths: review.strengths || '',
      improvements: review.improvements || '',
      managerComments: review.managerComments || '',
      recommendation: review.recommendation || 'None'
    });
    setEditId(review._id);
    setShowModal(true);
  };

  const addKpi = () => {
    setForm(f => ({ ...f, kpis: [...f.kpis, { name: '', target: '', achieved: '', rating: 3, weight: 1 }] }));
  };

  const removeKpi = (idx) => {
    setForm(f => ({ ...f, kpis: f.kpis.filter((_, i) => i !== idx) }));
  };

  const updateKpi = (idx, field, value) => {
    setForm(f => {
      const kpis = [...f.kpis];
      kpis[idx] = { ...kpis[idx], [field]: value };
      return { ...f, kpis };
    });
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    try {
      if (editId) {
        await updatePerformanceReviewAPI(editId, form);
        toast.success('Review updated');
      } else {
        await createPerformanceReviewAPI(form);
        toast.success('Review created');
      }
      setShowModal(false);
      resetForm();
      fetchReviews();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save review');
    }
  };

  const handleSubmitReview = async (id) => {
    try {
      await submitPerformanceReviewAPI(id);
      toast.success('Review submitted to employee');
      fetchReviews();
      setShowDetail(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit');
    }
  };

  const handleAcknowledge = async (id) => {
    try {
      await acknowledgePerformanceReviewAPI(id, { employeeComments: employeeComment });
      toast.success('Review acknowledged');
      setEmployeeComment('');
      fetchReviews();
      setShowDetail(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to acknowledge');
    }
  };

  const handleClose = async (id) => {
    try {
      await closePerformanceReviewAPI(id);
      toast.success('Review closed');
      fetchReviews();
      setShowDetail(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to close');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this draft review?')) return;
    try {
      await deletePerformanceReviewAPI(id);
      toast.success('Review deleted');
      fetchReviews();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    }
  };

  const statusColor = (s) => ({
    Draft: 'bg-gray-100 text-gray-700',
    Submitted: 'bg-blue-100 text-blue-700',
    Acknowledged: 'bg-green-100 text-green-700',
    Closed: 'bg-purple-100 text-purple-700'
  }[s] || 'bg-gray-100 text-gray-700');

  const avgRating = (kpis) => {
    if (!kpis?.length) return 0;
    const totalWeight = kpis.reduce((s, k) => s + (k.weight || 1), 0);
    const weighted = kpis.reduce((s, k) => s + (k.rating || 0) * (k.weight || 1), 0);
    return totalWeight > 0 ? (weighted / totalWeight).toFixed(1) : 0;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Performance Reviews</h1>
        <div className="flex items-center gap-3">
          <select
            value={filters.year}
            onChange={e => setFilters(f => ({ ...f, year: e.target.value }))}
            className="border rounded-lg px-3 py-2 text-sm"
          >
            {[...Array(5)].map((_, i) => {
              const y = new Date().getFullYear() - i;
              return <option key={y} value={y}>{y}</option>;
            })}
          </select>
          <select
            value={filters.period}
            onChange={e => setFilters(f => ({ ...f, period: e.target.value }))}
            className="border rounded-lg px-3 py-2 text-sm"
          >
            <option value="">All Periods</option>
            {periods.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          {canCreate && (
            <button onClick={openCreate} className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 text-sm">
              <FiPlus /> New Review
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm border">
          <FiStar className="mx-auto text-4xl text-gray-300 mb-3" />
          <p className="text-gray-500">No performance reviews found</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Employee</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Period</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Rating</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Recommendation</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Reviewer</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {reviews.map(r => (
                  <tr key={r._id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setShowDetail(r)}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{r.employee?.firstName} {r.employee?.lastName}</div>
                      <div className="text-xs text-gray-500">{r.employee?.employeeId} • {r.employee?.designation}</div>
                    </td>
                    <td className="px-4 py-3">{r.period} {r.year}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <FiStar className={r.overallRating >= 1 ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'} size={14} />
                        <span className="font-medium">{r.overallRating || avgRating(r.kpis)}/5</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs ${r.recommendation !== 'None' ? 'text-primary-600 font-medium' : 'text-gray-400'}`}>
                        {r.recommendation}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor(r.status)}`}>{r.status}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {r.reviewer
                        ? `${r.reviewer.firstName} ${r.reviewer.lastName}`
                        : r.reviewerUser?.name || '—'}
                    </td>
                    <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        {r.status === 'Draft' && canCreate && (
                          <button onClick={() => openEdit(r)} className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded" title="Edit">
                            <FiEdit2 size={14} />
                          </button>
                        )}
                        {(r.status === 'Draft' || role === 'super_admin') && (
                          <button onClick={() => handleDelete(r._id)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded" title="Delete">
                            <FiTrash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-lg font-bold">Performance Review</h2>
                <p className="text-sm text-gray-500">{showDetail.employee?.firstName} {showDetail.employee?.lastName} — {showDetail.period} {showDetail.year}</p>
              </div>
              <button onClick={() => setShowDetail(null)} className="text-gray-400 hover:text-gray-600"><FiX size={20} /></button>
            </div>
            <div className="p-6 space-y-6">
              {/* Overview */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-500">Overall Rating</div>
                  <div className="text-xl font-bold text-gray-900 flex items-center gap-1">
                    <FiStar className="fill-yellow-400 text-yellow-400" size={16} />
                    {showDetail.overallRating}/5
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-500">KPI Avg</div>
                  <div className="text-xl font-bold text-gray-900">{avgRating(showDetail.kpis)}/5</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-500">Recommendation</div>
                  <div className="text-sm font-medium text-primary-600">{showDetail.recommendation}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-500">Status</div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor(showDetail.status)}`}>{showDetail.status}</span>
                </div>
              </div>

              {/* KPIs */}
              {showDetail.kpis?.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">KPIs</h3>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left px-3 py-2 font-medium text-gray-600">KPI</th>
                          <th className="text-left px-3 py-2 font-medium text-gray-600">Target</th>
                          <th className="text-left px-3 py-2 font-medium text-gray-600">Achieved</th>
                          <th className="text-left px-3 py-2 font-medium text-gray-600">Rating</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {showDetail.kpis.map((kpi, i) => (
                          <tr key={i}>
                            <td className="px-3 py-2 font-medium">{kpi.name}</td>
                            <td className="px-3 py-2 text-gray-600">{kpi.target}</td>
                            <td className="px-3 py-2 text-gray-600">{kpi.achieved}</td>
                            <td className="px-3 py-2"><StarRating value={kpi.rating} readOnly /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Comments */}
              {showDetail.strengths && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Strengths</h3>
                  <p className="text-sm text-gray-700 bg-green-50 rounded-lg p-3">{showDetail.strengths}</p>
                </div>
              )}
              {showDetail.improvements && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Areas for Improvement</h3>
                  <p className="text-sm text-gray-700 bg-yellow-50 rounded-lg p-3">{showDetail.improvements}</p>
                </div>
              )}
              {showDetail.managerComments && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Manager Comments</h3>
                  <p className="text-sm text-gray-700 bg-blue-50 rounded-lg p-3">{showDetail.managerComments}</p>
                </div>
              )}
              {showDetail.employeeComments && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Employee Comments</h3>
                  <p className="text-sm text-gray-700 bg-purple-50 rounded-lg p-3">{showDetail.employeeComments}</p>
                </div>
              )}

              {/* Employee Acknowledge */}
              {showDetail.status === 'Submitted' && role === 'employee' && (
                <div className="border-t pt-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Your Response</h3>
                  <textarea
                    value={employeeComment}
                    onChange={e => setEmployeeComment(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    rows={3}
                    placeholder="Add your comments (optional)..."
                  />
                  <button
                    onClick={() => handleAcknowledge(showDetail._id)}
                    className="mt-2 flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm"
                  >
                    <FiCheck size={16} /> Acknowledge Review
                  </button>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 border-t pt-4">
                {showDetail.status === 'Draft' && canCreate && (
                  <button onClick={() => handleSubmitReview(showDetail._id)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm">
                    <FiSend size={14} /> Submit to Employee
                  </button>
                )}
                {showDetail.status === 'Acknowledged' && ['super_admin', 'hr'].includes(role) && (
                  <button onClick={() => handleClose(showDetail._id)} className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 text-sm">
                    <FiLock size={14} /> Close Review
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white z-10">
              <h2 className="text-lg font-bold">{editId ? 'Edit Review' : 'New Performance Review'}</h2>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="text-gray-400 hover:text-gray-600"><FiX size={20} /></button>
            </div>
            <form onSubmit={handleSubmitForm} className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Employee *</label>
                  <select
                    required
                    disabled={!!editId}
                    value={form.employeeId}
                    onChange={e => setForm(f => ({ ...f, employeeId: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">Select employee</option>
                    {employees.map(emp => (
                      <option key={emp._id} value={emp._id}>{emp.firstName} {emp.lastName} ({emp.employeeId})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Period *</label>
                  <select
                    required
                    value={form.period}
                    onChange={e => setForm(f => ({ ...f, period: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  >
                    {periods.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Year *</label>
                  <input
                    type="number"
                    required
                    value={form.year}
                    onChange={e => setForm(f => ({ ...f, year: parseInt(e.target.value) }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    min={2020}
                    max={2030}
                  />
                </div>
              </div>

              {/* KPIs */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium text-gray-700">KPIs</label>
                  <button type="button" onClick={addKpi} className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1">
                    <FiPlus size={12} /> Add KPI
                  </button>
                </div>
                <div className="space-y-3">
                  {form.kpis.map((kpi, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-start bg-gray-50 rounded-lg p-3">
                      <div className="col-span-3">
                        <input
                          placeholder="KPI Name"
                          value={kpi.name}
                          onChange={e => updateKpi(idx, 'name', e.target.value)}
                          className="w-full border rounded px-2 py-1.5 text-sm"
                        />
                      </div>
                      <div className="col-span-3">
                        <input
                          placeholder="Target"
                          value={kpi.target}
                          onChange={e => updateKpi(idx, 'target', e.target.value)}
                          className="w-full border rounded px-2 py-1.5 text-sm"
                        />
                      </div>
                      <div className="col-span-3">
                        <input
                          placeholder="Achieved"
                          value={kpi.achieved}
                          onChange={e => updateKpi(idx, 'achieved', e.target.value)}
                          className="w-full border rounded px-2 py-1.5 text-sm"
                        />
                      </div>
                      <div className="col-span-2">
                        <StarRating value={kpi.rating} onChange={(v) => updateKpi(idx, 'rating', v)} />
                      </div>
                      <div className="col-span-1 flex justify-end">
                        {form.kpis.length > 1 && (
                          <button type="button" onClick={() => removeKpi(idx)} className="p-1 text-red-400 hover:text-red-600">
                            <FiTrash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Overall Rating *</label>
                <StarRating value={form.overallRating} onChange={(v) => setForm(f => ({ ...f, overallRating: v }))} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Strengths</label>
                  <textarea
                    value={form.strengths}
                    onChange={e => setForm(f => ({ ...f, strengths: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Areas for Improvement</label>
                  <textarea
                    value={form.improvements}
                    onChange={e => setForm(f => ({ ...f, improvements: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    rows={3}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Manager Comments</label>
                <textarea
                  value={form.managerComments}
                  onChange={e => setForm(f => ({ ...f, managerComments: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Recommendation</label>
                <select
                  value={form.recommendation}
                  onChange={e => setForm(f => ({ ...f, recommendation: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                >
                  {recommendations.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => { setShowModal(false); resetForm(); }} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700">
                  {editId ? 'Update' : 'Create'} Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PerformanceReviews;
