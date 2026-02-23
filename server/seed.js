import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import Department from './models/Department.js';
import LeaveType from './models/LeaveType.js';
import Holiday from './models/Holiday.js';

dotenv.config();

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Department.deleteMany({});
    await LeaveType.deleteMany({});
    await Holiday.deleteMany({});

    // Create Super Admin
    const superAdmin = await User.create({
      name: 'Super Admin',
      email: 'admin@hrms.com',
      password: 'admin123',
      role: 'super_admin'
    });
    console.log('Super Admin created:', superAdmin.email);

    // Create HR
    const hr = await User.create({
      name: 'HR Manager',
      email: 'hr@hrms.com',
      password: 'hr123456',
      role: 'hr'
    });
    console.log('HR created:', hr.email);

    // Create Departments
    const departments = await Department.insertMany([
      { name: 'Engineering', description: 'Software Engineering Department' },
      { name: 'Human Resources', description: 'HR Department' },
      { name: 'Marketing', description: 'Marketing & Sales Department' },
      { name: 'Finance', description: 'Finance & Accounting Department' },
      { name: 'Operations', description: 'Operations & Support Department' },
    ]);
    console.log('Departments created:', departments.length);

    // Create Leave Types
    const leaveTypes = await LeaveType.insertMany([
      { name: 'Casual Leave', description: 'For personal/family reasons', daysPerYear: 12 },
      { name: 'Sick Leave', description: 'For health-related reasons', daysPerYear: 10 },
      { name: 'Earned Leave', description: 'Accumulated paid leave', daysPerYear: 15, carryForward: true },
      { name: 'Maternity Leave', description: 'For expecting mothers', daysPerYear: 180 },
      { name: 'Paternity Leave', description: 'For new fathers', daysPerYear: 15 },
    ]);
    console.log('Leave types created:', leaveTypes.length);

    // Create Holidays for 2026
    const holidays = await Holiday.insertMany([
      { name: 'New Year', date: new Date('2026-01-01'), type: 'National' },
      { name: 'Republic Day', date: new Date('2026-01-26'), type: 'National' },
      { name: 'Holi', date: new Date('2026-03-17'), type: 'National' },
      { name: 'Good Friday', date: new Date('2026-04-03'), type: 'National' },
      { name: 'Independence Day', date: new Date('2026-08-15'), type: 'National' },
      { name: 'Gandhi Jayanti', date: new Date('2026-10-02'), type: 'National' },
      { name: 'Diwali', date: new Date('2026-11-08'), type: 'National' },
      { name: 'Christmas', date: new Date('2026-12-25'), type: 'National' },
    ]);
    console.log('Holidays created:', holidays.length);

    console.log('\n--- Seed Complete ---');
    console.log('Login credentials:');
    console.log('Super Admin: admin@hrms.com / admin123');
    console.log('HR: hr@hrms.com / hr123456');

    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

seed();
