# ANK Management System (AMS) — Full Blueprint

**Prepared for:** Ankur, Founder — ANK Digital Media
**Scope:** Web-only, internal-use unified business management platform
**Goal:** Replace scattered tools (Excel, WhatsApp groups, manual tracking) with one custom-built ERP-like system covering Sales, Marketing, Design, Development, and HR.

---

## 1. Locked Scope (Final Decisions)

| # | Decision Point | Final Answer |
|---|----------------|--------------|
| 1 | Platform | Web-only (mobile in future phase) |
| 2 | Users | Internal team only — no client access |
| 3 | HR Scope | Full — Candidate + Employee + Attendance + Payroll + Performance |
| 4 | Role Hierarchy | Superadmin → Admin → SubAdmin → Dept Heads → Team |
| 5 | SOPs Module | Separate module inside AMS |
| 6 | Notifications | All channels built (In-app + Email + WhatsApp), **only In-app active in Phase 1** |
| 7 | Build Approach | Custom build (in-house Ank Development team) |
| 8 | Branding | ANK colors + Montserrat Bold + Open Sans |
| 9 | DM → GD → Client | DM assigns task to GD → GD delivers to DM → **DM gives final delivery to client** (single point of contact) |
| 10 | CRM Source | Detailed CRM Blueprint v1 (already finalized separately) |

---

## 2. Role Hierarchy

```
SUPERADMIN (Ankur)
    ↓ grants permissions to
ADMIN (Operations control)
    ↓ delegates to
SUBADMIN (Admin-equivalent on selected modules)
    ↓ oversees
DEPT HEADS (Sales Head, DM Head, GD Head, Dev Head, HR Head)
    ↓ leads
TEAM MEMBERS (BDE, Marketer, Designer, Developer, HR Exec)
```

### Permission Matrix

| Module | Superadmin | Admin | SubAdmin | Dept Head | Team |
|--------|------------|-------|----------|-----------|------|
| User & Permission Mgmt | Full | Full (via cascade) | Limited | Own dept | Self only |
| CRM (Sales) | Full | Full | Full | Sales only | Own leads |
| DM Module | Full | Full | Full | DM only | Assigned clients |
| GD Module | Full | Full | Full | GD only | Assigned tasks |
| Dev Module | Full | Full | Full | Dev only | Assigned projects |
| HR — Candidate | Full | Full | Limited | View | Hidden |
| HR — Employee | Full | Full | Limited | Own team | Self-service |
| HR — Payroll | Full | View | Hidden | Hidden | Own slip only |
| HR — Performance | Full | Full | View | Own team | Self only |
| SOPs | Full edit | Edit | Edit | Edit own dept | Read only |
| Financial Reports | Full | Limited | Hidden | Hidden | Hidden |
| Audit Logs | Full | View | Hidden | Hidden | Hidden |

**Permission Cascade Rule:** Superadmin checkbox UI se Admin ko every module ka access on/off kar sakta hai. Admin neeche cascade kar sakta hai SubAdmin tak.

---

## 3. Department Structure

| Department | Head Role | Member Types | Primary Module |
|------------|-----------|--------------|----------------|
| Sales | Sales Head | BDE / Tele-caller | CRM |
| Digital Marketing | DM Head | DM Executive / Strategist | DM |
| Graphic & Video | GD Head | Designer / Video Editor | GD |
| Development | Dev Head | Frontend / Backend / Full-stack | Development |
| HR | HR Head | HR Executive / Recruiter | HR |

---

# MODULE-WISE SPECIFICATION

---

## MODULE A: Core / Foundation

### Features
- Authentication (Email + Password + OTP login option)
- 2FA optional per user
- Role-Based Access Control (RBAC) with field-level masking
- User CRUD + role assignment + deactivation
- Department CRUD
- Permission cascade engine (visual checkbox UI for Superadmin)
- Notification engine (channel-toggleable per event type)
- Audit log (every action, every user, timestamped + IP)
- Master dashboard (role-wise widgets)
- Profile self-service
- Company settings (info, fiscal year, branding, holidays)
- File manager (Google Drive with department-wise folders)
- Search bar (global — searches across leads, clients, employees, candidates, projects)

