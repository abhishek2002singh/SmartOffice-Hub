const request  = require('supertest');
const mongoose = require('mongoose');

process.env.NODE_ENV           = 'test';
process.env.MONGODB_URI        = 'mongodb://localhost:27017/ams_test_sops';
process.env.JWT_SECRET         = 'test_jwt_secret_32_chars_minimum_x';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_32_chars_minx';
process.env.JWT_EXPIRY         = '1h';
process.env.JWT_REFRESH_EXPIRY = '7d';
process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID = '';

const { app }   = require('../src/app');
const connectDB = require('../src/config/db');
const User      = require('../src/models/User');

const ADMIN_PERMS = [
  'sops:read', 'sops:create', 'sops:delete', 'sops:approve', 'sops:publish', 'sops:category:manage',
];

let adminToken, memberToken;
let adminId, memberId;
let categoryId, sopId;

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) await connectDB();
  await mongoose.connection.dropDatabase();

  const admin = await User.create({
    name: 'SOP Admin', email: 'sopadmin@test.com',
    password: 'password123', role: 'SUPERADMIN',
    permissions: ADMIN_PERMS,
    createdBy: new mongoose.Types.ObjectId(),
  });
  adminId = admin._id;

  const member = await User.create({
    name: 'SOP Member', email: 'sopmember@test.com',
    password: 'password123', role: 'TEAM_MEMBER',
    permissions: ['sops:read'],
    createdBy: adminId,
  });
  memberId = member._id;

  const [ar, mr] = await Promise.all([
    request(app).post('/api/v1/auth/login').send({ email: 'sopadmin@test.com', password: 'password123' }),
    request(app).post('/api/v1/auth/login').send({ email: 'sopmember@test.com', password: 'password123' }),
  ]);
  adminToken  = ar.body.data.accessToken;
  memberToken = mr.body.data.accessToken;
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});

// ─── Categories ───────────────────────────────────────────────────────────────

describe('SOP Categories', () => {
  it('seeds default categories', async () => {
    const res = await request(app)
      .post('/api/v1/sops/categories/seed')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.categories.length).toBeGreaterThanOrEqual(4);
    categoryId = res.body.data.categories[0]._id;
  });

  it('lists categories (any authenticated user)', async () => {
    const res = await request(app)
      .get('/api/v1/sops/categories')
      .set('Authorization', `Bearer ${memberToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.categories)).toBe(true);
  });

  it('creates a custom category', async () => {
    const res = await request(app)
      .post('/api/v1/sops/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'IT Policies', description: 'IT related SOPs', iconName: 'Shield', sortOrder: 10 });
    expect(res.status).toBe(201);
    expect(res.body.data.category.name).toBe('IT Policies');
  });

  it('blocks category creation for non-admin', async () => {
    const res = await request(app)
      .post('/api/v1/sops/categories')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ name: 'Hacker Category' });
    expect(res.status).toBe(403);
  });

  it('updates a category', async () => {
    const res = await request(app)
      .patch(`/api/v1/sops/categories/${categoryId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ description: 'Updated description' });
    expect(res.status).toBe(200);
    expect(res.body.data.category.description).toBe('Updated description');
  });
});

// ─── SOP CRUD ─────────────────────────────────────────────────────────────────

