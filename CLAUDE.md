# CLAUDE.md — ANK Management System (AMS)

> **Important:** This is the standing project context for Claude Code. Read this fully before any task. When in doubt, ask the user (Ankur) for clarification rather than guessing.

---

## Project Mission

Build **ANK Management System (AMS)** — a custom, web-only, internal-use ERP-like platform for **ANK Digital Media** (Delhi-based digital marketing agency, ~50 employees). AMS replaces scattered tools (Excel sheets, WhatsApp groups, manual tracking) with one unified system covering Sales, Marketing, Design, Development, and HR.

**Owner:** Ankur (Founder, ANK Digital Media)
**Communication:** Hinglish (Hindi-English mix) preferred. Code/comments in English.

---

## Tech Stack (LOCKED — Do not deviate without asking)

| Layer | Choice |
|-------|--------|
| **Backend** | Node.js + Express.js (REST API) |
| **Database** | MongoDB (with Mongoose ODM) |
| **Frontend** | React.js + Tailwind CSS + React Router |
| **Auth** | JWT (jsonwebtoken) + custom RBAC middleware |
| **File Storage** | Google Drive API (department-wise folders) |
| **Real-time** | Socket.io |
| **Cache / Queue** | **NONE** in Phase 1 (no Redis, no queue) |
| **Charts** | Recharts |
| **Forms** | React-Hook-Form + Zod (validation) |
| **HTTP client** | Axios |
| **Date** | dayjs |
| **Testing** | Jest + Supertest (backend), React Testing Library (frontend) |

---

## Branding (Use these in UI)

```css
--color-deep-navy:    #0A1628  /* Main BG, dark sections */
--color-brand-blue:   #1A3A6B  /* Headers, cards */
--color-action-blue:  #1E6FD9  /* Buttons, links, CTAs */
--color-orange:       #FF6B00  /* Accents, badges */
--color-cyan:         #00C6FF  /* Highlights, tags */
--color-white:        #FFFFFF
```

**Fonts:** Montserrat Bold (headings), Open Sans (body).
**Logo:** Triangle with upward arrow (growth symbol).
**Company:** ANK Digital Media · ankdigitalmedia.com · 09999779817

---

## Folder Structure (Monorepo)

```
ams/
├── CLAUDE.md                    # This file
├── README.md
├── .gitignore
├── docker-compose.yml           # Optional, for local MongoDB
│
├── backend/
│   ├── src/
│   │   ├── config/             # DB, env, google-drive
│   │   ├── models/             # Mongoose schemas
│   │   ├── routes/             # Express routes
│   │   ├── controllers/        # Business logic
│   │   ├── middleware/         # auth, rbac, errorHandler, audit
│   │   ├── services/           # gdrive, notification, etc.
│   │   ├── utils/              # helpers
│   │   ├── validators/         # Zod schemas
│   │   └── app.js
│   ├── tests/
│   ├── package.json
│   └── .env.example
│
└── frontend/
    ├── src/
    │   ├── components/         # Shared UI
    │   ├── pages/              # Route pages
    │   ├── modules/            # Module-wise folders
    │   │   ├── core/
    │   │   ├── crm/
    │   │   ├── dm/
    │   │   ├── gd/
    │   │   ├── dev/
    │   │   ├── hr/
    │   │   └── sops/
    │   ├── hooks/
    │   ├── context/            # AuthContext, ThemeContext
    │   ├── api/                # Axios instances per module
    │   ├── utils/
    │   ├── styles/
    │   └── App.jsx
    ├── public/
    ├── package.json
    └── tailwind.config.js
```

---

## Modules to Build (in order)

| # | Module | Phase | Status |
|---|--------|-------|--------|
| A | Core (Auth, RBAC, Users, Depts, Audit) | 1 | ✅ Complete (2026-05-13) |
| B | CRM (Sales — Leads, Pipeline, Clients, Communications) | 2 | Not started |
| C | DM (Daily Tasks + Audit Reports, 15 platforms) | 3 | Not started |
| D | GD (Task inbox, revisions, DM-routed delivery) | 3 | Not started |
| E | Development (Projects, Tasks, Bugs, Milestones) | 4 | Not started |
| F | HR Full (Candidate ATS + Employee + Attendance + Payroll + Performance) | 5 | Not started |
| G | SOPs / Office Manual | 6 | Not started |

**Detailed module specs:** See `AMS_Full_Blueprint.md` in the project root or repo wiki.

---

## Role Hierarchy & RBAC

```
SUPERADMIN → ADMIN → SUBADMIN → DEPT_HEAD → TEAM_MEMBER
```

