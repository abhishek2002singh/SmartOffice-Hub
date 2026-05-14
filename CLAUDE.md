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

> ⚠️ **CURRENT FOCUS: PHASE 5 ONLY (HR Full Module).**
> Phase 1, 2, 3 & 4 complete ✅. Phase 6 listed below for context only. **DO NOT start Phase 6 work until Ankur explicitly says so.** Phase 5 ko solid banao, deploy karo, test karo — Ankur khud bolega "Phase 6 shuru karo" tab next phase plan karenge.

| # | Module | Phase | Status |
|---|--------|-------|--------|
| A | Core (Auth, RBAC, Users, Depts, Audit) | 1 | ✅ **DONE** — Working & deployed |
| B | CRM (Sales — Leads, Pipeline, Clients, Communications) | 2 | ✅ **DONE** — Working & deployed |
| C | DM (Daily Tasks + Audit Reports, 15 platforms) | 3 | ✅ **DONE** — Working & deployed |
| D | GD (Task inbox, revisions, DM-routed delivery) | 3 | ✅ **DONE** — Working & deployed |
| E | Development (Projects, Tasks, Bugs, Milestones) | 4 | ✅ **DONE** — Working & deployed |
| F | HR Full (Candidate ATS + Employee + Attendance + Payroll + Performance) | 5 | **🟢 ACTIVE — Build this** |
| G | SOPs / Office Manual | 6 | ⏸️ Hold — future phase |

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

## Current Phase: PHASE 5 — HR Full Module (BIGGEST PHASE)

**Goal:** Build the complete HR system covering the full lifecycle — Candidate (ATS) → Employee (Onboarding) → Attendance/Leave → Payroll → Performance → Exit. This is the biggest module in AMS.

**⚠️ Duration:** 6 weeks (Week 15-20). Pace yourself. Do not rush.

**Scope (locked):**
- ✅ Candidate Management (ATS): full hiring pipeline from sourcing to offer
- ✅ Employee Management: from joining to exit
- ✅ Attendance Tracking: web check-in/out (no biometric in Phase 5)
- ✅ Leave Management: types, balances, approval workflow
- ✅ Payroll: salary structures, monthly run, payslip PDF, TDS/PF/ESI display
- ✅ Performance Management: KRAs, evaluations, appraisals, PIP
- ✅ Document Locker: per employee secure storage on Google Drive
- ✅ Employee Self-Service Portal: profile, leaves, payslips, performance
- ✅ Exit Management: exit interview, full-and-final settlement display
- ❌ Biometric integration — Phase 5 mein nahi (future)
- ❌ Tax filing automation — Phase 5 mein nahi (display only)
- ❌ Mobile app for employees — out of scope

### Week 15 Deliverables — Candidate ATS Module

**Backend:**
1. `Candidate` model (from Ams_Final.xlsx HR sheet):
   - Personal: firstName, middleName, lastName, dob, maritalStatus (Married/Unmarried/Other), gender (Male/Female/Other)
   - Contact: email, phone, altPhone, address
   - Background: education, lastSalary, previousCompany, previousProfile, totalExperience, expectedSalary
   - Application: appliedDate, leadSource (Internshala/Workindia/Indeed/LinkedIn/Walk-in/Reference/Others), referenceName
   - Profile: appliedProfile (Sales/DM/GD/Development/HR/Admin), appliedFor (Internship/Full Time/Part Time/Freelance/WFH)
   - Status: status (New/Shortlisted/Interview Done/Selected/Rejected/On Hold), priority (High/Medium/Low)
   - Communication: callingStatus (Ringing/Busy/Not Connected/Rejected/Switched Off), notes
   - Files: cvLink (gdrive), portfolioLink (gdrive — for GD candidates)
   - Skills: skillSet (Mixed — different per profile, see skill matrices below)
   - Languages: languagesKnown[]
   - Duplicate flag: previouslyApplied (boolean — auto-detect)
