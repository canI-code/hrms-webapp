import { useState, useEffect } from 'react';
import { getPayrollAPI, getPayslipAPI, downloadPayslipPDFAPI } from '../../api/axios';
import { toast } from 'react-toastify';
import { FiDollarSign, FiFileText, FiX, FiDownload } from 'react-icons/fi';

const MyPayslips = () => {
  const [payrolls, setPayrolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const [selectedPayslip, setSelectedPayslip] = useState(null);
  const [loadingSlip, setLoadingSlip] = useState(false);

  useEffect(() => { fetchPayroll(); }, [year]);

  const fetchPayroll = async () => {
    setLoading(true);
    try {
      const res = await getPayrollAPI({ year, limit: 50 });
      setPayrolls(res.data.payrolls);
    } catch { toast.error('Failed to load payslips'); }
    finally { setLoading(false); }
  };

  const viewPayslip = async (id) => {
    setLoadingSlip(true);
    try {
      const res = await getPayslipAPI(id);
      setSelectedPayslip(res.data);
    } catch { toast.error('Failed to load payslip details'); }
    finally { setLoadingSlip(false); }
  };

  const downloadPDF = async (id) => {
    try {
      const res = await downloadPayslipPDFAPI(id);
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `payslip_${id}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch { toast.error('Failed to download PDF'); }
  };

  const monthName = (m) => new Date(2000, m - 1).toLocaleString('default', { month: 'long' });

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        <FiDollarSign /> My Payslips
      </h1>

      {/* Year filter */}
      <div className="bg-white rounded-xl shadow-sm border p-4 mb-4 flex items-center gap-3">
        <label className="text-sm font-medium text-gray-600">Year:</label>
        <input type="number" value={year} onChange={e => setYear(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm w-24 outline-none focus:ring-2 focus:ring-primary-500" />
      </div>

      {/* Salary Structure Summary (from most recent payslip) */}
      {payrolls.length > 0 && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200 p-5 mb-6">
          <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <FiDollarSign className="text-green-600" /> Current Salary Structure
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-gray-500">Basic Salary</p>
              <p className="text-lg font-bold text-gray-800">₹{payrolls[0]?.basicSalary?.toLocaleString() || '0'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">HRA</p>
              <p className="text-lg font-bold text-gray-800">₹{payrolls[0]?.hra?.toLocaleString() || '0'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Allowances</p>
              <p className="text-lg font-bold text-gray-800">₹{payrolls[0]?.allowances?.toLocaleString() || '0'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Gross Salary</p>
              <p className="text-lg font-bold text-green-700">₹{payrolls[0]?.grossSalary?.toLocaleString() || '0'}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mt-4 pt-3 border-t border-green-200">
            <div>
              <p className="text-xs text-gray-500">PF</p>
              <p className="text-sm font-semibold text-red-600">- ₹{payrolls[0]?.deductions?.pf?.toLocaleString() || '0'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">ESI</p>
              <p className="text-sm font-semibold text-red-600">- ₹{payrolls[0]?.deductions?.esi?.toLocaleString() || '0'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Tax</p>
              <p className="text-sm font-semibold text-red-600">- ₹{payrolls[0]?.deductions?.tax?.toLocaleString() || '0'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Deductions</p>
              <p className="text-sm font-semibold text-red-600">- ₹{payrolls[0]?.totalDeductions?.toLocaleString() || '0'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Net (Take Home)</p>
              <p className="text-lg font-bold text-green-700">₹{payrolls[0]?.netSalary?.toLocaleString() || '0'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Payslip List */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="px-4 py-3 border-b">
          <h3 className="font-semibold text-gray-800">Payslip History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Period</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Gross</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Deductions</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Overtime</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Net Salary</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td colSpan="7" className="text-center py-10 text-gray-400">Loading...</td></tr>
              ) : payrolls.length === 0 ? (
                <tr><td colSpan="7" className="text-center py-10 text-gray-400">No payslips found for {year}</td></tr>
              ) : payrolls.map(p => (
                <tr key={p._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{monthName(p.month)} {p.year}</td>
                  <td className="px-4 py-3 text-right text-gray-700">₹{p.grossSalary?.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-red-600">- ₹{p.totalDeductions?.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-blue-600">
                    {p.overtime?.amount > 0 ? `+ ₹${p.overtime.amount.toLocaleString()}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-green-700">₹{p.netSalary?.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      p.status === 'Paid' ? 'bg-green-100 text-green-700' :
                      p.status === 'Processed' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>{p.status}</span>
                  </td>
                  <td className="px-4 py-3 flex items-center gap-2">
                    <button onClick={() => viewPayslip(p._id)} className="text-blue-600 hover:text-blue-800" title="View Payslip">
                      <FiFileText size={16} />
                    </button>
                    <button onClick={() => downloadPDF(p._id)} className="text-green-600 hover:text-green-800" title="Download PDF">
                      <FiDownload size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payslip Detail Modal */}
      {selectedPayslip && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-lg font-bold text-gray-800">
                Payslip — {monthName(selectedPayslip.month)} {selectedPayslip.year}
              </h2>
              <div className="flex items-center gap-2">
                <button onClick={() => downloadPDF(selectedPayslip._id)} className="text-green-600 hover:text-green-800" title="Download PDF">
                  <FiDownload size={18} />
                </button>
                <button onClick={() => setSelectedPayslip(null)} className="text-gray-400 hover:text-gray-600">
                  <FiX size={20} />
                </button>
              </div>
            </div>
            <div className="p-5 space-y-4">
              {/* Employee Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="font-semibold text-gray-800">{selectedPayslip.employee?.firstName} {selectedPayslip.employee?.lastName}</p>
                <p className="text-sm text-gray-500">{selectedPayslip.employee?.employeeId} • {selectedPayslip.employee?.designation} • {selectedPayslip.employee?.department?.name}</p>
              </div>

              {/* Earnings */}
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">Earnings</h4>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between"><span className="text-gray-600">Basic Salary</span><span>₹{selectedPayslip.basicSalary?.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">HRA</span><span>₹{selectedPayslip.hra?.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">Allowances</span><span>₹{selectedPayslip.allowances?.toLocaleString()}</span></div>
                  {selectedPayslip.overtime?.amount > 0 && (
                    <div className="flex justify-between"><span className="text-gray-600">Overtime ({selectedPayslip.overtime.hours?.toFixed(1)} hrs)</span><span className="text-blue-600">₹{selectedPayslip.overtime.amount?.toLocaleString()}</span></div>
                  )}
                  <div className="flex justify-between font-semibold border-t pt-1.5"><span>Gross Salary</span><span>₹{selectedPayslip.grossSalary?.toLocaleString()}</span></div>
                </div>
              </div>

              {/* Deductions */}
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">Deductions</h4>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between"><span className="text-gray-600">Provident Fund</span><span className="text-red-600">₹{selectedPayslip.deductions?.pf?.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">ESI</span><span className="text-red-600">₹{selectedPayslip.deductions?.esi?.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">Professional Tax</span><span className="text-red-600">₹{selectedPayslip.deductions?.tax?.toLocaleString()}</span></div>
                  {selectedPayslip.deductions?.other > 0 && (
                    <div className="flex justify-between"><span className="text-gray-600">Other</span><span className="text-red-600">₹{selectedPayslip.deductions.other?.toLocaleString()}</span></div>
                  )}
                  <div className="flex justify-between font-semibold border-t pt-1.5 text-red-600"><span>Total Deductions</span><span>₹{selectedPayslip.totalDeductions?.toLocaleString()}</span></div>
                </div>
              </div>

              {/* Net */}
              <div className="bg-green-50 rounded-lg p-4 flex justify-between items-center">
                <span className="font-bold text-gray-800 text-lg">Net Salary</span>
                <span className="font-bold text-green-700 text-xl">₹{selectedPayslip.netSalary?.toLocaleString()}</span>
              </div>

              {/* Bank Details */}
              {selectedPayslip.employee?.bankDetails && (
                <div className="text-xs text-gray-500 border-t pt-3">
                  <p>Bank: {selectedPayslip.employee.bankDetails.bankName} | A/C: {selectedPayslip.employee.bankDetails.accountNumber} | IFSC: {selectedPayslip.employee.bankDetails.ifscCode}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyPayslips;
