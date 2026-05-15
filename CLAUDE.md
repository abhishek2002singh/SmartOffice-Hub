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

> 🏁 **CURRENT FOCUS: PHASE 6 — FINAL PHASE (SOPs + Polish + Launch).**
> Phase 1, 2, 3, 4 & 5 complete ✅. **This is the last phase.** After this, AMS is production-ready and complete.

| # | Module | Phase | Status |
|---|--------|-------|--------|
| A | Core (Auth, RBAC, Users, Depts, Audit) | 1 | ✅ **DONE** — Working & deployed |
| B | CRM (Sales — Leads, Pipeline, Clients, Communications) | 2 | ✅ **DONE** — Working & deployed |
| C | DM (Daily Tasks + Audit Reports, 15 platforms) | 3 | ✅ **DONE** — Working & deployed |
| D | GD (Task inbox, revisions, DM-routed delivery) | 3 | ✅ **DONE** — Working & deployed |
| E | Development (Projects, Tasks, Bugs, Milestones) | 4 | ✅ **DONE** — Working & deployed |
| F | HR Full (Candidate ATS + Employee + Attendance + Payroll + Performance) | 5 | ✅ **DONE** — Working & deployed |
| G | SOPs / Office Manual + Polish + Launch | 6 | **🟢 ACTIVE — Final build** |

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

## Phase 1 — COMPLETED ✅ (Reference)

**What was built (already working — do not touch unless needed for integration):**
- Backend: Express + MongoDB + JWT auth + RBAC middleware + audit logs
- Models: User, Role, Permission, Department, AuditLog, Notification
- Auth endpoints: POST /auth/login, /auth/refresh, /auth/logout, GET /auth/me
- RBAC middleware: `requirePermission('module:action')`
- Frontend: React + Vite + Tailwind + Router + AuthContext
- Pages: Login, Master Layout (sidebar + topbar + notification bell)
- CRUD: Users, Departments, Permission cascade UI, Settings, Audit log viewer
- Notification engine: in-app (Socket.io) — Email/WhatsApp built but inactive
- Deployed and tested with multiple roles

**Integration points Phase 3 will use:**
- `req.user` (from authMiddleware) gives logged-in user with role + permissions
- `requirePermission('dm:task:create')` — use this pattern for all DM/GD routes
- `auditLogger` middleware — must wrap all DM/GD write operations
- `NotificationService.send(userId, eventType, payload)` — use this for task assignments
- `User` model — for assignedTo references in DM/GD tasks
- `Department` model — Sales/DM/GD/Dev/HR already seeded

---

## Phase 2 — COMPLETED ✅ (Reference)

**What was built (already working — do not touch unless needed for integration):**
- Models: Lead, LeadSource, LeadActivity, Client, ClientContact, ServiceCatalog, ServiceSubscription, ServiceTicket, Communication
- Lead capture from multiple sources + bulk CSV import
- Lead pipeline with Kanban + stages (new→won/lost)
- Auto-assignment + lead scoring
- Client auto-creation on Won
- Service catalog (no pricing)
- Renewal alerts
- Communication hub
- CRM dashboards + reports

**Integration points Phase 3 will use:**
- `Client` model — DM module attaches platforms to clients
- `Client` model — GD module receives task with client context
- `ServiceTicket` model — Phase 3 can extend this for DM/GD routing
- `ServiceSubscription` model — DM platforms map to subscribed services

---

## Phase 3 — COMPLETED ✅ (Reference)

**What was built (already working — do not touch unless needed for integration):**
- Models: DMPlatform, DMDailyTaskMaster, DMClientPlatform, DMDailyLog, DMDynamicField, DMAuditMetricMaster, DMAuditReport, DMAuditReportEntry, GDTask, GDTaskFile, GDTaskRevision, GDTaskComment, GDTimeLog
- 15 DM platforms seeded with daily task masters + audit metric masters
- DM daily task dashboard (checkbox UI with timestamps)
- DM audit report builder + PDF export with ANK branding
- GD task inbox + file uploads to Google Drive + version control
- DM → GD task auto-creation flow
- DM is single point of contact (GD never delivers directly to client)
- Cross-module dashboards + reports