2. `CandidateFollowup` model: { candidateId, scheduledAt, notes, completedAt, completedBy, status }
3. `CandidateInterview` model: { candidateId, round, scheduledAt, interviewer (userId), mode (in-person/video/phone), feedback, rating, status (scheduled/completed/cancelled/no-show) }
4. **Skill Matrices per Profile (seed data):**
   - **Graphic & Video Editor:** Photoshop, Premiere Pro, After Effects, CorelDraw, Illustration, CapCut, Final Cut Pro, Canva, 2D/3D Animation, AI Image Gen, AI Video Gen
   - **DM:** Social Media (FB/IG/X/LinkedIn/YT/Threads), SEO (On/Off/Technical), Ads (Meta/Google/LinkedIn), GMB, Content Writing, AI Tools, Google Analytics, Influencer Marketing, E-commerce (Amazon/Flipkart/Meesho/Myntra/Other)
   - **Development:** Frontend (HTML/CSS/JS/React/WordPress/JQuery/Bootstrap/React Native/Tailwind/Flutter/3JS/Next.js), Backend (Express/Node/PHP/Python/MySQL/MongoDB/SQL), E-commerce (Shopify/WooCommerce), Tools (VS Code/Github/Postman/AWS/Docker/Kubernetes), AI
   - **Sales:** Communication, Lead Generation, Client Conversion, Computer, Negotiation, Convincing, Problem Solving
   - **HR:** Recruitment, JD Writing, Interviewing, HR Documentation, Communication, Policy Creation, Resume Screening, Decision Making, Attendance Mgmt
5. APIs:
   - Candidate CRUD: `/api/v1/hr/candidates`
   - Bulk import (Excel/CSV with mobile+email dedup)
   - Single candidate add (manual)
   - Candidate from website form (placeholder API for future career page)
   - Follow-up CRUD: `/api/v1/hr/candidates/:id/followups`
   - Interview CRUD: `/api/v1/hr/candidates/:id/interviews`
   - Status transition: `/api/v1/hr/candidates/:id/status`
   - Rejected pool query: GET `/api/v1/hr/candidates?status=rejected&search=...`
   - Job-portal-style filters: skills[], gender, salaryRange, experience, location, profile, status
6. Permissions: `hr:candidate:create/read/update/delete`, `hr:interview:*`, `hr:followup:*`, `hr:bulk_import:create`
7. Duplicate detection: phone + email cross-check; show "Previously Applied" badge
8. Audit logging on all writes

**Frontend:**
1. HR module folder: `frontend/src/modules/hr/`
2. Pages:
   - Candidate List (job-portal style with rich filters)
   - Candidate Detail with tabs: Profile / Skills / Follow-ups / Interviews / Documents / Activity
   - Candidate Create/Edit form (multi-step: Personal → Background → Application → Skills)
   - Bulk Import UI
   - Rejected Pool (separate view with re-activate option)
   - Interview Scheduler (calendar view)
3. Skill matrix UI: profile-specific checklist with proficiency level (Beginner/Intermediate/Expert)
4. CV/Portfolio upload to Google Drive
5. "Previously Applied" warning banner on duplicate detection
6. Add "HR" sidebar entry visible to users with `hr:*` permissions

### Week 16 Deliverables — Employee Management + Document Locker

**Backend:**
1. `Employee` model (extends candidate data on Selection):
   - employeeId (auto: ANK-EMP-001 format)
   - userId (ref User — must have AMS login if needed)
   - candidateId (ref Candidate — auto-migrated)
   - personalInfo (firstName, lastName, dob, gender, maritalStatus, bloodGroup, emergencyContact)
   - contactInfo (email, phone, altPhone, currentAddress, permanentAddress)
   - employmentInfo (designation, departmentId, reportingManagerId, dateOfJoining, employmentType, employmentStatus, probationEndDate, confirmationDate, officeLocation)
   - bankDetails (accountNumber, ifsc, bankName, branch — encrypted)
   - statutoryInfo (panNumber, aadhaarNumber, uanNumber, esiNumber, pfNumber — encrypted)
   - salaryStructureId (ref SalaryStructure — see Week 18)
   - exitInfo (exitDate, exitReason, finalSettlement, exitInterviewId — only on exit)
