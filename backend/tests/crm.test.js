const request  = require('supertest');
const mongoose = require('mongoose');

process.env.NODE_ENV           = 'test';
process.env.MONGODB_URI        = 'mongodb://localhost:27017/ams_test_crm';
process.env.JWT_SECRET         = 'test_jwt_secret_32_chars_minimum_x';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_32_chars_minx';
process.env.JWT_EXPIRY         = '1h';
process.env.JWT_REFRESH_EXPIRY = '7d';

const { app } = require('../src/app');
const connectDB  = require('../src/config/db');
const User       = require('../src/models/User');
const LeadSource = require('../src/models/LeadSource');

let token;
let leadId;
let clientId;
let sourceId;

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) await connectDB();
  await mongoose.connection.dropDatabase();

  const admin = await User.create({
    name: 'CRM Admin', email: 'crmadmin@test.com',
    password: 'password123', role: 'SUPERADMIN',
    createdBy: new mongoose.Types.ObjectId(),
  });

  // Seed a LeadSource so lead creation works
  const src = await LeadSource.create({ name: 'Website', code: 'WEBSITE', createdBy: admin._id });
  sourceId = src._id.toString();

  const r = await request(app).post('/api/v1/auth/login').send({ email: 'crmadmin@test.com', password: 'password123' });
  token = r.body.data.accessToken;
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

// ── Leads ─────────────────────────────────────────────────────────────────────

describe('CRM — Leads', () => {
  it('creates a lead', async () => {
    const res = await request(app)
      .post('/api/v1/crm/leads')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Test Lead', mobile: '9999999999', source: sourceId });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.lead.name).toBe('Test Lead');
    leadId = res.body.data.lead._id;
  });

  it('returns 400 on missing required fields', async () => {
    const res = await request(app)
      .post('/api/v1/crm/leads')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'No Mobile' });
    expect(res.status).toBe(400);
  });

  it('returns 409 on duplicate mobile', async () => {
    const res = await request(app)
      .post('/api/v1/crm/leads')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Duplicate', mobile: '9999999999', source: sourceId });
    expect(res.status).toBe(409);
  });

  it('lists leads', async () => {
    const res = await request(app).get('/api/v1/crm/leads').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.leads.length).toBeGreaterThan(0);
  });

  it('gets a single lead', async () => {
    const res = await request(app).get(`/api/v1/crm/leads/${leadId}`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.lead._id).toBe(leadId);
  });

  it('updates lead stage via /stage endpoint', async () => {
    const res = await request(app)
      .patch(`/api/v1/crm/leads/${leadId}/stage`)
      .set('Authorization', `Bearer ${token}`)
      .send({ stage: 'contacted' });
    expect(res.status).toBe(200);
    expect(res.body.data.lead.stage).toBe('contacted');
  });

  it('soft-deletes a lead', async () => {
    const cr = await request(app)
      .post('/api/v1/crm/leads')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Delete Me', mobile: '8888888888', source: sourceId });
    const tmpId = cr.body.data.lead._id;

    const res = await request(app).delete(`/api/v1/crm/leads/${tmpId}`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);

    const list = await request(app).get('/api/v1/crm/leads').set('Authorization', `Bearer ${token}`);
    const found = list.body.data.leads.find(l => l._id === tmpId);
    expect(found).toBeUndefined();
  });
});

// ── Clients ───────────────────────────────────────────────────────────────────

describe('CRM — Clients', () => {
  it('creates a client', async () => {
    const res = await request(app)
      .post('/api/v1/crm/clients')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Test Corp', companyName: 'Test Corp Pvt Ltd', mobile: '7777777777', industry: 'technology' });
    expect(res.status).toBe(201);
    expect(res.body.data.client.name).toBe('Test Corp');
    clientId = res.body.data.client._id;
  });

  it('returns 400 on missing name', async () => {
    const res = await request(app)
      .post('/api/v1/crm/clients')
      .set('Authorization', `Bearer ${token}`)
      .send({ companyName: 'No Name Corp' });
    expect(res.status).toBe(400);
  });

  it('lists clients', async () => {
    const res = await request(app).get('/api/v1/crm/clients').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.clients.length).toBeGreaterThan(0);
  });

  it('gets single client', async () => {
    const res = await request(app).get(`/api/v1/crm/clients/${clientId}`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.client._id).toBe(clientId);
  });

  it('updates a client', async () => {
    const res = await request(app)
      .patch(`/api/v1/crm/clients/${clientId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ industry: 'finance' });
    expect(res.status).toBe(200);
    expect(res.body.data.client.industry).toBe('finance');
  });

  it('returns 404 for unknown client', async () => {
    const res = await request(app)
      .get(`/api/v1/crm/clients/${new mongoose.Types.ObjectId()}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});

// ── CRM Reports ───────────────────────────────────────────────────────────────

describe('CRM — Reports & Dashboard', () => {
  it('returns dashboard summary', async () => {
    const res = await request(app)
      .get('/api/v1/crm/reports/dashboard')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
  });

  it('returns pipeline report', async () => {
    const res = await request(app)
      .get('/api/v1/crm/reports/pipeline')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it('returns conversion funnel', async () => {
    const res = await request(app)
      .get('/api/v1/crm/reports/funnel')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });
});

// ── Communications ────────────────────────────────────────────────────────────

describe('CRM — Communications', () => {
  it('logs a communication on a lead', async () => {
    const res = await request(app)
      .post(`/api/v1/crm/leads/${leadId}/communications`)
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'call', content: 'Discussed requirements', direction: 'out' });
    expect(res.status).toBe(201);
  });

  it('gets lead timeline', async () => {
    const res = await request(app)
      .get(`/api/v1/crm/leads/${leadId}/timeline`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });
});