**Integration points Phase 4 will use:**
- `Client` model (Phase 2) — Development projects link to clients
- `ServiceSubscription` model (Phase 2) — Web/Dev services trigger project creation
- `ServiceTicket` model (Phase 2) — Won deals with Dev services auto-create Dev projects
- `NotificationService` — task assignments + bug alerts
- `GDTask` pattern (Phase 3) — Dev tasks follow similar revision/approval flow
- Google Drive file storage (already integrated)

---

## Phase 4 — COMPLETED ✅ (Reference)

**What was built (already working — do not touch unless needed for integration):**
- Models: DevProject, DevMilestone, DevProjectHandover, DevTask, DevBug, DevTaskComment, DevTimeLog
- Auto-handover from CRM ServiceTicket → Dev Module when Dev service in Won deal
- Project management with team, tech stack, repos, AMC tracking
- Milestone timeline with payment-linked display
- Task Kanban + List + Calendar views
- Bug tracker linked to tasks
- Time logging per task
- Dev Head, Lead Dev, Developer dashboards
- Project lifecycle: planning → active → completed → maintenance

**Integration points Phase 5 will use:**
- `User` model (Phase 1) — Employee is essentially a User with extra HR data; consider extending User OR linking 1:1
- `Department` model (Phase 1) — Employees belong to departments
- `NotificationService` — leave requests, payroll, performance reviews
- Google Drive (Phase 1) — Employee documents locker
- SOPs module (future Phase 6) — onboarding checklists will link to SOPs

---

## Phase 5 — COMPLETED ✅ (Reference)

**What was built (already working — do not touch unless needed for integration):**
- Models: Candidate, CandidateFollowup, CandidateInterview, Employee, EmployeeDocument, EmployeeFamilyMember, Attendance, Holiday, LeaveType, LeaveBalance, LeaveRequest, SalaryStructure, EmployeeSalary, PayrollRun, Payslip, Reimbursement, Bonus, KRA, PerformanceCycle, Goal, SelfEvaluation, ManagerEvaluation, PeerFeedback, OneOnOne, PIP, ExitInterview, FullAndFinalSettlement
- 5 profile skill matrices (Sales/DM/GD/Dev/HR) seeded
- Candidate ATS with bulk import + duplicate detection + interview scheduler
- Employee onboarding wizard (Candidate → Employee with auto-User creation)
- Document locker on Google Drive (per-employee folder structure)
- Attendance check-in/out + IP restriction + manual override
- Leave types + balances + approval workflow + manager dashboard
- Payroll engine: salary structures + monthly run + payslip PDFs + bank disbursement file
- Performance: quarterly cycles + KRAs + self+manager evaluations + 360 feedback + PIP
- Exit workflow: resignation + checklists + F&F + relieving letter
- Employee self-service portal
- HR Master Dashboard
- Sensitive data encrypted (PAN, Aadhaar, bank, salary)

**Integration points Phase 6 will use:**
- `Employee` model — for SOP acknowledgements, onboarding checklist assignment
- `Department` model — for department-wise SOP categorization
- `User` model — every module reference
- All Phase 1-5 modules — Phase 6 polishes them all (cross-module reports, search, performance, security audit)

---

## Current Phase: PHASE 6 — SOPs + Polish + Launch (FINAL PHASE)

**Goal:** Build the SOPs/Office Manual module + polish all 6 prior phases + final launch preparations + production deployment + team training.

**⚠️ Duration:** 4 weeks (Week 21-24). This is the home stretch.

