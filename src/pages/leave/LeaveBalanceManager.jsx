import { useState, useEffect } from 'react';
import { getEmployeesAPI, getLeaveTypesAPI, getLeaveBalanceAPI, adjustLeaveBalanceAPI } from '../../api/axios';
import { toast } from 'react-toastify';
import { FiDatabase, FiSearch, FiEdit2, FiX } from 'react-icons/fi';

const LeaveBalanceManager = () => {
  const [employees, setEmployees] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [selectedEmp, setSelectedEmp] = useState('');
  const [balances, setBalances] = useState([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editForm, setEditForm] = useState({ employeeId: '', leaveTypeId: '', year: 0, allocated: 0 });

  useEffect(() => {
    const load = async () => {
      try {
        const [empRes, typeRes] = await Promise.all([
          getEmployeesAPI({ limit: 500 }),
          getLeaveTypesAPI()
        ]);
        setEmployees(empRes.data.employees || empRes.data);
        setLeaveTypes(typeRes.data);
      } catch { toast.error('Failed to load data'); }
    };
    load();
  }, []);

  const fetchBalance = async (empId) => {
    if (!empId) { setBalances([]); return; }
    setLoading(true);
    try {
      const res = await getLeaveBalanceAPI({ employeeId: empId, year });
      setBalances(res.data);
    } catch { toast.error('Failed to load balances'); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (selectedEmp) fetchBalance(selectedEmp); }, [selectedEmp, year]);

  const filteredEmps = employees.filter(e =>
    `${e.firstName} ${e.lastName} ${e.employeeId}`.toLowerCase().includes(search.toLowerCase())
  );

  const openAdjust = (bal) => {
    setEditForm({
      employeeId: selectedEmp,
      leaveTypeId: bal.leaveType._id,
      year,
      allocated: bal.allocated,
      typeName: bal.leaveType.name,
    });
    setShowModal(true);
  };

  const initBalance = (lt) => {
    setEditForm({
      employeeId: selectedEmp,
      leaveTypeId: lt._id,
      year,
      allocated: lt.daysPerYear,
      typeName: lt.name,
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      await adjustLeaveBalanceAPI({
        employeeId: editForm.employeeId,
        leaveTypeId: editForm.leaveTypeId,
        year: editForm.year,
        allocated: editForm.allocated,
      });
      toast.success('Leave balance updated');
      setShowModal(false);
      fetchBalance(selectedEmp);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update');
    }
  };

  const selectedEmpName = employees.find(e => e._id === selectedEmp);
  const missingTypes = leaveTypes.filter(lt => !balances.find(b => b.leaveType?._id === lt._id));

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        <FiDatabase /> Leave Balance Management
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Employee selector */}
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="relative mb-3">
            <FiSearch className="absolute left-3 top-2.5 text-gray-400" size={16} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search employees..."
              className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div className="flex items-center gap-2 mb-3">
            <label className="text-xs text-gray-500">Year:</label>
            <input type="number" value={year} onChange={e => setYear(parseInt(e.target.value) || new Date().getFullYear())} 
              className="border rounded px-2 py-1 text-sm w-20 outline-none" />
          </div>
          <div className="max-h-96 overflow-y-auto space-y-1">
            {filteredEmps.map(emp => (
              <button key={emp._id} onClick={() => setSelectedEmp(emp._id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${selectedEmp === emp._id ? 'bg-primary-50 text-primary-700 font-medium' : 'hover:bg-gray-50 text-gray-700'}`}>
                <span className="font-medium">{emp.firstName} {emp.lastName}</span>
                <span className="text-xs text-gray-400 ml-2">{emp.employeeId}</span>
              </button>
            ))}
            {filteredEmps.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No employees found</p>}
          </div>
        </div>

        {/* Balance table */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border">
          <div className="p-4 border-b">
            <h3 className="font-semibold text-gray-800">
              {selectedEmpName ? `${selectedEmpName.firstName} ${selectedEmpName.lastName} — ${year}` : 'Select an employee'}
            </h3>
          </div>
          {!selectedEmp ? (
            <div className="text-center py-16 text-gray-400 text-sm">Select an employee to view/edit their leave balances</div>
          ) : loading ? (
            <div className="text-center py-16 text-gray-400 text-sm">Loading...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Leave Type</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">Allocated</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">Used</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">Remaining</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {balances.map(b => (
                    <tr key={b._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800">{b.leaveType?.name || 'Unknown'}</td>
                      <td className="px-4 py-3 text-center">{b.allocated}</td>
                      <td className="px-4 py-3 text-center text-red-600">{b.used}</td>
                      <td className="px-4 py-3 text-center font-semibold text-green-700">{b.remaining}</td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => openAdjust(b)} className="text-blue-600 hover:text-blue-800" title="Adjust">
                          <FiEdit2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {/* Missing types - allow initializing */}
                  {missingTypes.map(lt => (
                    <tr key={lt._id} className="hover:bg-gray-50 bg-yellow-50/50">
                      <td className="px-4 py-3 text-gray-500">{lt.name} <span className="text-xs text-yellow-600">(not initialized)</span></td>
                      <td className="px-4 py-3 text-center text-gray-400">—</td>
                      <td className="px-4 py-3 text-center text-gray-400">—</td>
                      <td className="px-4 py-3 text-center text-gray-400">—</td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => initBalance(lt)} className="text-xs text-primary-600 hover:text-primary-800 font-medium">
                          Initialize
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {balances.length === 0 && missingTypes.length === 0 && (
                <div className="text-center py-10 text-gray-400 text-sm">No leave types configured</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Adjust Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleSave} className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-lg font-bold text-gray-800">Adjust Balance</h2>
              <button type="button" onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><FiX size={20} /></button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-gray-600">Leave Type: <strong>{editForm.typeName}</strong></p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Allocated Days</label>
                <input type="number" value={editForm.allocated} onChange={e => setEditForm({ ...editForm, allocated: parseInt(e.target.value) || 0 })}
                  min="0" className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
            </div>
            <div className="p-5 border-t flex justify-end gap-2">
              <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button type="submit" className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700">Save</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default LeaveBalanceManager;
