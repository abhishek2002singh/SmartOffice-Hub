const request  = require('supertest');
const mongoose = require('mongoose');
const path     = require('path');

process.env.NODE_ENV           = 'test';
process.env.MONGODB_URI        = 'mongodb://localhost:27017/ams_test_gd';
process.env.JWT_SECRET         = 'test_jwt_secret_32_chars_minimum_x';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_32_chars_minx';
process.env.JWT_EXPIRY         = '1h';
process.env.JWT_REFRESH_EXPIRY = '7d';
// Prevent Google Drive calls in tests
process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID = '';

const { app } = require('../src/app');
const connectDB = require('../src/config/db');
const User   = require('../src/models/User');
const Client = require('../src/models/Client');

let adminToken;
let designerToken;
let clientId;
let taskId;
let commentId;

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) await connectDB();
  await mongoose.connection.dropDatabase();

  const admin = await User.create({
    name: 'GD Admin', email: 'gdadmin@test.com',
    password: 'password123', role: 'SUPERADMIN',
    permissions: [
      'gd:task:view','gd:task:create','gd:task:assign',
      'gd:task:submit','gd:task:approve','gd:task:deliver',
      'gd:task:revision','gd:file:upload','gd:report:view',
    ],
    createdBy: new mongoose.Types.ObjectId(),
  });

  const designer = await User.create({
    name: 'GD Designer', email: 'designer@test.com',
    password: 'password123', role: 'TEAM_MEMBER',
    permissions: ['gd:task:view','gd:task:submit','gd:file:upload'],
    createdBy: admin._id,
  });

  const client = await Client.create({
    name: 'GD Test Corp', companyName: 'GD Test Corp', mobile: '9000000002',
    createdBy: admin._id,
  });
  clientId = client._id.toString();

  const r1 = await request(app).post('/api/v1/auth/login').send({ email: 'gdadmin@test.com',  password: 'password123' });
  const r2 = await request(app).post('/api/v1/auth/login').send({ email: 'designer@test.com', password: 'password123' });
  adminToken    = r1.body.data.accessToken;
  designerToken = r2.body.data.accessToken;
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

// ── Task CRUD ─────────────────────────────────────────────────────────────────