**Scope (locked):**
- ✅ SOPs / Office Manual module (full)
- ✅ Department-wise SOP libraries with version control
- ✅ SOP approval workflow + acknowledgement tracking
- ✅ Onboarding checklists linking SOPs
- ✅ Quiz/Test module for training compliance
- ✅ Global search across all modules
- ✅ Cross-module unified dashboard for Superadmin/Admin
- ✅ Performance optimization (indexes, query review)
- ✅ Security audit + penetration testing
- ✅ Data backup + disaster recovery setup
- ✅ Production deployment + monitoring
- ✅ Team training + documentation
- ✅ Go-live + parallel run

### Week 21 Deliverables — SOPs Module Core

**Backend:**
1. `SOPCategory` model: { name, description, departmentId (ref Department, optional — null for company-wide), iconName, sortOrder }
   - Seed categories: Sales SOPs, DM SOPs, GD SOPs, Dev SOPs, HR SOPs, Common (leave, dress code, ethics, IT policy, communication, office rules)
2. `SOP` model:
   - title, slug, categoryId, description (short)
   - content (rich text — Markdown or HTML)
   - currentVersion (number)
   - status (draft / in_review / published / archived)
   - createdBy, lastUpdatedBy, publishedBy, publishedAt
   - applicableTo (all_employees / specific_departments / specific_roles / specific_designations)
   - applicableIds[] (department/role/designation IDs based on applicableTo)
   - mandatory (boolean — if true, all applicable employees must acknowledge)
   - acknowledgementDeadlineDays (number — within how many days of publish/joining)
   - tags[]
   - attachments[] (gdrive file links for PDFs, videos, screenshots)
3. `SOPVersion` model (full version history):
   - sopId, versionNumber, content, changeLog (what changed in this version)
   - createdBy, createdAt, publishedAt
   - status (draft / published / archived)
4. `SOPApproval` model (workflow):
   - sopId, versionNumber, requestedBy, requestedAt
   - reviewerId, reviewedAt, status (pending / approved / rejected / changes_requested)
   - reviewComments
5. APIs:
   - SOP category CRUD (Superadmin + Dept Heads for own dept): `/api/v1/sops/categories`
   - SOP CRUD: `/api/v1/sops`
   - SOP version history: GET `/api/v1/sops/:id/versions`
   - Submit for approval: POST `/api/v1/sops/:id/submit-for-approval`
   - Approve/reject (Admin or Superadmin): PATCH `/api/v1/sops/:id/approve`
   - Publish: PATCH `/api/v1/sops/:id/publish`
   - Archive: PATCH `/api/v1/sops/:id/archive`
   - Search SOPs: GET `/api/v1/sops/search?q=&category=&dept=`
6. Permissions: `sops:category:*`, `sops:create/read/update/delete/publish/approve`
7. Audit log all changes (legal requirement for policy docs)

**Frontend:**
1. SOPs module folder: `frontend/src/modules/sops/`
2. Pages:
   - SOP Library (filterable by category, department, tags) — main landing page
   - SOP Detail page (read view with version history, last updated, acknowledgement status)
   - SOP Editor (Markdown editor with preview — use `@uiw/react-md-editor` or similar)
   - SOP Categories Management (admin)
   - SOP Approval Inbox (for reviewers)
3. Rich text/Markdown editor with image upload to Google Drive
4. Version comparison view (side-by-side diff between versions)
5. SOP search bar (full-text search across all SOPs)
6. Add "SOPs" sidebar entry (visible to all users with `sops:read`)

### Week 22 Deliverables — Acknowledgements + Onboarding Checklists + Quiz

**Backend:**
1. `SOPAcknowledgement` model:
   - sopId, sopVersionNumber, userId (Employee/User)
   - acknowledgedAt, ipAddress, userAgent
   - signature (typed name or digital signature image)
   - acknowledgementText (auto-generated: "I, [Name], have read and understood [SOP Title v.X] on [Date]")
2. `OnboardingChecklist` model (template):
   - name (e.g., "New Joiner Day 1", "Sales BDE Onboarding")
   - applicableTo (all / department / role / designation)
   - items[] (ordered checklist items)