### Key Tables
`users`, `roles`, `departments`, `permissions`, `permission_grants`, `notifications`, `notification_channels`, `audit_logs`, `attachments`, `settings`

---

## MODULE B: CRM (Sales)

*Reference: ANK CRM Blueprint v1 — full detail wahaan hai. Yahan summary.*

### Features
- **Lead capture** from 10+ sources (Website, Google Ads, Meta Ads, LinkedIn, 3 GMB profiles, WhatsApp click-to-chat, IVR inbound, Email parse, Manual, Bulk import)
- **Lead pipeline:** New → Assigned → Contacted → Qualified → Proposal Sent → Negotiation → Won/Lost/Junk
- **Auto-assignment** (round-robin / service-based / geo-based / budget-based)
- **Lead scoring** (Hot 70+, Warm 40-69, Cold <40)
- **Client conversion** on Won (auto)
- **Service catalog** (for tagging only — no pricing/quoting)
- **Renewal alerts** (30/15/7 days before — manual amount tracking)
- **Communication Hub** — WA/SMS/Email/Call logs unified inbox
- **Service tickets** (auto-handover to GD/Dev after deal won)

> **Note:** Quote/Proposal builder aur Invoice/Payment tracking AMS scope se hata diye gaye hain. Ye Tally / external tools mein handle honge.

### Key Tables (MongoDB Collections)
`leads`, `lead_sources`, `clients`, `client_contacts`, `deals`, `services_catalog`, `service_subscriptions`, `communications`, `service_tickets`

---

## MODULE C: Digital Marketing (DM)

*Source: Ams_Final.xlsx — DM sheet*

### Sub-Module C.1 — Daily Task Management

**Concept:** Superadmin/Admin client-wise platforms add karta hai. Har platform ke sub-tasks (daily checklist) auto-load ho jaate hain.

**15 Platforms Supported:**
GMB · Facebook · Instagram · Twitter (X) · LinkedIn · YouTube · Meta Ads · Google Ads · LinkedIn Ads · E-commerce · Other Platform · Influencer Marketing · WhatsApp Channel · SMS Shoot · WAST Shoot

**Daily Tasks per Platform** (15-18 tasks each — pre-loaded master list, editable):

Example — **Facebook:**
- Page/Account Optimisation
- Content Posting (photos, videos, reels, carousel)
- Stories
- Comments reply (with count)
- Spam/abusive comments delete (with count)
- Messenger replies (with count)
- Page invites (with count)
- Old content repurpose
- Mentions/tags check
- Followers' comments like
- Spam comments delete
- Fake profiles block
- Group share (with count)
- Group join/remove (with count)
- Call & WhatsApp button on all posts

Similar detailed lists for IG, X, LinkedIn, YouTube, Meta Ads, Google Ads etc.

**Workflow:**
1. Superadmin/Admin client onboard karta hai → platforms select kare → sub-tasks auto-attach
2. Daily, DM team checkbox marks task complete → timestamp auto-save
3. SubAdmin/DM Head reviews
4. Progress visible in Client → DM Dashboard

**Custom Fields:** "Other Platform" mein Admin 5 dynamic fields create kar sakta hai (e.g., naya platform aaye toh).

### Sub-Module C.2 — Audit Reports

**Concept:** Same 15 platforms, but **performance metrics** (30-40 per platform) — generated for **7 / 15 / 30 / 60 / 90 days**.

