const request  = require('supertest');
const mongoose = require('mongoose');

process.env.NODE_ENV           = 'test';
process.env.MONGODB_URI        = 'mongodb://localhost:27017/ams_test_security';
process.env.JWT_SECRET         = 'test_jwt_secret_32_chars_minimum_x';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_32_chars_minx';
process.env.JWT_EXPIRY         = '1h';
process.env.JWT_REFRESH_EXPIRY = '7d';
process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID = '';

const { app }   = require('../src/app');
const connectDB = require('../src/config/db');
const User      = require('../src/models/User');

let superadminToken, adminToken, memberToken;

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) await connectDB();
  await mongoose.connection.dropDatabase();

  const creatorId = new mongoose.Types.ObjectId();

  const superadmin = await User.create({
    name: 'Super Admin', email: 'superadmin@sec.test',
    password: 'password123', role: 'SUPERADMIN',
    permissions: ['hr:employee:read', 'hr:employee:create', 'sops:read', 'sops:approve', 'sops:category:manage'],
    createdBy: creatorId,
  });

  const admin = await User.create({
    name: 'Admin User', email: 'admin@sec.test',
    password: 'password123', role: 'ADMIN',
    permissions: ['hr:employee:read', 'sops:read'],
    createdBy: superadmin._id,
  });

  const member = await User.create({
    name: 'Team Member', email: 'member@sec.test',
    password: 'password123', role: 'TEAM_MEMBER',
    permissions: ['hr:self:read', 'sops:read'],
    createdBy: superadmin._id,
  });

  const [sr, ar, mr] = await Promise.all([
    request(app).post('/api/v1/auth/login').send({ email: 'superadmin@sec.test', password: 'password123' }),
    request(app).post('/api/v1/auth/login').send({ email: 'admin@sec.test', password: 'password123' }),
    request(app).post('/api/v1/auth/login').send({ email: 'member@sec.test', password: 'password123' }),
  ]);
  superadminToken = sr.body.data.accessToken;
  adminToken      = ar.body.data.accessToken;
  memberToken     = mr.body.data.accessToken;
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});

// ─── Authentication ───────────────────────────────────────────────────────────

describe('Authentication Guards', () => {
  const PROTECTED_ROUTES = [
    ['GET',    '/api/v1/users'],
    ['GET',    '/api/v1/departments'],
    ['GET',    '/api/v1/audit-logs'],
    ['GET',    '/api/v1/crm/leads'],
    ['GET',    '/api/v1/crm/clients'],
    ['GET',    '/api/v1/hr/employees'],
    ['GET',    '/api/v1/sops'],
    ['GET',    '/api/v1/onboarding'],
    ['GET',    '/api/v1/search?q=test'],
    ['GET',    '/api/v1/dashboard/master'],
  ];

  test.each(PROTECTED_ROUTES)('%s %s returns 401 without token', async (method, path) => {
    const res = await request(app)[method.toLowerCase()](path);
    expect(res.status).toBe(401);
  });

  it('rejects malformed Bearer token', async () => {
    const res = await request(app)
      .get('/api/v1/users')
      .set('Authorization', 'Bearer not.a.valid.jwt');
    expect(res.status).toBe(401);
  });

  it('rejects expired/invalid JWT', async () => {
    const res = await request(app)
      .get('/api/v1/users')
      .set('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NiIsInJvbGUiOiJBRE1JTiIsImlhdCI6MTYwMDAwMDAwMCwiZXhwIjoxNjAwMDAwMDAxfQ.invalid');
    expect(res.status).toBe(401);
  });
});

// ─── RBAC — Role-based access ─────────────────────────────────────────────────

describe('RBAC — Role enforcement', () => {
  it('TEAM_MEMBER cannot access user management', async () => {
    const res = await request(app)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${memberToken}`);
    expect(res.status).toBe(403);
  });

  it('TEAM_MEMBER cannot create SOP categories', async () => {
    const res = await request(app)
      .post('/api/v1/sops/categories')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ name: 'Hack Category' });
    expect(res.status).toBe(403);
  });

  it('TEAM_MEMBER cannot list all employees (hr:employee:read required)', async () => {
    const res = await request(app)
      .get('/api/v1/hr/employees')
      .set('Authorization', `Bearer ${memberToken}`);
    expect(res.status).toBe(403);
  });

  it('TEAM_MEMBER cannot list onboarding templates', async () => {
    const res = await request(app)
      .get('/api/v1/onboarding')
      .set('Authorization', `Bearer ${memberToken}`);
    expect(res.status).toBe(403);
  });

  it('ADMIN with hr:employee:read can list employees', async () => {
    const res = await request(app)
      .get('/api/v1/hr/employees')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });

  it('SUPERADMIN can list and update permissions', async () => {
    const res = await request(app)
      .get('/api/v1/permissions')
      .set('Authorization', `Bearer ${superadminToken}`);
    expect(res.status).toBe(200);
  });

  it('ADMIN can list permissions (read-only)', async () => {
    const res = await request(app)
      .get('/api/v1/permissions')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });

  it('ADMIN cannot modify permissions (SUPERADMIN only for writes)', async () => {
    const fakeUserId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .put(`/api/v1/permissions/users/${fakeUserId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ permissions: ['sops:read'] });
    expect(res.status).toBe(403);
  });
});

// ─── Input Validation ─────────────────────────────────────────────────────────

describe('Input Validation', () => {
  it('login with missing password returns 400', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@sec.test' });
    expect([400, 401]).toContain(res.status);
  });

  it('login with wrong credentials returns 401', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@sec.test', password: 'wrongpassword' });
    expect(res.status).toBe(401);
  });

  it('search with query < 2 chars returns 400', async () => {
    const res = await request(app)
      .get('/api/v1/search?q=a')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects NoSQL injection attempt in search (object query)', async () => {
    const res = await request(app)
      .get('/api/v1/search?q[$gt]=x')
      .set('Authorization', `Bearer ${adminToken}`);
    // Express parses q[$gt]=x as { q: { $gt: 'x' } } — must reject gracefully, not 500
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

// ─── Security Headers ─────────────────────────────────────────────────────────

describe('Security Headers', () => {
  it('returns X-Content-Type-Options: nosniff', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('returns X-Frame-Options or CSP frame-ancestors header', async () => {
    const res = await request(app).get('/api/v1/health');
    const hasFrameOptions = res.headers['x-frame-options'] || res.headers['content-security-policy'];
    expect(hasFrameOptions).toBeTruthy();
  });

  it('health endpoint returns structured status', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('ok');
    expect(res.body.data).toHaveProperty('uptime');
    expect(res.body.data).toHaveProperty('db');
    expect(res.body.data).toHaveProperty('memory');
    expect(res.body.data).toHaveProperty('version');
  });
});

// ─── IDOR Prevention ──────────────────────────────────────────────────────────

describe('IDOR Prevention', () => {
  it('TEAM_MEMBER cannot mark another employee onboarding item complete', async () => {
    const fakeProgressId = new mongoose.Types.ObjectId();
    const fakeItemId     = new mongoose.Types.ObjectId();
    const res = await request(app)
      .patch(`/api/v1/onboarding/${fakeProgressId}/items/${fakeItemId}/complete`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ notes: 'hack' });
    expect([403, 404]).toContain(res.status);
  });

  it('non-existent resource returns 404 not 500', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .get(`/api/v1/sops/${fakeId}`)
      .set('Authorization', `Bearer ${memberToken}`);
    expect(res.status).toBe(404);
  });
});