3. `OnboardingChecklistItem` (sub-doc or separate):
   - title, description, type (read_sop / complete_task / submit_document / attend_meeting / online_form)
   - sopId (optional — if type is read_sop)
   - daysFromJoining (when this item is due)
   - mandatory (boolean)
   - assignedRole (HR / Reporting Manager / IT / Self)
4. `EmployeeOnboardingProgress` model:
   - employeeId, checklistId, startDate
   - items[] (with completedAt, completedBy, status)
   - overallStatus (in_progress / completed / overdue)
5. `Quiz` model (training compliance):
   - sopId (optional — quiz attached to specific SOP)
   - title, description, passingScore, timeLimit (minutes)
   - questions[] (question, type [single_choice/multi_choice/true_false], options[], correctAnswer)
6. `QuizAttempt` model:
   - quizId, userId, attemptedAt, score, passed (boolean), answers[], timeSpent
7. APIs:
   - Acknowledge SOP: POST `/api/v1/sops/:id/acknowledge`
   - My acknowledgements: GET `/api/v1/sops/me/acknowledgements`
   - Pending acknowledgements: GET `/api/v1/sops/me/pending`
   - Acknowledgement report (HR/Admin): GET `/api/v1/sops/:id/acknowledgement-report`
   - Onboarding checklist CRUD: `/api/v1/onboarding-checklists`
   - Auto-trigger onboarding on employee join: hook into Employee onboarding (Phase 5)
   - My onboarding: GET `/api/v1/hr/me/onboarding`
   - Mark item complete: PATCH `/api/v1/hr/me/onboarding/items/:id/complete`
   - Quiz CRUD: `/api/v1/quizzes`
   - Attempt quiz: POST `/api/v1/quizzes/:id/attempts`
   - Quiz results: GET `/api/v1/quizzes/:id/results`
8. Auto-notification on SOP update: identify affected users → send in-app notification
9. Auto-trigger acknowledgement requirement on mandatory SOP publish

**Frontend:**
1. Pages:
   - My SOPs (employee view: pending acknowledgements + read)
   - Acknowledgement modal (read content → checkbox "I have read & understood" → type name → submit)
   - Onboarding Checklist (employee view: progress bar, items by day)
   - Onboarding Templates Management (HR)
   - HR view: who has acknowledged what (matrix view)
   - Quiz Taker UI
   - Quiz Builder UI (admin)
   - Quiz Results dashboard
2. SOP update banner ("New version published — please review and acknowledge")
3. Onboarding progress widget on new employee dashboard
4. Onboarding overdue alerts to HR + Reporting Manager

### Week 23 Deliverables — Cross-Module Polish + Global Search + Master Dashboard

**Backend:**
1. Global search API: GET `/api/v1/search?q=&modules=`
   - Searches across: leads, clients, candidates, employees, dev_projects, sops, deals, tasks
   - Returns categorized results with permission filtering (only show what user can see)
   - Use MongoDB text indexes on key fields
2. Cross-module dashboard APIs:
   - Superadmin master dashboard: `/api/v1/dashboard/master` (revenue, pipeline, employees, projects, attendance, pending approvals — single payload)
   - Admin dashboard: similar but financial-sensitive filtered
3. Performance optimization:
   - Review all collections for missing indexes
   - Add compound indexes for common filter combinations
   - Slow query analysis (mongoose middleware to log queries >100ms)
   - Add response caching for static-ish endpoints (department list, services catalog, etc.) — simple in-memory cache, no Redis
4. Reports module consolidation:
   - Unified reports API: `/api/v1/reports?type=&filters=`
   - Export to CSV/Excel/PDF for all major reports
5. Notification preferences (per user):
   - User can mute certain event types
   - Daily digest option for non-urgent notifications
6. Cleanup utilities:
   - Soft-deleted record auto-archive after 90 days
   - Audit log retention policy (keep for 7 years, archive older)
   - Orphaned file cleanup on Google Drive (files not linked to any record)

