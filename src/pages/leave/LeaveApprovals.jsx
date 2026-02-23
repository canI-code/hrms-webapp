import { useState, useEffect } from 'react';
import { getLeavesAPI, managerLeaveActionAPI, hrLeaveActionAPI } from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { FiCheck, FiX, FiInfo } from 'react-icons/fi';

const LeaveApprovals = () => {
  const { user } = useAuth();
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [activeId, setActiveId] = useState(null);

  const isManager = user?.role === 'manager';
  const isHR = user?.role === 'hr';

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const res = await getLeavesAPI({ limit: 100 });
      let filtered = res.data.leaves;

      if (isManager) {
        // Manager sees Pending leaves from their team + HR staff
        filtered = filtered.filter(l =>
          l.status === 'Pending' &&
          l.appliedBy?.toString() !== user._id?.toString()
        );
      } else if (isHR) {
        // HR sees Approved_By_Manager leaves (ready for HR final) + Pending (HR override)
        // Excludes their own leaves — another HR or manager handles those
        filtered = filtered.filter(l =>
          ['Pending', 'Approved_By_Manager'].includes(l.status) &&
          l.appliedBy?.toString() !== user._id?.toString()
        );
      }

      setLeaves(filtered);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchLeaves(); }, []);

  const handleAction = async (leaveId, action) => {
    try {
      if (isManager) {
        await managerLeaveActionAPI(leaveId, { action, comment });
      } else {
        await hrLeaveActionAPI(leaveId, { action, comment });
      }
      toast.success(`Leave ${action.toLowerCase()}`);
      setComment('');
      setActiveId(null);
      fetchLeaves();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Leave Approvals</h1>
        <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
          {isManager ? 'Manager Approval' : 'HR Final Approval'}
        </span>
      </div>

      {/* Leave flow info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex items-start gap-3">
        <FiInfo className="text-blue-500 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-blue-700">
          {isManager ? (
            <>
              <p><strong>Approval Flow:</strong> Employee applies → <span className="font-bold underline">You approve/reject</span> → HR final approval</p>
              <p className="mt-1 text-blue-600 text-xs">
                You may also see HR staff leave requests here. If no other HR is available, your approval will be final.
              </p>
            </>
          ) : (
            <>
              <p><strong>Approval Flow:</strong> Employee applies → Manager approves → <span className="font-bold underline">You give final approval</span></p>
              <p className="mt-1 text-blue-600 text-xs">
                Leaves marked "Pending" haven't been reviewed by a manager yet. Approving them will override the manager step.
                Your own leave requests are excluded — a manager or another HR will handle those.
              </p>
            </>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-10 text-gray-400">Loading...</div>
        ) : leaves.length === 0 ? (
          <div className="bg-white rounded-xl border p-10 text-center text-gray-400">
            No pending leave requests
          </div>
        ) : leaves.map(leave => (
          <div key={leave._id} className="bg-white rounded-xl shadow-sm border p-5">
            <div className="flex flex-col sm:flex-row justify-between gap-4">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-800">
                  {leave.employee?.firstName} {leave.employee?.lastName}
                  <span className="text-xs text-gray-400 ml-2">({leave.employee?.employeeId})</span>
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  <span className="font-medium">{leave.leaveType?.name}</span> •{' '}
                  {new Date(leave.startDate).toLocaleDateString()} to {new Date(leave.endDate).toLocaleDateString()} •{' '}
                  <span className="font-medium">{leave.totalDays} days</span>
                </p>
                <p className="text-sm text-gray-600 mt-2">Reason: {leave.reason}</p>

                {/* Manager approval info */}
                {leave.managerApproval?.status !== 'Pending' && (
                  <p className="text-xs text-gray-400 mt-2">
                    Manager: <span className={leave.managerApproval?.status === 'Approved' ? 'text-green-600' : 'text-red-600'}>
                      {leave.managerApproval?.status}
                    </span>
                    {leave.managerApproval?.comment && ` — "${leave.managerApproval.comment}"`}
                  </p>
                )}

                {/* Status badge with step indicator */}
                <div className="flex items-center gap-2 mt-2">
                  <span className={`inline-block text-xs px-2 py-1 rounded-full ${
                    leave.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' :
                    leave.status === 'Approved_By_Manager' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {leave.status === 'Pending' ? 'Pending Manager Approval' :
                     leave.status === 'Approved_By_Manager' ? 'Awaiting HR Final Approval' :
                     leave.status.replace('_', ' ')}
                  </span>
                  {/* HR override warning for Pending leaves */}
                  {isHR && leave.status === 'Pending' && (
                    <span className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded-full">
                      HR Override
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-2 min-w-[140px]">
                {/* Show action buttons based on role and leave status */}
                {((isManager && leave.status === 'Pending') ||
                  (isHR && ['Pending', 'Approved_By_Manager'].includes(leave.status))) && (
                  <>
                    {activeId === leave._id && (
                      <input
                        type="text"
                        value={comment}
                        onChange={e => setComment(e.target.value)}
                        placeholder="Comment (optional)"
                        className="px-3 py-1.5 border rounded-lg text-xs focus:ring-2 focus:ring-primary-500 outline-none"
                      />
                    )}
                    {activeId !== leave._id ? (
                      <button onClick={() => setActiveId(leave._id)}
                        className="text-sm text-primary-600 hover:text-primary-700">
                        Take Action
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <button onClick={() => handleAction(leave._id, 'Approved')}
                          className="flex-1 flex items-center justify-center gap-1 bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-green-700">
                          <FiCheck /> Approve
                        </button>
                        <button onClick={() => handleAction(leave._id, 'Rejected')}
                          className="flex-1 flex items-center justify-center gap-1 bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-red-700">
                          <FiX /> Reject
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LeaveApprovals;
