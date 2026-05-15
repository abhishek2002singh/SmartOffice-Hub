const request  = require('supertest');
const mongoose = require('mongoose');

process.env.NODE_ENV           = 'test';
process.env.MONGODB_URI        = 'mongodb://localhost:27017/ams_test_dashboard';
process.env.JWT_SECRET         = 'test_jwt_secret_32_chars_minimum_x';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_32_chars_minx';
process.env.JWT_EXPIRY         = '1h';
process.env.JWT_REFRESH_EXPIRY = '7d';
process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID = '';

const { app }   = require('../src/app');
const connectDB = require('../src/config/db');
const User      = require('../src/models/User');

const ADMIN_PERMS = [
  'sops:read', 'sops:create', 'sops:publish', 'sops:approve', 'sops:category:manage',
  'hr:employee:read', 'hr:self:read',
];

let adminToken, memberToken;

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) await connectDB();
  await mongoose.connection.dropDatabase();

  const admin = await User.create({
    name: 'Dash Admin', email: 'dashadmin@test.com',
    password: 'password123', role: 'ADMIN',
    permissions: ADMIN_PERMS,
    createdBy: new mongoose.Types.ObjectId(),
  });

  const member = await User.create({
    name: 'Dash Member', email: 'dashmember@test.com',
    password: 'password123', role: 'TEAM_MEMBER',
    permissions: ['hr:self:read'],
    createdBy: admin._id,
  });

  const [ar, mr] = await Promise.all([
    request(app).post('/api/v1/auth/login').send({ email: 'dashadmin@test.com', password: 'password123' }),
    request(app).post('/api/v1/auth/login').send({ email: 'dashmember@test.com', password: 'password123' }),
  ]);
  adminToken  = ar.body.data.accessToken;
  memberToken = mr.body.data.accessToken;
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});

// ─── Global Search ─────────────────────────────────────────────────────────────

describe('Global Search', () => {
  it('requires authentication', async () => {
    const res = await request(app).get('/api/v1/search?q=test');
    expect(res.status).toBe(401);
  });

  it('rejects query shorter than 2 chars', async () => {
    const res = await request(app)
      .get('/api/v1/search?q=a')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns empty results for non-matching query', async () => {
    const res = await request(app)
      .get('/api/v1/search?q=zzzznonexistent99')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.total).toBe(0);
  });

  it('returns structured results object', async () => {
    const res = await request(app)
      .get('/api/v1/search?q=test')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('results');
    expect(res.body.data).toHaveProperty('query', 'test');
    expect(res.body.data).toHaveProperty('total');
  });

  it('TEAM_MEMBER cannot search candidates/employees', async () => {
    const res = await request(app)
      .get('/api/v1/search?q=test&modules=candidates,employees')
      .set('Authorization', `Bearer ${memberToken}`);
    expect(res.status).toBe(200);
    // Non-HR roles get empty results for HR modules — results may not contain those keys or they'll be empty
    const r = res.body.data.results;
    if (r.candidates) expect(r.candidates.length).toBe(0);
    if (r.employees)  expect(r.employees.length).toBe(0);
  });

  it('accepts modules filter parameter', async () => {
    const res = await request(app)
      .get('/api/v1/search?q=test&modules=leads,sops')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.results).toHaveProperty('leads');
    expect(res.body.data.results).toHaveProperty('sops');
    expect(res.body.data.results).not.toHaveProperty('employees');
  });

  it('returns results for admin searching their own name', async () => {
    // The admin user's name is 'Dash Admin' — search should find no records since no employee/lead seeded
    const res = await request(app)
      .get('/api/v1/search?q=Dash')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.query).toBe('Dash');
  });
});

// ─── Master Dashboard ──────────────────────────────────────────────────────────

describe('Master Dashboard', () => {
  it('requires authentication', async () => {
    const res = await request(app).get('/api/v1/dashboard/master');
    expect(res.status).toBe(401);
  });

  it('returns dashboard data for admin', async () => {
    const res = await request(app)
      .get('/api/v1/dashboard/master')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const { data } = res.body;
    expect(data).toHaveProperty('crm');
    expect(data).toHaveProperty('hr');
    expect(data).toHaveProperty('dev');
    expect(data).toHaveProperty('gd');
    expect(data).toHaveProperty('sops');
    expect(data).toHaveProperty('recentActivity');
    expect(data).toHaveProperty('generatedAt');
  });

  it('CRM section has expected fields', async () => {
    const res = await request(app)
      .get('/api/v1/dashboard/master')
      .set('Authorization', `Bearer ${adminToken}`);
    const { crm } = res.body.data;
    expect(crm).toHaveProperty('totalLeads');
    expect(crm).toHaveProperty('newLeadsThisMonth');
    expect(crm).toHaveProperty('wonLeadsThisMonth');
    expect(crm).toHaveProperty('totalClients');
    expect(crm).toHaveProperty('pipelineValue');
    expect(crm).toHaveProperty('stageBreakdown');
    expect(typeof crm.pipelineValue).toBe('number');
  });

  it('HR section has expected fields', async () => {
    const res = await request(app)
      .get('/api/v1/dashboard/master')
      .set('Authorization', `Bearer ${adminToken}`);
    const { hr } = res.body.data;
    expect(hr).toHaveProperty('totalEmployees');
    expect(hr).toHaveProperty('pendingLeaveRequests');
    expect(hr).toHaveProperty('attendanceToday');
    expect(typeof hr.totalEmployees).toBe('number');
  });

  it('Dev section has expected fields', async () => {
    const res = await request(app)
      .get('/api/v1/dashboard/master')
      .set('Authorization', `Bearer ${adminToken}`);
    const { dev } = res.body.data;
    expect(dev).toHaveProperty('activeProjects');
    expect(dev).toHaveProperty('openBugs');
    expect(dev).toHaveProperty('criticalBugs');
  });

  it('SOPs section has expected fields', async () => {
    const res = await request(app)
      .get('/api/v1/dashboard/master')
      .set('Authorization', `Bearer ${adminToken}`);
    const { sops } = res.body.data;
    expect(sops).toHaveProperty('published');
    expect(sops).toHaveProperty('pendingApprovals');
    expect(sops).toHaveProperty('mandatorySOPs');
    expect(sops).toHaveProperty('totalAcknowledgements');
  });

  it('TEAM_MEMBER can also access master dashboard', async () => {
    const res = await request(app)
      .get('/api/v1/dashboard/master')
      .set('Authorization', `Bearer ${memberToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('counts start at 0 on empty database', async () => {
    const res = await request(app)
      .get('/api/v1/dashboard/master')
      .set('Authorization', `Bearer ${adminToken}`);
    const { crm, hr, dev } = res.body.data;
    expect(crm.totalLeads).toBe(0);
    expect(hr.totalEmployees).toBe(0);
    expect(dev.activeProjects).toBe(0);
  });
});
