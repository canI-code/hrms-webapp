import { Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useAuth } from './context/AuthContext';
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/common/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import EmployeeList from './pages/employees/EmployeeList';
import EmployeeForm from './pages/employees/EmployeeForm';
import EmployeeProfile from './pages/employees/EmployeeProfile';
import LeaveList from './pages/leave/LeaveList';
import LeaveApply from './pages/leave/LeaveApply';
import LeaveApprovals from './pages/leave/LeaveApprovals';
import LeaveTypeList from './pages/leave/LeaveTypeList';
import LeaveBalanceManager from './pages/leave/LeaveBalanceManager';
import PayrollList from './pages/payroll/PayrollList';
import PayrollProcess from './pages/payroll/PayrollProcess';
import PayrollConfigPage from './pages/payroll/PayrollConfig';
import MyPayslips from './pages/payroll/MyPayslips';
import AttendancePage from './pages/attendance/AttendancePage';
import AttendanceReport from './pages/attendance/AttendanceReport';
import DepartmentList from './pages/departments/DepartmentList';
import AnnouncementList from './pages/announcements/AnnouncementList';
import HolidayList from './pages/holidays/HolidayList';
import AuditLogs from './pages/audit/AuditLogs';
import MyProfile from './pages/profile/MyProfile';
import CompanySettings from './pages/settings/CompanySettings';
import Reports from './pages/reports/Reports';
import PerformanceReviews from './pages/performance/PerformanceReviews';
import Recruitment from './pages/recruitment/Recruitment';
import Messages from './pages/messages/Messages';
import ProfileCompletion from './pages/profile/ProfileCompletion';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';

function App() {
  const { user } = useAuth();

  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} />
      <Routes>
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
        <Route path="/signup" element={!user ? <Signup /> : <Navigate to="/" />} />
        <Route path="/forgot-password" element={!user ? <ForgotPassword /> : <Navigate to="/" />} />
        <Route path="/complete-profile" element={
          user && !user.profileCompleted ? <ProfileCompletion /> : <Navigate to="/" />
        } />
        <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/staff" element={
            <ProtectedRoute roles={['super_admin']}>
              <EmployeeList mode="staff" />
            </ProtectedRoute>
          } />
          <Route path="/employees" element={
            <ProtectedRoute roles={['super_admin', 'hr', 'manager']}>
              <EmployeeList mode="employees" />
            </ProtectedRoute>
          } />
          <Route path="/employees/new" element={
            <ProtectedRoute roles={['super_admin', 'hr']}>
              <EmployeeForm />
            </ProtectedRoute>
          } />
          <Route path="/employees/:id/edit" element={
            <ProtectedRoute roles={['super_admin', 'hr']}>
              <EmployeeForm />
            </ProtectedRoute>
          } />
          <Route path="/employees/:id" element={<EmployeeProfile />} />
          <Route path="/leaves" element={<LeaveList />} />
          <Route path="/leaves/apply" element={
            <ProtectedRoute roles={['employee', 'manager', 'hr']}>
              <LeaveApply />
            </ProtectedRoute>
          } />
          <Route path="/leaves/approvals" element={
            <ProtectedRoute roles={['hr', 'manager']}>
              <LeaveApprovals />
            </ProtectedRoute>
          } />
          <Route path="/leave-types" element={
            <ProtectedRoute roles={['super_admin', 'hr']}>
              <LeaveTypeList />
            </ProtectedRoute>
          } />
          <Route path="/leave-balances" element={
            <ProtectedRoute roles={['hr']}>
              <LeaveBalanceManager />
            </ProtectedRoute>
          } />
          <Route path="/payroll" element={
            <ProtectedRoute roles={['super_admin', 'hr']}>
              <PayrollList />
            </ProtectedRoute>
          } />
          <Route path="/payroll/process" element={
            <ProtectedRoute roles={['hr']}>
              <PayrollProcess />
            </ProtectedRoute>
          } />
          <Route path="/payroll/config" element={
            <ProtectedRoute roles={['super_admin', 'hr']}>
              <PayrollConfigPage />
            </ProtectedRoute>
          } />
          <Route path="/my-payslips" element={
            <ProtectedRoute roles={['employee', 'manager']}>
              <MyPayslips />
            </ProtectedRoute>
          } />
          <Route path="/attendance" element={<AttendancePage />} />
          <Route path="/attendance/report" element={
            <ProtectedRoute roles={['super_admin', 'hr', 'manager']}>
              <AttendanceReport />
            </ProtectedRoute>
          } />
          <Route path="/departments" element={
            <ProtectedRoute roles={['super_admin', 'hr']}>
              <DepartmentList />
            </ProtectedRoute>
          } />
          <Route path="/announcements" element={<AnnouncementList />} />
          <Route path="/holidays" element={<HolidayList />} />
          <Route path="/audit" element={
            <ProtectedRoute roles={['super_admin']}>
              <AuditLogs />
            </ProtectedRoute>
          } />
          <Route path="/profile" element={<MyProfile />} />
          <Route path="/settings" element={
            <ProtectedRoute roles={['super_admin']}>
              <CompanySettings />
            </ProtectedRoute>
          } />
          <Route path="/reports" element={
            <ProtectedRoute roles={['super_admin', 'hr']}>
              <Reports />
            </ProtectedRoute>
          } />
          <Route path="/performance" element={<PerformanceReviews />} />
          <Route path="/recruitment" element={
            <ProtectedRoute roles={['super_admin', 'hr']}>
              <Recruitment />
            </ProtectedRoute>
          } />
          <Route path="/messages" element={<Messages />} />
        </Route>
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </>
  );
}

export default App;
