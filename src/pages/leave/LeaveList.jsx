import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getLeavesAPI, cancelLeaveAPI, endLeaveEarlyAPI } from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { FiPlus, FiXCircle, FiLogIn } from 'react-icons/fi';

const statusColors = {
  Pending: 'bg-yellow-100 text-yellow-700',
  Approved_By_Manager: 'bg-blue-100 text-blue-700',
  Approved: 'bg-green-100 text-green-700',
  Rejected: 'bg-red-100 text-red-700',
  Cancelled: 'bg-gray-100 text-gray-500',
};

const LeaveList = () => {
  const { user } = useAuth();
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  const isSuperAdmin = user?.role === 'super_admin';

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const res = await getLeavesAPI({ status: statusFilter, limit: 50 });
      setLeaves(res.data.leaves);
    } catch { toast.error('Failed to load leaves'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchLeaves(); }, [statusFilter]);

  const handleCancel = async (id) => {
    if (!confirm('Cancel this leave request?')) return;
    try {
      await cancelLeaveAPI(id);
      toast.success('Leave cancelled');
      fetchLeaves();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel');
    }
  };

  const handleEndEarly = async (id) => {
    if (!confirm('End this leave early and return to work? Remaining days will be refunded to your balance.')) return;
    try {
      const res = await endLeaveEarlyAPI(id);
      toast.success(res.data.message || 'Leave ended early');
      fetchLeaves();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to end leave early');
    }
  };

  // Check if a leave is currently active (today is within the leave period)
  const isLeaveActive = (leave) => {
    if (leave.status !== 'Approved') return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(leave.startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(leave.endDate);
    end.setHours(0, 0, 0, 0);
    return today >= start && today <= end;
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-800">{isSuperAdmin ? 'All Leaves' : 'My Leaves'}</h1>
        <div className="flex gap-3">
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500">
            <option value="">All Status</option>
            <option value="Pending">Pending</option>
            <option value="Approved_By_Manager">Awaiting HR Approval</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
            <option value="Cancelled">Cancelled</option>
          </select>
          {!isSuperAdmin && user?.role !== 'hr' && (
            <Link to="/leaves/apply" className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 text-sm">
              <FiPlus /> Apply Leave
            </Link>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['super_admin', 'hr', 'manager'].includes(user?.role) && (
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Employee</th>
                )}
                <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">From</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">To</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Days</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Reason</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td colSpan="8" className="text-center py-10 text-gray-400">Loading...</td></tr>
              ) : leaves.length === 0 ? (
                <tr><td colSpan="8" className="text-center py-10 text-gray-400">No leave records found</td></tr>
              ) : leaves.map(leave => (
                <tr key={leave._id} className="hover:bg-gray-50">
                  {['super_admin', 'hr', 'manager'].includes(user?.role) && (
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{leave.employee?.firstName} {leave.employee?.lastName}</p>
                      <p className="text-xs text-gray-500">{leave.employee?.employeeId}</p>
                    </td>
                  )}
                  <td className="px-4 py-3 text-gray-700">{leave.leaveType?.name || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{new Date(leave.startDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-gray-600">{new Date(leave.endDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-gray-700 font-medium">{leave.totalDays}</td>
                  <td className="px-4 py-3 text-gray-600 max-w-[200px] truncate">{leave.reason}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${statusColors[leave.status] || 'bg-gray-100'}`}>
                      {leave.status?.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {['Pending', 'Approved_By_Manager'].includes(leave.status) && !isSuperAdmin && (
                        <button onClick={() => handleCancel(leave._id)} className="text-red-600 hover:text-red-800" title="Cancel">
                          <FiXCircle size={16} />
                        </button>
                      )}
                      {isLeaveActive(leave) && !isSuperAdmin && (
                        <button onClick={() => handleEndEarly(leave._id)}
                          className="flex items-center gap-1 text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 px-2 py-1 rounded-full font-medium transition"
                          title="End leave early and return to work">
                          <FiLogIn size={12} /> End Early
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
    </div>
  );
};

export default LeaveList;
