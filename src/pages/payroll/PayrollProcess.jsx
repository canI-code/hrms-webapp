import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { processPayrollAPI } from '../../api/axios';
import { toast } from 'react-toastify';
import { FiArrowLeft, FiPlay } from 'react-icons/fi';

const PayrollProcess = () => {
  const navigate = useNavigate();
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);

  const handleProcess = async (e) => {
    e.preventDefault();
    if (!confirm(`Process payroll for ${new Date(2000, month - 1).toLocaleString('default', { month: 'long' })} ${year}?`)) return;
    setLoading(true);
    try {
      const res = await processPayrollAPI({ month, year });
      setResults(res.data.results);
      toast.success('Payroll processed successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Processing failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-700"><FiArrowLeft size={20} /></button>
        <h1 className="text-2xl font-bold text-gray-800">Process Payroll</h1>
      </div>

      <form onSubmit={handleProcess} className="bg-white rounded-xl shadow-sm border p-6 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
            <select value={month} onChange={e => setMonth(Number(e.target.value))}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none">
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(2000, i).toLocaleString('default', { month: 'long' })}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
            <input type="number" value={year} onChange={e => setYear(Number(e.target.value))}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
          </div>
        </div>

        <div className="bg-amber-50 p-4 rounded-lg text-sm text-amber-700">
          This will calculate and generate payroll for all active employees for the selected month.
          Previously processed entries will be skipped.
        </div>

        <button type="submit" disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-primary-600 text-white py-3 rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50">
          <FiPlay /> {loading ? 'Processing...' : 'Process Payroll'}
        </button>
      </form>

      {results && (
        <div className="mt-6 bg-white rounded-xl shadow-sm border p-6">
          <h3 className="font-semibold text-gray-800 mb-4">Results</h3>
          <div className="space-y-2">
            {results.map((r, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                <span className="text-sm text-gray-700">{r.employeeId}</span>
                <div className="flex items-center gap-3">
                  {r.netSalary && <span className="text-sm font-medium text-green-700">₹{r.netSalary.toLocaleString()}</span>}
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    r.status === 'processed' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                  }`}>{r.status}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 bg-green-50 rounded-lg text-sm text-green-700">
            Processed: {results.filter(r => r.status === 'processed').length} employees •
            Skipped: {results.filter(r => r.status === 'already_processed').length}
          </div>
        </div>
      )}
    </div>
  );
};

export default PayrollProcess;
