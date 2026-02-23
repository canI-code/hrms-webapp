import { useState, useEffect } from 'react';
import { getLeaveTypesAPI, createLeaveTypeAPI, updateLeaveTypeAPI, deleteLeaveTypeAPI } from '../../api/axios';
import { toast } from 'react-toastify';
import { FiCalendar, FiPlus, FiEdit2, FiTrash2, FiX } from 'react-icons/fi';

const LeaveTypeList = () => {
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', daysPerYear: 12, carryForward: false });

  useEffect(() => { fetchTypes(); }, []);

  const fetchTypes = async () => {
    setLoading(true);
    try {
      const res = await getLeaveTypesAPI();
      setTypes(res.data);
    } catch { toast.error('Failed to load leave types'); }
    finally { setLoading(false); }
  };

  const openNew = () => {
    setEditing(null);
    setForm({ name: '', description: '', daysPerYear: 12, carryForward: false });
    setShowModal(true);
  };

  const openEdit = (t) => {
    setEditing(t);
    setForm({ name: t.name, description: t.description || '', daysPerYear: t.daysPerYear, carryForward: t.carryForward });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await updateLeaveTypeAPI(editing._id, form);
        toast.success('Leave type updated');
      } else {
        await createLeaveTypeAPI(form);
        toast.success('Leave type created');
      }
      setShowModal(false);
      fetchTypes();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Deactivate this leave type?')) return;
    try {
      await deleteLeaveTypeAPI(id);
      toast.success('Leave type deactivated');
      fetchTypes();
    } catch { toast.error('Failed to delete'); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <FiCalendar /> Leave Types
        </h1>
        <button onClick={openNew} className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 text-sm">
          <FiPlus /> Add Leave Type
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Description</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Days/Year</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Carry Forward</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td colSpan="5" className="text-center py-10 text-gray-400">Loading...</td></tr>
            ) : types.length === 0 ? (
              <tr><td colSpan="5" className="text-center py-10 text-gray-400">No leave types configured</td></tr>
            ) : types.map(t => (
              <tr key={t._id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-800">{t.name}</td>
                <td className="px-4 py-3 text-gray-600">{t.description || '—'}</td>
                <td className="px-4 py-3 text-center font-semibold">{t.daysPerYear}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`text-xs px-2 py-1 rounded-full ${t.carryForward ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    {t.carryForward ? 'Yes' : 'No'}
                  </span>
                </td>
                <td className="px-4 py-3 text-center flex items-center justify-center gap-2">
                  <button onClick={() => openEdit(t)} className="text-blue-600 hover:text-blue-800" title="Edit">
                    <FiEdit2 size={15} />
                  </button>
                  <button onClick={() => handleDelete(t._id)} className="text-red-500 hover:text-red-700" title="Delete">
                    <FiTrash2 size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-lg font-bold text-gray-800">{editing ? 'Edit' : 'New'} Leave Type</h2>
              <button type="button" onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><FiX size={20} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required
                  className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows="2"
                  className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Days Per Year *</label>
                <input type="number" value={form.daysPerYear} onChange={e => setForm({ ...form, daysPerYear: parseInt(e.target.value) || 0 })} min="0" required
                  className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={form.carryForward} onChange={e => setForm({ ...form, carryForward: e.target.checked })} className="rounded text-primary-600" />
                <span className="text-sm text-gray-700">Allow carry forward</span>
              </label>
            </div>
            <div className="p-5 border-t flex justify-end gap-2">
              <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button type="submit" className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700">{editing ? 'Update' : 'Create'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default LeaveTypeList;