**Frontend:**
1. Global search bar in topbar (always visible) — keyboard shortcut Cmd+K / Ctrl+K
   - Results grouped by module
   - Recent searches saved
2. Master Dashboard (Superadmin landing page):
   - Revenue widget (MTD vs target)
   - Pipeline value
   - New leads + conversions
   - Employee count + attrition
   - Attendance summary today
   - Pending approvals across modules
   - Renewals due
   - Recent activity feed
   - Quick actions (Add Lead, Add Candidate, Create Project, etc.)
3. Admin Dashboard (similar, slightly filtered)
4. Reports Center: unified reports across modules with date range + filters + export
5. Notification preferences page
6. UI polish: loading states, empty states, error boundaries, accessibility (keyboard nav, ARIA labels)
7. Mobile-responsive tweaks (not full mobile, but key pages should work on tablet)

### Week 24 Deliverables — Security + Deploy + Training + Launch

**Backend:**
1. Security audit:
   - Run automated scans (npm audit, snyk, OWASP ZAP)
   - Check all routes have correct RBAC
   - Verify encryption at rest (DB) + in transit (HTTPS only)
   - Rate limiting on auth endpoints (already in Phase 1 — verify)
   - Penetration testing checklist (SQL injection equivalent for Mongo, XSS, CSRF, IDOR)
2. Backup & Disaster Recovery:
   - Daily MongoDB Atlas auto-backup verified (or mongodump cron if self-hosted)
   - Backup retention: 30 days
   - Restore drill (test restoring backup to staging)
   - Document DR procedure (RTO, RPO)
3. Monitoring setup:
   - Sentry for error tracking
   - UptimeRobot for uptime monitoring
   - Health check endpoint: GET `/api/v1/health`
   - Custom alerting (e.g., notify Ankur if API down >5 min)
4. Logging:
   - Structured JSON logs
   - Log rotation
   - Separate logs: app logs, audit logs, security logs
