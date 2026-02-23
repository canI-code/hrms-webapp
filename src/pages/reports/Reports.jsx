import { useState, useEffect } from 'react';
import { getReportsAPI, exportEmployeesAPI, exportPayrollAPI, exportAttendanceAPI, exportLeavesAPI } from '../../api/axios';
import { toast } from 'react-toastify';
import { FiBarChart2, FiUsers, FiCalendar, FiDollarSign, FiDownload } from 'react-icons/fi';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

const Reports = () => {
  const [data, setData] = useState(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchReports(); }, [year]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await getReportsAPI({ year });
      setData(res.data);
    } catch { toast.error('Failed to load reports'); }
    finally { setLoading(false); }
  };

  const downloadBlob = (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleExport = async (type) => {
    try {
      let res;
      switch (type) {
        case 'employees': res = await exportEmployeesAPI(); downloadBlob(new Blob([res.data]), 'employees.xlsx'); break;
        case 'payroll': res = await exportPayrollAPI({ year }); downloadBlob(new Blob([res.data]), `payroll_${year}.xlsx`); break;
        case 'attendance': res = await exportAttendanceAPI({ year }); downloadBlob(new Blob([res.data]), `attendance_${year}.xlsx`); break;
        case 'leaves': res = await exportLeavesAPI(); downloadBlob(new Blob([res.data]), 'leaves.xlsx'); break;
      }
      toast.success('Export downloaded');
    } catch { toast.error('Export failed'); }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>;
  if (!data) return null;

  // Transform data for charts
  const growthData = MONTHS.map((m, i) => ({
    month: m,
    hires: data.employeeGrowth.find(e => e._id === i + 1)?.count || 0
  }));

  const attendanceData = MONTHS.map((m, i) => {
    const d = data.attendanceTrends.find(a => a._id === i + 1);
    return { month: m, Present: d?.totalPresent || 0, Late: d?.totalLate || 0, Absent: d?.totalAbsent || 0 };
  });

  const payrollData = MONTHS.map((m, i) => {
    const d = data.payrollExpenses.find(p => p._id === i + 1);
    return { month: m, Gross: d?.totalGross || 0, Net: d?.totalNet || 0, Deductions: d?.totalDeductions || 0 };
  });

  // Leave trends aggregated by month
  const leaveMonthly = {};
  data.leaveTrends.forEach(lt => {
    const m = lt._id.month;
    if (!leaveMonthly[m]) leaveMonthly[m] = { Applied: 0, Approved: 0, Rejected: 0 };
    if (lt._id.status === 'Approved') leaveMonthly[m].Approved += lt.count;
    else if (lt._id.status === 'Rejected') leaveMonthly[m].Rejected += lt.count;
    else leaveMonthly[m].Applied += lt.count;
  });
  const leaveData = MONTHS.map((m, i) => ({
    month: m,
    Applied: leaveMonthly[i + 1]?.Applied || 0,
    Approved: leaveMonthly[i + 1]?.Approved || 0,
    Rejected: leaveMonthly[i + 1]?.Rejected || 0,
  }));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <FiBarChart2 /> Reports & Analytics
        </h1>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Year:</label>
          <input type="number" value={year} onChange={e => setYear(parseInt(e.target.value) || new Date().getFullYear())}
            className="border rounded-lg px-3 py-2 text-sm w-24 outline-none focus:ring-2 focus:ring-primary-500" />
        </div>
      </div>

      {/* Export buttons */}
      <div className="bg-white rounded-xl shadow-sm border p-4 mb-6 flex flex-wrap gap-2">
        <span className="text-sm text-gray-500 mr-2 flex items-center"><FiDownload className="mr-1" /> Export:</span>
        <button onClick={() => handleExport('employees')} className="text-xs bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-100">Employees</button>
        <button onClick={() => handleExport('payroll')} className="text-xs bg-green-50 text-green-700 px-3 py-1.5 rounded-lg hover:bg-green-100">Payroll ({year})</button>
        <button onClick={() => handleExport('attendance')} className="text-xs bg-yellow-50 text-yellow-700 px-3 py-1.5 rounded-lg hover:bg-yellow-100">Attendance ({year})</button>
        <button onClick={() => handleExport('leaves')} className="text-xs bg-purple-50 text-purple-700 px-3 py-1.5 rounded-lg hover:bg-purple-100">Leaves</button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center"><FiUsers className="text-blue-600" size={22} /></div>
          <div>
            <p className="text-xs text-gray-500">Active Employees</p>
            <p className="text-2xl font-bold text-gray-800">{data.summary.totalEmployees}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center"><FiCalendar className="text-yellow-600" size={22} /></div>
          <div>
            <p className="text-xs text-gray-500">Leave Requests ({year})</p>
            <p className="text-2xl font-bold text-gray-800">{data.summary.totalLeaves}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center"><FiDollarSign className="text-green-600" size={22} /></div>
          <div>
            <p className="text-xs text-gray-500">Total Payroll Cost ({year})</p>
            <p className="text-2xl font-bold text-gray-800">₹{data.summary.totalPayrollCost.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Employee Growth */}
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <h3 className="font-semibold text-gray-800 mb-4">Employee Hiring Trend</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={growthData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="hires" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Department Distribution */}
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <h3 className="font-semibold text-gray-800 mb-4">Department Distribution</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={data.departmentDistribution} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, count }) => `${name}: ${count}`}>
                {data.departmentDistribution.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Leave Trends */}
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <h3 className="font-semibold text-gray-800 mb-4">Leave Trends</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={leaveData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="Applied" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Approved" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Rejected" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Attendance Trends */}
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <h3 className="font-semibold text-gray-800 mb-4">Attendance Trends</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={attendanceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="Present" stroke="#10b981" strokeWidth={2} />
              <Line type="monotone" dataKey="Late" stroke="#f59e0b" strokeWidth={2} />
              <Line type="monotone" dataKey="Absent" stroke="#ef4444" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Payroll Expenses */}
        <div className="bg-white rounded-xl shadow-sm border p-5 lg:col-span-2">
          <h3 className="font-semibold text-gray-800 mb-4">Payroll Expenses</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={payrollData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={v => `₹${v.toLocaleString()}`} />
              <Legend />
              <Bar dataKey="Gross" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Deductions" fill="#ef4444" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Net" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Reports;
