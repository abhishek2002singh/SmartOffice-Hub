const request  = require('supertest');
const mongoose = require('mongoose');

process.env.NODE_ENV            = 'test';
process.env.MONGODB_URI         = 'mongodb://localhost:27017/ams_test';
process.env.JWT_SECRET          = 'test_jwt_secret_32_chars_minimum_x';
process.env.JWT_REFRESH_SECRET  = 'test_refresh_secret_32_chars_minx';
process.env.JWT_EXPIRY          = '1h';
process.env.JWT_REFRESH_EXPIRY  = '7d';

const { app } = require('../src/app');
const connectDB = require('../src/config/db');
const User      = require('../src/models/User');

let accessToken;
let refreshToken;

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) await connectDB();
  await mongoose.connection.dropDatabase();

  await User.create({
    name: 'Test Admin',
    email: 'admin@test.com',
    password: 'password123',
    role: 'SUPERADMIN',
    createdBy: new mongoose.Types.ObjectId(),
  });
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

describe('POST /api/v1/auth/login', () => {
  it('returns 400 on missing fields', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({});
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 401 on wrong password', async () => {
    // password must pass Zod min(6), so use 6+ chars but wrong
    const res = await request(app).post('/api/v1/auth/login').send({ email: 'admin@test.com', password: 'wrongpassword' });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('returns tokens on valid credentials', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ email: 'admin@test.com', password: 'password123' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
    expect(res.body.data.user.email).toBe('admin@test.com');
    accessToken  = res.body.data.accessToken;
    refreshToken = res.body.data.refreshToken;
  });
});

describe('GET /api/v1/auth/me', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns user with valid token', async () => {
    const res = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe('admin@test.com');
  });
});

describe('POST /api/v1/auth/refresh', () => {
  it('returns new tokens with valid refresh token', async () => {
    const res = await request(app).post('/api/v1/auth/refresh').send({ refreshToken });
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
  });

  it('returns 401 with invalid refresh token', async () => {
    const res = await request(app).post('/api/v1/auth/refresh').send({ refreshToken: 'bad.token.here' });
    expect(res.status).toBe(401);
  });
});

describe('POST /api/v1/auth/logout', () => {
  it('logs out successfully', async () => {
    const res = await request(app)
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ refreshToken });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