2. `EmployeeDocument` model: { employeeId, type (offer_letter/joining_letter/id_proof/address_proof/education/experience/relieving/other), name, gdriveFileId, gdriveLink, uploadedBy, uploadedAt, expiresAt (optional for licenses) }
3. `EmployeeFamilyMember` model (optional): { employeeId, name, relation, dob, contact, isNominee }
4. APIs:
   - Onboard from candidate: POST `/api/v1/hr/employees/onboard/:candidateId`
   - Employee CRUD: `/api/v1/hr/employees`
   - Document upload/list: `/api/v1/hr/employees/:id/documents`
   - Exit workflow: POST `/api/v1/hr/employees/:id/exit`
   - Employee self-service: GET `/api/v1/hr/me/profile`, PATCH `/api/v1/hr/me/profile` (with HR approval)
5. Auto-create AMS User account on onboarding (default role: team member, dept-wise)
6. Sensitive data encryption: PAN, Aadhaar, bank details (use field-level encryption in Mongoose)
7. Permissions: `hr:employee:create/read/update/delete/exit`, `hr:document:*`, `hr:self:read/update`

**Frontend:**
1. Pages:
   - Employee Directory (list with filters: dept, designation, status, location)
   - Employee Detail with tabs: Profile / Employment / Salary (gated) / Documents / Family / Attendance / Leaves / Payslips / Performance / Activity
   - Employee Onboarding Wizard (multi-step: Basic Info → Documents → Salary → Bank → Confirm)
   - Exit Workflow Page
2. Document Locker UI with type-wise categorization, upload progress, expiry alerts
3. Employee Self-Service Portal:
   - My Profile (view + request edit)
   - My Documents
   - My Salary Slips (link to Week 18)
   - Update personal info (with HR approval flow)
4. Manager view: "My Team" page showing direct reports

### Week 17 Deliverables — Attendance + Leave Management

**Backend:**
1. `Attendance` model: { employeeId, date, checkIn (timestamp), checkOut (timestamp), workHours (calculated), status (present/absent/half_day/late/wfh/holiday/leave), notes, ipAddress, location (optional), modifiedBy (userId — if HR manual override) }
2. `Holiday` model: { date, name, type (national/regional/optional), applicableTo (all/specific_offices) }
3. `LeaveType` model: { name, code (CL/SL/EL/ML/PL/COMP/LOP), annualQuota, monthlyAccrualEnabled, carryForwardEnabled, maxCarryForward, halfDayAllowed, requireDocuments }
4. `LeaveBalance` model: { employeeId, leaveTypeId, year, allocated, used, remaining, carryForwarded }
5. `LeaveRequest` model: { employeeId, leaveTypeId, startDate, endDate, days (auto-calc excluding holidays/weekends), reason, attachments, status (pending/approved/rejected/cancelled/withdrawn), reviewedBy, reviewedAt, reviewerComments }
6. APIs:
   - Attendance: POST `/api/v1/hr/attendance/check-in`, POST `/check-out`, GET `/api/v1/hr/attendance?employeeId=&from=&to=`
   - Manual attendance entry (HR only): POST `/api/v1/hr/attendance/manual`
   - Holiday CRUD (Superadmin): `/api/v1/hr/holidays`
   - Leave types CRUD (Superadmin): `/api/v1/hr/leave-types`
   - Leave balance: GET `/api/v1/hr/employees/:id/leave-balances`
   - Apply leave: POST `/api/v1/hr/leave-requests`
   - Approve/reject (manager): PATCH `/api/v1/hr/leave-requests/:id/review`
   - Leave history: GET `/api/v1/hr/employees/:id/leave-history`
   - Team leaves view (for managers): GET `/api/v1/hr/leave-requests/team`
7. Workflow: Employee applies → Reporting Manager approves/rejects → HR can override → Attendance auto-marks "leave" for those dates
8. IP restriction option for check-in (only from office network — configurable)
9. Permissions: `hr:attendance:*`, `hr:leave:*`, `hr:holiday:*`

**Frontend:**
1. Pages:
   - Employee: Check-in/out widget (top of dashboard), My Attendance calendar, Apply Leave form, My Leave History
   - Manager: Team Attendance (matrix view: employees × dates), Pending Leave Approvals
   - HR: Attendance overview (all employees), Manual entry, Holiday calendar management, Leave types config