Example metrics — **Instagram:**
- Page Optimisation status
- Profile link
- Followers at start / end / net gain / unfollowers
- Total posts / reels / stories
- Reach (organic + paid)
- Impressions
- Video views
- Avg watch time
- Likes / comments / shares / saves
- Engagement rate
- Top-performing reel
- DMs received/replied
- Response rate
- Avg response time
- Link clicks / Website visits
- Leads generated
- WhatsApp inquiries
- Ad spend & ROAS (if applicable)
- Audience demographics
- Best posting day/time
- Achievements / Challenges / Recommendations / Next-week goals

Similar 30-40 metric sets for each of the 15 platforms.

**Report Generation:**
- DM Executive fills in data weekly/period-end
- Auto-PDF export with ANK branding (Deep Navy + Brand Blue + Open Sans)
- Client-wise + Platform-wise + Period-wise drill-down
- Comparison view (last period vs this period)

### Sub-Module C.3 — Workflow

```
DM (client se discuss kare)
    → Task identify kare (e.g., reel banana hai)
    → GD ko assign kare (Module D)
    → GD work submit kare
    → DM review kare
    → DM revisions ya approve kare
    → DM client ko final delivery de
    → Task closed
```

**DM remains single point of contact with client.**

### Key Tables
`dm_platforms`, `dm_daily_tasks_master`, `dm_client_platforms`, `dm_daily_logs`, `dm_audit_metrics_master`, `dm_audit_reports`, `dm_report_periods`

---

## MODULE D: Graphic & Video (GD)

*Source: Ams_Final.xlsx — GD sheet + clarification*

### Features
- Task inbox (assigned by Superadmin / Admin / SubAdmin / DM)
- Task fields: Client name, Date assigned, Date due, Type (video / reel / image / carousel / poster / thumbnail / banner), Status, Notes, Brief attachment, Reference attachment, Priority (High → Medium → Low)
- Status flow: **New → In Progress → Submitted → Revision Requested → Approved → Delivered to Client (by DM)**
- File upload (multiple — drafts + final files)
- Version control (v1, v2, v3 — track revisions)
- Datewise task assignment (calendar view)
- Time tracking (optional — designer logs time per task)
- Personal dashboard per designer:
  - Today's tasks
  - Pending tasks
  - This week's deliveries
  - Performance: avg turnaround time, on-time %
- GD Head dashboard:
  - Team load (per designer)
  - Bottlenecks
  - Client-wise pending count

### Workflow Rule
GD **never directly delivers to client**. Final approved file → DM ko notify → DM client ko deliver.

### Key Tables
`gd_tasks`, `gd_task_files`, `gd_task_revisions`, `gd_task_comments`, `gd_time_logs`

---

## MODULE E: Development

*Source: Ams_Final.xlsx — Development sheet*

### Features
- Project management (per client)
- Project fields: Client name, project name, type (Website / E-commerce / Web App / Custom), start date, deadline, status (Planning / Active / On-hold / Completed)
- Task management within project
- Task fields: Title, description, assigned to, priority (High → Medium → Low), status (To-do / In Progress / Code Review / Testing / Done / Bug), deadline, completion date, notes, attachments
- Milestone tracking
- Sprint/Kanban board view
- Bug tracker (linked to tasks)
- Code repository links (GitHub/GitLab integration optional)
- Time tracking per task
- Project handover document (from Sales → Dev when deal won)
- Dev Head dashboard:
  - All active projects
  - Team utilization
  - Overdue tasks alert
  - Client-wise project status

### Workflow
```
Sales Won → Project auto-created in Dev module with handover notes
    → Dev Head assigns Lead Developer
    → Lead Developer creates tasks & assigns to team
    → Daily standup updates via in-app comments
    → Milestones tracked
    → Final delivery → Auto-notify Sales/Admin
    → Project moves to "Maintenance" status (AMC tracking)
```

### Key Tables
`dev_projects`, `dev_milestones`, `dev_tasks`, `dev_task_comments`, `dev_bugs`, `dev_time_logs`, `dev_handover_docs`

---

## MODULE F: HR (Full)

