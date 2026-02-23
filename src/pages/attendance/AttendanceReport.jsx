import { useState, useEffect } from 'react';
import { getAttendanceReportAPI } from '../../api/axios';
import { toast } from 'react-toastify';
import { FiBarChart2 } from 'react-icons/fi';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const AttendanceReport = () => {
  const [report, setReport] = useState([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await getAttendanceReportAPI({ month, year });
      setReport(res.data);
    } catch { toast.error('Failed to load report'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchReport(); }, [month, year]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2"><FiBarChart2 /> Attendance Report</h1>

      <div className="bg-white rounded-xl shadow-sm border p-4 mb-4 flex gap-3">
        <select value={month} onChange={e => setMonth(Number(e.target.value))}
          className="border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500">
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i + 1} value={i + 1}>
              {new Date(2000, i).toLocaleString('default', { month: 'long' })}
            </option>
          ))}
        </select>
        <input type="number" value={year} onChange={e => setYear(Number(e.target.value))}
          className="border rounded-lg px-3 py-2 text-sm w-24 outline-none focus:ring-2 focus:ring-primary-500" />
      </div>

      {/* Chart */}
      {report.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border p-5 mb-6">
          <h3 className="font-semibold text-gray-800 mb-4">Attendance Overview</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={report.map(r => ({
              name: `${r.firstName} ${r.lastName?.charAt(0)}.`,
              Present: r.present,
              Late: r.late,
              Absent: r.absent,
              Leave: r.onLeave
            }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" fontSize={12} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="Present" fill="#10b981" />
              <Bar dataKey="Late" fill="#f59e0b" />
              <Bar dataKey="Absent" fill="#ef4444" />
              <Bar dataKey="Leave" fill="#8b5cf6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Employee</th>
                <th className="text-center px-4 py-3 font-medium text-green-600">Present</th>
                <th className="text-center px-4 py-3 font-medium text-amber-600">Late</th>
                <th className="text-center px-4 py-3 font-medium text-red-600">Absent</th>
                <th className="text-center px-4 py-3 font-medium text-yellow-600">Half Day</th>
                <th className="text-center px-4 py-3 font-medium text-purple-600">On Leave</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Total Hours</th>
                <th className="text-center px-4 py-3 font-medium text-blue-600">Overtime</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td colSpan="8" className="text-center py-10 text-gray-400">Loading...</td></tr>
              ) : report.length === 0 ? (
                <tr><td colSpan="8" className="text-center py-10 text-gray-400">No data available</td></tr>
              ) : report.map(r => (
                <tr key={r._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{r.firstName} {r.lastName}</p>
                    <p className="text-xs text-gray-500">{r.employeeId}</p>
                  </td>
                  <td className="px-4 py-3 text-center text-green-700 font-medium">{r.present}</td>
                  <td className="px-4 py-3 text-center text-amber-700">{r.late}</td>
                  <td className="px-4 py-3 text-center text-red-700">{r.absent}</td>
                  <td className="px-4 py-3 text-center text-yellow-700">{r.halfDay}</td>
                  <td className="px-4 py-3 text-center text-purple-700">{r.onLeave}</td>
                  <td className="px-4 py-3 text-center text-gray-700">{r.totalHours?.toFixed(1)}</td>
                  <td className="px-4 py-3 text-center text-blue-700">{r.totalOvertime?.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AttendanceReport;
