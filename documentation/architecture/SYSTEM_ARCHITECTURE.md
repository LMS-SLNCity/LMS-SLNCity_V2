# LMS-SLNCity System Architecture

## System Overview

The LMS-SLNCity system is a **full-stack Laboratory Management System** with a **three-tier architecture**:

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React 19.2.0)                  │
│                    http://localhost:3001                    │
│  - React Components                                         │
│  - TypeScript                                               │
│  - Tailwind CSS                                             │
│  - Context API (AppContext, AuthContext)                   │
└────────────────────────┬────────────────────────────────────┘
                         │
                    HTTP/REST API
                         │
┌────────────────────────▼────────────────────────────────────┐
│                  BACKEND (Express.js)                       │
│                  http://localhost:5001                      │
│  - Node.js + TypeScript                                     │
│  - Express.js Framework                                     │
│  - JWT Authentication                                       │
│  - RESTful API Endpoints                                    │
│  - Business Logic                                           │
│  - Database Queries                                         │
└────────────────────────┬────────────────────────────────────┘
                         │
                    PostgreSQL Driver
                         │
┌────────────────────────▼────────────────────────────────────┐
│              DATABASE (PostgreSQL 16)                       │
│              Docker Container                              │
│  - Persistent Data Storage                                  │
│  - 12+ Tables                                               │
│  - Relationships & Constraints                              │
│  - Audit Logs                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Data Flow

### 1. **Frontend → Backend → Database**

```
User Action (e.g., Create Visit)
    ↓
React Component
    ↓
AppContext Function (addVisit)
    ↓
API Client (api/client.ts)
    ↓
HTTP POST to http://localhost:5001/api/visits
    ↓
Backend Express Route Handler
    ↓
Business Logic Processing
    ↓
PostgreSQL Query
    ↓
Database Insert
    ↓
Response JSON
    ↓
Frontend State Update
    ↓
UI Re-render
```

### 2. **Frontend Data Loading**

```
App Loads
    ↓
AuthContext checks localStorage for token
    ↓
AppContext useEffect triggers
    ↓
API Client fetches data:
  - GET /api/users
  - GET /api/visits
  - GET /api/test-templates
  - GET /api/clients
  - GET /api/referral-doctors
  - GET /api/branches
  - GET /api/antibiotics
    ↓
Backend queries PostgreSQL
    ↓
Data returned to Frontend
    ↓
AppContext state updated
    ↓
Components re-render with real data
```

---

## Frontend Configuration

### API Base URL
**File:** `/api/client.ts` (Line 1)
```typescript
const API_BASE_URL = 'http://localhost:5001/api';
```

### Authentication
- JWT tokens stored in `localStorage`
- Sent with every API request in `Authorization` header
- Token verified on backend

### State Management
- **AppContext:** Manages all application data (visits, users, tests, etc.)
- **AuthContext:** Manages user authentication and permissions
- **localStorage:** Persists auth token and user info

---

## Backend Configuration

### API Base URL
**Port:** 5001
**Health Check:** http://localhost:5001/health

### Database Connection
**File:** `/server/src/index.ts`
```typescript
const pool = new Pool({
  user: 'postgres',
  password: 'postgres',
  host: 'localhost',
  port: 5432,
  database: 'lms_slncity'
});
```

### Key Endpoints
- `POST /api/auth/login` - User authentication
- `GET /api/users` - Fetch all users
- `POST /api/visits` - Create new visit
- `GET /api/visits` - Fetch all visits
- `PATCH /api/visit-tests/:id` - Update test status
- `POST /api/visit-tests/:id/results` - Enter test results
- And 50+ more endpoints...

---

## Database

### Type
- **PostgreSQL 16**
- **Docker Container**
- **Database Name:** lms_slncity

### Key Tables
1. `users` - Staff members
2. `patients` - Patient information
3. `visits` - Patient visits
4. `visit_tests` - Tests for each visit
5. `test_templates` - Test definitions
6. `clients` - B2B clients
7. `client_prices` - Custom pricing
8. `referral_doctors` - Referral doctors
9. `signatories` - Report signatories
10. `audit_logs` - Activity tracking
11. `branches` - Lab branches
12. `antibiotics` - Antibiotic database

---

## Data Persistence

### ✅ **SYSTEM USES DATABASE, NOT CACHING**

**Evidence:**
1. **API Client** (`/api/client.ts`) makes HTTP requests to backend
2. **Backend** (`/server/src/routes/*.ts`) queries PostgreSQL
3. **Frontend** loads data from backend on app start
4. **All changes** are persisted to database immediately
5. **No localStorage caching** of business data (only auth token)

### Data Flow for Create Visit:
```
Frontend Form Submit
    ↓
AppContext.addVisit()
    ↓
apiClient.createVisit(data)
    ↓
POST http://localhost:5001/api/visits
    ↓
Backend: INSERT INTO visits ...
    ↓
PostgreSQL: Data persisted
    ↓
Response: { id, visit_code, ... }
    ↓
Frontend: Update state
    ↓
UI: Show new visit
```

---

## Running the System

### Start Backend
```bash
cd /Users/ramgopal/LMS-SLNCity-V1/server
npm run dev
# Runs on http://localhost:5001
```

### Start Frontend
```bash
cd /Users/ramgopal/LMS-SLNCity-V1
npm run dev
# Runs on http://localhost:3001
```

### Start Database
```bash
docker-compose up -d
# PostgreSQL runs on localhost:5432
```

---

## Current Status

✅ **Backend:** Running on http://localhost:5001
✅ **Frontend:** Running on http://localhost:3001
✅ **Database:** PostgreSQL 16 (Docker)
✅ **Connection:** Frontend → Backend → Database
✅ **Data Persistence:** All data saved to database

---

## Key Features

### Authentication
- JWT-based authentication
- Role-based access control (SUDO, ADMIN, STAFF, etc.)
- Separate B2B client authentication

### Core Modules
- **Reception:** Patient registration and visit creation
- **Phlebotomy:** Sample collection tracking
- **Lab:** Test result entry
- **Approver:** Report approval workflow
- **Admin Panel:** User, test, and pricing management
- **B2B Management:** Client and pricing management
- **Dashboard:** Business insights and metrics

### Data Integrity
- Audit logs for all actions
- Status tracking for visits and tests
- Payment tracking and reconciliation
- Role-based permissions

---

## Architecture Benefits

✅ **Separation of Concerns:** Frontend, Backend, Database are separate
✅ **Scalability:** Can scale each tier independently
✅ **Security:** Backend validates all requests
✅ **Data Persistence:** All data in PostgreSQL
✅ **Real-time Updates:** Frontend fetches latest data from backend
✅ **Audit Trail:** All actions logged in database

---

## Conclusion

The LMS-SLNCity system is a **production-ready, three-tier architecture** that:
- Uses **PostgreSQL database** for persistent storage
- Has **Express.js backend** for business logic
- Has **React frontend** for user interface
- Implements **JWT authentication** for security
- Maintains **complete audit trail** of all actions

**All data is persisted to the database, not cached in the frontend.**

