const request  = require('supertest');
const mongoose = require('mongoose');

process.env.NODE_ENV            = 'test';
process.env.MONGODB_URI         = 'mongodb://localhost:27017/ams_test2';
process.env.JWT_SECRET          = 'test_jwt_secret_32_chars_minimum_x';
process.env.JWT_REFRESH_SECRET  = 'test_refresh_secret_32_chars_minx';
process.env.JWT_EXPIRY          = '1h';
process.env.JWT_REFRESH_EXPIRY  = '7d';

const { app } = require('../src/app');
const connectDB = require('../src/config/db');
const User      = require('../src/models/User');

let superadminToken;
let memberToken;

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) await connectDB();
  await mongoose.connection.dropDatabase();

  await User.create({ name: 'Superadmin', email: 'super@test.com',  password: 'password123', role: 'SUPERADMIN',   createdBy: new mongoose.Types.ObjectId() });
  await User.create({ name: 'Member',     email: 'member@test.com', password: 'password123', role: 'TEAM_MEMBER',  createdBy: new mongoose.Types.ObjectId() });

  const r1 = await request(app).post('/api/v1/auth/login').send({ email: 'super@test.com',  password: 'password123' });
  const r2 = await request(app).post('/api/v1/auth/login').send({ email: 'member@test.com', password: 'password123' });
  superadminToken = r1.body.data.accessToken;
  memberToken     = r2.body.data.accessToken;
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

describe('RBAC — Users endpoint', () => {
  it('SUPERADMIN can list users', async () => {
    const res = await request(app).get('/api/v1/users').set('Authorization', `Bearer ${superadminToken}`);
    expect(res.status).toBe(200);
  });

  it('TEAM_MEMBER cannot list users (403)', async () => {
    const res = await request(app).get('/api/v1/users').set('Authorization', `Bearer ${memberToken}`);
    expect(res.status).toBe(403);
  });

  it('Unauthenticated request is rejected (401)', async () => {
    const res = await request(app).get('/api/v1/users');
    expect(res.status).toBe(401);
  });
});

describe('RBAC — Audit logs endpoint', () => {
  it('SUPERADMIN can access audit logs', async () => {
    const res = await request(app).get('/api/v1/audit-logs').set('Authorization', `Bearer ${superadminToken}`);
    expect(res.status).toBe(200);
  });

  it('TEAM_MEMBER cannot access audit logs (403)', async () => {
    const res = await request(app).get('/api/v1/audit-logs').set('Authorization', `Bearer ${memberToken}`);
    expect(res.status).toBe(403);
  });
});

describe('RBAC — Departments endpoint', () => {
  it('Any authenticated user can list departments', async () => {
    const res = await request(app).get('/api/v1/departments').set('Authorization', `Bearer ${memberToken}`);
    expect(res.status).toBe(200);
  });

  it('TEAM_MEMBER cannot create department (403)', async () => {
    const res = await request(app).post('/api/v1/departments').set('Authorization', `Bearer ${memberToken}`).send({ name: 'Test', code: 'TST' });
    expect(res.status).toBe(403);
  });

  it('SUPERADMIN can create department', async () => {
    const res = await request(app).post('/api/v1/departments').set('Authorization', `Bearer ${superadminToken}`).send({ name: 'Test Dept', code: 'TSDEPT2' });
    expect(res.status).toBe(201);
  });
});