2. Calendar views (monthly grid with color codes per status)
3. Leave application modal: select type → dates → days auto-calc → reason → submit
4. Approval inbox for managers with quick approve/reject
5. Leave balance widget (dashboard)

### Week 18 Deliverables — Payroll

**Backend:**
1. `SalaryStructure` model: { name, basicPercent, hraPercent, allowances[] (name, amount/percent, taxable), deductions[] (name, amount/percent, type) }
2. `EmployeeSalary` model: { employeeId, structureId, ctc, basic, hra, allowancesBreakdown, deductionsBreakdown, netSalary, effectiveFrom, revisedReason }
3. `PayrollRun` model: { month, year, status (draft/processed/disbursed), processedBy, processedAt, totalEmployees, totalAmount }
4. `Payslip` model: { payrollRunId, employeeId, workingDays, paidDays, lopDays, otHours, grossEarnings, totalDeductions, netPay, tdsAmount, pfAmount, esiAmount, generatedPdfLink (gdrive) }
5. `Reimbursement` model: { employeeId, type (travel/food/internet/medical/other), amount, billDate, billAttachment, status (pending/approved/rejected/paid), submittedAt, reviewedBy, reviewedAt }
6. `Bonus` model: { employeeId, type (performance/festival/referral/other), amount, reason, payableMonth, payableYear, status (planned/included_in_payroll/disbursed) }
7. APIs:
   - Salary structure CRUD (Superadmin): `/api/v1/hr/salary-structures`
   - Assign salary to employee: POST `/api/v1/hr/employees/:id/salary`
   - Salary history: GET `/api/v1/hr/employees/:id/salary-history`
   - Process payroll: POST `/api/v1/hr/payroll/process` (month, year) — calculates LOP from attendance, applies deductions, generates payslips
   - Generate payslip PDF: GET `/api/v1/hr/payslips/:id/pdf` (with ANK branding)
   - Mark payroll disbursed: PATCH `/api/v1/hr/payroll/:id/disburse`
   - Bank disbursement file export: GET `/api/v1/hr/payroll/:id/bank-file` (CSV in bank-ready format)
   - Reimbursement CRUD: `/api/v1/hr/reimbursements`
   - Bonus CRUD: `/api/v1/hr/bonuses`
   - Form 16 placeholder: GET `/api/v1/hr/employees/:id/form16?fy=YYYY-YY` (display only, no e-filing)
8. Payroll engine logic:
   - Pull attendance for the month
   - Calculate LOP days
   - Apply pro-rated salary
   - Add bonuses + reimbursements approved this cycle
   - Calculate TDS (slab-based, basic logic — not full IT compliance)
   - Calculate PF (12% of basic, capped), ESI (if applicable)
   - Generate payslip per employee
   - Soft-deploy first as "draft" for HR review, then publish
9. Permissions: STRICT — `hr:salary:read/update` (Superadmin + Admin), `hr:payroll:process/disburse`, `hr:reimbursement:*`, `hr:bonus:*`, `hr:self:payslip:read` (employee own only)
10. Sensitive data: encrypt salary at rest

**Frontend:**
1. Pages:
   - Salary Structure Master (Superadmin)
   - Employee Salary Assignment + Revision History
   - Payroll Run Dashboard (current month status)
   - Payroll Process Wizard (Step 1: Review attendance → Step 2: Adjustments → Step 3: Preview → Step 4: Approve & Generate)
   - Payslip List (employee view: my payslips)
   - Reimbursement Submission (employee) + Approval (manager/HR)
   - Bonus Management (HR)
2. Payslip PDF download
3. Bank disbursement file download
4. Salary visibility STRICTLY role-gated (Team members see only their own)

### Week 19 Deliverables — Performance Management