describe('SOP CRUD', () => {
  it('creates a SOP (draft)', async () => {
    const res = await request(app)
      .post('/api/v1/sops')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Leave Application Process',
        categoryId,
        description: 'How to apply for leave in ANK Digital',
        content: '# Leave Process\n\n## Steps\n1. Open leave portal\n2. Select leave type\n3. Submit',
        mandatory: true,
        acknowledgementDeadlineDays: 7,
        tags: ['hr', 'leave'],
      });
    expect(res.status).toBe(201);
    expect(res.body.data.sop.status).toBe('draft');
    expect(res.body.data.sop.currentVersion).toBe(1);
    sopId = res.body.data.sop._id;
  });

  it('requires title and categoryId', async () => {
    const res = await request(app)
      .post('/api/v1/sops')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'No Category SOP' });
    expect(res.status).toBe(400);
  });

  it('gets SOP by ID (admin can see drafts)', async () => {
    const res = await request(app)
      .get(`/api/v1/sops/${sopId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.sop._id).toBe(sopId);
    expect(res.body.data.sop.content).toContain('Leave Process');
  });

  it('member cannot see draft SOP', async () => {
    const res = await request(app)
      .get(`/api/v1/sops/${sopId}`)
      .set('Authorization', `Bearer ${memberToken}`);
    expect(res.status).toBe(403);
  });

  it('updates SOP content (still draft)', async () => {
    const res = await request(app)
      .patch(`/api/v1/sops/${sopId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ content: '# Updated Leave Process\n\nNew content here.' });
    expect(res.status).toBe(200);
    expect(res.body.data.sop.content).toContain('Updated Leave Process');
    expect(res.body.data.sop.currentVersion).toBe(1); // still v1 since was draft
  });

  it('lists SOPs — member only sees published', async () => {
    const res = await request(app)
      .get('/api/v1/sops')
      .set('Authorization', `Bearer ${memberToken}`);
    expect(res.status).toBe(200);
    // No published SOPs yet, so 0 results for member
    expect(res.body.data.sops.length).toBe(0);
  });

  it('admin can list all statuses', async () => {
    const res = await request(app)
      .get('/api/v1/sops?status=draft')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.sops.length).toBeGreaterThan(0);
  });
});

// ─── Version History ──────────────────────────────────────────────────────────

describe('Version History', () => {
  it('returns version list with v1', async () => {
    const res = await request(app)
      .get(`/api/v1/sops/${sopId}/versions`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.versions.length).toBe(1);
    expect(res.body.data.versions[0].versionNumber).toBe(1);
    expect(res.body.data.versions[0].changeLog).toBe('Initial version');
  });
});

// ─── Approval Workflow ────────────────────────────────────────────────────────

