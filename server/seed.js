import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { faker } from '@faker-js/faker';
import User from './models/User.js';
import Department from './models/Department.js';
import Employee from './models/Employee.js';
import LeaveType from './models/LeaveType.js';
import Holiday from './models/Holiday.js';

dotenv.config();

const generateEmployeeData = (role, dpt, managerId) => {
  const gender = faker.person.sexType();
  const firstName = faker.person.firstName(gender);
  const lastName = faker.person.lastName(gender);
  const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@infenevocloud.local`;
  const phone = faker.phone.number('9#########');
  
  let designation = 'Network Support Engineer';
  if (role === 'hr') designation = 'Human Resource Business Partner';
  if (role === 'manager') designation = `${dpt.name} Manager`;
  if (role === 'employee' && dpt.name === 'Cloud Services') designation = 'Cloud Solutions Architect';
  if (role === 'employee' && dpt.name === 'IT Infrastructure') designation = 'Infrastructure Engineer';

  return {
    user: {
      name: `${firstName} ${lastName}`,
      email,
      password: 'password123',
      role,
      profileCompleted: true
    },
    employee: {
      employeeId: 'EMP' + faker.string.numeric(6),
      firstName,
      lastName,
      gender,
      email,
      phone,
      dateOfBirth: faker.date.birthdate({ min: 25, max: 45, mode: 'age' }),
      maritalStatus: faker.helpers.arrayElement(['Single', 'Married']),
      department: dpt._id,
      designation,
      manager: managerId || null,
      dateOfJoining: faker.date.past({ years: 3 }),
      employmentType: 'Full-time',
      address: {
        street: faker.location.streetAddress(),
        city: faker.location.city(),
        state: faker.location.state(),
        zipCode: faker.location.zipCode(),
        country: 'India'
      },
      salary: {
        basic: faker.number.int({ min: 40000, max: 120000 }),
        hra: 15000,
        allowances: 10000,
        deductions: 2000,
        pf: 8000,
        esi: 0,
        tax: 5000
      },
      bankDetails: {
        bankName: faker.finance.accountName() + ' Bank',
        accountNumber: faker.finance.accountNumber(10),
        ifscCode: 'IFSC1234567'
      },
      emergencyContact: {
        name: faker.person.fullName(),
        relation: 'Relative',
        phone: faker.phone.number('9#########')
      },
      status: 'Active'
    }
  };
};

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Department.deleteMany({});
    await Employee.deleteMany({});
    await LeaveType.deleteMany({});
    await Holiday.deleteMany({});

    // Create Super Admin
    const superAdminUser = await User.create({
      name: 'Super Admin',
      email: 'admin@infenevocloud.local',
      password: 'admin123',
      role: 'super_admin',
      profileCompleted: true
    });
    console.log('Super Admin created:', superAdminUser.email);

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
    ]);
    console.log('Holidays created:', holidays.length);

    // Departments
    const depts = [
      { name: 'Cloud Services', description: 'Cloud infrastructure and solutions' },
      { name: 'IT Infrastructure', description: 'Internal IT systems and network' },
      { name: 'Network Support', description: 'Network administration and support' }
    ];
    
    for (const d of depts) {
      const deptRec = await Department.create(d);
      
      const mgrData = generateEmployeeData('manager', deptRec, null);
      const mgrUser = await User.create(mgrData.user);
      const mgrEmp = await Employee.create({ ...mgrData.employee, user: mgrUser._id });
      mgrUser.employee = mgrEmp._id;
      await mgrUser.save();
      console.log(`Created Manager for ${d.name}: ${mgrUser.email}`);

      const hrData = generateEmployeeData('hr', deptRec, mgrEmp._id);
      const hrUser = await User.create(hrData.user);
      const hrEmp = await Employee.create({ ...hrData.employee, user: hrUser._id });
      hrUser.employee = hrEmp._id;
      await hrUser.save();
      console.log(`Created HR for ${d.name}: ${hrUser.email}`);

      for (let i = 0; i < 8; i++) {
        const empData = generateEmployeeData('employee', deptRec, mgrEmp._id);
        const empUser = await User.create(empData.user);
        const empRec = await Employee.create({ ...empData.employee, user: empUser._id });
        empUser.employee = empRec._id;
        await empUser.save();
      }
      console.log(`Created 8 employees for ${d.name}`);
    }

    console.log('\n--- Seed Complete ---');
    console.log('Login credentials:');
    console.log('Super Admin: admin@infenevocloud.local / admin123');
    console.log('Use password "password123" for any other generated account');

    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

seed();
