import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  FiHome, FiUsers, FiCalendar, FiDollarSign, FiClock,
  FiGrid, FiBell, FiStar, FiFileText, FiX, FiShield,
  FiChevronsLeft, FiChevronsRight, FiBriefcase, FiMessageSquare, FiAward
} from 'react-icons/fi';

const Sidebar = ({ onClose, collapsed, onToggleCollapse }) => {
  const { user } = useAuth();
  const role = user?.role;

  const navItems = [
    { to: '/', icon: FiHome, label: 'Dashboard', roles: ['super_admin', 'hr', 'manager', 'employee'] },
    { to: '/staff', icon: FiShield, label: 'Staff Management', roles: ['super_admin'] },
    { to: '/employees', icon: FiUsers, label: 'Employees', roles: ['super_admin', 'hr', 'manager'] },
    { to: '/departments', icon: FiGrid, label: 'Departments', roles: ['super_admin', 'hr'] },
    { to: '/leaves', icon: FiCalendar, label: 'Leaves', roles: ['super_admin', 'hr', 'manager', 'employee'] },
    { to: '/leaves/approvals', icon: FiCalendar, label: 'Leave Approvals', roles: ['hr'] },
    { to: '/leave-types', icon: FiCalendar, label: 'Leave Types', roles: ['super_admin', 'hr'] },
    { to: '/leave-balances', icon: FiCalendar, label: 'Leave Balances', roles: ['hr'] },
    { to: '/payroll', icon: FiDollarSign, label: 'Payroll', roles: ['super_admin', 'hr'] },
    { to: '/payroll/config', icon: FiDollarSign, label: 'Payroll Config', roles: ['super_admin', 'hr'] },
    { to: '/my-payslips', icon: FiDollarSign, label: 'My Payslips', roles: ['employee', 'manager'] },
    { to: '/attendance', icon: FiClock, label: 'Attendance', roles: ['super_admin', 'hr', 'manager', 'employee'] },
    { to: '/attendance/report', icon: FiClock, label: 'Attendance Report', roles: ['super_admin', 'hr', 'manager'] },
    { to: '/announcements', icon: FiBell, label: 'Announcements', roles: ['super_admin', 'hr', 'manager', 'employee'] },
    { to: '/holidays', icon: FiStar, label: 'Holidays', roles: ['super_admin', 'hr', 'manager', 'employee'] },
    { to: '/audit', icon: FiFileText, label: 'Audit Logs', roles: ['super_admin'] },
    { to: '/reports', icon: FiFileText, label: 'Reports', roles: ['super_admin', 'hr'] },
    { to: '/performance', icon: FiAward, label: 'Performance', roles: ['super_admin', 'hr', 'manager', 'employee'] },
    { to: '/recruitment', icon: FiBriefcase, label: 'Recruitment', roles: ['super_admin', 'hr'] },
    { to: '/messages', icon: FiMessageSquare, label: 'Messages', roles: ['super_admin', 'hr', 'manager', 'employee'] },
  ];

  const filteredItems = navItems.filter(item => item.roles.includes(role));

  return (
    <div className="h-full bg-white dark:bg-gray-800 shadow-lg flex flex-col transition-all duration-200">
      {/* Logo */}
      <div className="flex items-center justify-between p-4 border-b min-h-[3.75rem]">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <FiShield className="text-white text-lg" />
          </div>
          {!collapsed && <span className="text-xl font-bold text-gray-800 whitespace-nowrap">infeNevoCloud</span>}
        </div>
        <button onClick={onClose} className="lg:hidden text-gray-500 hover:text-gray-700">
          <FiX size={20} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        {filteredItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            onClick={onClose}
            title={collapsed ? item.label : undefined}
            className={({ isActive }) =>
              `group relative flex items-center gap-3 py-2.5 mx-2 rounded-lg text-sm font-medium transition-colors
              ${collapsed ? 'justify-center px-2' : 'px-4'}
              ${isActive
                ? 'bg-primary-50 text-primary-700'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`
            }
          >
            <item.icon size={18} className="flex-shrink-0" />
            {!collapsed && <span className="whitespace-nowrap overflow-hidden">{item.label}</span>}
            {collapsed && (
              <span className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded-md whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity z-50 pointer-events-none">
                {item.label}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Collapse toggle (desktop only) */}
      <div className="hidden lg:flex justify-center py-2 border-t">
        <button
          onClick={onToggleCollapse}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <FiChevronsRight size={18} /> : <FiChevronsLeft size={18} />}
        </button>
      </div>

      {/* User info footer */}
      <div className={`p-4 border-t ${collapsed ? 'flex justify-center' : ''}`}>
        <div className={`flex items-center ${collapsed ? '' : 'gap-3'}`} title={collapsed ? `${user?.name} (${user?.role?.replace('_', ' ')})` : undefined}>
          <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-medium text-primary-700">
              {user?.name?.charAt(0)?.toUpperCase()}
            </span>
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-700 truncate">{user?.name}</p>
              <p className="text-xs text-gray-500 capitalize">{user?.role?.replace('_', ' ')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
