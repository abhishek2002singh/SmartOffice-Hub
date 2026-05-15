const request  = require('supertest');
const mongoose = require('mongoose');

process.env.NODE_ENV           = 'test';
process.env.MONGODB_URI        = 'mongodb://localhost:27017/ams_test_onboarding';
process.env.JWT_SECRET         = 'test_jwt_secret_32_chars_minimum_x';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_32_chars_minx';
process.env.JWT_EXPIRY         = '1h';
process.env.JWT_REFRESH_EXPIRY = '7d';
process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID = '';

const { app }   = require('../src/app');
const connectDB = require('../src/config/db');
const User      = require('../src/models/User');
const Employee  = require('../src/models/Employee');

const ADMIN_PERMS = [
  'hr:employee:read', 'hr:employee:create', 'hr:employee:update', 'hr:employee:delete',
  'hr:self:read', 'hr:self:update',
];

let adminToken, memberToken;
let adminId, memberId;
let empId, memberEmpId;
let tmplId, progressId;

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) await connectDB();
  await mongoose.connection.dropDatabase();

  const admin = await User.create({
    name: 'OB Admin', email: 'obadmin@test.com',
    password: 'password123', role: 'SUPERADMIN',
    permissions: ADMIN_PERMS,
    createdBy: new mongoose.Types.ObjectId(),
  });
  adminId = admin._id;

  const member = await User.create({
    name: 'New Joiner', email: 'newjoiner@test.com',
    password: 'password123', role: 'TEAM_MEMBER',
    permissions: ['hr:self:read'],
    createdBy: adminId,
  });
  memberId = member._id;

  const emp = await Employee.create({
    firstName: 'OB', lastName: 'Admin',
    employeeCode: 'ANK-EMP-2026-001', userId: adminId,
    dateOfJoining: new Date('2020-01-01'), employmentStatus: 'confirmed',
    dob: new Date('1990-01-01'), createdBy: adminId,
  });
  empId = emp._id;

  const memberEmp = await Employee.create({
    firstName: 'New', lastName: 'Joiner',
    employeeCode: 'ANK-EMP-2026-002', userId: memberId,
    dateOfJoining: new Date('2026-05-01'), employmentStatus: 'confirmed',
    createdBy: adminId,
  });
  memberEmpId = memberEmp._id;

  const [ar, mr] = await Promise.all([
    request(app).post('/api/v1/auth/login').send({ email: 'obadmin@test.com', password: 'password123' }),
    request(app).post('/api/v1/auth/login').send({ email: 'newjoiner@test.com', password: 'password123' }),
  ]);
  adminToken  = ar.body.data.accessToken;
  memberToken = mr.body.data.accessToken;
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});

// ─── Templates ────────────────────────────────────────────────────────────────

describe('Onboarding Templates', () => {
  it('creates a template', async () => {
    const res = await request(app)
      .post('/api/v1/onboarding')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'New Joiner — Week 1',
        description: 'Standard onboarding checklist for all new hires',
        applicableTo: 'all',
        isDefault: true,
        items: [
          { title: 'Read HR Policy SOP', type: 'read_sop', daysFromJoining: 1, mandatory: true, assignedRole: 'Self', sortOrder: 0 },
          { title: 'Meet Reporting Manager', type: 'attend_meeting', daysFromJoining: 1, mandatory: true, assignedRole: 'Manager', sortOrder: 1 },
          { title: 'Submit ID proof documents', type: 'submit_document', daysFromJoining: 3, mandatory: true, assignedRole: 'HR', sortOrder: 2 },
          { title: 'Complete IT setup form', type: 'online_form', daysFromJoining: 2, mandatory: false, assignedRole: 'IT', sortOrder: 3 },
        ],
      });
    expect(res.status).toBe(201);
    expect(res.body.data.template.name).toBe('New Joiner — Week 1');
    expect(res.body.data.template.items.length).toBe(4);
    expect(res.body.data.template.isDefault).toBe(true);
    tmplId = res.body.data.template._id;
  });

  it('blocks template creation for non-admin', async () => {
    const res = await request(app)
      .post('/api/v1/onboarding')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ name: 'Hack template' });
    expect(res.status).toBe(403);
  });

  it('lists templates', async () => {
    const res = await request(app)
      .get('/api/v1/onboarding')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.templates.length).toBe(1);
  });

  it('gets template by ID', async () => {
    const res = await request(app)
      .get(`/api/v1/onboarding/${tmplId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.template.items.length).toBe(4);
  });

  it('updates template name', async () => {
    const res = await request(app)
      .patch(`/api/v1/onboarding/${tmplId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'New Joiner — Week 1 (Updated)', description: 'Updated description' });
    expect(res.status).toBe(200);
    expect(res.body.data.template.name).toContain('Updated');
  });
});

