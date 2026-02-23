import { useState, useEffect } from 'react';
import { getAnnouncementsAPI, createAnnouncementAPI, deleteAnnouncementAPI } from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { FiPlus, FiTrash2, FiX, FiBell } from 'react-icons/fi';

const priorityColors = {
  Low: 'bg-blue-100 text-blue-700',
  Medium: 'bg-yellow-100 text-yellow-700',
  High: 'bg-orange-100 text-orange-700',
  Urgent: 'bg-red-100 text-red-700',
};

const AnnouncementList = () => {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', priority: 'Medium', targetRoles: [] });

  const canManage = ['super_admin', 'hr'].includes(user?.role);

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const res = await getAnnouncementsAPI();
      setAnnouncements(res.data);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAnnouncements(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await createAnnouncementAPI(form);
      toast.success('Announcement posted');
      setShowForm(false);
      setForm({ title: '', content: '', priority: 'Medium', targetRoles: [] });
      fetchAnnouncements();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this announcement?')) return;
    try {
      await deleteAnnouncementAPI(id);
      toast.success('Deleted');
      fetchAnnouncements();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const toggleRole = (role) => {
    setForm(p => ({
      ...p,
      targetRoles: p.targetRoles.includes(role) ? p.targetRoles.filter(r => r !== role) : [...p.targetRoles, role]
    }));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><FiBell /> Announcements</h1>
        {canManage && (
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 text-sm">
            <FiPlus /> New Announcement
          </button>
        )}
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-800">New Announcement</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><FiX /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Content *</label>
                <textarea value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
                  rows="4" className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none">
                  {['Low', 'Medium', 'High', 'Urgent'].map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Target Roles (empty = all)</label>
                <div className="flex gap-2 flex-wrap">
                  {['super_admin', 'hr', 'manager', 'employee'].map(r => (
                    <button key={r} type="button" onClick={() => toggleRole(r)}
                      className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                        form.targetRoles.includes(r) ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-600 border-gray-300 hover:border-primary-400'
                      }`}>{r}</button>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">Cancel</button>
                <button type="submit" className="px-6 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700">Post</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="text-center py-10 text-gray-400">Loading...</div>
      ) : announcements.length === 0 ? (
        <div className="bg-white rounded-xl border p-10 text-center text-gray-400">No announcements</div>
      ) : (
        <div className="space-y-4">
          {announcements.map(a => (
            <div key={a._id} className="bg-white rounded-xl shadow-sm border p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-800">{a.title}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${priorityColors[a.priority] || 'bg-gray-100'}`}>{a.priority}</span>
                  </div>
                  <p className="text-sm text-gray-600 whitespace-pre-line">{a.content}</p>
                  <div className="flex items-center gap-3 mt-3 text-xs text-gray-400">
                    <span>By {a.postedBy?.name || 'System'}</span>
                    <span>{new Date(a.createdAt).toLocaleDateString()}</span>
                    {a.targetRoles?.length > 0 && (
                      <span>For: {a.targetRoles.join(', ')}</span>
                    )}
                  </div>
                </div>
                {canManage && (
                  <button onClick={() => handleDelete(a._id)} className="text-red-500 hover:text-red-700 ml-4">
                    <FiTrash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AnnouncementList;
