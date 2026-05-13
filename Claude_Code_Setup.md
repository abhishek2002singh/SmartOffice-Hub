# Claude Code — Initial Bootstrap Prompt

## Setup Steps (Ek Baar Karo)

### Step 1: Project folder banao
```bash
mkdir ams && cd ams
git init
```

### Step 2: CLAUDE.md project root mein rakho
`CLAUDE.md` file (jo maine alag se diya hai) is folder mein paste karo.

### Step 3: Claude Code install + run
```bash
# Install (sirf pehli baar)
npm install -g @anthropic-ai/claude-code

# Project folder mein chalao
cd ams
claude
```

### Step 4: Pehla prompt paste karo

Neeche wala prompt copy karke Claude Code terminal mein paste karo:

---

## 🚀 INITIAL PROMPT (Copy this & paste in Claude Code)

```
Hi Claude Code. Read CLAUDE.md fully — that's the full project context for ANK Management System (AMS).

Quick summary:
- Building a web-only internal ERP for ANK Digital Media (Delhi-based digital agency)
- Tech: Node + Express + MongoDB + React + Tailwind + JWT
- 7 modules total, building in phases
- Currently: Phase 1 Week 1 — Foundation (Auth, RBAC, Users, Departments, Audit logs)

Before you start coding, confirm with me:
1. Tech stack — Express + MongoDB + React. Right?
2. Folder structure as proposed in CLAUDE.md. OK?
3. Do I have MongoDB running locally? (If not, guide me to install via Docker)
4. Should we use MongoDB Atlas (cloud) or local for now?

Once confirmed, execute the "First Task" section from CLAUDE.md:
- Initialize backend folder with all dependencies
- Initialize frontend folder with Vite + React + Tailwind
- Create base Express app.js with MongoDB connection
- Build User, Role, Permission, Department Mongoose models (as per schema conventions in CLAUDE.md)
- Build auth endpoints: POST /api/v1/auth/login, /refresh, /logout, GET /me
- Build RBAC middleware: requirePermission('module:action')
- Build audit log middleware
- Create a seeder that creates: 1 Superadmin user (email: ankur@ankdigitalmedia.com, password: temp_changeme_123)
- Test the full flow with curl: login → get JWT → hit protected route

After this is working, show me the output and we'll plan Week 1 next steps.

Important rules:
- Hinglish chat, English code
- Ask before assuming any spec
- Soft delete only (deletedAt field, never hard delete)
- Every write operation logs to audit_logs
- No Redis, no queue, no cache — keep it simple
- Commit after each working feature with format: [module] action: description

Let's start. Confirm the 4 questions above first.
```

---

## Iske Baad Ka Workflow

### Daily flow:
```bash
cd ams
claude
> "Continue Phase 1 Week 1. Last session mein ye complete hua tha: [...]. Aaj ye banana hai: [...]"
```

### Weekly milestones (Phase 1):
- **Week 1:** Backend foundation + Auth + RBAC + Audit ✅
- **Week 2:** Frontend foundation + Login UI + User/Dept CRUD ✅
- **Week 3:** Permission cascade UI + Notification engine ✅
- **Week 4:** Audit viewer + Profile + Settings + Deploy ✅

### Phase 2+ prompts (later):
Jab Phase 1 complete ho, mujhe batao — main Phase 2 (CRM) ka prompt banake dunga.

---

## Pre-requisites Checklist

Pehle ye install kar lo apne computer pe:

- [ ] **Node.js** v20+ → https://nodejs.org
- [ ] **MongoDB** (local ya MongoDB Atlas free tier)
  - Local: Docker se chalao — `docker run -d -p 27017:27017 --name mongo mongo:7`
  - Atlas: https://www.mongodb.com/cloud/atlas (free 512MB cluster)
- [ ] **Git** → https://git-scm.com
- [ ] **VS Code** (Claude Code yahan bhi chal sakta hai extension ke through)
- [ ] **Postman** ya **Thunder Client** (API testing ke liye)
- [ ] **Claude Code account** → https://claude.com/claude-code

### Google Drive API setup (Week 1 ke baad zaroori hoga):
1. Go to https://console.cloud.google.com
2. Create new project: "ANK AMS"
3. Enable Google Drive API
4. Create OAuth 2.0 credentials
5. Get refresh token via OAuth playground
6. Create a root folder in your Google Drive: "ANK AMS Files"
7. Share with service account if using service account approach
8. Save credentials to backend `.env`

(Claude Code Week 3-4 mein iska integration guide karega.)

---

## Pro Tips for Working with Claude Code

1. **Specific raho** — "Build login" se behtar hai "Build POST /api/v1/auth/login that accepts email+password, returns JWT (24hr) + refresh token (7d), with bcrypt password compare"

2. **One feature at a time** — Claude Code parallel mein 10 cheezein dene se confused hota hai. Sequential rakho.

3. **Test karwao** — Har feature ke baad bolo "test this with curl/Postman and show me the output"

4. **Git discipline** — "Commit this with proper message" har feature ke baad

5. **CLAUDE.md update karwao** — Jab phase complete ho, status update karwao file mein

6. **Errors share karo** — Error aaye toh poora error message paste karo, woh debug kar dega

7. **Refactor on demand** — Code gandi lage toh bolo "refactor this for clarity"

8. **Plan first, code later** — Bada feature start karne se pehle bolo "plan karo, code mat likho. Plan dikhao."

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| MongoDB connect error | Check if MongoDB running: `docker ps` or check Atlas URI |
| Port 5000 in use | Change PORT in .env to 5001 |
| JWT secret missing | Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| Tailwind not working | Ensure `npx tailwindcss init -p` chal gaya hai aur `index.css` mein directives hain |
| CORS error | Check `cors()` middleware in app.js with correct origin |

---

## Useful Commands Reference

```bash
# Backend
cd backend
npm run dev           # Start with nodemon
npm test              # Run tests
npm run lint          # ESLint check

# Frontend
cd frontend
npm run dev           # Start Vite dev server
npm run build         # Production build

# MongoDB (local Docker)
docker start mongo    # Start MongoDB container
docker exec -it mongo mongosh   # Open mongo shell

# Git
git status
git add .
git commit -m "[module] feat: description"
git push origin main
```

---

## Important Files

| File | Purpose |
|------|---------|
| `CLAUDE.md` | Standing project context for Claude Code (auto-read) |
| `AMS_Full_Blueprint.md` | Full module specs (reference) |
| `README.md` | Public project readme |
| `backend/.env` | Backend secrets (never commit!) |
| `frontend/.env` | Frontend env vars |

---

*Ankur ji, ye script ready hai. Pehle Pre-requisites install karo, phir Step 1-4 follow karo. Pehla prompt paste karte hi Claude Code aapse 4 questions poochega, jawab do, aur build shuru ho jayega.*

*Stuck ho kahin bhi → mujhe wapas bata dena, main next prompt ya troubleshooting help kar dunga.*
