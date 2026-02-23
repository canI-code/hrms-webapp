import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { applyLeaveAPI, getLeaveTypesAPI, getLeaveBalanceAPI } from '../../api/axios';
import { toast } from 'react-toastify';
import { FiArrowLeft, FiSend } from 'react-icons/fi';

const LeaveApply = () => {
  const navigate = useNavigate();
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    leaveType: '', startDate: '', endDate: '', reason: ''
  });

  useEffect(() => {
    getLeaveTypesAPI().then(res => setLeaveTypes(res.data));
    getLeaveBalanceAPI().then(res => setBalances(res.data)).catch(() => {});
  }, []);

  const totalDays = form.startDate && form.endDate
    ? Math.max(1, Math.ceil((new Date(form.endDate) - new Date(form.startDate)) / (1000 * 60 * 60 * 24)) + 1)
    : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (totalDays <= 0) return toast.error('Invalid date range');
    setLoading(true);
    try {
      await applyLeaveAPI(form);
      toast.success('Leave applied successfully!');
      navigate('/leaves');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to apply leave');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-700"><FiArrowLeft size={20} /></button>
        <h1 className="text-2xl font-bold text-gray-800">Apply for Leave</h1>
      </div>

      {/* Leave Balances */}
      {balances.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {balances.map(b => (
            <div key={b._id} className="bg-white rounded-lg border p-3 text-center">
              <p className="text-xs text-gray-500">{b.leaveType?.name}</p>
              <p className="text-lg font-bold text-primary-700">{b.remaining}</p>
              <p className="text-xs text-gray-400">of {b.allocated} remaining</p>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Leave Type *</label>
          <select value={form.leaveType} onChange={e => setForm(p => ({ ...p, leaveType: e.target.value }))}
            className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" required>
            <option value="">Select leave type</option>
            {leaveTypes.map(t => <option key={t._id} value={t._id}>{t.name} ({t.daysPerYear} days/year)</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
            <input type="date" value={form.startDate} onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date *</label>
            <input type="date" value={form.endDate} min={form.startDate}
              onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" required />
          </div>
        </div>

        {totalDays > 0 && (
          <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-700">
            Total days: <span className="font-bold">{totalDays}</span>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Reason *</label>
          <textarea value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))}
            rows="3" className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" required
            placeholder="Provide reason for leave..." />
        </div>

        <div className="flex gap-3 justify-end">
          <button type="button" onClick={() => navigate(-1)}
            className="px-6 py-2.5 border rounded-lg text-sm hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={loading}
            className="flex items-center gap-2 bg-primary-600 text-white px-6 py-2.5 rounded-lg text-sm hover:bg-primary-700 disabled:opacity-50">
            <FiSend /> {loading ? 'Submitting...' : 'Submit Application'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default LeaveApply;