*Source: Ams_Final.xlsx — HR sheet, expanded with locked full-HR scope*

### Sub-Module F.1 — Candidate Management (ATS)

**Personal Info Fields:**
Full Name (First/Middle/Last), DOB (DD/MM/YY), Marital Status (Married/Unmarried/Other), Gender (Male/Female/Other), Email, Phone, Alt Phone, Address, Education, Last Salary, Previous Company, Previous Profile, Total Experience, Expected Salary, Applied Date, Lead Source, Experience, Previously Applied (Y/N), Status, CV upload, Languages Known, Applied Profile, Applied For, Calling Status, Notes

**Lead Source dropdown:** Internshala / Workindia / Indeed / LinkedIn / Walk-in / Reference (with name) / Others

**Status dropdown:** New / Shortlisted / Interview Done / Selected / Rejected / On Hold

**Applied Profile dropdown:** Sales / DM / GD / Development / HR / Admin

**Applied For dropdown:** Internship / Full Time / Part Time / Freelance / Work From Home

**Calling Status dropdown:** Ringing / Busy / Not Connected / Rejected / Switched Off

**Skill Matrices per Profile:**

| Profile | Skill Checklist |
|---------|-----------------|
| **Graphic & Video Editor** | Photoshop, Premiere Pro, After Effects, CorelDraw, Illustration, CapCut, Final Cut Pro, Canva, 2D/3D Animation, AI Image Gen, AI Video Gen |
| **DM** | Social Media (FB/IG/X/LinkedIn/YT/Threads), SEO (On/Off/Technical), Ads (Meta/Google/LinkedIn), GMB, Content Writing, AI Tools, Google Analytics, Influencer Marketing, E-commerce (Amazon/Flipkart/Meesho/Myntra/Other) |
| **Development** | Frontend (HTML/CSS/JS/React/WordPress/JQuery/Bootstrap/React Native/Tailwind/Flutter/3JS/Next.js), Backend (Express/Node/PHP/Python/MySQL/MongoDB/SQL), E-commerce (Shopify/WooCommerce), Tools (VS Code/Github/Postman/AWS/Docker/Kubernetes), AI |
| **Sales** | Communication, Lead Generation, Client Conversion, Computer, Negotiation, Convincing, Problem Solving |
| **HR** | Recruitment, JD Writing, Interviewing, HR Documentation, Communication, Policy Creation, Resume Screening, Decision Making, Attendance Mgmt |

**Functional Features:**
- Add / Remove / Edit candidates
- Data input modes: Excel bulk upload, Website form, Manual entry
- All-type filters (skills, gender, salary, experience, location, status — job-portal style)
- Multiple follow-up date+time entries per candidate
- Multiple interview schedule entries per candidate
- GD: Portfolio link field
- CV upload
- Portfolio upload
- Task assignment by Admin/SubAdmin (e.g., "Call 10 shortlisted today")
- Priority order (High → Medium → Low)
- **Duplicate detection** — phone + email cross-check; show "Previously Applied" badge
- **Rejected pool** — searchable, filterable; can re-activate if needed

### Sub-Module F.2 — Employee Management

**Concept:** Candidate "Selected" → "Onboarded" → becomes Employee.

**Employee Fields:**
- All candidate fields (auto-migrated)
- Employee ID (auto: ANK-EMP-001)
- Date of Joining
- Designation
- Department
- Reporting Manager
- Office location (default: Shalimar Bagh; multi-office ready)
- Salary structure (Basic + HRA + Allowances + Deductions)
- Bank account details
- PAN / Aadhaar
- UAN / ESI number
- Probation period
- Confirmation date
- Employment status (Active / Notice Period / Exited)
- Documents locker (Offer Letter, Joining Letter, ID proof, Address proof, Education docs, Experience certs, etc.)

**Self-Service Portal for Employee:**
- View profile
- Update personal info (with HR approval)
- Apply for leave
- View attendance
- Download payslips
- View performance feedback
- Access SOPs relevant to their role

