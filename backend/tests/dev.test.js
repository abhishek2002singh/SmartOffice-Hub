const request  = require('supertest');
const mongoose = require('mongoose');

process.env.NODE_ENV           = 'test';
process.env.MONGODB_URI        = 'mongodb://localhost:27017/ams_test_dev';
process.env.JWT_SECRET         = 'test_jwt_secret_32_chars_minimum_x';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_32_chars_minx';
process.env.JWT_EXPIRY         = '1h';
process.env.JWT_REFRESH_EXPIRY = '7d';
process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID = '';

const { app }  = require('../src/app');
const connectDB = require('../src/config/db');
const User    = require('../src/models/User');
const Client  = require('../src/models/Client');
const DevProjectHandover = require('../src/models/DevProjectHandover');

const DEV_PERMS = [
  'dev:project:read','dev:project:create','dev:project:update','dev:project:delete',
  'dev:milestone:read','dev:milestone:create','dev:milestone:update','dev:milestone:delete',
  'dev:task:read','dev:task:create','dev:task:update','dev:task:delete',
  'dev:time_log:create',
  'dev:bug:read','dev:bug:create','dev:bug:update','dev:bug:delete',
  'dev:handover:read','dev:handover:accept',
  'dev:report:read',
];

let token;
let clientId;
let projectId;
let milestoneId;
let taskId;
let bugId;
let handoverId;

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) await connectDB();
  await mongoose.connection.dropDatabase();

  const admin = await User.create({
    name: 'Dev Admin', email: 'devadmin@test.com',
    password: 'password123', role: 'SUPERADMIN',
    permissions: DEV_PERMS,
    createdBy: new mongoose.Types.ObjectId(),
  });

  const client = await Client.create({
    name: 'Dev Test Corp', companyName: 'Dev Test Corp', mobile: '9100000001',
    createdBy: admin._id,
  });
  clientId = client._id.toString();

  // Pre-create a handover for handover tests
  const handover = await DevProjectHandover.create({
    clientId:            client._id,
    salesPerson:         admin._id,
    originalRequirement: 'Build a corporate website with CMS',
    status:              'pending_review',
    createdBy:           admin._id,
  });
  handoverId = handover._id.toString();

  const r = await request(app).post('/api/v1/auth/login').send({ email: 'devadmin@test.com', password: 'password123' });
  token = r.body.data.accessToken;
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

// ── Projects ──────────────────────────────────────────────────────────────────