**5 Departments:** Sales · Digital Marketing (DM) · Graphic & Video (GD) · Development · HR

**RBAC Approach:**
- Permissions stored in MongoDB as a `permissions` collection
- Each User has a `role` field + a `permissions` array (granular grants)
- Middleware `requirePermission('module:action')` guards routes
- Examples: `crm:lead:create`, `hr:payroll:view`, `dm:audit_report:generate`

**Permission Cascade:**
- Superadmin can grant/revoke any permission to Admin
- Admin can cascade to SubAdmin (subset of Admin's permissions)
- Dept Heads get auto-permissions for their department only
- Team gets auto-permissions for "own data" only

---

## MongoDB Conventions

- **Collection names:** snake_case plural (e.g., `users`, `dm_daily_tasks`)
- **Field names:** camelCase (e.g., `createdAt`, `assignedTo`)
- **Timestamps:** Every collection has `createdAt`, `updatedAt`, `createdBy`, `updatedBy`
- **Soft delete:** Use `deletedAt` field (null = active). Never hard-delete records (audit trail).
- **ObjectIds:** Use Mongoose `Schema.Types.ObjectId` for references
- **Indexes:** Always index `createdAt`, foreign keys, and frequently-queried fields
- **No embedded large arrays:** Prefer separate collections + references for scalability

**Example Schema:**

```javascript
const leadSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  mobile: { type: String, required: true, index: true },
  email: { type: String, lowercase: true, trim: true },
  source: { type: String, enum: [...], required: true },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  stage: { type: String, enum: ['new','assigned','contacted','qualified','proposal','negotiation','won','lost','junk'], default: 'new' },
  // ...
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  deletedAt: { type: Date, default: null }
}, { timestamps: true });
```

---

## API Conventions

- **Base URL:** `/api/v1`
- **Module prefix:** `/api/v1/<module>/<resource>` (e.g., `/api/v1/crm/leads`)
- **REST verbs:** GET (list/single), POST (create), PATCH (update), DELETE (soft-delete)
- **Response shape (success):**
  ```json
  { "success": true, "data": {...}, "message": "Optional" }
  ```
- **Response shape (error):**
  ```json
  { "success": false, "error": { "code": "VALIDATION_ERROR", "message": "...", "details": {...} } }
  ```
- **Pagination:** Query params `?page=1&limit=20&sort=-createdAt`
- **Filtering:** Query params `?stage=new&assignedTo=<userId>`
- **Search:** `?q=keyword`
- **Auth:** `Authorization: Bearer <jwt>` header
- **Validation:** Zod schemas before controller logic

---

## Authentication Flow

1. **Login:** POST `/api/v1/auth/login` with email + password → returns JWT (24hr expiry) + refresh token (7 days)
2. **JWT payload:** `{ userId, role, departmentId, iat, exp }`
3. **Refresh:** POST `/api/v1/auth/refresh` with refresh token → new JWT
4. **Middleware:** `authMiddleware` verifies JWT → attaches `req.user`
5. **RBAC Middleware:** `requirePermission('module:action')` checks `req.user.permissions`
6. **Logout:** POST `/api/v1/auth/logout` → blacklist refresh token

**No 2FA in Phase 1** (can add later if needed).

---

## Audit Logging Rule

**Every** write operation (POST, PATCH, DELETE) must log to `audit_logs` collection:

```javascript
{
  userId: ObjectId,
  action: 'CREATE' | 'UPDATE' | 'DELETE',
  resource: 'lead' | 'user' | 'employee' | ...,
  resourceId: ObjectId,
  changes: { before: {...}, after: {...} },
  ipAddress: String,
  userAgent: String,
  createdAt: Date
}
```

Implement as Express middleware `auditLogger`.

---

## Coding Conventions

**Backend (JavaScript):**
- ES6+ async/await (no callback hell)
- Use `try/catch` in async functions; throw errors, catch in central error middleware
- Validate request body with Zod **before** controller logic
- Keep controllers thin — push logic into `services/`
- Use dependency injection where possible (testability)
- Avoid `var`. Use `const` by default, `let` only when reassigning.

**Frontend (React):**
- Functional components + hooks only (no class components)
- Use Context for global state (Auth, Notifications) — no Redux unless really needed
- Use `react-hook-form` for all forms (validation via Zod resolver)
- File naming: PascalCase for components (`LeadCard.jsx`), camelCase for utilities (`formatDate.js`)
- One component per file
- Tailwind classes inline (no separate CSS files unless absolutely needed)
- Loading states + error states for every async UI

**Both:**
- Self-documenting code first; comments only for **why**, not **what**
- No magic numbers/strings — use constants
- ESLint + Prettier enforced (will add config in setup)

---

## Environment Variables (`.env`)

```env
# Backend
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/ams_dev
JWT_SECRET=<generated>
JWT_REFRESH_SECRET=<generated>
JWT_EXPIRY=24h
JWT_REFRESH_EXPIRY=7d

# Google Drive
GOOGLE_DRIVE_CLIENT_ID=
GOOGLE_DRIVE_CLIENT_SECRET=
GOOGLE_DRIVE_REDIRECT_URI=
GOOGLE_DRIVE_REFRESH_TOKEN=
GOOGLE_DRIVE_ROOT_FOLDER_ID=

# Frontend
VITE_API_URL=http://localhost:5000/api/v1
```

---

## ✅ PHASE 1 — Foundation (COMPLETE — 2026-05-13)

**Week 1 ✅:** Backend foundation — Express, MongoDB, JWT auth, RBAC, Audit logs, Seeder
**Week 2 ✅:** Frontend — Redux Toolkit, Login page, MasterLayout, User/Dept CRUD
**Week 3 ✅:** Notifications (Socket.io), Permission matrix UI, Settings page
**Week 4 ✅:** Audit log viewer, Profile page, Search bar, 21 passing tests

**Entry point:** `backend/src/server.js` | Frontend: Vite on port 5173

---

## Current Phase: PHASE 2 — CRM (Sales)

**Goal:** Build CRM module — Leads, Pipeline, Clients, Communications.

---

## How to Work with Ankur (the User)

- **Language:** Hinglish in conversation, English in code
- **Ask before assuming:** If a feature spec is ambiguous in the blueprint, ask — don't invent
- **Show progress often:** After every milestone, show what was built and run it
- **Tests:** Write tests for critical paths (auth, RBAC, audit) — not every line
- **Commit message format:** `[module] action: short description` e.g. `[auth] feat: add JWT login endpoint`
- **Before big changes:** Confirm with Ankur first
- **Stay scope-disciplined:** No Quote builder, no Invoice/Payment in Phase 2 (removed from scope)

---

## Out of Scope (Do NOT build these)

- ❌ Quote / Proposal builder (handled in Tally / external)
- ❌ Invoice generation / Payment gateway integration (handled in Tally / external)
- ❌ Mobile app (web-only for Phase 1-6)
- ❌ Client-facing portal (internal use only)
- ❌ Email / WhatsApp notification delivery in Phase 1 (built but inactive — only in-app live)
- ❌ Redis / caching layer
- ❌ Queue system (Bull, BullMQ, etc.)

---

## First Task When You Start

When Ankur runs you with "Let's begin Phase 1 Week 1", do this:

1. **Confirm tech stack & folder structure** with him (one-line yes/no check)
2. **Initialize repo:**
   - Run `git init`
   - Create folder structure as shown above
   - Generate `backend/package.json` with these deps:
     - `express`, `mongoose`, `dotenv`, `cors`, `helmet`, `morgan`, `jsonwebtoken`, `bcryptjs`, `zod`, `dayjs`, `socket.io`, `googleapis`
     - Dev: `nodemon`, `jest`, `supertest`, `eslint`, `prettier`
   - Generate `frontend/package.json` (Vite + React) with:
     - `react`, `react-dom`, `react-router-dom`, `axios`, `react-hook-form`, `@hookform/resolvers`, `zod`, `recharts`, `dayjs`, `socket.io-client`, `lucide-react` (icons), `tailwindcss`
3. **Set up base `.env.example`**
4. **Create base `app.js`** with Express + MongoDB connection + error middleware
5. **Implement User + Role + Permission models** with the schemas defined above
6. **Build Auth endpoints:** login, refresh, logout, me
7. **Build RBAC middleware**
8. **Run a test:** create a test Superadmin user via seeder, login via curl/Postman, get JWT, hit a protected route
9. **Report back:** Show what's working, what's pending, what needs Ankur's input

After Week 1 success → move to Week 2 frontend scaffold.

---

## Important Reminders

- 🇮🇳 **Compliance:** DPDPA (India's Digital Personal Data Protection Act) — handle PII carefully
- 🔒 **Security:** Never commit secrets. Always hash passwords (bcrypt, 12 rounds). HTTPS only in prod.
- 📊 **Performance:** Index MongoDB queries. Profile slow endpoints.
- 🧪 **Testing:** Auth + RBAC + Audit log = must have tests. Everything else, judgment call.
- 📝 **Docs:** Update README as you add modules. Keep API docs in `backend/docs/` as Markdown.

---

*Last updated: When Ankur edits this file. If you (Claude Code) update it, commit message must reflect that.*