### Sub-Module F.3 — Attendance & Leave

**Features:**
- Daily attendance — multiple modes:
  - Web check-in / check-out (IP-restricted to office network)
  - Biometric integration (optional, future)
  - Manual entry by HR (for exceptions)
- Working hours calculation
- Overtime tracking
- Late mark / Half day / Absent
- Holiday calendar (Delhi-specific + festival list)
- Leave types: Casual / Sick / Earned / Maternity / Paternity / LOP / Comp-off
- Leave balance auto-calculation
- Leave application workflow:
  - Employee applies → Reporting Manager approves/rejects → HR confirms → Calendar updates
- Half-day leave support
- Leave history & reports

### Sub-Module F.4 — Payroll

**Features:**
- Monthly salary processing
- Auto-calculate from attendance (LOP deductions, OT additions)
- Salary structure templates
- TDS calculation
- PF / ESI deductions
- Salary slip generation (PDF with ANK branding)
- Bulk salary disbursement file (bank-ready format)
- Form 16 generation at year-end
- Salary history per employee
- Reimbursements module (travel, food, internet)
- Bonus/Incentive entry
- Salary revision history
- Tally / Zoho Books export

### Sub-Module F.5 — Performance Management

**Features:**
- KRA / KPI definition per role
- Quarterly review cycle
- Self-evaluation form (employee fills)
- Manager evaluation form
- 360-degree feedback (peer reviews) — optional toggle
- Goal setting (annual + quarterly)
- 1-on-1 meeting notes
- Performance rating scale (1-5 or custom)
- Appraisal cycle (annual)
- Increment recommendation workflow
- Training need identification
- PIP (Performance Improvement Plan) tracking
- Exit interview module (for departing employees)

### Key Tables
`candidates`, `candidate_followups`, `candidate_interviews`, `candidate_skills`, `employees`, `employee_documents`, `employee_salary_structures`, `attendance`, `leaves`, `leave_balances`, `holidays`, `payroll_runs`, `payslips`, `reimbursements`, `performance_cycles`, `kras`, `evaluations`, `goals`, `one_on_ones`, `exits`

---

## MODULE G: SOPs / Office Manual

### Features
- **Department-wise SOP library:**
  - Sales SOPs (Lead handling, Quote making, Client onboarding etc.)
  - DM SOPs (Platform-wise best practices, posting schedule, escalation)
  - GD SOPs (File naming, version control, brand guidelines, software shortcuts)
  - Dev SOPs (Coding standards, Git workflow, deployment, code review)
  - HR SOPs (Hiring process, onboarding checklist, exit process)
  - Common SOPs (Office rules, leave policy, dress code, communication etiquette, ethics)
- **Version control** — SOP v1, v2, v3 with change-log
- **Approval workflow** — SOP draft → Dept Head review → Admin approval → Published
- **Acknowledgement tracking** — kis employee ne kaun si SOP padhi + signed (digital signature)
- **Update notifications** — SOP badli toh affected employees ko in-app alert
- **Search-friendly knowledge base** — full-text search across all SOPs
- **Onboarding checklist** — new employee ko Day 1 → Day 30 ka structured plan with SOPs to read
- **Quiz / Test module** — training compliance verify karne ke liye (optional)
- **Category & Tags** — har SOP categorize karo for easy discovery
- **Attachment support** — PDF, videos, screenshots embed kar sakte ho

### Key Tables
`sops`, `sop_versions`, `sop_categories`, `sop_acknowledgements`, `sop_quizzes`, `sop_quiz_attempts`, `onboarding_checklists`, `checklist_items`

---

## 5. Tech Stack (Final — Locked)

