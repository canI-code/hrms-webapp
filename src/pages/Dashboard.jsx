import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getDashboardAPI } from '../api/axios';
import { Link } from 'react-router-dom';
import {
  FiUsers, FiCalendar, FiDollarSign, FiClock, FiGrid, FiBell,
  FiAlertTriangle, FiUserPlus, FiTrendingUp, FiStar, FiCheckCircle, FiLogIn, FiFileText
} from 'react-icons/fi';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
const MONTHS = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const StatCard = ({ icon: Icon, label, value, color, sub }) => (
  <div className="bg-white rounded-xl shadow-sm border p-5 flex items-center gap-4">
    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${color}`}>
      <Icon className="text-white text-xl" />
    </div>
    <div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-gray-800">{value ?? '—'}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  </div>
);

const Dashboard = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboardAPI()
      .then(res => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const role = user?.role;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          Welcome back, {user?.name}!
        </h1>
        <p className="text-gray-500 capitalize">{role?.replace('_', ' ')} Dashboard</p>
      </div>

      {/* ═══════════ Super Admin Dashboard ═══════════ */}
      {role === 'super_admin' && data?.stats && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <StatCard icon={FiUsers} label="Total Employees" value={data.stats.totalEmployees} color="bg-blue-500" />
            <StatCard icon={FiUsers} label="Active Employees" value={data.stats.activeEmployees} color="bg-green-500" />
            <StatCard icon={FiCalendar} label="On Leave Today" value={data.stats.onLeaveToday} color="bg-purple-500" />
            <StatCard icon={FiGrid} label="Departments" value={data.stats.departments} color="bg-cyan-500" />
            <StatCard icon={FiCalendar} label="Pending Leaves" value={data.stats.pendingLeaves} color="bg-amber-500" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-xl shadow-sm border p-5">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Monthly Payroll Expenses</h3>
              {data.payrollSummary?.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={data.payrollSummary.map(s => ({ month: MONTHS[s._id], amount: s.totalNet }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(v) => `₹${v.toLocaleString()}`} />
                    <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-gray-400 text-center py-10">No payroll data yet</p>}
            </div>
            <div className="bg-white rounded-xl shadow-sm border p-5">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Department Distribution</h3>
              {data.departmentStats?.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={data.departmentStats} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={90}
                      label={({ name, count }) => `${name}: ${count}`}>
                      {data.departmentStats.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : <p className="text-gray-400 text-center py-10">No department data yet</p>}
            </div>
          </div>

          {/* Employees on Leave Today */}
          {data.employeesOnLeave?.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border p-5 mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <FiCalendar className="text-purple-500" /> Employees On Leave Today
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {data.employeesOnLeave.map((e, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                      <span className="text-sm font-medium text-purple-700">{e.name?.charAt(0)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{e.name}</p>
                      <p className="text-xs text-gray-500">{e.designation} {e.department ? `• ${e.department}` : ''}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="text-xs bg-purple-200 text-purple-800 px-2 py-1 rounded-full">On Leave</span>
                      <p className="text-[10px] text-gray-400 mt-1">Until {new Date(e.endDate).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ═══════════ HR Dashboard ═══════════ */}
      {role === 'hr' && data?.stats && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
            <StatCard icon={FiUsers} label="Active Employees" value={data.stats.totalEmployees} color="bg-blue-500" />
            <StatCard icon={FiCalendar} label="Pending Leaves" value={data.stats.pendingLeaves} color="bg-amber-500" />
            <StatCard icon={FiClock} label="Today Present" value={data.stats.todayAttendance} color="bg-green-500" />
            <StatCard icon={FiAlertTriangle} label="Late Today" value={data.stats.todayLate} color="bg-orange-500" />
            <StatCard icon={FiCalendar} label="On Leave Today" value={data.stats.onLeaveToday} color="bg-purple-500" />
            <StatCard icon={FiGrid} label="Departments" value={data.stats.totalDepartments} color="bg-cyan-500" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Attendance breakdown this month */}
            <div className="bg-white rounded-xl shadow-sm border p-5">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Monthly Attendance Overview</h3>
              {data.monthAttendanceSummary?.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={data.monthAttendanceSummary.map(s => ({ name: s._id, value: s.count }))}
                      dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                      label={({ name, value }) => `${name}: ${value}`}>
                      {data.monthAttendanceSummary.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : <p className="text-gray-400 text-center py-10">No data</p>}
            </div>

            {/* Payroll trend */}
            <div className="bg-white rounded-xl shadow-sm border p-5">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Payroll Trend ({new Date().getFullYear()})</h3>
              {data.payrollTrend?.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.payrollTrend.map(s => ({ month: MONTHS[s._id], total: s.totalNet, count: s.count }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(v) => `₹${v.toLocaleString()}`} />
                    <Bar dataKey="total" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-gray-400 text-center py-10">No payroll data</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Recent Hires */}
            <div className="bg-white rounded-xl shadow-sm border p-5">
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2"><FiUserPlus className="text-green-500" /> Recent Hires</h3>
              {data.recentHires?.length > 0 ? (
                <div className="space-y-2">
                  {data.recentHires.map(h => (
                    <div key={h._id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-sm">
                      <div>
                        <p className="font-medium text-gray-800">{h.firstName} {h.lastName}</p>
                        <p className="text-xs text-gray-500">{h.employeeId} • {h.designation}</p>
                      </div>
                      <span className="text-xs text-gray-400">{new Date(h.createdAt).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-gray-400 text-sm">No recent hires</p>}
            </div>

            {/* Upcoming Holidays */}
            <div className="bg-white rounded-xl shadow-sm border p-5">
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2"><FiStar className="text-amber-500" /> Upcoming Holidays</h3>
              {data.upcomingHolidays?.length > 0 ? (
                <div className="space-y-2">
                  {data.upcomingHolidays.map(h => (
                    <div key={h._id} className="flex items-center justify-between p-2 bg-amber-50 rounded-lg text-sm">
                      <p className="font-medium text-gray-800">{h.name}</p>
                      <span className="text-xs text-amber-700">{new Date(h.date).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-gray-400 text-sm">No upcoming holidays</p>}
            </div>

            {/* Employees by Role */}
            <div className="bg-white rounded-xl shadow-sm border p-5">
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2"><FiUsers className="text-blue-500" /> Staff by Role</h3>
              {data.employeesByRole?.length > 0 ? (
                <div className="space-y-2">
                  {data.employeesByRole.map(r => (
                    <div key={r._id} className="flex items-center justify-between p-2 bg-blue-50 rounded-lg text-sm">
                      <span className="font-medium text-gray-800 capitalize">{r._id?.replace('_', ' ')}</span>
                      <span className="font-bold text-blue-700">{r.count}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-gray-400 text-sm">No data</p>}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <Link to="/employees/new?role=employee" className="bg-white rounded-xl border p-4 text-center hover:bg-gray-50 transition">
              <FiUserPlus className="mx-auto text-2xl text-blue-500 mb-2" />
              <p className="text-sm font-medium text-gray-700">Add Employee</p>
            </Link>
            <Link to="/leaves/approvals" className="bg-white rounded-xl border p-4 text-center hover:bg-gray-50 transition">
              <FiCalendar className="mx-auto text-2xl text-amber-500 mb-2" />
              <p className="text-sm font-medium text-gray-700">Leave Approvals</p>
            </Link>
            <Link to="/attendance" className="bg-white rounded-xl border p-4 text-center hover:bg-gray-50 transition">
              <FiClock className="mx-auto text-2xl text-green-500 mb-2" />
              <p className="text-sm font-medium text-gray-700">Attendance</p>
            </Link>
            <Link to="/payroll/process" className="bg-white rounded-xl border p-4 text-center hover:bg-gray-50 transition">
              <FiDollarSign className="mx-auto text-2xl text-purple-500 mb-2" />
              <p className="text-sm font-medium text-gray-700">Process Payroll</p>
            </Link>
          </div>

          {/* Employees on Leave Today */}
          {data.employeesOnLeave?.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border p-5 mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <FiCalendar className="text-purple-500" /> Employees On Leave Today
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {data.employeesOnLeave.map((e, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                      <span className="text-sm font-medium text-purple-700">{e.name?.charAt(0)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{e.name}</p>
                      <p className="text-xs text-gray-500">{e.designation} {e.department ? `• ${e.department}` : ''}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="text-xs bg-purple-200 text-purple-800 px-2 py-1 rounded-full">On Leave</span>
                      <p className="text-[10px] text-gray-400 mt-1">Until {new Date(e.endDate).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ═══════════ Manager Dashboard ═══════════ */}
      {role === 'manager' && data?.stats && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <StatCard icon={FiUsers} label="Team Size" value={data.stats.teamSize} color="bg-blue-500" />
            <StatCard icon={FiClock} label="Present Today" value={data.stats.todayAttendance} color="bg-green-500" />
            <StatCard icon={FiAlertTriangle} label="Late Today" value={data.stats.todayLate} color="bg-orange-500" />
            <StatCard icon={FiCalendar} label="On Leave Today" value={data.stats.onLeaveToday} color="bg-purple-500" />
            <StatCard icon={FiCalendar} label="Pending Leaves" value={data.stats.pendingLeaves} color="bg-amber-500" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Team Attendance chart */}
            <div className="bg-white rounded-xl shadow-sm border p-5">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Team Attendance This Month</h3>
              {data.teamMonthAttendance?.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={data.teamMonthAttendance.map(s => ({ name: s._id, value: s.count }))}
                      dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                      label={({ name, value }) => `${name}: ${value}`}>
                      {data.teamMonthAttendance.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : <p className="text-gray-400 text-center py-10">No data</p>}
            </div>

            {/* Pending leave requests */}
            <div className="bg-white rounded-xl shadow-sm border p-5">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <FiCalendar className="text-amber-500" /> Pending Leave Requests
              </h3>
              {data.recentLeaveRequests?.length > 0 ? (
                <div className="space-y-2">
                  {data.recentLeaveRequests.map(l => (
                    <div key={l._id} className="flex items-center justify-between p-3 bg-amber-50 rounded-lg text-sm">
                      <div>
                        <p className="font-medium text-gray-800">{l.employee?.firstName} {l.employee?.lastName}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(l.startDate).toLocaleDateString()} — {new Date(l.endDate).toLocaleDateString()}
                        </p>
                      </div>
                      <span className="text-xs bg-amber-200 text-amber-800 px-2 py-1 rounded-full">Pending</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-gray-400 text-sm">No pending requests</p>}
              <Link to="/leaves/approvals" className="block text-center text-sm text-primary-600 hover:underline mt-3">View All</Link>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Team on leave */}
            <div className="bg-white rounded-xl shadow-sm border p-5">
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2"><FiCalendar className="text-purple-500" /> Team On Leave Today</h3>
              {data.teamOnLeave?.length > 0 ? (
                <div className="space-y-2">
                  {data.teamOnLeave.map((l, i) => (
                    <div key={i} className="p-2 bg-purple-50 rounded-lg text-sm">
                      <p className="font-medium">{l.name}</p>
                      <p className="text-xs text-gray-500">Until {new Date(l.endDate).toLocaleDateString()}</p>
                    </div>
                  ))}
                </div>
              ) : <p className="text-gray-400 text-sm">No one on leave today</p>}
            </div>

            {/* Upcoming leaves */}
            <div className="bg-white rounded-xl shadow-sm border p-5">
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2"><FiTrendingUp className="text-blue-500" /> Upcoming Team Leaves</h3>
              {data.upcomingLeaves?.length > 0 ? (
                <div className="space-y-2">
                  {data.upcomingLeaves.map(l => (
                    <div key={l._id} className="p-2 bg-blue-50 rounded-lg text-sm">
                      <p className="font-medium">{l.employee?.firstName} {l.employee?.lastName}</p>
                      <p className="text-xs text-gray-500">{new Date(l.startDate).toLocaleDateString()} — {new Date(l.endDate).toLocaleDateString()}</p>
                    </div>
                  ))}
                </div>
              ) : <p className="text-gray-400 text-sm">No upcoming leaves</p>}
            </div>

            {/* Holidays */}
            <div className="bg-white rounded-xl shadow-sm border p-5">
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2"><FiStar className="text-amber-500" /> Upcoming Holidays</h3>
              {data.upcomingHolidays?.length > 0 ? (
                <div className="space-y-2">
                  {data.upcomingHolidays.map(h => (
                    <div key={h._id} className="flex justify-between p-2 bg-amber-50 rounded-lg text-sm">
                      <span className="font-medium">{h.name}</span>
                      <span className="text-xs text-amber-700">{new Date(h.date).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-gray-400 text-sm">No upcoming holidays</p>}
            </div>
          </div>

          {/* Team Members */}
          {data.teamMembers?.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border p-5 mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Team Members</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {data.teamMembers.map(m => (
                  <div key={m._id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                      <span className="text-sm font-medium text-primary-700">{m.name.charAt(0)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{m.name}</p>
                      <p className="text-xs text-gray-500">{m.designation} {m.department ? `• ${m.department}` : ''}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full flex-shrink-0 ${
                      m.status === 'On Leave' ? 'bg-purple-100 text-purple-700' :
                      m.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                    }`}>{m.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ═══════════ Employee Dashboard ═══════════ */}
      {role === 'employee' && data?.stats && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard icon={FiClock} label="Present (Month)" value={data.stats.presentDays} color="bg-green-500"
              sub={data.stats.lateDays > 0 ? `${data.stats.lateDays} late` : undefined} />
            <StatCard icon={FiAlertTriangle} label="Late Minutes" value={data.stats.totalLateMinutes} color="bg-orange-500"
              sub={`${data.stats.totalWorkingHours} hrs worked`} />
            <StatCard icon={FiCalendar} label="Pending Leaves" value={data.stats.pendingLeaves} color="bg-amber-500" />
            <StatCard icon={FiDollarSign} label="Last Salary" value={`₹${(data.stats.lastSalary || 0).toLocaleString()}`} color="bg-blue-500" />
          </div>

          {/* Info bar */}
          <div className="bg-gradient-to-r from-primary-50 to-blue-50 rounded-xl border border-primary-200 p-4 mb-6 flex flex-wrap items-center gap-4 text-sm">
            <span className="text-gray-600">Department: <strong>{data.stats.department}</strong></span>
            <span className="text-gray-400">|</span>
            <span className="text-gray-600">Designation: <strong>{data.stats.designation || '—'}</strong></span>
            {data.stats.manager && (
              <>
                <span className="text-gray-400">|</span>
                <span className="text-gray-600">Manager: <strong>{data.stats.manager}</strong></span>
              </>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Today's Status */}
            <div className="bg-white rounded-xl shadow-sm border p-5">
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2"><FiLogIn className="text-green-500" /> Today's Attendance</h3>
              {data.todayAttendance ? (
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Morning In</p>
                    <p className="font-semibold">{data.todayAttendance.morningCheckIn ? new Date(data.todayAttendance.morningCheckIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Morning Out</p>
                    <p className="font-semibold">{data.todayAttendance.morningCheckOut ? new Date(data.todayAttendance.morningCheckOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Afternoon In</p>
                    <p className="font-semibold">{data.todayAttendance.afternoonCheckIn ? new Date(data.todayAttendance.afternoonCheckIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Afternoon Out</p>
                    <p className="font-semibold">{data.todayAttendance.afternoonCheckOut ? new Date(data.todayAttendance.afternoonCheckOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</p>
                  </div>
                  <div className="col-span-2 flex items-center gap-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      data.todayAttendance.status === 'Present' ? 'bg-green-100 text-green-700' :
                      data.todayAttendance.status === 'Late' ? 'bg-amber-100 text-amber-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>{data.todayAttendance.status}</span>
                    {data.todayAttendance.totalLateMinutes > 0 && (
                      <span className="text-xs text-amber-700">{data.todayAttendance.totalLateMinutes} min late</span>
                    )}
                    <span className="text-xs text-gray-500 ml-auto">{data.todayAttendance.workingHours?.toFixed(1)} hrs</span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-gray-400 mb-3">Not checked in today</p>
                  <Link to="/attendance" className="text-sm text-primary-600 hover:underline">Go to Attendance →</Link>
                </div>
              )}
            </div>

            {/* Leave Balance */}
            <div className="bg-white rounded-xl shadow-sm border p-5">
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2"><FiCalendar className="text-blue-500" /> Leave Balance</h3>
              {data.leaveBalance?.length > 0 ? (
                <div className="space-y-3">
                  {data.leaveBalance.map((lb, i) => (
                    <div key={i}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-700">{lb.type}</span>
                        <span className="text-gray-500">{lb.used}/{lb.total} used</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${Math.min((lb.used / lb.total) * 100, 100)}%` }}></div>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{lb.remaining} remaining</p>
                    </div>
                  ))}
                </div>
              ) : <p className="text-gray-400 text-sm py-4 text-center">No leave balances configured</p>}
              <Link to="/leaves/apply" className="block text-center text-sm text-primary-600 hover:underline mt-3">Apply for Leave →</Link>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Recent Leaves */}
            <div className="bg-white rounded-xl shadow-sm border p-5">
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2"><FiFileText className="text-purple-500" /> Recent Leaves</h3>
              {data.recentLeaves?.length > 0 ? (
                <div className="space-y-2">
                  {data.recentLeaves.map(l => (
                    <div key={l._id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-sm">
                      <div>
                        <p className="font-medium text-gray-700">{l.leaveType?.name || 'Leave'}</p>
                        <p className="text-xs text-gray-400">{new Date(l.startDate).toLocaleDateString()} — {new Date(l.endDate).toLocaleDateString()}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        l.status === 'Approved' ? 'bg-green-100 text-green-700' :
                        l.status === 'Pending' ? 'bg-amber-100 text-amber-700' :
                        l.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>{l.status}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-gray-400 text-sm">No leave records</p>}
            </div>

            {/* Payslip History */}
            <div className="bg-white rounded-xl shadow-sm border p-5">
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2"><FiDollarSign className="text-green-500" /> Recent Payslips</h3>
              {data.payslipHistory?.length > 0 ? (
                <div className="space-y-2">
                  {data.payslipHistory.map(p => (
                    <div key={p._id} className="flex items-center justify-between p-2 bg-green-50 rounded-lg text-sm">
                      <span className="font-medium text-gray-700">{MONTHS[p.month]} {p.year}</span>
                      <span className="font-bold text-green-700">₹{p.netSalary?.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-gray-400 text-sm">No payslips yet</p>}
              <Link to="/my-payslips" className="block text-center text-sm text-primary-600 hover:underline mt-3">View All Payslips →</Link>
            </div>

            {/* Upcoming Holidays */}
            <div className="bg-white rounded-xl shadow-sm border p-5">
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2"><FiStar className="text-amber-500" /> Upcoming Holidays</h3>
              {data.upcomingHolidays?.length > 0 ? (
                <div className="space-y-2">
                  {data.upcomingHolidays.map(h => (
                    <div key={h._id} className="flex justify-between p-2 bg-amber-50 rounded-lg text-sm">
                      <span className="font-medium">{h.name}</span>
                      <span className="text-xs text-amber-700">{new Date(h.date).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-gray-400 text-sm">No upcoming holidays</p>}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <Link to="/attendance" className="bg-white rounded-xl border p-4 text-center hover:bg-gray-50 transition">
              <FiCheckCircle className="mx-auto text-2xl text-green-500 mb-2" />
              <p className="text-sm font-medium text-gray-700">Check In</p>
            </Link>
            {user?.role !== 'hr' && (
              <Link to="/leaves/apply" className="bg-white rounded-xl border p-4 text-center hover:bg-gray-50 transition">
                <FiCalendar className="mx-auto text-2xl text-amber-500 mb-2" />
                <p className="text-sm font-medium text-gray-700">Apply Leave</p>
              </Link>
            )}
            <Link to="/my-payslips" className="bg-white rounded-xl border p-4 text-center hover:bg-gray-50 transition">
              <FiDollarSign className="mx-auto text-2xl text-blue-500 mb-2" />
              <p className="text-sm font-medium text-gray-700">My Payslips</p>
            </Link>
            <Link to="/profile" className="bg-white rounded-xl border p-4 text-center hover:bg-gray-50 transition">
              <FiUsers className="mx-auto text-2xl text-purple-500 mb-2" />
              <p className="text-sm font-medium text-gray-700">My Profile</p>
            </Link>
          </div>
        </>
      )}

      {/* ═══════════ Announcements (all roles) ═══════════ */}
      {data?.announcements?.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <FiBell className="text-amber-500" /> Recent Announcements
          </h3>
          <div className="space-y-3">
            {data.announcements.map(a => (
              <div key={a._id} className="p-3 bg-gray-50 rounded-lg border-l-4 border-primary-500">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-medium text-gray-800">{a.title}</h4>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    a.priority === 'Urgent' ? 'bg-red-100 text-red-700' :
                    a.priority === 'High' ? 'bg-amber-100 text-amber-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>{a.priority}</span>
                </div>
                <p className="text-sm text-gray-600">{a.content}</p>
                <p className="text-xs text-gray-400 mt-1">By {a.postedBy?.name} • {new Date(a.createdAt).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
