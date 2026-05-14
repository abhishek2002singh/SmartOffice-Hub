const request  = require('supertest');
const mongoose = require('mongoose');

process.env.NODE_ENV           = 'test';
process.env.MONGODB_URI        = 'mongodb://localhost:27017/ams_test_dm';
process.env.JWT_SECRET         = 'test_jwt_secret_32_chars_minimum_x';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_32_chars_minx';
process.env.JWT_EXPIRY         = '1h';
process.env.JWT_REFRESH_EXPIRY = '7d';

const { app } = require('../src/app');
const connectDB = require('../src/config/db');
const User   = require('../src/models/User');
const Client = require('../src/models/Client');

let token;
let platformId;
let taskId;
let clientId;
let mappingId;
let reportId;

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) await connectDB();
  await mongoose.connection.dropDatabase();

  const admin = await User.create({
    name: 'DM Admin', email: 'dmadmin@test.com',
    password: 'password123', role: 'SUPERADMIN',
    permissions: [
      'dm:platform:view','dm:platform:manage',
      'dm:client_platform:view','dm:client_platform:manage',
      'dm:daily_log:view','dm:daily_log:create',
      'dm:custom_field:manage','dm:report:view','dm:report:generate',
    ],
    createdBy: new mongoose.Types.ObjectId(),
  });

  const client = await Client.create({
    name: 'DM Test Corp', companyName: 'DM Test Corp', mobile: '9000000001',
    createdBy: admin._id,
  });
  clientId = client._id.toString();

  const r = await request(app).post('/api/v1/auth/login').send({ email: 'dmadmin@test.com', password: 'password123' });
  token = r.body.data.accessToken;
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

// ── Platforms ─────────────────────────────────────────────────────────────────

