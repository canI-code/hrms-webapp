import { useState, useEffect } from 'react';
import { getHolidaysAPI, createHolidayAPI, updateHolidayAPI, deleteHolidayAPI } from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { FiPlus, FiEdit2, FiTrash2, FiX, FiCalendar } from 'react-icons/fi';

const typeColors = {
  National: 'bg-red-100 text-red-700',
  Regional: 'bg-blue-100 text-blue-700',
  Company: 'bg-green-100 text-green-700',
  Optional: 'bg-purple-100 text-purple-700',
};

const HolidayList = () => {
  const { user } = useAuth();
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', date: '', type: 'Company', description: '' });

  const canManage = ['super_admin', 'hr'].includes(user?.role);

  const fetchHolidays = async () => {
    setLoading(true);
    try {
      const res = await getHolidaysAPI();
      setHolidays(res.data);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchHolidays(); }, []);

  const openNew = () => { setEditing(null); setForm({ name: '', date: '', type: 'Company', description: '' }); setShowForm(true); };
  const openEdit = (h) => { setEditing(h._id); setForm({ name: h.name, date: h.date?.split('T')[0], type: h.type, description: h.description || '' }); setShowForm(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await updateHolidayAPI(editing, form);
        toast.success('Holiday updated');
      } else {
        await createHolidayAPI(form);
        toast.success('Holiday created');
      }
      setShowForm(false);
      fetchHolidays();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this holiday?')) return;
    try { await deleteHolidayAPI(id); toast.success('Deleted'); fetchHolidays(); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const grouped = holidays.reduce((acc, h) => {
    const month = new Date(h.date).toLocaleString('default', { month: 'long', year: 'numeric' });
    if (!acc[month]) acc[month] = [];
    acc[month].push(h);
    return acc;
  }, {});

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><FiCalendar /> Holidays</h1>
        {canManage && (
          <button onClick={openNew} className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 text-sm">
            <FiPlus /> Add Holiday
          </button>
        )}
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-semibold">{editing ? 'Edit' : 'Add'} Holiday</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><FiX /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none">
                  {['National', 'Regional', 'Company', 'Optional'].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  rows="2" className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" placeholder="Optional description" />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">Cancel</button>
                <button type="submit" className="px-6 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700">{editing ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* List grouped by month */}
      {loading ? (
        <div className="text-center py-10 text-gray-400">Loading...</div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="bg-white rounded-xl border p-10 text-center text-gray-400">No holidays found</div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([month, items]) => (
            <div key={month}>
              <h3 className="text-sm font-semibold text-gray-500 mb-2">{month}</h3>
              <div className="space-y-2">
                {items.map(h => (
                  <div key={h._id} className="bg-white rounded-lg shadow-sm border px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="text-center min-w-[50px]">
                        <p className="text-2xl font-bold text-primary-600">{new Date(h.date).getDate()}</p>
                        <p className="text-xs text-gray-400">{new Date(h.date).toLocaleString('default', { weekday: 'short' })}</p>
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{h.name}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${typeColors[h.type] || 'bg-gray-100'}`}>{h.type}</span>
                      </div>
                    </div>
                    {canManage && (
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(h)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><FiEdit2 size={14} /></button>
                        <button onClick={() => handleDelete(h._id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><FiTrash2 size={14} /></button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HolidayList;
