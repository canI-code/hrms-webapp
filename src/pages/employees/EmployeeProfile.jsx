import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getEmployeeAPI, uploadAvatarAPI, getDocumentsAPI, uploadDocumentAPI, deleteDocumentAPI, toggleUserAPI, viewDocumentURL, downloadDocumentURL } from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { FiArrowLeft, FiEdit, FiUpload, FiTrash2, FiDownload, FiMail, FiPhone, FiMapPin, FiCalendar, FiDollarSign, FiToggleLeft, FiToggleRight, FiX, FiFile, FiEye, FiExternalLink } from 'react-icons/fi';

const EmployeeProfile = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('info');
  const [showDocModal, setShowDocModal] = useState(false);
  const [docForm, setDocForm] = useState({ name: '', type: 'Other', description: '', file: null });
  const [docUploading, setDocUploading] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const [empRes, docsRes] = await Promise.all([
        getEmployeeAPI(id),
        getDocumentsAPI(id).catch(() => ({ data: [] }))
      ]);
      setEmployee(empRes.data);
      setDocuments(docsRes.data);
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

  const handleDocUpload = async (e) => {
    e.preventDefault();
    if (!docForm.file) return toast.error('Please select a file');
    setDocUploading(true);
    const formData = new FormData();
    formData.append('document', docForm.file);
    formData.append('name', docForm.name || docForm.file.name);
    formData.append('type', docForm.type);
    formData.append('description', docForm.description);
    try {
      await uploadDocumentAPI(id, formData);
      toast.success('Document uploaded!');
      setShowDocModal(false);
      setDocForm({ name: '', type: 'Other', description: '', file: null });
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setDocUploading(false);
    }
  };

  const handleDeleteDoc = async (docId) => {
    if (!confirm('Delete this document?')) return;
    try {
      await deleteDocumentAPI(docId);
      toast.success('Document deleted');
      setDocuments(prev => prev.filter(d => d._id !== docId));
    } catch (err) {
      toast.error('Delete failed');
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
        {['info', 'salary', 'documents'].map(t => (
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

      {tab === 'documents' && (
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">Documents</h3>
            {(isOwner || isHR) && (
              <button onClick={() => setShowDocModal(true)}
                className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-primary-700">
                <FiUpload /> Upload Document
              </button>
            )}
          </div>
          {documents.length === 0 ? (
            <p className="text-center text-gray-400 py-10">No documents uploaded</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {documents.map(doc => {
                const isPdf = doc.mimeType === 'application/pdf' || doc.url?.toLowerCase().endsWith('.pdf');
                const isImage = doc.mimeType?.startsWith('image/');
                return (
                  <div key={doc._id} className="bg-gray-50 border rounded-xl p-3 flex flex-col hover:shadow-md transition-shadow group">
                    {/* Thumbnail / Icon */}
                    <div className="w-full aspect-square rounded-lg bg-white border flex items-center justify-center overflow-hidden mb-2 cursor-pointer relative"
                      onClick={() => setPreviewDoc(doc)}>
                      {isImage ? (
                        <img src={doc.url} alt={doc.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex flex-col items-center justify-center">
                          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${isPdf ? 'bg-red-100' : 'bg-primary-100'}`}>
                            <FiFile className={isPdf ? 'text-red-500' : 'text-primary-600'} size={24} />
                          </div>
                          <span className="text-[10px] text-gray-400 mt-1 uppercase font-medium">
                            {isPdf ? 'PDF' : doc.mimeType?.split('/').pop()?.toUpperCase() || 'FILE'}
                          </span>
                        </div>
                      )}
                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <FiEye className="text-white" size={22} />
                      </div>
                    </div>
                    {/* Doc Info */}
                    <p className="text-xs font-semibold text-gray-800 truncate" title={doc.name}>{doc.name}</p>
                    <span className="inline-block text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded mt-1 w-fit">{doc.type}</span>
                    {doc.description && (
                      <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-2" title={doc.description}>{doc.description}</p>
                    )}
                    <p className="text-[10px] text-gray-400 mt-auto pt-1">
                      {new Date(doc.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      {doc.uploadedBy?.name && <span> &middot; {doc.uploadedBy.name}</span>}
                    </p>
                    {/* Actions */}
                    <div className="flex items-center gap-1 mt-2 pt-2 border-t">
                      <button onClick={() => setPreviewDoc(doc)}
                        className="flex-1 flex items-center justify-center gap-1 text-[10px] text-emerald-600 hover:bg-emerald-50 rounded py-1 font-medium">
                        <FiEye size={12} /> View
                      </button>
                      <a href={downloadDocumentURL(doc._id)} target="_blank" rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-1 text-[10px] text-blue-600 hover:bg-blue-50 rounded py-1 font-medium">
                        <FiDownload size={12} /> Download
                      </a>
                      {(isOwner || isHR) && (
                        <button onClick={() => handleDeleteDoc(doc._id)}
                          className="flex-1 flex items-center justify-center gap-1 text-[10px] text-red-600 hover:bg-red-50 rounded py-1 font-medium">
                          <FiTrash2 size={12} /> Delete
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Document Upload Modal */}
      {showDocModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="text-lg font-semibold text-gray-800">Upload Document</h3>
              <button onClick={() => { setShowDocModal(false); setDocForm({ name: '', type: 'Other', description: '', file: null }); }}
                className="text-gray-400 hover:text-gray-600">
                <FiX size={20} />
              </button>
            </div>
            <form onSubmit={handleDocUpload} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Document Type *</label>
                <select value={docForm.type} onChange={e => setDocForm(p => ({ ...p, type: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" required>
                  {['ID Proof', 'Address Proof', 'Resume', 'Certificate', 'Offer Letter', 'Contract', 'Payslip', 'Experience Letter', 'Educational Document', 'PAN Card', 'Aadhaar Card', 'Passport', 'Bank Statement', 'Other'].map(t =>
                    <option key={t} value={t}>{t}</option>
                  )}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Document Name</label>
                <input type="text" value={docForm.name} onChange={e => setDocForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. John's Aadhaar Card (auto-filled from filename if empty)"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea value={docForm.description} onChange={e => setDocForm(p => ({ ...p, description: e.target.value }))}
                  rows="2" placeholder="Short description about this document..."
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select File *</label>
                <div className="border-2 border-dashed rounded-lg p-4 text-center">
                  {docForm.file ? (
                    <div className="flex items-center justify-center gap-2">
                      <FiFile className="text-primary-600" />
                      <span className="text-sm text-gray-700">{docForm.file.name}</span>
                      <button type="button" onClick={() => setDocForm(p => ({ ...p, file: null }))}
                        className="text-red-500 hover:text-red-700 ml-1"><FiX size={14} /></button>
                    </div>
                  ) : (
                    <label className="cursor-pointer">
                      <FiUpload className="mx-auto text-gray-400 mb-1" size={24} />
                      <p className="text-sm text-gray-500">Click to select a file</p>
                      <p className="text-xs text-gray-400 mt-1">PDF, Images, Documents (Max 10MB)</p>
                      <input type="file" className="hidden" onChange={e => {
                        const file = e.target.files[0];
                        if (file) setDocForm(p => ({ ...p, file, name: p.name || file.name }));
                      }} />
                    </label>
                  )}
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500"><strong>Upload Date:</strong> {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} (set automatically)</p>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => { setShowDocModal(false); setDocForm({ name: '', type: 'Other', description: '', file: null }); }}
                  className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={docUploading || !docForm.file}
                  className="flex items-center gap-2 bg-primary-600 text-white px-5 py-2 rounded-lg text-sm hover:bg-primary-700 disabled:opacity-50">
                  <FiUpload /> {docUploading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Document Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-semibold text-gray-800 truncate">{previewDoc.name}</h3>
                <div className="flex flex-wrap items-center gap-2 mt-0.5">
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{previewDoc.type}</span>
                  <span className="text-xs text-gray-400">
                    {new Date(previewDoc.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                  {previewDoc.uploadedBy?.name && (
                    <span className="text-xs text-gray-400">by {previewDoc.uploadedBy.name}</span>
                  )}
                  {previewDoc.fileSize && (
                    <span className="text-xs text-gray-400">{(previewDoc.fileSize / 1024).toFixed(0)} KB</span>
                  )}
                </div>
                {previewDoc.description && (
                  <p className="text-xs text-gray-500 mt-1">{previewDoc.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                <a href={downloadDocumentURL(previewDoc._id)} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 px-3 py-1.5 rounded-lg hover:bg-blue-50">
                  <FiDownload size={14} /> Download
                </a>
                <button onClick={() => setPreviewDoc(null)}
                  className="text-gray-400 hover:text-gray-600 p-1">
                  <FiX size={20} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4 bg-gray-100 flex items-center justify-center min-h-[400px]">
              {previewDoc.mimeType?.startsWith('image/') ? (
                <img src={viewDocumentURL(previewDoc._id)} alt={previewDoc.name}
                  className="max-w-full max-h-[70vh] object-contain rounded-lg shadow" />
              ) : previewDoc.mimeType === 'application/pdf' || previewDoc.url?.toLowerCase().endsWith('.pdf') ? (
                <iframe
                  src={viewDocumentURL(previewDoc._id)}
                  title={previewDoc.name}
                  className="w-full h-[70vh] rounded-lg border bg-white" />
              ) : (
                <div className="text-center py-16">
                  <FiFile className="mx-auto text-gray-300 mb-4" size={64} />
                  <p className="text-gray-500 mb-2">Preview not available for this file type</p>
                  <p className="text-xs text-gray-400 mb-4">{previewDoc.mimeType || 'Unknown type'}</p>
                  <a href={downloadDocumentURL(previewDoc._id)} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-primary-700">
                    <FiDownload size={14} /> Download to view
                  </a>
                </div>
              )}
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
