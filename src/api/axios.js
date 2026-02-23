import axios from 'axios';

const API = axios.create({
  baseURL: '/api',
  withCredentials: true
});

// Add token to requests
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Don't redirect if already on login/signup page (e.g. wrong credentials or deactivated account)
      const isAuthPage = window.location.pathname === '/login' || window.location.pathname === '/signup';
      if (!isAuthPage) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth
export const checkSetupAPI = () => API.get('/auth/check-setup');
export const initialSetupAPI = (data) => API.post('/auth/initial-setup', data);
export const loginAPI = (data) => API.post('/auth/login', data);
export const getMeAPI = () => API.get('/auth/me');
export const registerUserAPI = (data) => API.post('/auth/register', data);
export const updatePasswordAPI = (data) => API.put('/auth/password', data);
export const getUsersAPI = (params) => API.get('/auth/users', { params });
export const toggleUserAPI = (id) => API.put(`/auth/users/${id}/toggle`);
export const forgotPasswordAPI = (data) => API.post('/auth/forgot-password', data);
export const verifyOtpAPI = (data) => API.post('/auth/verify-otp', data);
export const resetPasswordAPI = (data) => API.post('/auth/reset-password', data);

// Notifications
export const getNotificationsAPI = (params) => API.get('/notifications', { params });
export const getUnreadCountAPI = () => API.get('/notifications/unread-count');
export const markNotificationReadAPI = (id) => API.put(`/notifications/${id}/read`);
export const markAllNotificationsReadAPI = () => API.put('/notifications/read-all');
export const deleteNotificationAPI = (id) => API.delete(`/notifications/${id}`);

// Employees
export const getEmployeesAPI = (params) => API.get('/employees', { params });
export const getEmployeeAPI = (id) => API.get(`/employees/${id}`);
export const createEmployeeAPI = (data) => API.post('/employees', data);
export const updateEmployeeAPI = (id, data) => API.put(`/employees/${id}`, data);
export const deleteEmployeeAPI = (id) => API.delete(`/employees/${id}`);
export const uploadAvatarAPI = (id, formData) => API.post(`/employees/${id}/avatar`, formData);

// Departments
export const getDepartmentsAPI = () => API.get('/departments');
export const createDepartmentAPI = (data) => API.post('/departments', data);
export const updateDepartmentAPI = (id, data) => API.put(`/departments/${id}`, data);
export const deleteDepartmentAPI = (id) => API.delete(`/departments/${id}`);

// Leaves
export const getLeavesAPI = (params) => API.get('/leaves', { params });
export const applyLeaveAPI = (data) => API.post('/leaves', data);
export const managerLeaveActionAPI = (id, data) => API.put(`/leaves/${id}/manager-action`, data);
export const hrLeaveActionAPI = (id, data) => API.put(`/leaves/${id}/hr-action`, data);
export const cancelLeaveAPI = (id) => API.put(`/leaves/${id}/cancel`);
export const endLeaveEarlyAPI = (id) => API.put(`/leaves/${id}/end-early`);
export const getLeaveTypesAPI = () => API.get('/leaves/types');
export const createLeaveTypeAPI = (data) => API.post('/leaves/types', data);
export const updateLeaveTypeAPI = (id, data) => API.put(`/leaves/types/${id}`, data);
export const deleteLeaveTypeAPI = (id) => API.delete(`/leaves/types/${id}`);
export const getLeaveBalanceAPI = (params) => API.get('/leaves/balance', { params });
export const adjustLeaveBalanceAPI = (data) => API.put('/leaves/balance', data);

// Payroll
export const getPayrollAPI = (params) => API.get('/payroll', { params });
export const processPayrollAPI = (data) => API.post('/payroll/process', data);
export const getPayslipAPI = (id) => API.get(`/payroll/${id}/payslip`);
export const downloadPayslipPDFAPI = (id) => API.get(`/payroll/${id}/pdf`, { responseType: 'blob' });
export const getPayrollSummaryAPI = (params) => API.get('/payroll/summary', { params });
export const getPayrollConfigAPI = () => API.get('/payroll/config');
export const updatePayrollConfigAPI = (data) => API.put('/payroll/config', data);

// Attendance
export const checkInAPI = () => API.post('/attendance/checkin');
export const checkOutAPI = () => API.put('/attendance/checkout');
export const getAttendanceAPI = (params) => API.get('/attendance', { params });
export const markAttendanceAPI = (data) => API.post('/attendance/mark', data);
export const getAttendanceReportAPI = (params) => API.get('/attendance/report', { params });

// Dashboard
export const getDashboardAPI = () => API.get('/dashboard');

// Announcements
export const getAnnouncementsAPI = () => API.get('/announcements');
export const createAnnouncementAPI = (data) => API.post('/announcements', data);
export const updateAnnouncementAPI = (id, data) => API.put(`/announcements/${id}`, data);
export const deleteAnnouncementAPI = (id) => API.delete(`/announcements/${id}`);

