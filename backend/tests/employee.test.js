const request  = require('supertest');
const mongoose = require('mongoose');

process.env.NODE_ENV           = 'test';
process.env.MONGODB_URI        = 'mongodb://localhost:27017/ams_test_employee';
process.env.JWT_SECRET         = 'test_jwt_secret_32_chars_minimum_x';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_32_chars_minx';
process.env.JWT_EXPIRY         = '1h';
process.env.JWT_REFRESH_EXPIRY = '7d';
process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID = '';

const { app }   = require('../src/app');
const connectDB = require('../src/config/db');
const User      = require('../src/models/User');
const Candidate = require('../src/models/Candidate');
const Employee  = require('../src/models/Employee');

const HR_PERMS = [
  'hr:config:read', 'hr:config:update',
  'hr:candidate:read', 'hr:candidate:create', 'hr:candidate:update', 'hr:candidate:delete',
  'hr:employee:read', 'hr:employee:create', 'hr:employee:update', 'hr:employee:exit',
  'hr:document:read', 'hr:document:create',
  'hr:self:read', 'hr:self:update',
];

let token;
let adminId;
let candidateId;
let employeeId;

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) await connectDB();
  await mongoose.connection.dropDatabase();

  const admin = await User.create({
    name: 'HR Admin', email: 'hradmin@test.com',
    password: 'password123', role: 'SUPERADMIN',
    permissions: HR_PERMS,
    createdBy: new mongoose.Types.ObjectId(),
  });
  adminId = admin._id;

  const res = await request(app).post('/api/v1/auth/login').send({ email: 'hradmin@test.com', password: 'password123' });
  token = res.body.data.accessToken;

  // Create a candidate in Selected status for onboarding
  const c = await Candidate.create({
    firstName: 'Priya', lastName: 'Sharma',
    phone: '9999200001', email: 'priya@test.com',
    gender: 'Female', appliedProfile: 'DM', appliedFor: 'Full Time',
    leadSource: 'LinkedIn', status: 'Selected',
    createdBy: adminId,
  });
  candidateId = c._id.toString();
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

// ── Employee Onboarding ───────────────────────────────────────────────────────

describe('Employee Onboarding', () => {
  it('POST /hr/employees/onboard/:candidateId — onboards employee', async () => {
    const r = await request(app)
      .post(`/api/v1/hr/employees/onboard/${candidateId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        designation:    'Digital Marketing Executive',
        dateOfJoining:  '2026-05-01',
        employmentType: 'Full Time',
        officeLocation: 'Delhi',
        currentCTC:     360000,
      });
    expect(r.status).toBe(201);
    expect(r.body.data.employee.employeeCode).toMatch(/^ANK-EMP-\d{4}-\d{3}$/);
    expect(r.body.data.employee.firstName).toBe('Priya');
    employeeId = r.body.data.employee._id;
  });

  it('POST /hr/employees/onboard — 409 if already onboarded', async () => {
    const r = await request(app)
      .post(`/api/v1/hr/employees/onboard/${candidateId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ designation: 'Dup', dateOfJoining: '2026-05-01' });
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe('ALREADY_ONBOARDED');
  });
});

// ── Employee CRUD ─────────────────────────────────────────────────────────────

