import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from './config/db.js';

// Route imports
import authRoutes from './routes/auth.routes.js';
import employeeRoutes from './routes/employee.routes.js';
import departmentRoutes from './routes/department.routes.js';
import leaveRoutes from './routes/leave.routes.js';
import payrollRoutes from './routes/payroll.routes.js';
import attendanceRoutes from './routes/attendance.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import announcementRoutes from './routes/announcement.routes.js';
import documentRoutes from './routes/document.routes.js';
import auditRoutes from './routes/audit.routes.js';
import holidayRoutes from './routes/holiday.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import profileRoutes from './routes/profile.routes.js';
import settingsRoutes from './routes/settings.routes.js';
import reportsRoutes from './routes/reports.routes.js';
import exportRoutes from './routes/export.routes.js';
import performanceRoutes from './routes/performance.routes.js';
import recruitmentRoutes from './routes/recruitment.routes.js';
import messageRoutes from './routes/message.routes.js';
import { checkDocumentExpiry } from './utils/documentExpiryChecker.js';
import LeaveType from './models/LeaveType.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/holidays', holidayRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/performance', performanceRoutes);
app.use('/api/recruitment', recruitmentRoutes);
app.use('/api/messages', messageRoutes);

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '..', 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
  });
}

const PORT = process.env.PORT || 5000;

// Connect to MongoDB before starting the server
const startServer = async () => {
  try {
    await connectDB();

    // Auto-seed default leave types if none exist
    const leaveTypeCount = await LeaveType.countDocuments();
    if (leaveTypeCount === 0) {
      await LeaveType.insertMany([
        { name: 'Casual Leave', description: 'For personal/casual reasons', daysPerYear: 12, carryForward: false },
        { name: 'Sick Leave', description: 'For illness or medical needs', daysPerYear: 10, carryForward: false },
        { name: 'Earned Leave', description: 'Privilege/earned leave, can be carried forward', daysPerYear: 15, carryForward: true },
        { name: 'Maternity Leave', description: 'Maternity leave as per policy', daysPerYear: 180, carryForward: false },
        { name: 'Paternity Leave', description: 'Paternity leave as per policy', daysPerYear: 15, carryForward: false },
      ]);
      console.log('Default leave types seeded');
    }

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

    // Run document expiry check on startup, then every 24 hours
    checkDocumentExpiry();
    setInterval(checkDocumentExpiry, 24 * 60 * 60 * 1000);
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();
