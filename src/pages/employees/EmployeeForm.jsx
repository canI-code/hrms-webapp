import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { createEmployeeAPI, updateEmployeeAPI, getEmployeeAPI, getDepartmentsAPI, getEmployeesAPI } from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { FiSave, FiArrowLeft, FiZap } from 'react-icons/fi';

const EmployeeForm = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const isEdit = Boolean(id);
  const presetRole = searchParams.get('role');
  const [loading, setLoading] = useState(false);
  const presetDepartments = [
    'Human Resources', 'Engineering', 'Marketing', 'Sales', 'Finance',
    'Operations', 'Product', 'Design', 'Customer Support', 'Legal',
    'IT', 'Administration', 'Business Development', 'Quality Assurance'
  ];
  const [departments, setDepartments] = useState([]);
  const [managers, setManagers] = useState([]);

  // Determine which roles the current user can assign
  const isSuperAdmin = currentUser?.role === 'super_admin';
  const isHR = currentUser?.role === 'hr';
  const allowedRoles = isSuperAdmin ? ['hr', 'manager'] : isHR ? ['employee'] : [];
  const defaultRole = presetRole && allowedRoles.includes(presetRole) ? presetRole : allowedRoles[0] || 'employee';

  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '', dateOfBirth: '',
    gender: '', maritalStatus: '', department: '', designation: '', manager: '',
    dateOfJoining: new Date().toISOString().split('T')[0], employmentType: 'Full-time',
    password: '', role: defaultRole,
    address: { street: '', city: '', state: '', zipCode: '', country: 'India' },
    salary: { basic: 0, hra: 0, allowances: 0, deductions: 0, pf: 0, esi: 0, tax: 0 },
    bankDetails: { bankName: '', accountNumber: '', ifscCode: '' },
    emergencyContact: { name: '', relation: '', phone: '' }
  });

  useEffect(() => {
    getDepartmentsAPI().then(res => {
      if (res.data && res.data.length > 0) {
        setDepartments(res.data);
      }
    }).catch(() => {});
    getEmployeesAPI({ limit: 100, role: 'manager' }).then(res => setManagers(res.data.employees)).catch(() => {});
    if (isEdit) {
      getEmployeeAPI(id).then(res => {
        const emp = res.data;
        setForm({
          ...emp,
          dateOfBirth: emp.dateOfBirth ? new Date(emp.dateOfBirth).toISOString().split('T')[0] : '',
          dateOfJoining: emp.dateOfJoining ? new Date(emp.dateOfJoining).toISOString().split('T')[0] : '',
          department: emp.department?._id || '',
          manager: emp.manager?._id || '',
          password: '', role: emp.user?.role || 'employee',
          address: emp.address || { street: '', city: '', state: '', zipCode: '', country: 'India' },
          salary: emp.salary || { basic: 0, hra: 0, allowances: 0, deductions: 0, pf: 0, esi: 0, tax: 0 },
          bankDetails: emp.bankDetails || { bankName: '', accountNumber: '', ifscCode: '' },
          emergencyContact: emp.emergencyContact || { name: '', relation: '', phone: '' }
        });
      }).catch(() => toast.error('Failed to load employee'));
    }
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setForm(prev => ({ ...prev, [parent]: { ...prev[parent], [child]: value } }));
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isEdit) {
        await updateEmployeeAPI(id, form);
        toast.success('Employee updated!');
      } else {
        await createEmployeeAPI(form);
        toast.success('Employee created!');
      }
      navigate('/employees');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save employee');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-700">
          <FiArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold text-gray-800">
          {isEdit ? 'Edit' : 'Add'} {form.role === 'hr' ? 'HR' : form.role === 'manager' ? 'Manager' : 'Employee'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Info */}
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Personal Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>First Name *</label>
              <input name="firstName" value={form.firstName} onChange={handleChange} className={inputClass} required />
            </div>
            <div>
              <label className={labelClass}>Last Name *</label>
              <input name="lastName" value={form.lastName} onChange={handleChange} className={inputClass} required />
            </div>
            <div>
              <label className={labelClass}>Email *</label>
              <input name="email" type="email" value={form.email} onChange={handleChange} className={inputClass} required />
            </div>
            <div>
              <label className={labelClass}>Phone</label>
              <input name="phone" value={form.phone} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Date of Birth</label>
              <input name="dateOfBirth" type="date" value={form.dateOfBirth} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Gender</label>
              <select name="gender" value={form.gender} onChange={handleChange} className={inputClass}>
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Marital Status</label>
              <select name="maritalStatus" value={form.maritalStatus} onChange={handleChange} className={inputClass}>
                <option value="">Select</option>
                <option value="Single">Single</option>
                <option value="Married">Married</option>
                <option value="Divorced">Divorced</option>
                <option value="Widowed">Widowed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Address</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-3">
              <label className={labelClass}>Street</label>
              <input name="address.street" value={form.address.street} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>City</label>
              <input name="address.city" value={form.address.city} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>State</label>
              <input name="address.state" value={form.address.state} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Zip Code</label>
              <input name="address.zipCode" value={form.address.zipCode} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Country</label>
              <input name="address.country" value={form.address.country} onChange={handleChange} className={inputClass} />
            </div>
          </div>
        </div>

        {/* Employment */}
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Employment Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Department</label>
              <select name="department" value={form.department} onChange={handleChange} className={inputClass}>
                <option value="">Select Department</option>
                {departments.length > 0
                  ? departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)
                  : presetDepartments.map(name => <option key={name} value={name}>{name}</option>)
                }
              </select>
            </div>
            <div>
              <label className={labelClass}>Designation</label>
              <input name="designation" value={form.designation} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Manager</label>
              <select name="manager" value={form.manager} onChange={handleChange} className={inputClass}>
                <option value="">Select Manager</option>
                {managers.filter(m => m._id !== id).map(m => (
                  <option key={m._id} value={m._id}>{m.firstName} {m.lastName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Date of Joining *</label>
              <input name="dateOfJoining" type="date" value={form.dateOfJoining} onChange={handleChange} className={inputClass} required />
            </div>
            <div>
              <label className={labelClass}>Employment Type</label>
              <select name="employmentType" value={form.employmentType} onChange={handleChange} className={inputClass}>
                <option value="Full-time">Full-time</option>
                <option value="Part-time">Part-time</option>
                <option value="Contract">Contract</option>
                <option value="Intern">Intern</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Role</label>
              <select name="role" value={form.role} onChange={handleChange} className={inputClass}
                disabled={!!presetRole && !isEdit}>
                {allowedRoles.map(r => (
                  <option key={r} value={r}>{r === 'hr' ? 'HR' : r.charAt(0).toUpperCase() + r.slice(1)}</option>
                ))}
              </select>
              {isSuperAdmin && (
                <p className="text-xs text-gray-400 mt-1">Super Admin can create HR or Manager accounts only</p>
              )}
              {isHR && (
                <p className="text-xs text-gray-400 mt-1">HR can create Employee accounts only</p>
              )}
            </div>
            {isEdit && (
              <div>
                <label className={labelClass}>Employee Status</label>
                <select name="status" value={form.status || 'Active'} onChange={handleChange} className={inputClass}>
                  {['Active', 'Deactivated', 'Resigned', 'Terminated', 'On Leave'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            )}
            {!isEdit && (
              <div>
                <label className={labelClass}>Password</label>
                <input name="password" type="password" value={form.password} onChange={handleChange}
                  placeholder="Default: password123" className={inputClass} />
              </div>
            )}
          </div>
        </div>

        {/* Salary */}
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Salary Structure</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className={labelClass}>Basic Salary</label>
              <input name="salary.basic" type="number" value={form.salary.basic} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>HRA</label>
              <input name="salary.hra" type="number" value={form.salary.hra} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Allowances</label>
              <input name="salary.allowances" type="number" value={form.salary.allowances} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Other Deductions</label>
              <input name="salary.deductions" type="number" value={form.salary.deductions} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>PF</label>
              <input name="salary.pf" type="number" value={form.salary.pf} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>ESI</label>
              <input name="salary.esi" type="number" value={form.salary.esi} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Tax</label>
              <input name="salary.tax" type="number" value={form.salary.tax} onChange={handleChange} className={inputClass} />
            </div>
            <div className="flex items-end">
              <div className="w-full p-3 bg-green-50 rounded-lg">
                <p className="text-xs text-green-700">Net Salary</p>
                <p className="text-lg font-bold text-green-800">
                  ₹{((Number(form.salary.basic) + Number(form.salary.hra) + Number(form.salary.allowances)) -
                    (Number(form.salary.deductions) + Number(form.salary.pf) + Number(form.salary.esi) + Number(form.salary.tax))).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bank & Emergency */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border p-5">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Bank Details</h2>
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Bank Name</label>
                <input name="bankDetails.bankName" value={form.bankDetails.bankName} onChange={handleChange} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Account Number</label>
                <input name="bankDetails.accountNumber" value={form.bankDetails.accountNumber} onChange={handleChange} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>IFSC Code</label>
                <input name="bankDetails.ifscCode" value={form.bankDetails.ifscCode} onChange={handleChange} className={inputClass} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-5">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Emergency Contact</h2>
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Name</label>
                <input name="emergencyContact.name" value={form.emergencyContact.name} onChange={handleChange} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Relation</label>
                <select name="emergencyContact.relation" value={form.emergencyContact.relation} onChange={handleChange} className={inputClass}>
                  <option value="">Select</option>
                  {['Father', 'Mother', 'Spouse', 'Sibling', 'Child', 'Friend', 'Other'].map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Phone</label>
                <input name="emergencyContact.phone" value={form.emergencyContact.phone} onChange={handleChange} className={inputClass} />
              </div>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => navigate(-1)} className="px-6 py-2.5 border rounded-lg text-sm hover:bg-gray-50">
            Cancel
          </button>
          <button type="submit" disabled={loading}
            className="flex items-center gap-2 bg-primary-600 text-white px-6 py-2.5 rounded-lg text-sm hover:bg-primary-700 disabled:opacity-50">
            <FiSave /> {loading ? 'Saving...' : isEdit ? 'Update' : `Create ${form.role === 'hr' ? 'HR' : form.role === 'manager' ? 'Manager' : 'Employee'}`}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EmployeeForm;