describe('Employee CRUD', () => {
  it('GET /hr/employees — lists employees', async () => {
    const r = await request(app)
      .get('/api/v1/hr/employees')
      .set('Authorization', `Bearer ${token}`);
    expect(r.status).toBe(200);
    expect(r.body.data.total).toBe(1);
    expect(r.body.data.employees[0].employeeCode).toBeDefined();
  });

  it('GET /hr/employees/:id — returns employee', async () => {
    const r = await request(app)
      .get(`/api/v1/hr/employees/${employeeId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(r.status).toBe(200);
    expect(r.body.data.employee._id).toBe(employeeId);
    expect(r.body.data.employee.designation).toBe('Digital Marketing Executive');
  });

  it('GET /hr/employees — filter by designation', async () => {
    const r = await request(app)
      .get('/api/v1/hr/employees?designation=digital')
      .set('Authorization', `Bearer ${token}`);
    expect(r.status).toBe(200);
    expect(r.body.data.employees.length).toBe(1);
  });

  it('GET /hr/employees — filter by non-existing designation returns 0', async () => {
    const r = await request(app)
      .get('/api/v1/hr/employees?designation=ZZZ_NOT_EXIST')
      .set('Authorization', `Bearer ${token}`);
    expect(r.status).toBe(200);
    expect(r.body.data.employees.length).toBe(0);
  });

  it('PATCH /hr/employees/:id — updates employee', async () => {
    const r = await request(app)
      .patch(`/api/v1/hr/employees/${employeeId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ designation: 'Senior DM Executive', officeLocation: 'Remote' });
    expect(r.status).toBe(200);
    expect(r.body.data.employee.designation).toBe('Senior DM Executive');
    expect(r.body.data.employee.officeLocation).toBe('Remote');
  });

  it('PATCH /hr/employees/:id — employeeCode remains immutable', async () => {
    const before = (await request(app).get(`/api/v1/hr/employees/${employeeId}`).set('Authorization', `Bearer ${token}`)).body.data.employee.employeeCode;
    const r = await request(app)
      .patch(`/api/v1/hr/employees/${employeeId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ employeeCode: 'HACKED-CODE' });
    const after = (await request(app).get(`/api/v1/hr/employees/${employeeId}`).set('Authorization', `Bearer ${token}`)).body.data.employee.employeeCode;
    expect(after).toBe(before);
  });
});

// ── Employee Code Sequence ────────────────────────────────────────────────────

describe('Employee Code Auto-Sequence', () => {
  it('Second onboarding gets next sequence number', async () => {
    const c2 = await Candidate.create({
      firstName: 'Rahul', lastName: 'Dev',
      phone: '9999200002', email: 'rahul@test.com',
      gender: 'Male', appliedProfile: 'Development', appliedFor: 'Full Time',
      leadSource: 'LinkedIn', status: 'Selected',
      createdBy: adminId,
    });
    const r = await request(app)
      .post(`/api/v1/hr/employees/onboard/${c2._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ designation: 'Developer', dateOfJoining: '2026-05-01', employmentType: 'Full Time' });
    expect(r.status).toBe(201);
    const code = r.body.data.employee.employeeCode;
    const seq  = parseInt(code.split('-').pop(), 10);
    expect(seq).toBe(2);
  });
});

// ── Family Members ────────────────────────────────────────────────────────────

describe('Family Members', () => {
  it('POST /hr/employees/:id/family — adds family member', async () => {
    const r = await request(app)
      .post(`/api/v1/hr/employees/${employeeId}/family`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Ramesh Sharma', relation: 'Father', contact: '9988776655', isNominee: true });
    expect(r.status).toBe(201);
    expect(r.body.data.member.relation).toBe('Father');
    expect(r.body.data.member.isNominee).toBe(true);
  });

  it('GET /hr/employees/:id/family — lists family members', async () => {
    const r = await request(app)
      .get(`/api/v1/hr/employees/${employeeId}/family`)
      .set('Authorization', `Bearer ${token}`);
    expect(r.status).toBe(200);
    expect(r.body.data.members.length).toBe(1);
    expect(r.body.data.members[0].name).toBe('Ramesh Sharma');
  });
});

// ── Exit Workflow ─────────────────────────────────────────────────────────────

describe('Exit Workflow', () => {
  it('POST /hr/employees/:id/exit — initiates exit', async () => {
    const r = await request(app)
      .post(`/api/v1/hr/employees/${employeeId}/exit`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        exitDate: '2026-06-30',
        exitReason: 'Better opportunity',
        resignationDate: '2026-06-01',
      });
    expect(r.status).toBe(200);
    expect(r.body.data.employee.employmentStatus).toBe('resigned');
    expect(r.body.data.employee.exitInfo.exitReason).toBe('Better opportunity');
  });

  it('GET /hr/employees/:id — reflects resigned status', async () => {
    const r = await request(app)
      .get(`/api/v1/hr/employees/${employeeId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(r.body.data.employee.employmentStatus).toBe('resigned');
  });
});

// ── Self-Service ──────────────────────────────────────────────────────────────

describe('Self-Service', () => {
  it('GET /hr/me/profile — returns 404 when no employee linked to user', async () => {
    // The admin user doesn't have an employee record linked
    const r = await request(app)
      .get('/api/v1/hr/me/profile')
      .set('Authorization', `Bearer ${token}`);
    expect(r.status).toBe(404);
    expect(r.body.error.code).toBe('NOT_FOUND');
  });

  it('GET /hr/me/profile — returns profile when employee userId is linked', async () => {
    // Link the admin user to the first employee
    await Employee.findByIdAndUpdate(employeeId, { userId: adminId });

    const r = await request(app)
      .get('/api/v1/hr/me/profile')
      .set('Authorization', `Bearer ${token}`);
    expect(r.status).toBe(200);
    expect(r.body.data.employee.firstName).toBe('Priya');
  });

  it('PATCH /hr/me/profile — updates own personal info', async () => {
    const r = await request(app)
      .patch('/api/v1/hr/me/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ phone: '9876543210', bloodGroup: 'B+' });
    expect(r.status).toBe(200);
    expect(r.body.data.employee.phone).toBe('9876543210');
    expect(r.body.data.employee.bloodGroup).toBe('B+');
  });
});