```
Frontend:    React.js + Tailwind CSS (ANK brand tokens built-in)
             Recharts (dashboards)
             React-Hook-Form (forms)
             React Router

Backend:     Express.js (Node.js) — REST API
             Mongoose ODM for MongoDB

Database:    MongoDB (no SQL, no cache layer)

File Store:  Google Drive (department-wise folders, via Google Drive API)

Real-time:   Socket.io (notifications, live updates)

Auth:        JWT + custom RBAC middleware

Hosting:     AWS EC2 / DigitalOcean Droplet (Node + MongoDB)
             Domain: ams.ankdigitalmedia.com

Backup:      MongoDB Atlas auto-backups (if cloud) OR daily mongodump to Google Drive

Monitoring:  Sentry (error tracking) + UptimeRobot

Note: No Redis. No Laravel. No queue system in Phase 1 — all sync operations.
```

---

## 6. Build Phases (6-Month Sprint Plan)

### Phase 1 — Foundation (Month 1) — 4 weeks
- Week 1: Auth + RBAC + User + Department + Permission engine
- Week 2: Master dashboard skeleton + Notification engine (In-app)
- Week 3: Audit logs + File manager + Settings
- Week 4: Testing + Bug fixes + Phase 1 deploy

### Phase 2 — CRM (Month 2) — 4 weeks
- Week 5: Lead module (capture + pipeline)
- Week 6: Client module + Service catalog
- Week 7: Quote builder + Invoice + Payment
- Week 8: Communication hub + Phase 2 deploy

### Phase 3 — DM + GD (Month 3) — 4 weeks
- Week 9: DM Daily Task module (15 platforms + master tasks)
- Week 10: DM Audit Report module + Report generator
- Week 11: GD Task module + revision workflow
- Week 12: DM ↔ GD integration + Phase 3 deploy

### Phase 4 — Development Module (Month 4) — 2 weeks
- Week 13: Dev project + task + bug tracker
- Week 14: Dashboard + Time tracking + Phase 4 deploy

### Phase 5 — HR (Months 4-5) — 6 weeks
- Week 15: Candidate ATS module
- Week 16: Employee module + Document locker
- Week 17: Attendance + Leave
- Week 18: Payroll engine
- Week 19: Performance management
- Week 20: HR self-service portal + Phase 5 deploy

### Phase 6 — SOPs + Polish (Month 6) — 4 weeks
- Week 21: SOPs module + Knowledge base
- Week 22: Onboarding checklist + Acknowledgement
- Week 23: Reports & analytics polish across all modules
- Week 24: Final testing + Documentation + Launch

---

## 7. Notifications Strategy

**Architecture:** Single notification engine, multiple channels, **toggleable per event-type**.

