import { useState, useEffect } from 'react';
import { getAuditLogsAPI } from '../../api/axios';
import { toast } from 'react-toastify';
import { FiBriefcase } from 'react-icons/fi';

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [module, setModule] = useState('');

  const modules = ['auth', 'employee', 'department', 'leave', 'payroll', 'attendance', 'announcement', 'document', 'holiday', 'user'];

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await getAuditLogsAPI({ page, module: module || undefined });
      setLogs(res.data.logs);
      setTotalPages(res.data.pages || 1);
    } catch { toast.error('Failed to load logs'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchLogs(); }, [page, module]);

  const actionColors = {
    create: 'bg-green-100 text-green-700',
    update: 'bg-blue-100 text-blue-700',
    delete: 'bg-red-100 text-red-700',
    login: 'bg-purple-100 text-purple-700',
    approve: 'bg-emerald-100 text-emerald-700',
    reject: 'bg-orange-100 text-orange-700',
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2"><FiBriefcase /> Audit Logs</h1>

      <div className="bg-white rounded-xl shadow-sm border p-4 mb-4 flex gap-3">
        <select value={module} onChange={e => { setModule(e.target.value); setPage(1); }}
          className="border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500">
          <option value="">All Modules</option>
          {modules.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Timestamp</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">User</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Action</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Module</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td colSpan="5" className="text-center py-10 text-gray-400">Loading...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan="5" className="text-center py-10 text-gray-400">No audit logs found</td></tr>
              ) : logs.map(log => (
                <tr key={log._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800 text-xs">{log.user?.name || '—'}</p>
                    <p className="text-xs text-gray-400">{log.user?.role}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      actionColors[log.action] || 'bg-gray-100 text-gray-600'
                    }`}>{log.action}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs uppercase font-medium">{log.module}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs max-w-[300px] truncate">{log.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t">
          <p className="text-xs text-gray-500">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
              className="px-3 py-1 border rounded text-xs hover:bg-gray-50 disabled:opacity-40">Previous</button>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
              className="px-3 py-1 border rounded text-xs hover:bg-gray-50 disabled:opacity-40">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuditLogs;