describe('DM — Platforms', () => {
  it('creates a platform', async () => {
    const res = await request(app)
      .post('/api/v1/dm/platforms')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Facebook', code: 'FB', description: 'Facebook platform' });
    expect(res.status).toBe(201);
    expect(res.body.data.platform.name).toBe('Facebook');
    platformId = res.body.data.platform._id;
  });

  it('lists platforms', async () => {
    const res = await request(app).get('/api/v1/dm/platforms').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.platforms.length).toBeGreaterThan(0);
  });

  it('updates a platform', async () => {
    const res = await request(app)
      .patch(`/api/v1/dm/platforms/${platformId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ description: 'Updated description' });
    expect(res.status).toBe(200);
  });

  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/v1/dm/platforms');
    expect(res.status).toBe(401);
  });
});

// ── Daily Tasks ───────────────────────────────────────────────────────────────

describe('DM — Platform Tasks', () => {
  it('creates a daily task', async () => {
    const res = await request(app)
      .post(`/api/v1/dm/platforms/${platformId}/tasks`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Post daily update', hasCount: false });
    expect(res.status).toBe(201);
    expect(res.body.data.task.title).toBe('Post daily update');
    taskId = res.body.data.task._id;
  });

  it('creates a hasCount task', async () => {
    const res = await request(app)
      .post(`/api/v1/dm/platforms/${platformId}/tasks`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Comment replies (numbers)', hasCount: true });
    expect(res.status).toBe(201);
    expect(res.body.data.task.hasCount).toBe(true);
  });

  it('lists tasks for platform', async () => {
    const res = await request(app)
      .get(`/api/v1/dm/platforms/${platformId}/tasks`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.tasks.length).toBeGreaterThanOrEqual(2);
  });

  it('updates a task', async () => {
    const res = await request(app)
      .patch(`/api/v1/dm/platforms/${platformId}/tasks/${taskId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Updated task title' });
    expect(res.status).toBe(200);
    expect(res.body.data.task.title).toBe('Updated task title');
  });
});

// ── Custom Fields ─────────────────────────────────────────────────────────────

describe('DM — Custom Fields', () => {
  it('creates a custom field', async () => {
    const res = await request(app)
      .post(`/api/v1/dm/platforms/${platformId}/custom-fields`)
      .set('Authorization', `Bearer ${token}`)
      .send({ label: 'Campaign Name', fieldType: 'text', isRequired: false });
    expect(res.status).toBe(201);
    expect(res.body.data.field.label).toBe('Campaign Name');
  });

  it('creates a dropdown custom field', async () => {
    const res = await request(app)
      .post(`/api/v1/dm/platforms/${platformId}/custom-fields`)
      .set('Authorization', `Bearer ${token}`)
      .send({ label: 'Status', fieldType: 'dropdown', options: ['Active', 'Paused', 'Ended'] });
    expect(res.status).toBe(201);
    expect(res.body.data.field.options).toHaveLength(3);
  });

  it('lists custom fields', async () => {
    const res = await request(app)
      .get(`/api/v1/dm/platforms/${platformId}/custom-fields`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.fields.length).toBeGreaterThanOrEqual(2);
  });
});

// ── Client Platform Mapping ───────────────────────────────────────────────────

describe('DM — Client Platform Mapping', () => {
  it('adds a platform to a client', async () => {
    const res = await request(app)
      .post(`/api/v1/dm/clients/${clientId}/platforms`)
      .set('Authorization', `Bearer ${token}`)
      .send({ platformId, assignedTo: [] });
    expect(res.status).toBe(201);
    expect(res.body.data.mapping.client).toBe(clientId);
    mappingId = res.body.data.mapping._id;
  });

  it('rejects duplicate platform mapping', async () => {
    const res = await request(app)
      .post(`/api/v1/dm/clients/${clientId}/platforms`)
      .set('Authorization', `Bearer ${token}`)
      .send({ platformId, assignedTo: [] });
    expect(res.status).toBe(409);
  });

  it('lists client platforms', async () => {
    const res = await request(app)
      .get(`/api/v1/dm/clients/${clientId}/platforms`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.mappings.length).toBe(1);
  });
});

// ── Daily Logs ────────────────────────────────────────────────────────────────

describe('DM — Daily Logs', () => {
  const date = new Date().toISOString().slice(0, 10);

  it('logs a task as completed', async () => {
    const res = await request(app)
      .post('/api/v1/dm/daily-logs')
      .set('Authorization', `Bearer ${token}`)
      .send({ clientId, platformId, taskId, date, isCompleted: true });
    expect(res.status).toBe(200);
    expect(res.body.data.log.isCompleted).toBe(true);
  });

  it('upserts on second log (idempotent)', async () => {
    const res = await request(app)
      .post('/api/v1/dm/daily-logs')
      .set('Authorization', `Bearer ${token}`)
      .send({ clientId, platformId, taskId, date, isCompleted: false });
    expect(res.status).toBe(200);
    expect(res.body.data.log.isCompleted).toBe(false);
  });

  it('logs a task with count', async () => {
    const res = await request(app)
      .post('/api/v1/dm/daily-logs')
      .set('Authorization', `Bearer ${token}`)
      .send({ clientId, platformId, taskId, date, isCompleted: true, count: 42 });
    expect(res.status).toBe(200);
    expect(res.body.data.log.count).toBe(42);
  });

  it('returns daily dashboard', async () => {
    const res = await request(app)
      .get(`/api/v1/dm/daily-dashboard?date=${date}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.dashboard).toBeDefined();
  });

  it('returns head dashboard', async () => {
    const res = await request(app)
      .get(`/api/v1/dm/head-dashboard?date=${date}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.rows).toBeDefined();
  });
});

// ── DM Audit Reports ──────────────────────────────────────────────────────────

describe('DM — Audit Reports', () => {
  let metricId;

  it('creates an audit metric', async () => {
    const res = await request(app)
      .post(`/api/v1/dm/platforms/${platformId}/audit-metrics`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Total Followers', valueType: 'number' });
    expect(res.status).toBe(201);
    metricId = res.body.data.metric._id;
  });

  it('generates an audit report', async () => {
    const res = await request(app)
      .post('/api/v1/dm/audit-reports')
      .set('Authorization', `Bearer ${token}`)
      .send({ clientId, platformId, periodDays: 30, startDate: new Date().toISOString() });
    expect(res.status).toBe(201);
    expect(res.body.data.report.periodDays).toBe(30);
    reportId = res.body.data.report._id;
  });

  it('lists audit reports', async () => {
    const res = await request(app)
      .get('/api/v1/dm/audit-reports')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.reports.length).toBeGreaterThan(0);
  });

  it('gets a single report', async () => {
    const res = await request(app)
      .get(`/api/v1/dm/audit-reports/${reportId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.report._id).toBe(reportId);
  });

  it('saves report entries', async () => {
    const res = await request(app)
      .patch(`/api/v1/dm/audit-reports/${reportId}/entries`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        entries: [{ metricId, value: 5000, notes: 'Good growth' }],
        achievements: 'Hit 5k followers',
      });
    expect(res.status).toBe(200);
  });

  it('publishes a report', async () => {
    const res = await request(app)
      .patch(`/api/v1/dm/audit-reports/${reportId}/publish`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.report.status).toBe('published');
  });
});

// ── DM-GD Pipeline ────────────────────────────────────────────────────────────

describe('DM — GD Pipeline', () => {
  it('returns pipeline stats', async () => {
    const res = await request(app)
      .get('/api/v1/dm/gd-pipeline')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.counts).toBeDefined();
  });

  it('creates a GD task from DM context', async () => {
    const res = await request(app)
      .post('/api/v1/dm/gd-tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Design a Reel', type: 'reel', client: clientId });
    expect(res.status).toBe(201);
    expect(res.body.data.sourceModule).toBe('dm');
  });
});