describe('Dev — Projects', () => {
  it('creates a project', async () => {
    const res = await request(app)
      .post('/api/v1/dev/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({ clientId, name: 'ANK Corp Website', type: 'website', priority: 'high' });
    expect(res.status).toBe(201);
    expect(res.body.data.project.name).toBe('ANK Corp Website');
    expect(res.body.data.project.status).toBe('planning');
    projectId = res.body.data.project._id;
  });

  it('creates an ecommerce project with platform', async () => {
    const res = await request(app)
      .post('/api/v1/dev/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({ clientId, name: 'Store Project', type: 'ecommerce', ecommercePlatform: 'shopify' });
    expect(res.status).toBe(201);
    expect(res.body.data.project.ecommercePlatform).toBe('shopify');
  });

  it('returns 400 on missing required fields', async () => {
    const res = await request(app)
      .post('/api/v1/dev/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'No Client' });
    expect(res.status).toBe(400);
  });

  it('lists projects', async () => {
    const res = await request(app).get('/api/v1/dev/projects').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.projects.length).toBeGreaterThan(0);
  });

  it('gets project detail', async () => {
    const res = await request(app).get(`/api/v1/dev/projects/${projectId}`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.project._id).toBe(projectId);
    expect(res.body.data.milestones).toBeDefined();
    expect(res.body.data.taskCounts).toBeDefined();
  });

  it('updates project status', async () => {
    const res = await request(app)
      .patch(`/api/v1/dev/projects/${projectId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'active', techStack: ['React', 'Node.js', 'MongoDB'] });
    expect(res.status).toBe(200);
    expect(res.body.data.project.status).toBe('active');
    expect(res.body.data.project.techStack).toContain('React');
  });

  it('returns 404 for unknown project', async () => {
    const res = await request(app)
      .get(`/api/v1/dev/projects/${new mongoose.Types.ObjectId()}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it('auto-activates AMC when project completed with amcEnabled', async () => {
    const cr = await request(app)
      .post('/api/v1/dev/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({ clientId, name: 'AMC Test Project', type: 'website', amcEnabled: true, amcDurationMonths: 6 });
    const pid = cr.body.data.project._id;
    const res = await request(app)
      .patch(`/api/v1/dev/projects/${pid}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'completed' });
    expect(res.status).toBe(200);
    expect(res.body.data.project.amcStartDate).toBeDefined();
    expect(res.body.data.project.amcEndDate).toBeDefined();
  });
});

// ── Milestones ────────────────────────────────────────────────────────────────

describe('Dev — Milestones', () => {
  it('creates a milestone', async () => {
    const res = await request(app)
      .post(`/api/v1/dev/projects/${projectId}/milestones`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Design Sign-off', dueDate: '2026-08-01', deliverables: ['Wireframes', 'Mockups'] });
    expect(res.status).toBe(201);
    expect(res.body.data.milestone.title).toBe('Design Sign-off');
    expect(res.body.data.milestone.sequence).toBe(1);
    milestoneId = res.body.data.milestone._id;
  });

  it('auto-sequences second milestone', async () => {
    const res = await request(app)
      .post(`/api/v1/dev/projects/${projectId}/milestones`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Development Complete', dueDate: '2026-10-01' });
    expect(res.status).toBe(201);
    expect(res.body.data.milestone.sequence).toBe(2);
  });

  it('requires title and dueDate', async () => {
    const res = await request(app)
      .post(`/api/v1/dev/projects/${projectId}/milestones`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'No date' });
    expect(res.status).toBe(400);
  });

  it('lists milestones', async () => {
    const res = await request(app).get(`/api/v1/dev/projects/${projectId}/milestones`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.milestones.length).toBeGreaterThanOrEqual(2);
  });

  it('updates milestone status to completed', async () => {
    const res = await request(app)
      .patch(`/api/v1/dev/projects/${projectId}/milestones/${milestoneId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'completed' });
    expect(res.status).toBe(200);
    expect(res.body.data.milestone.status).toBe('completed');
    expect(res.body.data.milestone.completedDate).toBeDefined();
  });

  it('soft-deletes a milestone', async () => {
    const cr = await request(app)
      .post(`/api/v1/dev/projects/${projectId}/milestones`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Temp Milestone', dueDate: '2026-12-01' });
    const mid = cr.body.data.milestone._id;
    const res = await request(app)
      .delete(`/api/v1/dev/projects/${projectId}/milestones/${mid}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });
});

// ── Tasks (Kanban) ────────────────────────────────────────────────────────────

describe('Dev — Tasks', () => {
  it('creates a task', async () => {
    const res = await request(app)
      .post(`/api/v1/dev/projects/${projectId}/tasks`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Set up project repo', type: 'chore', priority: 'high' });
    expect(res.status).toBe(201);
    expect(res.body.data.task.title).toBe('Set up project repo');
    expect(res.body.data.task.status).toBe('backlog');
    taskId = res.body.data.task._id;
  });

  it('requires title', async () => {
    const res = await request(app)
      .post(`/api/v1/dev/projects/${projectId}/tasks`)
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'feature' });
    expect(res.status).toBe(400);
  });

  it('lists tasks', async () => {
    const res = await request(app).get(`/api/v1/dev/projects/${projectId}/tasks`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.tasks.length).toBeGreaterThan(0);
  });

  it('updates task status via Kanban', async () => {
    const res = await request(app)
      .patch(`/api/v1/dev/projects/${projectId}/tasks/${taskId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'in_progress' });
    expect(res.status).toBe(200);
    expect(res.body.data.task.status).toBe('in_progress');
  });

  it('bulk updates tasks', async () => {
    const res = await request(app)
      .patch(`/api/v1/dev/projects/${projectId}/tasks/bulk`)
      .set('Authorization', `Bearer ${token}`)
      .send({ updates: [{ taskId, status: 'todo', kanbanOrder: 1 }] });
    expect(res.status).toBe(200);
  });

  it('marks task done with completedDate', async () => {
    const res = await request(app)
      .patch(`/api/v1/dev/projects/${projectId}/tasks/${taskId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'done' });
    expect(res.status).toBe(200);
    expect(res.body.data.task.status).toBe('done');
    expect(res.body.data.task.completedDate).toBeDefined();
  });
});

// ── Task Comments ─────────────────────────────────────────────────────────────

describe('Dev — Task Comments', () => {
  it('adds a comment', async () => {
    const res = await request(app)
      .post(`/api/v1/dev/projects/${projectId}/tasks/${taskId}/comments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ message: 'Repo is ready on GitHub' });
    expect(res.status).toBe(201);
    expect(res.body.data.comment.message).toBe('Repo is ready on GitHub');
  });

  it('rejects empty message', async () => {
    const res = await request(app)
      .post(`/api/v1/dev/projects/${projectId}/tasks/${taskId}/comments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ message: '' });
    expect(res.status).toBe(400);
  });

  it('lists comments', async () => {
    const res = await request(app)
      .get(`/api/v1/dev/projects/${projectId}/tasks/${taskId}/comments`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.comments.length).toBeGreaterThan(0);
  });
});

// ── Time Logs ─────────────────────────────────────────────────────────────────

describe('Dev — Time Logs', () => {
  it('logs time on a task', async () => {
    const res = await request(app)
      .post(`/api/v1/dev/projects/${projectId}/tasks/${taskId}/time-logs`)
      .set('Authorization', `Bearer ${token}`)
      .send({ minutes: 120, notes: 'Initial setup' });
    expect(res.status).toBe(201);
    expect(res.body.data.log.minutes).toBe(120);
  });

  it('rejects minutes < 1', async () => {
    const res = await request(app)
      .post(`/api/v1/dev/projects/${projectId}/tasks/${taskId}/time-logs`)
      .set('Authorization', `Bearer ${token}`)
      .send({ minutes: 0 });
    expect(res.status).toBe(400);
  });
});

// ── Bugs ──────────────────────────────────────────────────────────────────────

describe('Dev — Bugs', () => {
  it('creates a blocker bug', async () => {
    const res = await request(app)
      .post(`/api/v1/dev/projects/${projectId}/bugs`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Login page crashes on mobile',
        severity: 'blocker',
        foundIn: 'staging',
        description: 'App throws white screen on iOS Safari',
      });
    expect(res.status).toBe(201);
    expect(res.body.data.bug.severity).toBe('blocker');
    expect(res.body.data.bug.status).toBe('open');
    bugId = res.body.data.bug._id;
  });

  it('requires title and severity', async () => {
    const res = await request(app)
      .post(`/api/v1/dev/projects/${projectId}/bugs`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Bug without severity' });
    expect(res.status).toBe(400);
  });

  it('lists bugs', async () => {
    const res = await request(app).get(`/api/v1/dev/projects/${projectId}/bugs`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.bugs.length).toBeGreaterThan(0);
  });

  it('filters bugs by severity', async () => {
    const res = await request(app)
      .get(`/api/v1/dev/projects/${projectId}/bugs?severity=blocker`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    res.body.data.bugs.forEach(b => expect(b.severity).toBe('blocker'));
  });

  it('updates bug status to fixed', async () => {
    const res = await request(app)
      .patch(`/api/v1/dev/projects/${projectId}/bugs/${bugId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'fixed' });
    expect(res.status).toBe(200);
    expect(res.body.data.bug.status).toBe('fixed');
    expect(res.body.data.bug.resolvedAt).toBeDefined();
  });
});

// ── Handovers ─────────────────────────────────────────────────────────────────

describe('Dev — Handovers', () => {
  it('lists handovers', async () => {
    const res = await request(app).get('/api/v1/dev/handovers').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.handovers.length).toBeGreaterThan(0);
  });

  it('gets a single handover', async () => {
    const res = await request(app).get(`/api/v1/dev/handovers/${handoverId}`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.handover._id).toBe(handoverId);
  });

  it('requests clarification', async () => {
    const res = await request(app)
      .patch(`/api/v1/dev/handovers/${handoverId}/clarify`)
      .set('Authorization', `Bearer ${token}`)
      .send({ clarificationNotes: 'Please confirm budget and timeline' });
    expect(res.status).toBe(200);
    expect(res.body.data.handover.status).toBe('clarification_needed');
  });

  it('requires clarificationNotes', async () => {
    // Create a fresh pending handover
    const h2 = await (require('../src/models/DevProjectHandover')).create({
      clientId: new mongoose.Types.ObjectId(clientId),
      status: 'pending_review',
      createdBy: new mongoose.Types.ObjectId(),
    });
    const res = await request(app)
      .patch(`/api/v1/dev/handovers/${h2._id}/clarify`)
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it('accepts handover and creates project', async () => {
    // Create a fresh pending handover
    const h3 = await (require('../src/models/DevProjectHandover')).create({
      clientId: new mongoose.Types.ObjectId(clientId),
      originalRequirement: 'E-commerce site for retail brand',
      status: 'pending_review',
      createdBy: new mongoose.Types.ObjectId(),
    });
    const res = await request(app)
      .patch(`/api/v1/dev/handovers/${h3._id}/accept`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Retail Brand Store', type: 'ecommerce', ecommercePlatform: 'woocommerce' });
    expect(res.status).toBe(200);
    expect(res.body.data.handover.status).toBe('accepted');
    expect(res.body.data.project.name).toBe('Retail Brand Store');
    expect(res.body.data.project.type).toBe('ecommerce');
  });
});

// ── Dashboards ────────────────────────────────────────────────────────────────

describe('Dev — Dashboards', () => {
  it('returns developer dashboard', async () => {
    const res = await request(app).get('/api/v1/dev/dashboard/developer').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.taskCounts).toBeDefined();
    expect(res.body.data.overdueTasks).toBeDefined();
    expect(res.body.data.myBugs).toBeDefined();
  });

  it('returns head dashboard', async () => {
    const res = await request(app).get('/api/v1/dev/dashboard/head').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.projectCounts).toBeDefined();
    expect(res.body.data.teamWorkload).toBeDefined();
    expect(res.body.data.bugCounts).toBeDefined();
  });

  it('returns dev reports', async () => {
    const res = await request(app).get('/api/v1/dev/reports').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.tasksByStatus).toBeDefined();
    expect(res.body.data.bugsBySeverity).toBeDefined();
  });
});

// ── Soft Delete ───────────────────────────────────────────────────────────────

describe('Dev — Soft Delete', () => {
  it('soft-deletes a project', async () => {
    const cr = await request(app)
      .post('/api/v1/dev/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({ clientId, name: 'Delete Me', type: 'custom' });
    const pid = cr.body.data.project._id;

    const res = await request(app).delete(`/api/v1/dev/projects/${pid}`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);

    const get = await request(app).get(`/api/v1/dev/projects/${pid}`).set('Authorization', `Bearer ${token}`);
    expect(get.status).toBe(404);
  });
});
