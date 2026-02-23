import { useState, useEffect } from 'react';
import { checkInAPI, checkOutAPI, getAttendanceAPI } from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { FiClock, FiLogIn, FiLogOut, FiSun, FiSunset, FiAlertTriangle } from 'react-icons/fi';

const statusColors = {
  Present: 'bg-green-100 text-green-700',
  Absent: 'bg-red-100 text-red-700',
  Late: 'bg-amber-100 text-amber-700',
  'Half Day': 'bg-yellow-100 text-yellow-700',
  'On Leave': 'bg-purple-100 text-purple-700',
  Holiday: 'bg-blue-100 text-blue-700',
};

const fmtTime = (d) => d ? new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';

const AttendancePage = () => {
  const { user } = useAuth();
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [todayRecord, setTodayRecord] = useState(null);

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const res = await getAttendanceAPI({});
      setAttendance(res.data.attendance);
      const today = new Date().toDateString();
      const todayRec = res.data.attendance.find(
        a => new Date(a.date).toDateString() === today && a.employee?.user === user._id
      ) || res.data.attendance.find(
        a => new Date(a.date).toDateString() === today && String(a.employee?.user) === String(user._id)
      );
      setTodayRecord(todayRec || null);
    } catch { toast.error('Failed to load attendance'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAttendance(); }, []);

  const handleCheckIn = async () => {
    try {
      const res = await checkInAPI();
      const data = res.data;
      const msg = data.sessionLateMinutes > 0
        ? `Checked in (${data.currentSession}) — ${data.sessionLateMinutes} min late`
        : `Checked in for ${data.currentSession} session!`;
      toast.success(msg);
      fetchAttendance();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Check-in failed');
    }
  };

  const handleCheckOut = async () => {
    try {
      await checkOutAPI();
      toast.success('Checked out!');
      fetchAttendance();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Check-out failed');
    }
  };

  const now = new Date();
  const currentHour = now.getHours();
  const isMorning = currentHour < 12;
  const morningDone = todayRecord?.morningCheckIn && todayRecord?.morningCheckOut;
  const afternoonDone = todayRecord?.afternoonCheckIn && todayRecord?.afternoonCheckOut;

  // Can check in: morning session open if no morning checkin, afternoon open if no afternoon checkin
  const canCheckIn = isMorning ? !todayRecord?.morningCheckIn : !todayRecord?.afternoonCheckIn;
  // Can check out: has an open session (checked in but not checked out)
  const canCheckOut = todayRecord && (
    (todayRecord.morningCheckIn && !todayRecord.morningCheckOut) ||
    (todayRecord.afternoonCheckIn && !todayRecord.afternoonCheckOut)
  );

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2"><FiClock /> Attendance</h1>

      {/* Today's Session Cards */}
      {['employee', 'manager', 'hr'].includes(user?.role) && (
        <div className="mb-6 space-y-4">
          <div className="bg-white rounded-xl shadow-sm border p-5">
            <p className="text-lg font-semibold text-gray-800 mb-1">
              {now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            <p className="text-xs text-gray-400 mb-4">Current time: {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
              {/* Morning session */}
              <div className={`rounded-lg border-2 p-4 ${isMorning ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-gray-50'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <FiSun className="text-amber-500" />
                  <span className="font-semibold text-gray-800">Morning Session</span>
                  <span className="text-xs text-gray-400 ml-auto">9:00 AM – 12:00 PM</span>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div><span className="text-gray-500">In:</span> <span className="font-medium">{fmtTime(todayRecord?.morningCheckIn)}</span></div>
                  <div><span className="text-gray-500">Out:</span> <span className="font-medium">{fmtTime(todayRecord?.morningCheckOut)}</span></div>
                  {todayRecord?.morningLateMinutes > 0 && (
                    <span className="flex items-center gap-1 text-xs text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                      <FiAlertTriangle size={12} /> {todayRecord.morningLateMinutes} min late
                    </span>
                  )}
                </div>
                {morningDone && <p className="text-xs text-green-600 mt-1 font-medium">✓ Completed</p>}
              </div>

              {/* Afternoon session */}
              <div className={`rounded-lg border-2 p-4 ${!isMorning ? 'border-orange-300 bg-orange-50' : 'border-gray-200 bg-gray-50'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <FiSunset className="text-orange-500" />
                  <span className="font-semibold text-gray-800">Afternoon Session</span>
                  <span className="text-xs text-gray-400 ml-auto">1:00 PM – 5:00 PM</span>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div><span className="text-gray-500">In:</span> <span className="font-medium">{fmtTime(todayRecord?.afternoonCheckIn)}</span></div>
                  <div><span className="text-gray-500">Out:</span> <span className="font-medium">{fmtTime(todayRecord?.afternoonCheckOut)}</span></div>
                  {todayRecord?.afternoonLateMinutes > 0 && (
                    <span className="flex items-center gap-1 text-xs text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                      <FiAlertTriangle size={12} /> {todayRecord.afternoonLateMinutes} min late
                    </span>
                  )}
                </div>
                {afternoonDone && <p className="text-xs text-green-600 mt-1 font-medium">✓ Completed</p>}
              </div>
            </div>

            {/* Summary row */}
            {todayRecord && (
              <div className="flex items-center gap-4 text-sm border-t pt-3">
                <span className="text-gray-500">Total Hours: <strong>{todayRecord.workingHours?.toFixed(1) || '0'}</strong></span>
                {todayRecord.totalLateMinutes > 0 && (
                  <span className="text-amber-700 flex items-center gap-1"><FiAlertTriangle size={13} /> Total Late: <strong>{todayRecord.totalLateMinutes} min</strong></span>
                )}
                <span className={`text-xs px-2 py-1 rounded-full ${statusColors[todayRecord.status] || 'bg-gray-100'}`}>
                  {todayRecord.status}
                </span>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3 mt-4">
              <button onClick={handleCheckIn} disabled={!canCheckIn}
                className="flex items-center gap-2 bg-green-600 text-white px-5 py-2.5 rounded-lg text-sm hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition">
                <FiLogIn /> Check In {isMorning ? '(Morning)' : '(Afternoon)'}
              </button>
              <button onClick={handleCheckOut} disabled={!canCheckOut}
                className="flex items-center gap-2 bg-red-600 text-white px-5 py-2.5 rounded-lg text-sm hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition">
                <FiLogOut /> Check Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Attendance History */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="px-4 py-3 border-b">
          <h3 className="font-semibold text-gray-800">This Month's Attendance</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                {['super_admin', 'hr', 'manager'].includes(user?.role) && (
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Employee</th>
                )}
                <th className="text-left px-4 py-3 font-medium text-gray-600">Morning In</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Morning Out</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Afternoon In</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Afternoon Out</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Hours</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Late</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td colSpan="9" className="text-center py-10 text-gray-400">Loading...</td></tr>
              ) : attendance.length === 0 ? (
                <tr><td colSpan="9" className="text-center py-10 text-gray-400">No attendance records this month</td></tr>
              ) : attendance.map(a => (
                <tr key={a._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-700">{new Date(a.date).toLocaleDateString()}</td>
                  {['super_admin', 'hr', 'manager'].includes(user?.role) && (
                    <td className="px-4 py-3 text-gray-700">{a.employee?.firstName} {a.employee?.lastName}</td>
                  )}
                  <td className="px-4 py-3 text-gray-600">{fmtTime(a.morningCheckIn)}</td>
                  <td className="px-4 py-3 text-gray-600">{fmtTime(a.morningCheckOut)}</td>
                  <td className="px-4 py-3 text-gray-600">{fmtTime(a.afternoonCheckIn)}</td>
                  <td className="px-4 py-3 text-gray-600">{fmtTime(a.afternoonCheckOut)}</td>
                  <td className="px-4 py-3 text-gray-700 font-medium">{a.workingHours?.toFixed(1) || '—'}</td>
                  <td className="px-4 py-3">
                    {a.totalLateMinutes > 0 ? (
                      <span className="text-xs text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">{a.totalLateMinutes}m</span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${statusColors[a.status] || 'bg-gray-100'}`}>
                      {a.status}
                    </span>
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

export default AttendancePage;