describe('Approval Workflow', () => {
  it('submits SOP for approval', async () => {
    const res = await request(app)
      .post(`/api/v1/sops/${sopId}/submit-for-approval`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.sop.status).toBe('in_review');
    expect(res.body.data.approval.status).toBe('pending');
  });

  it('cannot submit again when already in_review', async () => {
    const res = await request(app)
      .post(`/api/v1/sops/${sopId}/submit-for-approval`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(409);
  });

  it('gets approval inbox (has 1 pending)', async () => {
    const res = await request(app)
      .get('/api/v1/sops/approvals')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.approvals.length).toBe(1);
    expect(res.body.data.approvals[0].status).toBe('pending');
  });

  it('reviewer approves the SOP', async () => {
    const res = await request(app)
      .patch(`/api/v1/sops/${sopId}/review`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ decision: 'approved', reviewComments: 'Looks good. Approve!' });
    expect(res.status).toBe(200);
    expect(res.body.data.approval.status).toBe('approved');
    // SOP stays in_review after approve (needs separate publish step)
    expect(res.body.data.sop.status).toBe('in_review');
  });

  it('publishes the approved SOP', async () => {
    const res = await request(app)
      .patch(`/api/v1/sops/${sopId}/publish`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.sop.status).toBe('published');
    expect(res.body.data.sop.publishedAt).not.toBeNull();
  });

  it('member can now see the published SOP', async () => {
    const res = await request(app)
      .get(`/api/v1/sops/${sopId}`)
      .set('Authorization', `Bearer ${memberToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.sop.status).toBe('published');
    expect(res.body.data.acknowledged).toBe(false);
  });

  it('reject flow resets SOP to draft', async () => {
    // Create another SOP and submit
    const cr = await request(app).post('/api/v1/sops').set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Reject Test SOP', categoryId, content: 'Test content' });
    const id2 = cr.body.data.sop._id;
    await request(app).post(`/api/v1/sops/${id2}/submit-for-approval`).set('Authorization', `Bearer ${adminToken}`);

    const res = await request(app)
      .patch(`/api/v1/sops/${id2}/review`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ decision: 'rejected', reviewComments: 'Needs more detail' });
    expect(res.status).toBe(200);
    expect(res.body.data.sop.status).toBe('draft');
    expect(res.body.data.approval.status).toBe('rejected');
  });
});

// ─── Acknowledgement ──────────────────────────────────────────────────────────

describe('Acknowledgement', () => {
  it('member acknowledges published SOP', async () => {
    const res = await request(app)
      .post(`/api/v1/sops/${sopId}/acknowledge`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ signature: 'SOP Member' });
    expect(res.status).toBe(200);
    expect(res.body.data.acknowledgement.signature).toBe('SOP Member');
    expect(res.body.data.acknowledgement.acknowledgementText).toContain('SOP Member');
  });

  it('prevents duplicate acknowledgement', async () => {
    const res = await request(app)
      .post(`/api/v1/sops/${sopId}/acknowledge`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ signature: 'SOP Member' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ALREADY_ACKNOWLEDGED');
  });

  it('SOP detail shows acknowledged: true for member', async () => {
    const res = await request(app)
      .get(`/api/v1/sops/${sopId}`)
      .set('Authorization', `Bearer ${memberToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.acknowledged).toBe(true);
  });

  it('my acknowledgements list', async () => {
    const res = await request(app)
      .get('/api/v1/sops/me/acknowledgements')
      .set('Authorization', `Bearer ${memberToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.acknowledgements.length).toBe(1);
  });

  it('acknowledgement report for HR/Admin', async () => {
    const res = await request(app)
      .get(`/api/v1/sops/${sopId}/acknowledgement-report`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.totalAcknowledged).toBe(1);
    expect(res.body.data.acknowledgements[0].userId.name).toBe('SOP Member');
  });

  it('my pending SOPs — mandatory and unacknowledged', async () => {
    // Create another mandatory SOP and publish it directly (without approval chain)
    const cr = await request(app).post('/api/v1/sops').set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Mandatory Policy', categoryId, content: 'Must read', mandatory: true });
    const pid = cr.body.data.sop._id;
    await request(app).patch(`/api/v1/sops/${pid}/publish`).set('Authorization', `Bearer ${adminToken}`);

    const res = await request(app)
      .get('/api/v1/sops/me/pending')
      .set('Authorization', `Bearer ${memberToken}`);
    expect(res.status).toBe(200);
    // 'Mandatory Policy' is pending, 'Leave Application' is already acknowledged
    expect(res.body.data.pending.some(s => s.title === 'Mandatory Policy')).toBe(true);
    expect(res.body.data.pending.some(s => s.title === 'Leave Application Process')).toBe(false);
  });
});

// ─── Archive ─────────────────────────────────────────────────────────────────

describe('Archive', () => {
  it('archives a published SOP', async () => {
    const res = await request(app)
      .patch(`/api/v1/sops/${sopId}/archive`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.sop.status).toBe('archived');
  });

  it('cannot archive an already archived SOP', async () => {
    const res = await request(app)
      .patch(`/api/v1/sops/${sopId}/archive`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(409);
  });
});

// ─── New Version on Published SOP ────────────────────────────────────────────

describe('New Version', () => {
  let liveSopId;

  it('creates and publishes a SOP directly', async () => {
    const cr = await request(app).post('/api/v1/sops').set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Version Test SOP', categoryId, content: 'v1 content' });
    liveSopId = cr.body.data.sop._id;
    await request(app).patch(`/api/v1/sops/${liveSopId}/publish`).set('Authorization', `Bearer ${adminToken}`);
  });

  it('editing a published SOP creates v2 in draft', async () => {
    const res = await request(app)
      .patch(`/api/v1/sops/${liveSopId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ content: 'v2 content — updated', changeLog: 'Major update' });
    expect(res.status).toBe(200);
    expect(res.body.data.sop.currentVersion).toBe(2);
    expect(res.body.data.sop.status).toBe('draft');
    expect(res.body.data.sop.content).toContain('v2 content');
  });

  it('version history shows 2 versions', async () => {
    const res = await request(app)
      .get(`/api/v1/sops/${liveSopId}/versions`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.versions.length).toBe(2);
  });
});
