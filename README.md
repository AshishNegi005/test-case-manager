# Test Case Management System

A full-stack Test Case Management application built with React 18, Node.js, PostgreSQL, and Redis.

## Tech Stack

- **Frontend**: React 18, React Router v6, Recharts, Axios
- **Backend**: Node.js, Express.js, JWT Auth
- **Database**: PostgreSQL
- **Caching**: Redis (15-60 min TTL per endpoint)
- **API Docs**: Swagger/OpenAPI at `/api/docs`

## Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@demo.com | Test@1234 |
| Test Lead | testlead@demo.com | Test@1234 |
| Tester | tester@demo.com | Test@1234 |
| Read Only | readonly@demo.com | Test@1234 |

## Features

- JWT-based authentication with RBAC (4 roles)
- Project management with team members
- Test case CRUD with steps, tags, priority, type
- Test suite management + bulk execution
- Test execution recording (Pass/Fail/Blocked/Skipped)
- Defect tracking from failed tests
- Analytics dashboard with 3 chart types (Pie, Line, Bar)
- Redis caching with cache invalidation
- Rate limiting per endpoint type
- XSS & SQL injection prevention
- Lazy loading with React.lazy + Suspense
- Pagination for test case lists
- Dark mode toggle
- Swagger API documentation

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Redis 6+

### Backend Setup

```bash
cd backend
cp .env.example .env
# Edit .env with your DB credentials
npm install
npm run db:migrate
npm run db:seed
npm start
```

### Frontend Setup

```bash
cd frontend
npm install
npm start
```

App runs at http://localhost:3000, API at http://localhost:5000

### Docker Compose (Recommended)

```bash
docker-compose up -d
```

## Database Schema

```
users           → id, username, email, password, role
projects        → id, name, description, version, status, created_by
project_members → project_id, user_id, role
test_suites     → id, project_id, name, description, created_by
test_cases      → id, project_id, title, description, priority, type, tags, ...
test_steps      → id, test_case_id, step_number, action, expected_result
test_suite_cases→ suite_id, test_case_id
test_executions → id, test_case_id, project_id, executed_by, status, comments, ...
```

## API Documentation

Swagger UI available at: http://localhost:5000/api/docs

### Key Endpoints

| Method | Endpoint | Roles |
|--------|----------|-------|
| POST | /api/auth/login | Public |
| GET | /api/projects | All |
| POST | /api/projects | Admin, Test-Lead |
| GET | /api/projects/:id/testcases | All |
| POST | /api/projects/:id/testcases | Admin, Test-Lead |
| POST | /api/projects/:id/executions | Admin, Test-Lead, Tester |
| GET | /api/projects/:id/analytics/summary | All |
| GET | /api/auth/users | Admin only |

## RBAC Summary

| Feature | Admin | Test-Lead | Tester | Read-Only |
|---------|-------|-----------|--------|-----------|
| View test cases | ✅ | ✅ | ✅ | ✅ |
| Create/edit test cases | ✅ | ✅ | ❌ | ❌ |
| Execute tests | ✅ | ✅ | ✅ | ❌ |
| Manage projects | ✅ | ✅ | ❌ | ❌ |
| Manage users | ✅ | ❌ | ❌ | ❌ |
| View analytics | ✅ | ✅ | ✅ | ✅ |

## Caching Strategy (Redis)

| Data | TTL |
|------|-----|
| Analytics/summary | 15 min |
| Test suite lists | 30 min |
| Project metadata | 1 hour |

Cache is invalidated on any write operation.

## Rate Limits

| Endpoint | Limit |
|----------|-------|
| Auth endpoints | 5 req / 15 min |
| Test case CRUD | 100 req / hour |
| Test executions | 200 req / hour |
| Analytics | 50 req / hour |
