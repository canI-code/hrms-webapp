import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getEmployeeAPI, uploadAvatarAPI, toggleUserAPI } from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { FiArrowLeft, FiEdit, FiUpload, FiMail, FiPhone, FiMapPin, FiCalendar, FiDollarSign, FiToggleLeft, FiToggleRight, FiX } from 'react-icons/fi';

const EmployeeProfile = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('info');

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const empRes = await getEmployeeAPI(id);
      setEmployee(empRes.data);
    } catch (err) {
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('avatar', file);
    try {
      await uploadAvatarAPI(id, formData);
      toast.success('Photo updated!');
      loadData();
    } catch (err) {
      toast.error('Upload failed');
    }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" /></div>;
  if (!employee) return <p className="text-center py-20 text-gray-500">Employee not found</p>;

  const isOwner = employee.user?._id === user?._id || employee.user === user?._id;
  const isSuperAdmin = user?.role === 'super_admin';
  const isHR = user?.role === 'hr';
  const empRole = employee.user?.role;
  // Super admin can only edit staff (HR/managers), not employees. HR can edit employees.
  const canEdit = isSuperAdmin ? ['hr', 'manager'].includes(empRole) : isHR;
  const userIsActive = employee.user?.isActive !== false;

  const handleToggleActive = async () => {
    const userId = employee.user?._id || employee.user;
    if (!userId) return;
    const action = userIsActive ? 'deactivate' : 'activate';
    if (!confirm(`Are you sure you want to ${action} ${employee.firstName} ${employee.lastName}'s account?`)) return;
    try {
      await toggleUserAPI(userId);
      toast.success(`Account ${action}d successfully`);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to ${action} account`);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-700"><FiArrowLeft size={20} /></button>
        <h1 className="text-2xl font-bold text-gray-800">Employee Profile</h1>
        <div className="ml-auto flex items-center gap-2">
          {isSuperAdmin && !isOwner && (
            <button onClick={handleToggleActive}
              className={`flex items-center gap-2 text-sm px-4 py-2 rounded-lg transition-colors ${
                userIsActive
                  ? 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
                  : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
              }`}>
              {userIsActive ? <FiToggleRight size={18} /> : <FiToggleLeft size={18} />}
              {userIsActive ? 'Deactivate' : 'Activate'}
            </button>
          )}
          {canEdit && (
            <Link to={`/employees/${id}/edit`} className="flex items-center gap-2 text-sm bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700">
              <FiEdit /> Edit
            </Link>
          )}
        </div>
      </div>

      {/* Profile Header */}
      <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-primary-100 flex items-center justify-center overflow-hidden">
              {employee.profileImage ? (
                <img src={employee.profileImage} alt="" className="w-24 h-24 rounded-full object-cover" />
              ) : (
                <span className="text-2xl font-bold text-primary-700">{employee.firstName.charAt(0)}{employee.lastName.charAt(0)}</span>
              )}
            </div>
            {isOwner && (
              <label className="absolute bottom-0 right-0 w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-primary-700">
                <FiUpload className="text-white text-sm" />
                <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
              </label>
            )}
          </div>
          <div className="text-center sm:text-left">
            <h2 className="text-xl font-bold text-gray-800">{employee.firstName} {employee.lastName}</h2>
            <p className="text-gray-500">{employee.designation || 'No designation'} • {employee.department?.name || 'No department'}</p>
            <p className="text-sm text-gray-400 font-mono">{employee.employeeId}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className={`text-xs px-2 py-1 rounded-full ${
                employee.status === 'Active' ? 'bg-green-100 text-green-700' :
                employee.status === 'Deactivated' ? 'bg-red-100 text-red-700' :
                employee.status === 'Resigned' ? 'bg-gray-100 text-gray-700' :
                employee.status === 'On Leave' ? 'bg-amber-100 text-amber-700' :
                employee.status === 'Terminated' ? 'bg-orange-100 text-orange-700' :
                'bg-gray-100 text-gray-700'
              }`}>{employee.status}</span>
              {isSuperAdmin && (
                <span className={`text-xs px-2 py-1 rounded-full ${
                  userIsActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                }`}>
                  Account {userIsActive ? 'Active' : 'Deactivated'}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-white rounded-lg shadow-sm border p-1">
        {['info', 'salary'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 text-sm font-medium rounded-md capitalize transition-colors ${
              tab === t ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-50'
            }`}>{t}</button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'info' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border p-5">
            <h3 className="font-semibold text-gray-800 mb-4">Personal Details</h3>
            <div className="space-y-3">
              <InfoRow icon={FiMail} label="Email" value={employee.email} />
              <InfoRow icon={FiPhone} label="Phone" value={employee.phone || '—'} />
              <InfoRow icon={FiCalendar} label="Date of Birth" value={employee.dateOfBirth ? new Date(employee.dateOfBirth).toLocaleDateString() : '—'} />
              <InfoRow label="Gender" value={employee.gender ? employee.gender.charAt(0).toUpperCase() + employee.gender.slice(1) : '—'} />
              <InfoRow label="Marital Status" value={employee.maritalStatus || '—'} />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-5">
            <h3 className="font-semibold text-gray-800 mb-4">Employment Details</h3>
            <div className="space-y-3">
              <InfoRow label="Employee ID" value={employee.employeeId} />
              <InfoRow label="Department" value={employee.department?.name || '—'} />
              <InfoRow label="Designation" value={employee.designation || '—'} />
              <InfoRow label="Manager" value={employee.manager ? `${employee.manager.firstName} ${employee.manager.lastName}` : '—'} />
              <InfoRow icon={FiCalendar} label="Date of Joining" value={new Date(employee.dateOfJoining).toLocaleDateString()} />
              <InfoRow label="Employment Type" value={employee.employmentType} />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-5">
            <h3 className="font-semibold text-gray-800 mb-4">Address</h3>
            <div className="flex items-start gap-2">
              <FiMapPin className="text-gray-400 mt-1" />
              <p className="text-sm text-gray-600">
                {employee.address ?
                  [employee.address.street, employee.address.city, employee.address.state, employee.address.zipCode, employee.address.country].filter(Boolean).join(', ')
                  : 'Not provided'}
              </p>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-5">
            <h3 className="font-semibold text-gray-800 mb-4">Emergency Contact</h3>
            <div className="space-y-3">
              <InfoRow label="Name" value={employee.emergencyContact?.name || '—'} />
              <InfoRow label="Relation" value={employee.emergencyContact?.relation || '—'} />
              <InfoRow icon={FiPhone} label="Phone" value={employee.emergencyContact?.phone || '—'} />
            </div>
          </div>
        </div>
      )}

      {tab === 'salary' && (
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2"><FiDollarSign /> Salary Structure</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-medium text-green-700 mb-3">Earnings</h4>
              <div className="space-y-2">
                <SalaryRow label="Basic Salary" value={employee.salary?.basic || 0} />
                <SalaryRow label="HRA" value={employee.salary?.hra || 0} />
                <SalaryRow label="Allowances" value={employee.salary?.allowances || 0} />
                <div className="border-t pt-2 mt-2">
                  <SalaryRow label="Gross Salary" value={(employee.salary?.basic || 0) + (employee.salary?.hra || 0) + (employee.salary?.allowances || 0)} bold />
                </div>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-red-700 mb-3">Deductions</h4>
              <div className="space-y-2">
                <SalaryRow label="PF" value={employee.salary?.pf || 0} />
                <SalaryRow label="ESI" value={employee.salary?.esi || 0} />
                <SalaryRow label="Tax" value={employee.salary?.tax || 0} />
                <SalaryRow label="Other Deductions" value={employee.salary?.deductions || 0} />
                <div className="border-t pt-2 mt-2">
                  <SalaryRow label="Net Salary" value={employee.salary?.netSalary || 0} bold green />
                </div>
              </div>
            </div>
          </div>
          {/* Bank Details */}
          <div className="mt-6 pt-4 border-t">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Bank Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <InfoRow label="Bank Name" value={employee.bankDetails?.bankName || '—'} />
              <InfoRow label="Account Number" value={employee.bankDetails?.accountNumber || '—'} />
              <InfoRow label="IFSC Code" value={employee.bankDetails?.ifscCode || '—'} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const InfoRow = ({ icon: Icon, label, value }) => (
  <div className="flex items-center gap-2">
    {Icon && <Icon className="text-gray-400 flex-shrink-0" size={16} />}
    <span className="text-sm text-gray-500 min-w-[120px]">{label}:</span>
    <span className="text-sm text-gray-800 font-medium">{value}</span>
  </div>
);

const SalaryRow = ({ label, value, bold, green }) => (
  <div className="flex justify-between">
    <span className={`text-sm ${bold ? 'font-semibold' : ''} text-gray-600`}>{label}</span>
    <span className={`text-sm ${bold ? 'font-bold' : 'font-medium'} ${green ? 'text-green-700' : 'text-gray-800'}`}>
      ₹{(value || 0).toLocaleString()}
    </span>
  </div>
);

export default EmployeeProfile;
