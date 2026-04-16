# InfeNevo Cloud — Installation Guide

Step-by-step instructions to clone, configure, and run this project.

---

## Prerequisites

Make sure you have the following installed:

| Tool | Version | Download |
|------|---------|----------|
| **Node.js** | v18 or higher | https://nodejs.org |
| **npm** | v9 or higher (comes with Node.js) | — |
| **Git** | Any recent version | https://git-scm.com |

You'll also need accounts on:

- **MongoDB Atlas** (free tier works) — https://www.mongodb.com/atlas
- **Cloudinary** (free tier works) — https://cloudinary.com

---

## Step 1: Clone the Repository

```bash
git clone <repo-url>
cd webapp
```

## Step 2: Install Dependencies

```bash
npm install
```

This installs both frontend (React, Vite, Tailwind) and backend (Express, Mongoose, etc.) dependencies from a single `package.json`.

## Step 3: Create the `.env` File

Copy the example environment file:

```bash
# On Windows
copy .env.example .env

# On macOS/Linux
cp .env.example .env
```

Open `.env` and fill in your values:

```env
# MongoDB — Get this from MongoDB Atlas → Connect → Drivers
MONGODB_URI=<your-mongodb-connection-string>

# JWT — Use any random string (the longer the better)
JWT_SECRET=<your-jwt-secret-key>
JWT_EXPIRE=7d

# Cloudinary — Get these from Cloudinary Dashboard → Settings
CLOUDINARY_CLOUD_NAME=<your-cloud-name>
CLOUDINARY_API_KEY=<your-api-key>
CLOUDINARY_API_SECRET=<your-api-secret>

# Server
PORT=5000
NODE_ENV=development

# Email (for Forgot Password OTP)
EMAIL_SERVICE=gmail
EMAIL_USER=<your-email@gmail.com>
EMAIL_PASS=<your-app-password>
```

### How to Get MongoDB URI

1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas) and create a free account
2. Create a new cluster (free M0 tier is fine)
3. Go to **Database Access** → Add a database user with a password
4. Go to **Network Access** → Add `0.0.0.0/0` to allow connections from anywhere
5. Go to **Database** → **Connect** → **Drivers** → Copy the connection string
6. Replace `<password>` in the string with your database user's password

### How to Get Cloudinary Credentials

1. Go to [Cloudinary](https://cloudinary.com) and create a free account
2. Go to **Dashboard** — you'll see Cloud Name, API Key, and API Secret right there
3. Copy them into your `.env` file

### How to Get Gmail App Password (for OTP emails)

1. Go to your [Google Account](https://myaccount.google.com)
2. Go to **Security** → Enable **2-Step Verification** (required)
3. After enabling 2FA, go to **Security** → **2-Step Verification** → **App Passwords**
4. Select app "Mail" and device "Other" → name it "HRMS"
5. Google will generate a 16-character password — copy it
6. Set `EMAIL_USER` to your Gmail address and `EMAIL_PASS` to the App Password (not your regular Gmail password)

## Step 4: Start the Application

```bash
npm run dev
```

This starts **both** the backend (Express on port 5000) and frontend (Vite on port 5173) concurrently.

Open your browser and go to: **http://localhost:5173**

## Step 5: First-Time Setup

On first launch, the app detects no Super Admin exists and shows a **setup page**. Create your Super Admin account:

- Enter a name, email, and password (min 6 characters)
- This becomes the main admin account for the system

After setup, log in and start configuring:

1. **Create HR accounts** — Super Admin → Employees → Add Employee (role: HR)
2. **Create Manager accounts** — Super Admin → Employees → Add Employee (role: Manager)
3. **HR creates Employees** — HR → Employees → Add Employee
4. **Departments** are auto-seeded, or you can create your own
5. **Leave Types** are auto-seeded (Casual, Sick, Earned, Maternity, Paternity)

---

## Optional: Seed Sample Data

If you want pre-made sample data (departments, holidays, leave types, and default admin/HR accounts):

```bash
npm run seed
```

> ⚠️ **Warning:** This clears existing users, departments, leave types, and holidays. Only run on a fresh database.

After seeding, use these credentials:

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@hrms.com | admin123 |
| HR | hr@hrms.com | hr123456 |

---

## Project Structure

```
webapp/
├── server/                 # Express backend
│   ├── index.js            # Server entry point
│   ├── seed.js             # Database seeder
│   ├── config/             # DB and Cloudinary config
│   ├── controllers/        # Route handlers
│   ├── middleware/          # Auth & upload middleware
│   ├── models/             # Mongoose schemas
│   ├── routes/             # API route definitions
│   └── utils/              # Helpers (audit, notifications)
├── src/                    # React frontend
│   ├── main.jsx            # App entry point
│   ├── App.jsx             # Routes & layout
│   ├── api/                # Axios API client
│   ├── components/         # Shared components (Layout, Header, Sidebar)
│   ├── context/            # Auth & Theme context providers
│   └── pages/              # Page components by feature
├── public/                 # Static assets
├── .env.example            # Environment template
├── package.json            # Dependencies & scripts
├── vite.config.ts          # Vite config with API proxy
├── tailwind.config.js      # Tailwind CSS config
└── postcss.config.js       # PostCSS config
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start frontend + backend concurrently (development) |
| `npm run dev:client` | Start only the Vite frontend |
| `npm run dev:server` | Start only the Express backend with hot-reload |
| `npm run build` | Build the React frontend for production (`dist/`) |
| `npm start` | Start the production server (serves built frontend) |
| `npm run seed` | Seed database with sample data |

## Ports

| Service | URL |
|---------|-----|
| Frontend (Vite) | http://localhost:5173 |
| Backend (Express) | http://localhost:5000 |

The Vite dev server proxies `/api/*` requests to the backend automatically, so no CORS issues in development.

---

## Troubleshooting

### "MongoDB connection error"

- Check your `MONGODB_URI` in `.env`
- Make sure your IP is whitelisted in MongoDB Atlas → Network Access
- Verify your database user password is correct

### "Cannot find module" errors

- Run `npm install` again
- Delete `node_modules` and run `npm install` fresh

### Cloudinary upload fails

- Verify `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` in `.env`
- Make sure they match your Cloudinary dashboard exactly

### Port already in use

- Change `PORT` in `.env` for the backend
- Change `server.port` in `vite.config.ts` for the frontend

---

## Production Deployment

```bash
npm run build       # Build React frontend
npm start           # Start Express server (serves frontend from dist/)
```

Set `NODE_ENV=production` in your environment. The Express server serves the built React app from the `dist/` folder in production mode.