// ─── Assignment ───────────────────────────────────────────────────────────────

describe('Onboarding Assignment', () => {
  it('assigns checklist to employee', async () => {
    const res = await request(app)
      .post('/api/v1/onboarding/assign')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ employeeId: memberEmpId, checklistId: tmplId, startDate: '2026-06-01' });
    expect(res.status).toBe(201);
    expect(res.body.data.progress.overallStatus).toBe('in_progress');
    expect(res.body.data.progress.items.length).toBe(4);
    // Items should have dueDate set
    expect(res.body.data.progress.items[0].dueDate).not.toBeNull();
    progressId = res.body.data.progress._id;
  });

  it('prevents duplicate assignment', async () => {
    const res = await request(app)
      .post('/api/v1/onboarding/assign')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ employeeId: memberEmpId, checklistId: tmplId });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ALREADY_ASSIGNED');
  });

  it('requires employeeId and checklistId', async () => {
    const res = await request(app)
      .post('/api/v1/onboarding/assign')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ employeeId: memberEmpId });
    expect(res.status).toBe(400);
  });
});

// ─── Employee Self-Service ────────────────────────────────────────────────────

describe('Employee Onboarding Self-Service', () => {
  it('member can get their own onboarding', async () => {
    const res = await request(app)
      .get('/api/v1/onboarding/me')
      .set('Authorization', `Bearer ${memberToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.progressList.length).toBe(1);
    expect(res.body.data.progressList[0].items.length).toBe(4);
  });

  it('member can mark a Self-assigned item as complete', async () => {
    // Get item ID for 'Read HR Policy SOP' (assignedRole: Self)
    const prog = await request(app)
      .get('/api/v1/onboarding/me')
      .set('Authorization', `Bearer ${memberToken}`);
    const selfItem = prog.body.data.progressList[0].items.find(i => i.assignedRole === 'Self');
    expect(selfItem).toBeDefined();

    const res = await request(app)
      .patch(`/api/v1/onboarding/${progressId}/items/${selfItem._id}/complete`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ notes: 'Read and understood the policy.' });
    expect(res.status).toBe(200);
    const updated = res.body.data.progress.items.find(i => i._id === selfItem._id);
    expect(updated.status).toBe('completed');
    expect(updated.notes).toContain('Read and understood');
  });

  it('progress status remains in_progress after partial completion', async () => {
    const res = await request(app)
      .get('/api/v1/onboarding/me')
      .set('Authorization', `Bearer ${memberToken}`);
    expect(res.body.data.progressList[0].overallStatus).toBe('in_progress');
  });
});

// ─── HR Views ─────────────────────────────────────────────────────────────────

describe('HR Onboarding Views', () => {
  it('lists all progress records', async () => {
    const res = await request(app)
      .get('/api/v1/onboarding/progress/all')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.progressList.length).toBeGreaterThan(0);
  });

  it('filters by status', async () => {
    const res = await request(app)
      .get('/api/v1/onboarding/progress/all?status=in_progress')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    res.body.data.progressList.forEach(p => expect(p.overallStatus).toBe('in_progress'));
  });

  it('gets specific employee progress', async () => {
    const res = await request(app)
      .get(`/api/v1/onboarding/progress/employee/${memberEmpId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.progressList.length).toBe(1);
  });

  it('admin can also mark items complete', async () => {
    const prog = await request(app)
      .get(`/api/v1/onboarding/progress/employee/${memberEmpId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    const hrItem = prog.body.data.progressList[0].items.find(i => i.assignedRole === 'HR' && i.status !== 'completed');
    if (!hrItem) return; // already done
    const res = await request(app)
      .patch(`/api/v1/onboarding/${progressId}/items/${hrItem._id}/complete`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ notes: 'Documents verified by HR' });
    expect(res.status).toBe(200);
    const updated = res.body.data.progress.items.find(i => i._id === hrItem._id);
    expect(updated.status).toBe('completed');
  });
});

// ─── Template Deletion ────────────────────────────────────────────────────────

describe('Template Deletion', () => {
  it('creates a second template then deletes it', async () => {
    const cr = await request(app).post('/api/v1/onboarding').set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Temp Template', items: [] });
    const tid = cr.body.data.template._id;

    const res = await request(app)
      .delete(`/api/v1/onboarding/${tid}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);

    const list = await request(app).get('/api/v1/onboarding').set('Authorization', `Bearer ${adminToken}`);
    expect(list.body.data.templates.every(t => t._id !== tid)).toBe(true);
  });
});