**Backend:**
1. `KRA` model (Key Result Area): { name, description, applicableRoles[], measurableUnits, weightagePercent }
2. `PerformanceCycle` model: { name, type (quarterly/half_yearly/annual), startDate, endDate, status (planned/active/in_review/completed) }
3. `Goal` model: { employeeId, cycleId, title, description, targetValue, achievedValue, kraId (optional), status (set/in_progress/achieved/missed), weightagePercent }
4. `SelfEvaluation` model: { employeeId, cycleId, goals (with self-rating + comments), strengths, improvements, trainingNeeds, submittedAt }
5. `ManagerEvaluation` model: { employeeId, managerId, cycleId, goalRatings (per goal), overallRating (1-5), strengths, improvements, increment_recommendation, promotion_recommendation, submittedAt }
6. `PeerFeedback` model (360-degree, optional): { evaluateeId, evaluatorId, cycleId, anonymous (boolean), ratings, comments, submittedAt }
7. `OneOnOne` model: { managerId, employeeId, scheduledAt, agenda, notes, actionItems[], conductedAt }
8. `PIP` model (Performance Improvement Plan): { employeeId, startDate, endDate, reason, expectations[], reviewer, status (active/passed/failed), reviews[] }
9. APIs:
   - KRA CRUD (HR + role heads): `/api/v1/hr/kras`
   - Performance cycle setup: `/api/v1/hr/performance-cycles`
   - Goals: `/api/v1/hr/employees/:id/goals?cycleId=`
   - Self-evaluation: `/api/v1/hr/me/evaluations/:cycleId`
   - Manager evaluation: `/api/v1/hr/employees/:id/manager-evaluation/:cycleId`
   - Peer feedback (anonymous): `/api/v1/hr/peer-feedback`
   - 1-on-1 meetings: `/api/v1/hr/one-on-ones`
   - PIP CRUD: `/api/v1/hr/pips`
   - Performance reports: `/api/v1/hr/reports/performance`
10. Permissions: `hr:performance:*`, `hr:self:evaluation:*`, `hr:peer:create/read`

**Frontend:**
1. Pages:
   - Performance Cycle Setup (HR)
   - KRA Master (role-wise)
   - Goal Setting (employee + manager view)
   - Self-Evaluation Form
   - Manager Evaluation Form (with prior self-eval visible)
   - 360-feedback form (anonymous)
   - 1-on-1 Notes
   - PIP Management
   - Performance Dashboard (employee — see own ratings over cycles)
   - Manager Dashboard (team performance overview)
   - HR Dashboard (org-wide performance distribution)

### Week 20 Deliverables — Exit + Self-Service + Polish + Deploy

**Backend:**
1. `ExitInterview` model: { employeeId, conductedBy, conductedAt, reasons[] (better_opportunity/compensation/work_life/manager/role/personal/other), feedback, suggestions, wouldRecommend (yes/no), eligibleForRehire (boolean) }
2. `FullAndFinalSettlement` model: { employeeId, exitDate, pendingSalary, leaveEncashment, gratuity, bonus, deductions, netPayable, status (pending/approved/disbursed), processedBy, processedAt }
3. Exit workflow:
   - Resignation submitted by employee
   - Manager + HR acknowledgement
   - Notice period tracking
   - Knowledge transfer checklist
   - Asset return checklist
   - Document collection (relieving letter, experience certificate)
   - F&F calculation
   - Final approval + disbursement
4. APIs:
   - Resignation submission: POST `/api/v1/hr/me/resignation`
   - Exit workflow tracking: `/api/v1/hr/employees/:id/exit-checklist`
   - Exit interview: POST `/api/v1/hr/employees/:id/exit-interview`
   - F&F calculation: POST `/api/v1/hr/employees/:id/full-and-final`
   - Generate relieving letter PDF
   - Generate experience certificate PDF

**Frontend:**
1. Resignation submission UI (employee)
2. Exit workflow tracker (employee + HR)
3. Exit interview form
4. F&F approval UI
5. Generate + download exit documents (PDFs with ANK branding)
6. HR Master Dashboard:
   - Total employees + by dept
   - Joinings this month
   - Exits this month + attrition rate
   - Birthdays/anniversaries this week
   - Pending leave requests
   - Pending reimbursements
   - Probation expiring soon
   - Performance reviews due
   - Open positions in pipeline (from ATS)
7. Phase 5 testing + bug fixes + deploy

---

## Phase 5 Key Decisions to Confirm with Ankur Before Building