5. Production environment setup:
   - Production MongoDB (Atlas M10+ or self-hosted with replica)
   - Production server (AWS EC2 / DigitalOcean)
   - Domain: ams.ankdigitalmedia.com
   - SSL certificate (Let's Encrypt auto-renew)
   - Environment variables locked
   - Process manager: PM2 with cluster mode
   - Nginx reverse proxy
   - Firewall rules
6. Final data migration:
   - If existing data in Excel/old tools, plan migration scripts
   - Parallel run period: 2 weeks (old + new together)

**Frontend:**
1. Build optimization (code splitting, lazy loading, tree shaking)
2. PWA basics (offline page, app icon, manifest)
3. SEO basics (meta tags — even internal app, helps with bookmarks)
4. Error tracking integration (Sentry)
5. Analytics (basic — page views, feature usage)
6. Final UI polish across all modules

**Documentation:**
1. **End-user manuals** (department-wise):
   - Sales team manual (how to use CRM)
   - DM team manual (daily tasks + audit reports)
   - GD team manual (task inbox)
   - Dev team manual (projects + tasks)
   - HR manual (full HR cycle)
   - Manager manual (approvals + dashboards)
   - Employee self-service manual
2. **Admin manual** (Ankur + Admin):
   - User management
   - Permission cascade
   - Master data management (services, platforms, holidays, leave types, salary structures)
   - SOP management
   - Reports + dashboards
3. **Technical documentation**:
   - API reference (auto-generated from code if possible)
   - Database schema
   - Deployment guide
   - Backup/restore procedure
   - Troubleshooting guide
   - Security playbook

**Training:**
1. Department-wise training sessions (1-2 hours each)
2. Hands-on walkthrough with real scenarios
3. Q&A sessions
4. Power users / champions in each dept identified
5. Internal support channel (WhatsApp group or in-app chat)

**Launch:**
1. Soft launch: enable for HR + Sales team first (1 week)
2. Full launch: all 5 departments
3. Decommission old tools (Excel sheets, WhatsApp groups for tracking)
4. Post-launch support window: 30 days dedicated developer availability

---

## Phase 6 Key Decisions to Confirm with Ankur Before Building

Before Week 21 starts, confirm:
1. **SOP categories:** Use suggested list (Sales/DM/GD/Dev/HR + Common) or customize?
2. **SOP approval workflow:** Single-level (Dept Head approves) or two-level (Dept Head + Admin)?
3. **Acknowledgement signature:** Typed name + checkbox (simple) OR digital signature drawing (more formal)?
4. **Onboarding checklist templates:** How many templates initially? (Recommend: 1 Common + 5 dept-specific = 6 templates)
5. **Quiz module:** Mandatory for Phase 6 OR can defer to post-launch enhancement?
6. **Global search scope:** All modules OR start with leads + clients + employees only?
7. **Master Dashboard widgets:** Confirm final widget list for Superadmin homepage
8. **Production hosting:** AWS EC2 / DigitalOcean Droplet / VPS? (Recommend: DigitalOcean for cost-effectiveness)
9. **Domain:** Confirm `ams.ankdigitalmedia.com` for production
10. **Launch strategy:** Big-bang (all depts together) OR phased (HR + Sales first, then rest)?
11. **Training format:** In-person sessions + recorded videos OR live webinar?
12. **Post-launch support:** 30 days / 60 days / 90 days of dedicated dev availability?

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

## First Task When You Start Phase 6

When Ankur runs you with "Let's begin Phase 6 Week 21", do this:

1. **Confirm Phase 1-5 are all fully working:**
   - Login + RBAC + Audit (Phase 1)
   - CRM + Leads + Pipeline + Clients (Phase 2)
   - DM + GD modules (Phase 3)
   - Development module (Phase 4)
   - HR Full (Phase 5)
   - Quick smoke test across all modules

2. **Confirm Phase 6 key decisions** (12 questions in "Phase 6 Key Decisions" section above)

3. **Create SOPs module structure:**
   - `backend/src/modules/sops/`
   - `frontend/src/modules/sops/`

4. **Week 21 Build Order (SOPs Core):**
   - `SOPCategory` model + seed 6 categories (Sales/DM/GD/Dev/HR + Common)
   - `SOP` model with full schema
   - `SOPVersion` model (version history)
   - `SOPApproval` model (workflow)
   - SOP CRUD APIs + approval workflow
   - Permissions: `sops:*`
   - Validation schemas (Zod)
   - Frontend: SOP Library page
   - Frontend: SOP Detail page with version history
   - Frontend: SOP Editor (Markdown editor)
   - Frontend: Approval Inbox

5. **Test as you build:**
   - Create test SOPs across categories
   - Submit for approval → reviewer approves → publish
   - Version 2 → submit → approve → publish (version history works)
   - Search SOPs by keyword

6. **Report back to Ankur** after Week 21 with:
   - Screenshots of SOP library + editor
   - Version control demo
   - Approval workflow demo

After Week 21 → Week 22 (Acknowledgements + Onboarding Checklists) → Week 23 (Polish + Search + Master Dashboard) → Week 24 (Security + Deploy + Training + Launch).

**Phase 6 is the FINAL phase. After this, AMS is complete and production-ready.**

**Commit format:** `[sops] feat: SOP library with version control and approval workflow`

---

## Important Reminders

- 🇮🇳 **Compliance:** DPDPA (India's Digital Personal Data Protection Act) — handle PII carefully
- 🔒 **Security:** Never commit secrets. Always hash passwords (bcrypt, 12 rounds). HTTPS only in prod.
- 📊 **Performance:** Index MongoDB queries. Profile slow endpoints.
- 🧪 **Testing:** Auth + RBAC + Audit log = must have tests. Everything else, judgment call.
- 📝 **Docs:** Update README as you add modules. Keep API docs in `backend/docs/` as Markdown.

---

*Last updated: When Ankur edits this file. If you (Claude Code) update it, commit message must reflect that.*
