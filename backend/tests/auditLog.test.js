const request  = require('supertest');
const mongoose = require('mongoose');

process.env.NODE_ENV            = 'test';
process.env.MONGODB_URI         = 'mongodb://localhost:27017/ams_test3';
process.env.JWT_SECRET          = 'test_jwt_secret_32_chars_minimum_x';
process.env.JWT_REFRESH_SECRET  = 'test_refresh_secret_32_chars_minx';
process.env.JWT_EXPIRY          = '1h';
process.env.JWT_REFRESH_EXPIRY  = '7d';

const { app } = require('../src/app');
const connectDB = require('../src/config/db');
const User     = require('../src/models/User');
const AuditLog = require('../src/models/AuditLog');

let token;
let createdUserId;

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) await connectDB();
  await mongoose.connection.dropDatabase();

  await User.create({ name: 'Superadmin', email: 'super@test.com', password: 'password123', role: 'SUPERADMIN', createdBy: new mongoose.Types.ObjectId() });

  const loginRes = await request(app).post('/api/v1/auth/login').send({ email: 'super@test.com', password: 'password123' });
  token = loginRes.body.data.accessToken;
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

describe('Audit Log — write operations create log entries', () => {
  it('creating a user generates a CREATE audit log', async () => {
    const before = await AuditLog.countDocuments({ action: 'CREATE', resource: 'user' });

    const res = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'New User', email: 'newuser@test.com', password: 'password123', role: 'TEAM_MEMBER' });

    expect(res.status).toBe(201);
    createdUserId = res.body.data.user._id;

    const after = await AuditLog.countDocuments({ action: 'CREATE', resource: 'user' });
    expect(after).toBe(before + 1);
  });

  it('updating a user generates an UPDATE audit log', async () => {
    const before = await AuditLog.countDocuments({ action: 'UPDATE', resource: 'user' });

    await request(app)
      .patch(`/api/v1/users/${createdUserId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Updated User' });

    const after = await AuditLog.countDocuments({ action: 'UPDATE', resource: 'user' });
    expect(after).toBe(before + 1);
  });

  it('deleting a user generates a DELETE audit log', async () => {
    const before = await AuditLog.countDocuments({ action: 'DELETE', resource: 'user' });

    await request(app)
      .delete(`/api/v1/users/${createdUserId}`)
      .set('Authorization', `Bearer ${token}`);

    const after = await AuditLog.countDocuments({ action: 'DELETE', resource: 'user' });
    expect(after).toBe(before + 1);
  });
});

describe('Audit Log — viewer endpoint', () => {
  it('lists audit logs with pagination', async () => {
    const res = await request(app).get('/api/v1/audit-logs').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.logs)).toBe(true);
    expect(res.body.data.total).toBeGreaterThan(0);
  });

  it('filters by action=CREATE', async () => {
    const res = await request(app).get('/api/v1/audit-logs?action=CREATE').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    res.body.data.logs.forEach((l) => expect(l.action).toBe('CREATE'));
  });
});
