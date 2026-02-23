import { useState, useEffect } from 'react';
import { getPayrollAPI, getPayslipAPI } from '../../api/axios';
import { toast } from 'react-toastify';
import { Link } from 'react-router-dom';
import { FiDollarSign, FiFileText, FiPlus } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';

const PayrollList = () => {
  const { user } = useAuth();
  const [payrolls, setPayrolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    fetchPayroll();
  }, [month, year, statusFilter]);

  const fetchPayroll = async () => {
    setLoading(true);
    try {
      const res = await getPayrollAPI({ month: month || undefined, year, status: statusFilter || undefined, limit: 50 });
      setPayrolls(res.data.payrolls);
    } catch { toast.error('Failed to load payroll'); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><FiDollarSign /> Payroll</h1>
        {user?.role === 'hr' && (
          <Link to="/payroll/process" className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 text-sm">
            <FiPlus /> Process Payroll
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border p-4 mb-4 flex gap-3">
        <select value={month} onChange={e => setMonth(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500">
          <option value="">All Months</option>
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i + 1} value={i + 1}>
              {new Date(2000, i).toLocaleString('default', { month: 'long' })}
            </option>
          ))}
        </select>
        <input type="number" value={year} onChange={e => setYear(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm w-24 outline-none focus:ring-2 focus:ring-primary-500" />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500">
          <option value="">All Status</option>
          <option value="Draft">Draft</option>
          <option value="Processed">Processed</option>
          <option value="Paid">Paid</option>
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Employee</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Month</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Gross</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Deductions</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Net Salary</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td colSpan="7" className="text-center py-10 text-gray-400">Loading...</td></tr>
              ) : payrolls.length === 0 ? (
                <tr><td colSpan="7" className="text-center py-10 text-gray-400">No payroll records found</td></tr>
              ) : payrolls.map(p => (
                <tr key={p._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{p.employee?.firstName} {p.employee?.lastName}</p>
                    <p className="text-xs text-gray-500">{p.employee?.employeeId} • {p.employee?.department?.name}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {new Date(2000, p.month - 1).toLocaleString('default', { month: 'short' })} {p.year}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700">₹{p.grossSalary?.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-red-600">₹{p.totalDeductions?.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-bold text-green-700">₹{p.netSalary?.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      p.status === 'Paid' ? 'bg-green-100 text-green-700' :
                      p.status === 'Processed' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>{p.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <button className="text-blue-600 hover:text-blue-800" title="View Payslip">
                      <FiFileText size={16} />
                    </button>
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

export default PayrollList;
