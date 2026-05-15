# Personal OS

A full-stack life and career dashboard. Built with React + Vite, Node.js + Express, MongoDB Atlas, and Gemini AI.

## Stack

| Layer    | Tech                      |
|----------|---------------------------|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend  | Node.js + Express          |
| Database | MongoDB Atlas              |
| Auth     | Single password + JWT      |
| AI       | Gemini 2.5 Flash           |
| Deploy   | Vercel (frontend) + Render (backend) |

---

## Prerequisites

- Node.js 18+
- A [MongoDB Atlas](https://www.mongodb.com/atlas) free cluster
- Git

---

## Setup

### 1. Clone and navigate

```bash
git clone <repo-url>
cd personal_os
```

### 2. Configure backend

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:

```env
PORT=5000
MONGO_URI=mongodb+srv://<user>:<pass>@cluster0.xxxxx.mongodb.net/personal_os?retryWrites=true&w=majority
JWT_SECRET=a_very_long_random_string_at_least_32_characters
JWT_EXPIRES_IN=7d
ADMIN_PASSWORD=choose_a_secure_password
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```

Install dependencies and start:

```bash
npm install
npm run dev
```

Backend will run on `http://localhost:5000`.

### 3. Configure frontend

```bash
cd ../frontend
cp .env.example .env
```

The default `VITE_API_URL=/api` proxies to the backend via Vite's dev server (no changes needed for local dev).

Install dependencies and start:

```bash
npm install
npm run dev
```

Frontend will run on `http://localhost:5173`.

---

## Running both together

Open two terminals:

**Terminal 1 — Backend**
```bash
cd backend
npm run dev
```

**Terminal 2 — Frontend**
```bash
cd frontend
npm run dev
```

Then open `http://localhost:5173` in your browser.

---

## Login

Navigate to `http://localhost:5173/login` and enter the password you set as `ADMIN_PASSWORD` in `backend/.env`.

---

## Folder structure

```
personal_os/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js              # MongoDB connection
│   │   ├── middleware/
│   │   │   ├── auth.js            # JWT protection middleware
│   │   │   └── errorHandler.js    # Global error handler
│   │   ├── routes/
│   │   │   └── auth.js            # POST /api/auth/login
│   │   └── server.js              # Express entry point
│   ├── .env.example
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── api/
    │   │   └── axios.js           # Axios instance with JWT interceptor
    │   ├── components/
    │   │   └── layout/
    │   │       ├── AppLayout.jsx  # Sidebar + page outlet
    │   │       ├── ProtectedRoute.jsx
    │   │       └── Sidebar.jsx    # Collapsible nav with all 9 pages
    │   ├── context/
    │   │   └── AuthContext.jsx    # Auth state provider
    │   ├── hooks/
    │   │   └── useAuth.js
    │   ├── pages/
    │   │   ├── Home.jsx           # Dashboard with 4 summary cards
    │   │   ├── Login.jsx
    │   │   ├── Tasks.jsx          # Sprint 2
    │   │   ├── DSATracker.jsx     # Sprint 3
    │   │   ├── Projects.jsx       # Sprint 4
    │   │   ├── InternshipCRM.jsx  # Sprint 4
    │   │   ├── ContentCalendar.jsx# Sprint 5
    │   │   ├── Goals.jsx          # Sprint 5
    │   │   ├── GeminiChat.jsx     # Sprint 6
    │   │   └── Settings.jsx       # Sprint 7
    │   ├── App.jsx
    │   ├── main.jsx
    │   └── index.css
    ├── .env.example
    └── vite.config.js
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable          | Description                                                    |
|-------------------|----------------------------------------------------------------|
| `MONGO_URI`       | MongoDB Atlas connection string                                |
| `JWT_SECRET`      | Random string ≥ 32 chars for signing JWTs                      |
| `ADMIN_PASSWORD`  | Single-user password for the dashboard                         |
| `GEMINI_API_KEY`  | Google Gemini API key (optional — can also be set in Settings) |
| `FRONTEND_URL`    | Frontend origin for CORS (e.g. https://your-app.vercel.app)    |
| `PORT`            | Server port (default: 5000)                                    |
| `NODE_ENV`        | `development` or `production`                                  |

### Frontend (`frontend/.env`)

| Variable       | Description                                                                    |
|----------------|--------------------------------------------------------------------------------|
| `VITE_API_URL` | Backend base URL for production (e.g. https://your-backend.onrender.com). Omit in dev — Vite proxy handles it. |

---

## Deployment

### Frontend — Vercel

1. Push repo to GitHub
2. Create a new Vercel project → set **Root Directory** to `frontend`
3. Add env variable: `VITE_API_URL=https://your-backend.onrender.com`
4. `frontend/vercel.json` handles SPA rewrites automatically

### Backend — Render

1. Create a **Web Service** in Render → set **Root Directory** to `backend`
2. `backend/render.yaml` is picked up automatically
3. Add all env vars in Render dashboard (MONGO_URI, JWT_SECRET, ADMIN_PASSWORD, FRONTEND_URL)
4. Set `FRONTEND_URL` to your Vercel deployment URL for CORS

---

## Sprint roadmap

| Sprint | Scope |
|--------|-------|
| ✅ 1   | Scaffold, auth, sidebar nav |
| ✅ 2   | Tasks CRUD + home dashboard |
| ✅ 3   | DSA tracker + Striver sheet + streak |
| ✅ 4   | Projects + Internship CRM with Kanban DnD |
| ✅ 5   | Content calendar + Goals Gantt timeline |
| ✅ 6   | Gemini Chat — live context + action cards |
| ✅ 7   | Alerts panel, export/backup, mobile polish, deployment |
