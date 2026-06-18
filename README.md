# Test Case Management System (TCM)

A full-stack Test Case Management System built with **React 18**, **Node.js/Express**, **PostgreSQL**, and **Redis**.  
Developed as a technical assignment for Tech-Bridge.

---

## Features

| Area | Details |
|---|---|
| **Authentication** | JWT-based login/register, 7-day token, bcrypt password hashing |
| **RBAC** | 4 roles: `admin` › `test-lead` › `tester` › `read-only` |
| **Projects** | Create/manage projects, assign team members with per-project roles |
| **Test Cases** | Full CRUD, priority/type tags, bulk operations, step-by-step test steps |
| **Export / Import** | Export test cases to **CSV** or **Excel (.xlsx)**; import from CSV/Excel |
| **Test Suites** | Group test cases into suites, execute entire suite at once |
| **Executions** | Record pass/fail/blocked/skipped results, track defects |
| **Analytics** | Recharts dashboards: pie, line, bar — pass rates, trends, tester progress |
| **Comments** | Collaborative comments on each test case (edit/delete your own) |
| **Versioning** | Automatic version snapshot on every test case update; restore any version |
| **Email Notifications** | Notifies assignees when a test case is assigned to them (nodemailer) |
| **CI/CD Integration** | Generate API keys, trigger test suite runs via REST API, update results |
| **Scheduling** | Cron-based scheduled test runs (node-cron), pause/resume/delete |
| **Dark Mode** | Persistent theme toggle (CSS variables, localStorage) |
| **Performance** | Redis caching, React.lazy code splitting, paginated queries, DB indexes |

---

## Tech Stack

**Backend**
- Node.js + Express
- PostgreSQL (pg library, parameterized queries)
- Redis (ioredis, optional — graceful fallback)
- JWT authentication, bcryptjs, helmet, CORS
- nodemailer, exceljs, node-cron, multer
- Swagger UI at `/api/docs`

**Frontend**
- React 18 with React.lazy + Suspense
- React Router v6, Axios
- Recharts for analytics
- CSS variables for theming (light/dark)

---

## Project Structure

```
TestCaseManager/
├── backend/
│   ├── src/
│   │   ├── config/          # DB, Redis, migration
│   │   ├── controllers/     # Business logic
│   │   ├── middleware/       # Auth, rate-limiting, validation
│   │   ├── routes/          # Express routers
│   │   ├── services/        # Email service
│   │   └── server.js
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── api/             # Axios client
│   │   ├── components/      # Layout, LoadingSpinner, BackButton
│   │   ├── context/         # AuthContext, ProjectContext, ThemeContext
│   │   └── pages/           # All page components
│   ├── .env.example
│   └── package.json
├── docker-compose.yml
└── README.md
```

---

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Redis (optional)

### 1. Clone and install

```bash
git clone https://github.com/AshishNegi005/test-case-manager.git
cd test-case-manager

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
```

### 2. Configure environment

```bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env with your DB credentials and JWT secret

# Frontend
cp frontend/.env.example frontend/.env
# No changes needed for local development
```

### 3. Set up database

```bash
cd backend
npm run db:migrate    # Creates all 12 tables
npm run db:seed       # Creates sample data + admin user
```

Default admin credentials after seeding:
- **Email:** `admin@tcm.local`
- **Password:** `Admin@123`

### 4. Run the application

```bash
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend
cd frontend && npm start
```

Open [http://localhost:3000](http://localhost:3000)

---

## API Overview

All authenticated endpoints require: `Authorization: Bearer <token>`

| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login |
| GET | `/api/projects` | List projects (role-filtered) |
| POST | `/api/projects/:id/members` | Add team member |
| GET | `/api/projects/:id/testcases` | List test cases (paginated) |
| GET | `/api/projects/:id/testcases/export/csv` | Export as CSV |
| GET | `/api/projects/:id/testcases/export/excel` | Export as Excel |
| POST | `/api/projects/:id/testcases/import/csv` | Import from CSV |
| GET | `/api/projects/:id/testcases/:caseId/comments` | Get comments |
| GET | `/api/projects/:id/testcases/:caseId/versions` | Version history |
| GET | `/api/projects/:id/api-keys` | List CI/CD API keys |
| POST | `/api/ci/run` | Trigger suite run (API key auth) |
| GET | `/api/projects/:id/schedules` | List cron schedules |

Full interactive docs: [http://localhost:5001/api/docs](http://localhost:5001/api/docs)

---

## CI/CD Integration

Generate an API key in the project's **CI/CD** tab, then use it in your pipeline:

```yaml
# GitHub Actions example
- name: Trigger test suite
  run: |
    curl -X POST ${{ vars.TCM_URL }}/api/ci/run \
      -H "X-API-Key: ${{ secrets.TCM_API_KEY }}" \
      -H "Content-Type: application/json" \
      -d '{"suiteId": "${{ vars.SMOKE_SUITE_ID }}"}'
```

---

## Docker

```bash
docker-compose up --build
```

Services: `frontend` (port 3000), `backend` (port 5001), `postgres` (port 5432), `redis` (port 6379)

---

## Security

- Parameterized SQL queries (no injection)
- XSS sanitization on all inputs
- Rate limiting (auth: 20/15min, test cases: 100/hr)
- Helmet security headers
- Passwords: bcrypt with 12 salt rounds
- API keys: stored as bcrypt hashes, only prefix exposed

---

## License

MIT