// Documents
export const getDocumentsAPI = (employeeId) => API.get(`/documents/${employeeId}`);
export const uploadDocumentAPI = (employeeId, formData) => API.post(`/documents/${employeeId}`, formData);
export const deleteDocumentAPI = (id) => API.delete(`/documents/${id}`);
export const viewDocumentURL = (id) => {
  const token = localStorage.getItem('token');
  return `/api/documents/view/${id}?token=${token}`;
};
export const downloadDocumentURL = (id) => {
  const token = localStorage.getItem('token');
  return `/api/documents/download/${id}?token=${token}`;
};

// Audit Logs
export const getAuditLogsAPI = (params) => API.get('/audit', { params });

// Profile
export const getProfileAPI = () => API.get('/profile');
export const completeProfileAPI = (data) => API.put('/profile/complete', data);
export const updateProfileAPI = (data) => API.put('/profile', data);
export const getLoginLogsAPI = (params) => API.get('/profile/login-logs', { params });
export const uploadMyAvatarAPI = (formData) => API.post('/profile/avatar', formData);
export const getMyDocumentsAPI = () => API.get('/profile/documents');
export const logoutAPI = () => API.post('/auth/logout');

// Holidays
export const getHolidaysAPI = (params) => API.get('/holidays', { params });
export const createHolidayAPI = (data) => API.post('/holidays', data);
export const updateHolidayAPI = (id, data) => API.put(`/holidays/${id}`, data);
export const deleteHolidayAPI = (id) => API.delete(`/holidays/${id}`);

export default API;

// Settings
export const getSettingsAPI = () => API.get('/settings');
export const updateSettingsAPI = (data) => API.put('/settings', data);

// Reports
export const getReportsAPI = (params) => API.get('/reports', { params });

// Exports
export const exportEmployeesAPI = () => API.get('/export/employees', { responseType: 'blob' });
export const exportPayrollAPI = (params) => API.get('/export/payroll', { params, responseType: 'blob' });
export const exportAttendanceAPI = (params) => API.get('/export/attendance', { params, responseType: 'blob' });
export const exportLeavesAPI = () => API.get('/export/leaves', { responseType: 'blob' });

// Performance
export const getPerformanceReviewsAPI = (params) => API.get('/performance', { params });
export const getPerformanceReviewAPI = (id) => API.get(`/performance/${id}`);
export const createPerformanceReviewAPI = (data) => API.post('/performance', data);
export const updatePerformanceReviewAPI = (id, data) => API.put(`/performance/${id}`, data);
export const submitPerformanceReviewAPI = (id) => API.put(`/performance/${id}/submit`);
export const acknowledgePerformanceReviewAPI = (id, data) => API.put(`/performance/${id}/acknowledge`, data);
export const closePerformanceReviewAPI = (id) => API.put(`/performance/${id}/close`);
export const deletePerformanceReviewAPI = (id) => API.delete(`/performance/${id}`);

// Recruitment
export const getJobPostingsAPI = (params) => API.get('/recruitment/jobs', { params });
export const getJobPostingAPI = (id) => API.get(`/recruitment/jobs/${id}`);
export const createJobPostingAPI = (data) => API.post('/recruitment/jobs', data);
export const updateJobPostingAPI = (id, data) => API.put(`/recruitment/jobs/${id}`, data);
export const deleteJobPostingAPI = (id) => API.delete(`/recruitment/jobs/${id}`);
export const getCandidatesAPI = (params) => API.get('/recruitment/candidates', { params });
export const getCandidateAPI = (id) => API.get(`/recruitment/candidates/${id}`);
export const createCandidateAPI = (data) => API.post('/recruitment/candidates', data);
export const updateCandidateAPI = (id, data) => API.put(`/recruitment/candidates/${id}`, data);
export const deleteCandidateAPI = (id) => API.delete(`/recruitment/candidates/${id}`);
export const addInterviewAPI = (id, data) => API.post(`/recruitment/candidates/${id}/interviews`, data);
export const getRecruitmentStatsAPI = () => API.get('/recruitment/stats');

// Messages
export const getInboxAPI = (params) => API.get('/messages/inbox', { params });
export const getSentAPI = (params) => API.get('/messages/sent', { params });
export const getMessageAPI = (id) => API.get(`/messages/${id}`);
export const sendMessageAPI = (data) => API.post('/messages', data);
export const markMessageReadAPI = (id) => API.put(`/messages/${id}/read`);
export const markAllMessagesReadAPI = () => API.put('/messages/read-all');
export const deleteMessageAPI = (id) => API.delete(`/messages/${id}`);
export const getMessageUnreadCountAPI = () => API.get('/messages/unread-count');
export const getMessageUsersAPI = () => API.get('/messages/users');