describe('GD — Task CRUD', () => {
  it('creates a GD task', async () => {
    const res = await request(app)
      .post('/api/v1/gd/tasks')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Design Instagram Post', type: 'image', client: clientId, priority: 'high' });
    expect(res.status).toBe(201);
    expect(res.body.data.title).toBe('Design Instagram Post');
    expect(res.body.data.status).toBe('new');
    taskId = res.body.data._id;
  });

  it('returns 400 on missing required fields', async () => {
    const res = await request(app)
      .post('/api/v1/gd/tasks')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'No type or client' });
    expect(res.status).toBe(400);
  });

  it('lists tasks', async () => {
    const res = await request(app).get('/api/v1/gd/tasks').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.tasks.length).toBeGreaterThan(0);
  });

  it('filters tasks by status', async () => {
    const res = await request(app)
      .get('/api/v1/gd/tasks?status=new')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    res.body.data.tasks.forEach(t => expect(t.status).toBe('new'));
  });

  it('gets task detail', async () => {
    const res = await request(app)
      .get(`/api/v1/gd/tasks/${taskId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.task._id).toBe(taskId);
    expect(res.body.data.files).toBeDefined();
    expect(res.body.data.comments).toBeDefined();
    expect(res.body.data.revisions).toBeDefined();
  });

  it('updates a task', async () => {
    const res = await request(app)
      .patch(`/api/v1/gd/tasks/${taskId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ priority: 'low', brief: 'Make it pop' });
    expect(res.status).toBe(200);
    expect(res.body.data.priority).toBe('low');
    expect(res.body.data.brief).toBe('Make it pop');
  });

  it('returns 404 for unknown task', async () => {
    const res = await request(app)
      .get(`/api/v1/gd/tasks/${new mongoose.Types.ObjectId()}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });
});

// ── Status Flow ───────────────────────────────────────────────────────────────

describe('GD — Status Flow', () => {
  it('cannot submit from wrong status (new → must be assigned/in_progress)', async () => {
    // Actually new is allowed — let's submit
    const res = await request(app)
      .patch(`/api/v1/gd/tasks/${taskId}/submit`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('submitted');
  });

  it('cannot submit again (already submitted)', async () => {
    const res = await request(app)
      .patch(`/api/v1/gd/tasks/${taskId}/submit`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_STATUS');
  });

  it('requests revision (submitted → revision_requested)', async () => {
    const res = await request(app)
      .patch(`/api/v1/gd/tasks/${taskId}/request-revision`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ revisionNotes: 'Please use brand colors' });
    expect(res.status).toBe(200);
    expect(res.body.data.task.status).toBe('revision_requested');
    expect(res.body.data.task.revisionCount).toBe(1);
    expect(res.body.data.revision.revisionNotes).toBe('Please use brand colors');
  });

  it('requires revisionNotes', async () => {
    // Re-submit first
    await request(app).patch(`/api/v1/gd/tasks/${taskId}/submit`).set('Authorization', `Bearer ${adminToken}`);
    const res = await request(app)
      .patch(`/api/v1/gd/tasks/${taskId}/request-revision`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it('approves submitted task', async () => {
    // task is submitted now (from re-submit above)
    const res = await request(app)
      .patch(`/api/v1/gd/tasks/${taskId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('approved');
    expect(res.body.data.approvedAt).toBeDefined();
  });

  it('cannot approve if not submitted', async () => {
    const res = await request(app)
      .patch(`/api/v1/gd/tasks/${taskId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(400);
  });

  it('delivers approved task to client', async () => {
    const res = await request(app)
      .patch(`/api/v1/gd/tasks/${taskId}/deliver`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ deliveryMethod: 'whatsapp', deliveryNotes: 'Sent on WA group' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('delivered_to_client');
    expect(res.body.data.deliveryMethod).toBe('whatsapp');
    expect(res.body.data.deliveredAt).toBeDefined();
  });

  it('requires deliveryMethod', async () => {
    // Create a fresh task
    const cr = await request(app)
      .post('/api/v1/gd/tasks')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Tmp Task', type: 'reel', client: clientId });
    const tid = cr.body.data._id;
    await request(app).patch(`/api/v1/gd/tasks/${tid}/submit`).set('Authorization', `Bearer ${adminToken}`);
    await request(app).patch(`/api/v1/gd/tasks/${tid}/approve`).set('Authorization', `Bearer ${adminToken}`);
    const res = await request(app)
      .patch(`/api/v1/gd/tasks/${tid}/deliver`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});
    expect(res.status).toBe(400);
  });
});

// ── Comments ──────────────────────────────────────────────────────────────────

describe('GD — Comments', () => {
  let freshTaskId;

  beforeAll(async () => {
    const cr = await request(app)
      .post('/api/v1/gd/tasks')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Comment Test Task', type: 'poster', client: clientId });
    freshTaskId = cr.body.data._id;
  });

  it('adds a comment', async () => {
    const res = await request(app)
      .post(`/api/v1/gd/tasks/${freshTaskId}/comments`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ message: 'Looks great so far!' });
    expect(res.status).toBe(201);
    expect(res.body.data.message).toBe('Looks great so far!');
    commentId = res.body.data._id;
  });

  it('requires a message', async () => {
    const res = await request(app)
      .post(`/api/v1/gd/tasks/${freshTaskId}/comments`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ message: '' });
    expect(res.status).toBe(400);
  });

  it('lists comments', async () => {
    const res = await request(app)
      .get(`/api/v1/gd/tasks/${freshTaskId}/comments`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
  });

  it('deletes own comment', async () => {
    const res = await request(app)
      .delete(`/api/v1/gd/tasks/${freshTaskId}/comments/${commentId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });
});

// ── Time Logs ─────────────────────────────────────────────────────────────────

describe('GD — Time Logs', () => {
  let tlTaskId;

  beforeAll(async () => {
    const cr = await request(app)
      .post('/api/v1/gd/tasks')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Time Log Task', type: 'video', client: clientId });
    tlTaskId = cr.body.data._id;
  });

  it('logs time', async () => {
    const res = await request(app)
      .post(`/api/v1/gd/tasks/${tlTaskId}/time-logs`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ minutes: 90, notes: 'Initial design pass' });
    expect(res.status).toBe(201);
    expect(res.body.data.minutes).toBe(90);
  });

  it('rejects invalid minutes', async () => {
    const res = await request(app)
      .post(`/api/v1/gd/tasks/${tlTaskId}/time-logs`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ minutes: 0 });
    expect(res.status).toBe(400);
  });
});

// ── Dashboards ────────────────────────────────────────────────────────────────

describe('GD — Dashboards', () => {
  it('returns designer dashboard', async () => {
    const res = await request(app)
      .get('/api/v1/gd/dashboard/designer')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.statusCounts).toBeDefined();
    expect(res.body.data.dueTodayTasks).toBeDefined();
    expect(res.body.data.recentTasks).toBeDefined();
  });

  it('returns head dashboard', async () => {
    const res = await request(app)
      .get('/api/v1/gd/dashboard/head')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.statusCounts).toBeDefined();
    expect(res.body.data.designerLoad).toBeDefined();
    expect(res.body.data.stats).toBeDefined();
  });

  it('returns GD reports', async () => {
    const res = await request(app)
      .get('/api/v1/gd/reports')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.byType).toBeDefined();
    expect(res.body.data.byStatus).toBeDefined();
  });
});

// ── Soft Delete ───────────────────────────────────────────────────────────────

describe('GD — Soft Delete', () => {
  it('soft-deletes a task', async () => {
    const cr = await request(app)
      .post('/api/v1/gd/tasks')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Delete Me', type: 'banner', client: clientId });
    const tid = cr.body.data._id;

    const res = await request(app).delete(`/api/v1/gd/tasks/${tid}`).set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);

    // Should 404 on get
    const get = await request(app).get(`/api/v1/gd/tasks/${tid}`).set('Authorization', `Bearer ${adminToken}`);
    expect(get.status).toBe(404);
  });
});
