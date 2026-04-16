import { useState, useEffect } from 'react';
import { getProfileAPI, updatePasswordAPI, updateProfileAPI, getLoginLogsAPI, uploadMyAvatarAPI } from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import {
  FiUser, FiLock, FiSave, FiPhone, FiMail, FiCalendar, FiMapPin,
  FiEye, FiEyeOff, FiAlertCircle, FiClock, FiEdit2, FiX, FiCheck,
  FiLogIn, FiLogOut, FiChevronLeft, FiChevronRight, FiHash,
  FiCamera
} from 'react-icons/fi';

const MyProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSystemId, setShowSystemId] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pwd, setPwd] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [avatarUploading, setAvatarUploading] = useState(false);

  // Login logs state
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logPage, setLogPage] = useState(1);
  const [logPages, setLogPages] = useState(1);
  const [logTotal, setLogTotal] = useState(0);
  const [showLogs, setShowLogs] = useState(false);

  // Edit form
  const [editForm, setEditForm] = useState({});

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await getProfileAPI();
      setProfile(res.data);
      setEditForm({
        phone: res.data.phone || '',
        alternateEmail: res.data.alternateEmail || '',
        dateOfBirth: res.data.dateOfBirth ? res.data.dateOfBirth.split('T')[0] : '',
        gender: res.data.gender || '',
        address: res.data.address || { street: '', city: '', state: '', zipCode: '', country: '' },
        emergencyContact: res.data.emergencyContact || { name: '', relationship: '', phone: '' },
        bio: res.data.bio || '',
      });
    } catch {
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.length ? e.target.files[0] : null;
    if (!file) return;
    
    setAvatarUploading(true);
    const formData = new FormData();
    formData.append('avatar', file);
    try {
      const res = await uploadMyAvatarAPI(formData);
      setProfile(prev => ({ ...prev, avatar: res.data.url }));
      toast.success('Profile picture updated!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setAvatarUploading(false);
    }
  };

  const fetchLogs = async (page = 1) => {
    setLogsLoading(true);
    try {
      const res = await getLoginLogsAPI({ page, limit: 15 });
      setLogs(res.data.logs);
      setLogPage(res.data.page);
      setLogPages(res.data.pages);
      setLogTotal(res.data.total);
    } catch {
      toast.error('Failed to load login logs');
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    if (showLogs) fetchLogs(logPage);
  }, [showLogs, logPage]);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (pwd.newPassword !== pwd.confirmPassword) return toast.error('Passwords do not match');
    if (pwd.newPassword.length < 6) return toast.error('Minimum 6 characters');
    try {
      await updatePasswordAPI(pwd);
      toast.success('Password updated');
      setShowPwd(false);
      setPwd({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update password');
    }
  };

  const handleProfileSave = async () => {
    setSaving(true);
    try {
      const res = await updateProfileAPI({
        ...editForm,
        dateOfBirth: editForm.dateOfBirth || undefined,
      });
      setProfile(res.data.user);
      setEditing(false);
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  }) : '—';

  const formatDateTime = (d) => d ? new Date(d).toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  }) : '—';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
        <FiUser /> My Profile
      </h1>

      {/* Profile Header Card */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 p-6 text-white">
          <div className="flex items-center gap-4">
            <div className="relative group">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center overflow-hidden">
                {profile?.avatar ? (
                  <img src={profile.avatar} alt="" className="w-20 h-20 rounded-full object-cover" />
                ) : (
                  <span className="text-3xl font-bold">{profile?.name?.charAt(0)}</span>
                )}
              </div>
              {/* Camera overlay for profile pic upload */}
              <label className="absolute inset-0 bg-black/0 group-hover:bg-black/40 rounded-full flex items-center justify-center cursor-pointer transition-all">
                <div className={`opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center ${avatarUploading ? '!opacity-100' : ''}`}>
                  {avatarUploading ? (
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent" />
                  ) : (
                    <FiCamera size={20} className="text-white" />
                  )}
                </div>
                <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" disabled={avatarUploading} />
              </label>
            </div>
            <div>
              <h2 className="text-2xl font-bold">{profile?.name}</h2>
              <p className="text-primary-100">{profile?.email}</p>
              <span className="inline-block mt-1 text-xs px-3 py-1 rounded-full bg-white/20 capitalize">
                {profile?.role?.replace('_', ' ')}
              </span>
            </div>
          </div>
        </div>

        {/* System ID, Account Created, Last Login */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-6 bg-gray-50 border-b">
          <div>
            <p className="text-xs text-gray-400 flex items-center gap-1"><FiHash /> System ID</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="font-mono font-bold text-gray-800 text-sm">
                {showSystemId ? (profile?.systemId || '—') : '••••••••••'}
              </span>
              <button
                onClick={() => setShowSystemId(!showSystemId)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showSystemId ? <FiEyeOff size={14} /> : <FiEye size={14} />}
              </button>
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-400 flex items-center gap-1"><FiCalendar /> Account Created</p>
            <p className="font-medium text-gray-800 text-sm mt-1">{formatDate(profile?.createdAt)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 flex items-center gap-1"><FiClock /> Last Login</p>
            <p className="font-medium text-gray-800 text-sm mt-1">{formatDateTime(profile?.lastLogin)}</p>
          </div>
        </div>

        {/* Profile Details */}
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Personal Information</h3>
            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                <FiEdit2 size={14} /> Edit
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => setEditing(false)}
                  className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 font-medium"
                >
                  <FiX size={14} /> Cancel
                </button>
                <button
                  onClick={handleProfileSave}
                  disabled={saving}
                  className="flex items-center gap-1 text-sm text-green-600 hover:text-green-700 font-medium disabled:opacity-50"
                >
                  <FiCheck size={14} /> {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            )}
          </div>

          {!editing ? (
            /* View Mode */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8 text-sm">
              <div>
                <p className="text-xs text-gray-400"><FiPhone className="inline mr-1" />Phone</p>
                <p className="font-medium text-gray-800 mt-0.5">{profile?.phone || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400"><FiMail className="inline mr-1" />Alternate Email</p>
                <p className="font-medium text-gray-800 mt-0.5">{profile?.alternateEmail || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400"><FiCalendar className="inline mr-1" />Date of Birth</p>
                <p className="font-medium text-gray-800 mt-0.5">{formatDate(profile?.dateOfBirth)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Gender</p>
                <p className="font-medium text-gray-800 capitalize mt-0.5">{profile?.gender || '—'}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs text-gray-400"><FiMapPin className="inline mr-1" />Address</p>
                <p className="font-medium text-gray-800 mt-0.5">
                  {[profile?.address?.street, profile?.address?.city, profile?.address?.state,
                    profile?.address?.zipCode, profile?.address?.country]
                    .filter(Boolean).join(', ') || '—'}
                </p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs text-gray-400">Bio</p>
                <p className="font-medium text-gray-800 mt-0.5">{profile?.bio || '—'}</p>
              </div>
            </div>
          ) : (
            /* Edit Mode */
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
                  <input type="tel" value={editForm.phone}
                    onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Alternate Email</label>
                  <input type="email" value={editForm.alternateEmail}
                    onChange={e => setEditForm(f => ({ ...f, alternateEmail: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Date of Birth</label>
                  <input type="date" value={editForm.dateOfBirth}
                    onChange={e => setEditForm(f => ({ ...f, dateOfBirth: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Gender</label>
                  <select value={editForm.gender}
                    onChange={e => setEditForm(f => ({ ...f, gender: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none">
                    <option value="">Select</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Street</label>
                  <input type="text" value={editForm.address?.street || ''}
                    onChange={e => setEditForm(f => ({ ...f, address: { ...f.address, street: e.target.value } }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">City</label>
                  <input type="text" value={editForm.address?.city || ''}
                    onChange={e => setEditForm(f => ({ ...f, address: { ...f.address, city: e.target.value } }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">State</label>
                  <input type="text" value={editForm.address?.state || ''}
                    onChange={e => setEditForm(f => ({ ...f, address: { ...f.address, state: e.target.value } }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Zip</label>
                  <input type="text" value={editForm.address?.zipCode || ''}
                    onChange={e => setEditForm(f => ({ ...f, address: { ...f.address, zipCode: e.target.value } }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Country</label>
                  <input type="text" value={editForm.address?.country || ''}
                    onChange={e => setEditForm(f => ({ ...f, address: { ...f.address, country: e.target.value } }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Bio</label>
                <textarea value={editForm.bio} maxLength={500} rows={3}
                  onChange={e => setEditForm(f => ({ ...f, bio: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none resize-none" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Emergency Contact */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <FiAlertCircle className="text-red-500" /> Emergency Contact
        </h3>
        {!editing ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-xs text-gray-400">Name</p>
              <p className="font-medium text-gray-800 mt-0.5">{profile?.emergencyContact?.name || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Relationship</p>
              <p className="font-medium text-gray-800 mt-0.5">{profile?.emergencyContact?.relationship || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Phone</p>
              <p className="font-medium text-gray-800 mt-0.5">{profile?.emergencyContact?.phone || '—'}</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
              <input type="text" value={editForm.emergencyContact?.name || ''}
                onChange={e => setEditForm(f => ({
                  ...f, emergencyContact: { ...f.emergencyContact, name: e.target.value }
                }))}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Relationship</label>
              <select value={editForm.emergencyContact?.relationship || ''}
                onChange={e => setEditForm(f => ({
                  ...f, emergencyContact: { ...f.emergencyContact, relationship: e.target.value }
                }))}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none">
                <option value="">Select</option>
                {['Father', 'Mother', 'Spouse', 'Sibling', 'Child', 'Friend', 'Other'].map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
              <input type="tel" value={editForm.emergencyContact?.phone || ''}
                onChange={e => setEditForm(f => ({
                  ...f, emergencyContact: { ...f.emergencyContact, phone: e.target.value }
                }))}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
            </div>
          </div>
        )}
      </div>

      {/* Change Password */}
      <div className="bg-white rounded-xl shadow-sm border">
        <button onClick={() => setShowPwd(!showPwd)}
          className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors">
          <span className="flex items-center gap-2 font-medium text-gray-800"><FiLock /> Change Password</span>
          <span className="text-sm text-primary-600">{showPwd ? 'Close' : 'Open'}</span>
        </button>

        {showPwd && (
          <form onSubmit={handlePasswordChange} className="px-6 pb-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
              <input type="password" value={pwd.currentPassword}
                onChange={e => setPwd(p => ({ ...p, currentPassword: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
              <input type="password" value={pwd.newPassword}
                onChange={e => setPwd(p => ({ ...p, newPassword: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
              <input type="password" value={pwd.confirmPassword}
                onChange={e => setPwd(p => ({ ...p, confirmPassword: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" required />
            </div>
            <button type="submit"
              className="flex items-center gap-2 bg-primary-600 text-white px-6 py-2.5 rounded-lg text-sm hover:bg-primary-700 transition-colors">
              <FiSave /> Update Password
            </button>
          </form>
        )}
      </div>

      {/* Login/Logout Logs */}
      <div className="bg-white rounded-xl shadow-sm border">
        <button onClick={() => setShowLogs(!showLogs)}
          className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors">
          <span className="flex items-center gap-2 font-medium text-gray-800"><FiClock /> Login Activity Log</span>
          <span className="text-sm text-primary-600">{showLogs ? 'Close' : 'View'}</span>
        </button>

        {showLogs && (
          <div className="px-6 pb-6">
            {logsLoading ? (
              <div className="py-8 text-center text-gray-400">Loading logs...</div>
            ) : logs.length === 0 ? (
              <div className="py-8 text-center text-gray-400">No login activity found.</div>
            ) : (
              <>
                <div className="text-xs text-gray-400 mb-3">Total: {logTotal} records</div>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {logs.map((log) => (
                    <div key={log._id}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm ${
                        log.action === 'LOGIN'
                          ? 'bg-green-50 border border-green-100'
                          : 'bg-orange-50 border border-orange-100'
                      }`}
                    >
                      {log.action === 'LOGIN' ? (
                        <FiLogIn className="text-green-500 shrink-0" />
                      ) : (
                        <FiLogOut className="text-orange-500 shrink-0" />
                      )}
                      <div className="flex-1">
                        <span className={`font-medium ${
                          log.action === 'LOGIN' ? 'text-green-700' : 'text-orange-700'
                        }`}>
                          {log.action === 'LOGIN' ? 'Signed In' : 'Signed Out'}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 text-right">
                        <div>{formatDateTime(log.timestamp)}</div>
                        {log.ipAddress && <div className="text-gray-400">IP: {log.ipAddress}</div>}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {logPages > 1 && (
                  <div className="flex items-center justify-center gap-3 mt-4">
                    <button
                      onClick={() => setLogPage(p => Math.max(1, p - 1))}
                      disabled={logPage === 1}
                      className="flex items-center gap-1 text-sm text-gray-600 hover:text-primary-600 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <FiChevronLeft /> Prev
                    </button>
                    <span className="text-sm text-gray-500">
                      Page {logPage} of {logPages}
                    </span>
                    <button
                      onClick={() => setLogPage(p => Math.min(logPages, p + 1))}
                      disabled={logPage === logPages}
                      className="flex items-center gap-1 text-sm text-gray-600 hover:text-primary-600 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Next <FiChevronRight />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyProfile;
