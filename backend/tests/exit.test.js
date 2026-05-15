const request  = require('supertest');
const mongoose = require('mongoose');

process.env.NODE_ENV           = 'test';
process.env.MONGODB_URI        = 'mongodb://localhost:27017/ams_test_exit';
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
  'hr:employee:read', 'hr:employee:create', 'hr:employee:update',
  'hr:salary:read', 'hr:payroll:process', 'hr:payroll:disburse',
  'hr:self:read', 'hr:self:update',
];

let adminToken, memberToken;
let adminId, memberId;
let empId, memberEmpId;

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) await connectDB();
  await mongoose.connection.dropDatabase();

  const admin = await User.create({
    name: 'HR Admin', email: 'hradmin@test.com',
    password: 'password123', role: 'SUPERADMIN',
    permissions: ADMIN_PERMS,
    createdBy: new mongoose.Types.ObjectId(),
  });
  adminId = admin._id;

  const member = await User.create({
    name: 'Team Member', email: 'member@test.com',
    password: 'password123', role: 'TEAM_MEMBER',
    permissions: ADMIN_PERMS,
    createdBy: adminId,
  });
  memberId = member._id;

  const emp = await Employee.create({
    firstName: 'HR', lastName: 'Admin',
    employeeCode: 'ANK-EMP-2026-001',
    userId: adminId,
    dateOfJoining: new Date('2020-01-01'),
    employmentStatus: 'confirmed',
    dob: new Date('1995-06-15'),
    createdBy: adminId,
  });
  empId = emp._id;

  const memberEmp = await Employee.create({
    firstName: 'Team', lastName: 'Member',
    employeeCode: 'ANK-EMP-2026-002',
    userId: memberId,
    dateOfJoining: new Date('2024-01-01'),
    employmentStatus: 'confirmed',
    createdBy: adminId,
  });
  memberEmpId = memberEmp._id;

  const [ar, mr] = await Promise.all([
    request(app).post('/api/v1/auth/login').send({ email: 'hradmin@test.com', password: 'password123' }),
    request(app).post('/api/v1/auth/login').send({ email: 'member@test.com', password: 'password123' }),
  ]);
  adminToken  = ar.body.data.accessToken;
  memberToken = mr.body.data.accessToken;
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});

// ─── Resignation ─────────────────────────────────────────────────────────────

describe('Resignation', () => {
  it('employee submits resignation and creates exit checklist', async () => {
    const res = await request(app)
      .post('/api/v1/hr/me/resignation')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        resignationDate: '2026-06-01',
        lastWorkingDay:  '2026-06-30',
        reason: 'Better opportunity elsewhere',
        noticePeriodDays: 30,
      });
    expect(res.status).toBe(200);
    expect(res.body.data.employee.employmentStatus).toBe('resigned');
    expect(res.body.data.checklist).not.toBeNull();
    expect(res.body.data.checklist.items.length).toBeGreaterThan(0);
    expect(res.body.data.checklist.status).toBe('initiated');
  });

  it('prevents duplicate resignation submission', async () => {
    const res = await request(app)
      .post('/api/v1/hr/me/resignation')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        resignationDate: '2026-07-01',
        lastWorkingDay:  '2026-07-31',
        reason: 'Second attempt',
      });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ALREADY_EXITING');
  });

  it('requires resignationDate and lastWorkingDay', async () => {
    const res = await request(app)
      .post('/api/v1/hr/me/resignation')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Missing dates' });
    expect(res.status).toBe(400);
  });
});

// ─── Exit Checklist ───────────────────────────────────────────────────────────

describe('Exit Checklist', () => {
  it('gets exit checklist for an employee', async () => {
    const res = await request(app)
      .get(`/api/v1/hr/employees/${memberEmpId}/exit-checklist`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.checklist).not.toBeNull();
    expect(Array.isArray(res.body.data.checklist.items)).toBe(true);
  });

  it('updates a checklist item to completed', async () => {
    const res = await request(app)
      .patch(`/api/v1/hr/employees/${memberEmpId}/exit-checklist`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ itemKey: 'knowledge_transfer', completed: true, notes: 'Handover doc shared on Drive' });
    expect(res.status).toBe(200);
    const item = res.body.data.checklist.items.find(i => i.key === 'knowledge_transfer');
    expect(item.completed).toBe(true);
    expect(item.notes).toBe('Handover doc shared on Drive');
  });

  it('checklist status transitions to in_progress after partial completion', async () => {
    const res = await request(app)
      .get(`/api/v1/hr/employees/${memberEmpId}/exit-checklist`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.body.data.checklist.status).toBe('in_progress');
  });

  it('manager can acknowledge', async () => {
    const res = await request(app)
      .patch(`/api/v1/hr/employees/${memberEmpId}/exit-checklist`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ acknowledgeManager: true });
    expect(res.status).toBe(200);
    expect(res.body.data.checklist.acknowledgedByManager).toBe(true);
  });

  it('HR can acknowledge separately', async () => {
    const res = await request(app)
      .patch(`/api/v1/hr/employees/${memberEmpId}/exit-checklist`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ acknowledgeHR: true });
    expect(res.status).toBe(200);
    expect(res.body.data.checklist.acknowledgedByHR).toBe(true);
  });
});

// ─── Exit Interview ───────────────────────────────────────────────────────────