Before Week 15 starts, confirm:
1. **Candidate skill matrices:** Use lists from Ams_Final.xlsx HR sheet? Any updates needed?
2. **Employee ID format:** ANK-EMP-001 (3-digit zero-padded) or ANK-EMP-2026-001 (year-prefixed)?
3. **Attendance method:** Web check-in only? IP-restricted to office network? Allow WFH check-in?
4. **Leave types & quotas:** What are ANK's current leave types and annual quotas? (CL/SL/EL/ML/etc., 12/12/15 days?)
5. **Salary structure:** Standard Basic+HRA+Allowances+Deductions, or custom for ANK?
6. **Payroll cycle:** Calendar month (1st-end) or custom (e.g., 26th-25th)?
7. **TDS calculation:** Display estimate only (no e-filing) — confirm?
8. **PF/ESI applicability:** Apply for all or only employees above certain salary?
9. **Performance cycle:** Quarterly, Half-yearly, or Annual?
10. **360-feedback:** Include anonymous peer feedback or skip?
11. **PIP:** Auto-trigger after consecutive low ratings or manual only?
12. **Exit interview:** Mandatory for all exits or optional?

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

## First Task When You Start Phase 5

When Ankur runs you with "Let's begin Phase 5 Week 15", do this:

1. **Confirm Phase 1, 2, 3 & 4 are fully working:**
   - Login + RBAC + Audit (Phase 1)
   - CRM + Leads + Pipeline + Clients (Phase 2)
   - DM + GD modules (Phase 3)
   - Development module (Phase 4)
   - Quick smoke test via Postman

2. **Confirm Phase 5 key decisions** (12 questions in "Phase 5 Key Decisions" section above) — Ankur se 1-by-1 puchho. **This is critical** because HR has compliance + sensitive data implications.

3. **Reference source data:**
   - Open `Ams_Final.xlsx` HR sheet for candidate fields + skill matrices
   - Ask Ankur for: current leave types & quotas, salary structure template, PF/ESI policy

4. **Create HR module structure:**
   - `backend/src/modules/hr/` (with sub-folders: candidate, employee, attendance, leave, payroll, performance, exit)
   - `frontend/src/modules/hr/` (similar structure)

5. **Week 15 Build Order (Candidate ATS):**
   - `Candidate` model with all fields from Excel
   - Skill matrix seed data (5 profile types — see CLAUDE.md)
   - `CandidateFollowup` model
   - `CandidateInterview` model
   - Candidate CRUD APIs with duplicate detection (phone+email)
   - Bulk import (Excel/CSV)
   - Validation schemas (Zod)
   - Frontend: Candidate List with job-portal-style filters
   - Frontend: Candidate Detail with tabs
   - Frontend: Multi-step Add Candidate form
   - Frontend: Bulk Import UI
   - Frontend: Rejected Pool view
   - Frontend: Interview Scheduler

6. **Test as you build:**
   - Create test HR user with `hr:candidate:*` permissions
   - Add 10 dummy candidates across 5 profiles
   - Test duplicate detection (same phone)
   - Schedule interview, complete with feedback
   - Move candidate through statuses
   - Verify RBAC: non-HR users can't access

7. **Report back to Ankur** after Week 15 with:
   - Screenshots of candidate list with filters
   - Demo of skill matrix per profile
   - Duplicate detection working
   - Interview workflow

After Week 15 success → move to Week 16 (Employee + Documents).

**⚠️ Security reminder for Phase 5:** PAN, Aadhaar, bank details, salary — encrypt at rest. Strict RBAC. Audit every access. This is the most sensitive module in AMS.

**Commit format:** `[hr] feat: candidate ATS with skill matrices`

---

## Important Reminders

- 🇮🇳 **Compliance:** DPDPA (India's Digital Personal Data Protection Act) — handle PII carefully
- 🔒 **Security:** Never commit secrets. Always hash passwords (bcrypt, 12 rounds). HTTPS only in prod.
- 📊 **Performance:** Index MongoDB queries. Profile slow endpoints.
- 🧪 **Testing:** Auth + RBAC + Audit log = must have tests. Everything else, judgment call.
- 📝 **Docs:** Update README as you add modules. Keep API docs in `backend/docs/` as Markdown.

---

*Last updated: When Ankur edits this file. If you (Claude Code) update it, commit message must reflect that.*
