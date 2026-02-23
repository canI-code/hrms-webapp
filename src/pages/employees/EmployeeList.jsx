import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { getEmployeesAPI, deleteEmployeeAPI, getDepartmentsAPI, toggleUserAPI } from '../../api/axios';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import { FiPlus, FiSearch, FiEdit, FiTrash2, FiEye, FiChevronLeft, FiChevronRight, FiX, FiToggleLeft, FiToggleRight } from 'react-icons/fi';

const EmployeeList = ({ mode = 'all' }) => {
  const { user } = useAuth();
  const isStaffMode = mode === 'staff';
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [departments, setDepartments] = useState([]);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceRef = useRef(null);

  const fetchEmployees = useCallback(async (searchTerm) => {
    setLoading(true);
    try {
      const roleFilter = isStaffMode ? 'hr,manager' : (user?.role === 'super_admin' && mode === 'employees') ? 'employee' : undefined;
      const res = await getEmployeesAPI({ search: searchTerm, page, status: statusFilter, department: departmentFilter || undefined, role: roleFilter || undefined, limit: 15 });
      setEmployees(res.data.employees);
      setTotalPages(res.data.pages);
    } catch (err) {
      toast.error('Failed to load employees');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, departmentFilter, isStaffMode, mode, user?.role]);

  // Debounce search input — triggers after 300ms of no typing
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  useEffect(() => { fetchEmployees(debouncedSearch); }, [debouncedSearch, page, statusFilter, departmentFilter, fetchEmployees]);

  useEffect(() => {
    getDepartmentsAPI().then(res => setDepartments(res.data || [])).catch(() => {});
  }, []);

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete employee ${name}?`)) return;
    try {
      await deleteEmployeeAPI(id);
      toast.success('Employee deleted');
      fetchEmployees(debouncedSearch);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  const handleToggleActive = async (emp) => {
    const userId = emp.user?._id || emp.user;
    if (!userId) return;
    const isActive = emp.user?.isActive !== false;
    const action = isActive ? 'deactivate' : 'activate';
    if (!confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} ${emp.firstName} ${emp.lastName}'s account?`)) return;
    try {
      await toggleUserAPI(userId);
      toast.success(`Account ${action}d`);
      fetchEmployees(debouncedSearch);
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to ${action}`);
    }
  };

  const isSuperAdmin = user?.role === 'super_admin';
  const isHR = user?.role === 'hr';
  const canEdit = isStaffMode ? isSuperAdmin : isHR;

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-800">{isStaffMode ? 'Staff Management' : 'Employees'}</h1>
        <div className="flex items-center gap-2">
          {isSuperAdmin && isStaffMode && (
            <>
              <Link
                to="/employees/new?role=hr"
                className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-sm"
              >
                <FiPlus /> Add HR
              </Link>
              <Link
                to="/employees/new?role=manager"
                className="flex items-center gap-2 bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 text-sm"
              >
                <FiPlus /> Add Manager
              </Link>
            </>
          )}
          {isHR && (
            <Link
              to="/employees/new?role=employee"
              className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 text-sm"
            >
              <FiPlus /> Add Employee
            </Link>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border p-4 mb-4 flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <FiSearch className="absolute left-3 top-2.5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, ID, or email..."
            className="w-full pl-10 pr-9 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600">
              <FiX size={16} />
            </button>
          )}
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All Status</option>
          <option value="Active">Active</option>
          <option value="Deactivated">Deactivated</option>
          <option value="Resigned">Resigned</option>
          <option value="Terminated">Terminated</option>
          <option value="On Leave">On Leave</option>
        </select>
        <select
          value={departmentFilter}
          onChange={(e) => { setDepartmentFilter(e.target.value); setPage(1); }}
          className="border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All Departments</option>
          {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">ID</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                {isStaffMode && <th className="text-left px-4 py-3 font-medium text-gray-600">Role</th>}
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Department</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Designation</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td colSpan={isStaffMode ? 7 : 6} className="text-center py-10 text-gray-400">Loading...</td></tr>
              ) : employees.length === 0 ? (
                <tr><td colSpan={isStaffMode ? 7 : 6} className="text-center py-10 text-gray-400">No {isStaffMode ? 'staff' : 'employees'} found</td></tr>
              ) : (
                employees.map((emp) => (
                  <tr key={emp._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{emp.employeeId}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                          {emp.profileImage ? (
                            <img src={emp.profileImage} alt="" className="w-8 h-8 rounded-full object-cover" />
                          ) : (
                            <span className="text-xs font-medium text-primary-700">
                              {emp.firstName?.charAt(0)}{emp.lastName?.charAt(0)}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">{emp.firstName} {emp.lastName}</p>
                          <p className="text-xs text-gray-500">{emp.email}</p>
                        </div>
                      </div>
                    </td>
                    {isStaffMode && (
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          emp.user?.role === 'hr' ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {emp.user?.role === 'hr' ? 'HR' : 'Manager'}
                        </span>
                      </td>
                    )}
                    <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{emp.department?.name || '—'}</td>
                    <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{emp.designation || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        emp.status === 'Active' ? 'bg-green-100 text-green-700' :
                        emp.status === 'Deactivated' ? 'bg-red-100 text-red-700' :
                        emp.status === 'Resigned' ? 'bg-gray-100 text-gray-700' :
                        emp.status === 'On Leave' ? 'bg-amber-100 text-amber-700' :
                        emp.status === 'Terminated' ? 'bg-orange-100 text-orange-700' :
                        'bg-red-100 text-red-700'
                      }`}>{emp.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link to={`/employees/${emp._id}`} className="text-blue-600 hover:text-blue-800">
                          <FiEye size={16} />
                        </Link>
                        {isSuperAdmin && (
                          <button
                            onClick={() => handleToggleActive(emp)}
                            className={emp.user?.isActive !== false ? 'text-green-500 hover:text-green-700' : 'text-red-500 hover:text-red-700'}
                            title={emp.user?.isActive !== false ? 'Deactivate account' : 'Activate account'}
                          >
                            {emp.user?.isActive !== false ? <FiToggleRight size={16} /> : <FiToggleLeft size={16} />}
                          </button>
                        )}
                        {canEdit && (
                          <>
                            <Link to={`/employees/${emp._id}/edit`} className="text-amber-600 hover:text-amber-800">
                              <FiEdit size={16} />
                            </Link>
                            <button onClick={() => handleDelete(emp._id, `${emp.firstName} ${emp.lastName}`)} className="text-red-600 hover:text-red-800">
                              <FiTrash2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-40"
            >
              <FiChevronLeft /> Previous
            </button>
            <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-40"
            >
              Next <FiChevronRight />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeList;
