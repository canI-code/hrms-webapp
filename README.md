# HRMS — Human Resource Management System

A full-stack HRMS web application built with **React + Vite** (frontend) and **Node.js + Express** (backend), using **MongoDB** for data storage and **Cloudinary** for file uploads.

## Features

- **Role-Based Access Control** — Super Admin, HR, Manager, Employee
- **Employee Management** — Full CRUD with profile photos, department assignment, manager linking
- **Attendance Tracking** — Session-based (morning/afternoon) check-in/check-out with late tracking
- **Leave Management** — Multi-level approval flow (Employee → Manager → HR), leave balances, end leave early
- **Payroll** — Salary structure, payroll processing, payslip generation (PDF)
- **Department Management** — Create/edit departments, assign heads
- **Holiday Calendar** — National and optional holidays
- **Document Management** — Upload, view, and download employee documents (Cloudinary storage)
- **Performance Reviews** — Goal setting, reviews, ratings
- **Recruitment** — Job postings, applicant tracking
- **Announcements** — Company-wide announcements
- **Internal Messaging** — Employee-to-employee messaging
- **Notifications** — Real-time in-app notifications
- **Audit Logs** — Track all system actions
- **Reports & Export** — Attendance, leave, payroll reports with Excel export
- **Dashboard** — Role-specific dashboards with charts and stats

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite, Tailwind CSS, React Router v7, Recharts |
| Backend | Node.js, Express |
| Database | MongoDB (Mongoose ODM) |
| File Storage | Cloudinary |
| Auth | JWT (JSON Web Tokens) |

## Quick Start

> For detailed setup instructions, see [INSTALLATION.md](INSTALLATION.md)

```bash
git clone <repo-url>
cd webapp
npm install
cp .env.example .env    # then fill in your values
npm run dev
```

The app opens at **http://localhost:5173**. On first launch, you'll be prompted to create a Super Admin account.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start both frontend (Vite) and backend (nodemon) concurrently |
| `npm run dev:client` | Start only the Vite dev server |
| `npm run dev:server` | Start only the Express backend with nodemon |
| `npm run build` | Build frontend for production |
| `npm start` | Start production server |
| `npm run seed` | Seed database with sample data (departments, leave types, holidays) |

## License

ISC