**Channels (built but on/off):**
| Channel | Phase 1 Status |
|---------|----------------|
| In-app (bell icon + dashboard) | ✅ Active |
| Email | ⚪ Built but off |
| WhatsApp (via ANK's own BSP) | ⚪ Built but off |

**Event Types (samples):**
- New lead assigned to me
- Task assigned to me
- Task overdue
- Lead stage changed
- Leave request submitted (HR + Manager)
- Leave approved/rejected (Employee)
- Payslip generated
- SOP updated (affected users)
- Birthday / Anniversary
- Performance review due
- Project milestone reached
- Invoice payment received
- Mention in comment (@username)

**Admin Control:** Settings → Notifications → har event ka channel toggle.

---

## 8. Reports & Dashboards Matrix

| Role | Dashboard Widgets |
|------|-------------------|
| **Superadmin (Ankur)** | Pipeline value · Revenue MTD vs target · New leads today · Renewals due 30 days · Stale leads · Team performance · Cash collection · Employee count · Attendance % today · Hot candidates in pipeline |
| **Admin** | Same as Superadmin minus financial sensitive data |
| **Sales Head** | Team pipeline · BDE performance · Conversion % · Source-wise leads · Avg response time · Forecast |
| **DM Head** | Active clients · Daily task completion % · Pending audits · Platform-wise performance heatmap · Team workload |
| **GD Head** | Task inbox · Pending revisions · On-time delivery % · Designer workload · Client-wise pending |
| **Dev Head** | Active projects · Overdue tasks · Team utilization · Bug count · Sprint velocity |
| **HR Head** | New candidates · Interviews this week · Offers extended · Joining pipeline · Attendance summary · Leave requests pending · Birthdays this month · Performance reviews due |
| **Team Member** | My tasks today · My pipeline (if applicable) · Notifications · Quick links |

---

## 9. Security & Compliance

- Role-Based Access Control (RBAC) with field-level masking
- 2FA optional (mandatory for Superadmin + Admin recommended)
- Password policy: min 8 chars, mix, force-change every 90 days
- Session timeout (30 min idle)
- IP whitelisting for sensitive modules (Payroll, Financial Reports)
- All passwords bcrypt-hashed
- All sensitive data encrypted at rest (AES-256)
- HTTPS only (SSL mandatory)
- Daily automated backups (encrypted, S3, 30-day retention)
- Audit log immutable (cannot be deleted, even by Superadmin)
- DPDPA (India's Digital Personal Data Protection Act) compliance
- GDPR readiness (for any future foreign clients)
- Activity recording consent for call logs

---

## 10. Investment Estimate (In-House Build)

| Item | Cost |
|------|------|
| Lead Developer (full-time, 6 months) | ₹3-4L |
| Backend Developer (full-time, 6 months) | ₹2.5-3L |
| Frontend Developer (full-time, 6 months) | ₹2.5-3L |
| UI/UX Designer (part-time, 3 months) | ₹75K-1L |
| QA Tester (part-time, 3 months) | ₹50K-75K |
| Server / Infra (1 year) | ₹60K-1L |
| Third-party services (S3, Pusher, etc.) | ₹30K-50K |
| **Total Year 1 Build Cost** | **~₹10-14L** |
| Ongoing maintenance (Year 2+) | ~₹3-4L/year |

**Bonus IP Value:** Since you're building custom, after stabilization you can productize this as **"ANK AMS — SaaS for Indian Digital Agencies"** and create a new revenue stream (aligned with your ecom + own-brand vision).

---

## 11. Pre-Build Checklist (Pehle 30 Din Ka Kaam)

- [ ] Dev team finalize karo (in-house ya new hires)
- [ ] Lead developer ko ye blueprint hand over karo
- [ ] Database schema detail document banwao (next deliverable)
- [ ] UI/UX wireframes banwao (Figma)
- [ ] Domain register karo: ams.ankdigitalmedia.com
- [ ] Server / hosting account setup
- [ ] AWS S3 bucket creation
- [ ] Git repository setup
- [ ] Project management tool decide (apna AMS hi banayega, but interim ke liye)
- [ ] Existing data export shuru karo (current Excel sheets → CSV → migration-ready)
- [ ] Master data document banao: services catalog, departments, designations, salary structures
- [ ] Pilot users identify karo (ek-ek per department)
- [ ] Training schedule plan karo (Phase-wise launch ke baad)

---

## 12. Risks & Mitigation

| Risk | Mitigation |
|------|-----------|
| Scope creep | Lock requirements; new features → "AMS v2" queue |
| Dev team turnover | Document everything, code review, no single-person dependency |
| User adoption resistance | Pilot phase + training + champion users per dept |
| Data migration mess | Clean data first, migrate phase-wise, parallel run for 1 month |
| Performance issues at scale | Build with caching, queues, indexing from Day 1 |
| Security breach | Regular audits, penetration testing before launch |

---

**Document Status:** Final v1 — Ready for development handover
**Next Deliverables (on request):**
1. Detailed Database Schema (all tables + columns + relationships)
2. UI/UX Wireframes (module-wise screens)
3. API Endpoints List (developer-ready)
4. Sprint-wise Task Breakdown (week-by-week, with assignees)

---

*Prepared with care for ANK Digital Media's strategic vision — building tomorrow's agency operations today.*