describe('Exit Interview', () => {
  it('saves exit interview', async () => {
    const res = await request(app)
      .post(`/api/v1/hr/employees/${memberEmpId}/exit-interview`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        reasons: ['better_opportunity', 'compensation'],
        feedback: 'Great team, good culture. Salary could be better.',
        suggestions: 'Consider salary benchmarking against market.',
        wouldRecommend: 'yes',
        eligibleForRehire: true,
      });
    expect(res.status).toBe(200);
    expect(res.body.data.interview.reasons).toContain('better_opportunity');
    expect(res.body.data.interview.wouldRecommend).toBe('yes');
    expect(res.body.data.interview.eligibleForRehire).toBe(true);
  });

  it('gets exit interview', async () => {
    const res = await request(app)
      .get(`/api/v1/hr/employees/${memberEmpId}/exit-interview`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.interview).not.toBeNull();
    expect(res.body.data.interview.feedback).toBeTruthy();
  });

  it('marks exit_interview checklist item as done automatically', async () => {
    const cl = await request(app)
      .get(`/api/v1/hr/employees/${memberEmpId}/exit-checklist`)
      .set('Authorization', `Bearer ${adminToken}`);
    const item = cl.body.data.checklist.items.find(i => i.key === 'exit_interview');
    expect(item.completed).toBe(true);
  });

  it('updates existing interview on re-save (upsert)', async () => {
    const res = await request(app)
      .post(`/api/v1/hr/employees/${memberEmpId}/exit-interview`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        reasons: ['personal'],
        feedback: 'Updated feedback',
        wouldRecommend: 'maybe',
        eligibleForRehire: false,
      });
    expect(res.status).toBe(200);
    expect(res.body.data.interview.wouldRecommend).toBe('maybe');
    expect(res.body.data.interview.eligibleForRehire).toBe(false);
  });
});

// ─── Full & Final Settlement ─────────────────────────────────────────────────

describe('Full & Final Settlement', () => {
  it('calculates F&F settlement', async () => {
    const res = await request(app)
      .post(`/api/v1/hr/employees/${memberEmpId}/full-and-final`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        deductions: [{ description: 'Notice period shortfall', amount: 5000 }],
        notes: 'Standard exit settlement',
      });
    expect(res.status).toBe(200);
    const { fnf, calculated } = res.body.data;
    expect(fnf.status).toBe('pending');
    expect(typeof fnf.netPayable).toBe('number');
    expect(typeof calculated.yearsOfService).toBe('number');
  });

  it('gets F&F settlement', async () => {
    const res = await request(app)
      .get(`/api/v1/hr/employees/${memberEmpId}/full-and-final`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.fnf).not.toBeNull();
    expect(res.body.data.fnf.status).toBe('pending');
  });

  it('approves F&F settlement', async () => {
    const res = await request(app)
      .patch(`/api/v1/hr/employees/${memberEmpId}/full-and-final/approve`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.fnf.status).toBe('approved');
    expect(res.body.data.fnf.processedBy).toBeTruthy();
  });

  it('prevents approving an already-approved F&F', async () => {
    const res = await request(app)
      .patch(`/api/v1/hr/employees/${memberEmpId}/full-and-final/approve`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(409);
  });

  it('disburses F&F and marks employee as relieved', async () => {
    const res = await request(app)
      .patch(`/api/v1/hr/employees/${memberEmpId}/full-and-final/disburse`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.fnf.status).toBe('disbursed');

    // Verify employee status updated
    const emp = await Employee.findById(memberEmpId);
    expect(emp.employmentStatus).toBe('relieved');
  });

  it('rejects F&F for non-resigned employee', async () => {
    const res = await request(app)
      .post(`/api/v1/hr/employees/${empId}/full-and-final`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

// ─── PDF Generation ───────────────────────────────────────────────────────────

describe('PDF Generation', () => {
  beforeAll(async () => {
    // Make memberEmp exit-eligible by ensuring exitInfo is set
    await Employee.updateOne(
      { _id: memberEmpId },
      { 'exitInfo.exitDate': new Date('2026-06-30'), 'exitInfo.resignationDate': new Date('2026-06-01') },
    );
  });

  it('generates relieving letter as PDF blob', async () => {
    const res = await request(app)
      .get(`/api/v1/hr/employees/${memberEmpId}/relieving-letter`)
      .set('Authorization', `Bearer ${adminToken}`)
      .buffer(true)
      .parse((res, callback) => {
        const chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () => callback(null, Buffer.concat(chunks)));
      });
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/pdf');
    // PDF starts with %PDF
    expect(res.body.slice(0, 4).toString()).toBe('%PDF');
  });

  it('generates experience certificate as PDF blob', async () => {
    const res = await request(app)
      .get(`/api/v1/hr/employees/${memberEmpId}/experience-letter`)
      .set('Authorization', `Bearer ${adminToken}`)
      .buffer(true)
      .parse((res, callback) => {
        const chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () => callback(null, Buffer.concat(chunks)));
      });
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/pdf');
    expect(res.body.slice(0, 4).toString()).toBe('%PDF');
  });
});

// ─── HR Master Dashboard ─────────────────────────────────────────────────────

describe('HR Master Dashboard', () => {
  it('returns org-wide metrics', async () => {
    const res = await request(app)
      .get('/api/v1/hr/hr-dashboard')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    const d = res.body.data;
    expect(typeof d.totalEmployees).toBe('number');
    expect(typeof d.joiningsThisMonth).toBe('number');
    expect(typeof d.exitsThisMonth).toBe('number');
    expect(typeof d.attritionRate).toBe('number');
    expect(Array.isArray(d.byDepartment)).toBe(true);
    expect(Array.isArray(d.probationExpiringSoon)).toBe(true);
    expect(Array.isArray(d.birthdaysThisWeek)).toBe(true);
    expect(typeof d.pendingLeaveRequests).toBe('number');
    expect(typeof d.pendingReimbursements).toBe('number');
  });
});
