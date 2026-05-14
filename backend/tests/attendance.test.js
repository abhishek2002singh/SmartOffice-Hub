const request  = require('supertest');
const mongoose = require('mongoose');

process.env.NODE_ENV           = 'test';
process.env.MONGODB_URI        = 'mongodb://localhost:27017/ams_test_attendance';
process.env.JWT_SECRET         = 'test_jwt_secret_32_chars_minimum_x';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_32_chars_minx';
process.env.JWT_EXPIRY         = '1h';
process.env.JWT_REFRESH_EXPIRY = '7d';
process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID = '';

const { app }   = require('../src/app');
const connectDB = require('../src/config/db');
const User      = require('../src/models/User');
const Employee  = require('../src/models/Employee');
const Candidate = require('../src/models/Candidate');
const Attendance = require('../src/models/Attendance');
const LeaveType  = require('../src/models/LeaveType');
const LeaveBalance = require('../src/models/LeaveBalance');

const HR_PERMS = [
  'hr:employee:read', 'hr:employee:create',
  'hr:attendance:read', 'hr:attendance:create', 'hr:attendance:update',
  'hr:leave:read', 'hr:leave:create', 'hr:leave:update',
  'hr:holiday:read', 'hr:holiday:create', 'hr:holiday:update', 'hr:holiday:delete',
  'hr:self:read', 'hr:self:update',
];

let token;
let adminId;
let employeeId;

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) await connectDB();
  await mongoose.connection.dropDatabase();

  const admin = await User.create({
    name: 'HR Admin', email: 'hr@test.com',
    password: 'password123', role: 'SUPERADMIN',
    permissions: HR_PERMS,
    createdBy: new mongoose.Types.ObjectId(),
  });
  adminId = admin._id;

  // Create an Employee linked to this user
  const emp = await Employee.create({
    firstName: 'Riya', lastName: 'Verma',
    employeeCode: 'ANK-EMP-2026-001',
    userId: adminId,
    dateOfJoining: new Date('2026-01-01'),
    createdBy: adminId,
  });
  employeeId = emp._id;

  // Seed a CL leave type
  await LeaveType.create({
    name: 'Casual Leave', code: 'CL',
    annualQuota: 12, halfDayAllowed: true,
  });

  const res = await request(app).post('/api/v1/auth/login').send({ email: 'hr@test.com', password: 'password123' });
  token = res.body.data.accessToken;
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

// ── Check-in / Check-out ──────────────────────────────────────────────────────

describe('Attendance: Check-in / Check-out', () => {
  it('POST /hr/attendance/check-in — checks in successfully', async () => {
    const r = await request(app)
      .post('/api/v1/hr/attendance/check-in')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(r.status).toBe(200);
    expect(r.body.data.attendance.checkIn).toBeTruthy();
    expect(['present', 'late']).toContain(r.body.data.attendance.status);
  });

  it('POST /hr/attendance/check-in — 409 on duplicate check-in', async () => {
    const r = await request(app)
      .post('/api/v1/hr/attendance/check-in')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe('ALREADY_CHECKED_IN');
  });

  it('POST /hr/attendance/check-out — checks out and calculates hours', async () => {
    const r = await request(app)
      .post('/api/v1/hr/attendance/check-out')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(r.status).toBe(200);
    expect(r.body.data.attendance.checkOut).toBeTruthy();
    expect(r.body.data.attendance.workHours).toBeGreaterThanOrEqual(0);
  });

  it('POST /hr/attendance/check-out — 409 on duplicate check-out', async () => {
    const r = await request(app)
      .post('/api/v1/hr/attendance/check-out')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe('ALREADY_CHECKED_OUT');
  });
});

// ── My Attendance ────────────────────────────────────────────────────────────

describe('Attendance: My records', () => {
  it('GET /hr/attendance/me — returns today record', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const r = await request(app)
      .get(`/api/v1/hr/attendance/me?from=${today}&to=${today}`)
      .set('Authorization', `Bearer ${token}`);
    expect(r.status).toBe(200);
    expect(r.body.data.records.length).toBeGreaterThan(0);
    expect(r.body.data.todayRecord).toBeDefined();
  });
});

// ── HR: Manual Attendance ─────────────────────────────────────────────────────

describe('Attendance: Manual override', () => {
  it('POST /hr/attendance/manual — HR can manually set attendance', async () => {
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
    const date = yesterday.toISOString().slice(0, 10);
    const r = await request(app)
      .post('/api/v1/hr/attendance/manual')
      .set('Authorization', `Bearer ${token}`)
      .send({ employeeId: employeeId.toString(), date, status: 'absent', notes: 'No show' });
    expect(r.status).toBe(200);
    expect(r.body.data.record.status).toBe('absent');
    expect(r.body.data.record.modifiedBy).toBeTruthy();
  });
});

// ── HR: Attendance List ────────────────────────────────────────────────────────

describe('Attendance: HR list', () => {
  it('GET /hr/attendance — returns attendance records', async () => {
    const r = await request(app)
      .get('/api/v1/hr/attendance')
      .set('Authorization', `Bearer ${token}`);
    expect(r.status).toBe(200);
    expect(r.body.data.records.length).toBeGreaterThan(0);
  });
});

// ── Holidays ──────────────────────────────────────────────────────────────────

describe('Holidays CRUD', () => {
  let holidayId;

  it('POST /hr/holidays — creates a holiday', async () => {
    const r = await request(app)
      .post('/api/v1/hr/holidays')
      .set('Authorization', `Bearer ${token}`)
      .send({ date: '2026-08-15', name: 'Independence Day', type: 'national' });
    expect(r.status).toBe(201);
    expect(r.body.data.holiday.name).toBe('Independence Day');
    holidayId = r.body.data.holiday._id;
  });

  it('GET /hr/holidays — lists holidays', async () => {
    const r = await request(app)
      .get('/api/v1/hr/holidays?year=2026')
      .set('Authorization', `Bearer ${token}`);
    expect(r.status).toBe(200);
    expect(r.body.data.holidays.length).toBe(1);
  });

  it('POST /hr/holidays — 409 on duplicate date', async () => {
    const r = await request(app)
      .post('/api/v1/hr/holidays')
      .set('Authorization', `Bearer ${token}`)
      .send({ date: '2026-08-15', name: 'Duplicate', type: 'national' });
    expect(r.status).toBe(409);
  });

  it('PATCH /hr/holidays/:id — updates name', async () => {
    const r = await request(app)
      .patch(`/api/v1/hr/holidays/${holidayId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Independence Day (Updated)' });
    expect(r.status).toBe(200);
    expect(r.body.data.holiday.name).toBe('Independence Day (Updated)');
  });

  it('DELETE /hr/holidays/:id — soft deletes', async () => {
    await request(app).delete(`/api/v1/hr/holidays/${holidayId}`).set('Authorization', `Bearer ${token}`);
    const r = await request(app).get('/api/v1/hr/holidays?year=2026').set('Authorization', `Bearer ${token}`);
    expect(r.body.data.holidays.length).toBe(0);
  });
});

// ── Leave Types ───────────────────────────────────────────────────────────────

describe('Leave Types', () => {
  it('GET /hr/leave-types — returns CL seeded in beforeAll', async () => {
    const r = await request(app)
      .get('/api/v1/hr/leave-types')
      .set('Authorization', `Bearer ${token}`);
    expect(r.status).toBe(200);
    expect(r.body.data.leaveTypes.some(lt => lt.code === 'CL')).toBe(true);
  });

  it('POST /hr/leave-types — creates new leave type', async () => {
    const r = await request(app)
      .post('/api/v1/hr/leave-types')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Sick Leave', code: 'SL', annualQuota: 12 });
    expect(r.status).toBe(201);
    expect(r.body.data.leaveType.code).toBe('SL');
  });

  it('POST /hr/leave-types — 409 on duplicate code', async () => {
    const r = await request(app)
      .post('/api/v1/hr/leave-types')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Dup', code: 'CL', annualQuota: 1 });
    expect(r.status).toBe(409);
  });
});

// ── Leave Request Flow ────────────────────────────────────────────────────────

describe('Leave Request: Apply → Approve flow', () => {
  let requestId;
  let clTypeId;

  beforeAll(async () => {
    const lt = await LeaveType.findOne({ code: 'CL' });
    clTypeId = lt._id.toString();

    // Create leave balance for employee
    await LeaveBalance.create({
      employeeId, leaveTypeId: clTypeId,
      year: 2026, allocated: 12, used: 0, carryForwarded: 0,
    });
  });

  it('POST /hr/leave-requests — submits leave request', async () => {
    const r = await request(app)
      .post('/api/v1/hr/leave-requests')
      .set('Authorization', `Bearer ${token}`)
      .send({
        leaveTypeId: clTypeId,
        startDate:   '2026-07-07',  // Monday
        endDate:     '2026-07-08',  // Tuesday (2 working days)
        reason:      'Personal work',
      });
    expect(r.status).toBe(201);
    expect(r.body.data.request.days).toBe(2);
    expect(r.body.data.request.status).toBe('pending');
    requestId = r.body.data.request._id;
  });

  it('GET /hr/me/leave-requests — employee sees their requests', async () => {
    const r = await request(app)
      .get('/api/v1/hr/me/leave-requests')
      .set('Authorization', `Bearer ${token}`);
    expect(r.status).toBe(200);
    expect(r.body.data.requests.length).toBe(1);
  });

  it('GET /hr/leave-requests/team — returns pending requests', async () => {
    const r = await request(app)
      .get('/api/v1/hr/leave-requests/team?status=pending')
      .set('Authorization', `Bearer ${token}`);
    expect(r.status).toBe(200);
    // SUPERADMIN sees all
    expect(Array.isArray(r.body.data.requests)).toBe(true);
  });

  it('PATCH /hr/leave-requests/:id/review — approves leave', async () => {
    const r = await request(app)
      .patch(`/api/v1/hr/leave-requests/${requestId}/review`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'approved', reviewerComments: 'Enjoy!' });
    expect(r.status).toBe(200);
    expect(r.body.data.request.status).toBe('approved');
    expect(r.body.data.request.reviewedBy).toBeTruthy();
  });

  it('Balance updated after approval: used += 2', async () => {
    const bal = await LeaveBalance.findOne({ employeeId, leaveTypeId: clTypeId, year: 2026 });
    expect(bal.used).toBe(2);
  });

  it('Attendance records created for approved leave days', async () => {
    const mon = await Attendance.findOne({
      employeeId,
      date: new Date('2026-07-07'),
    });
    expect(mon).toBeDefined();
    expect(mon.status).toBe('leave');
  });
});

// ── Cancel Leave ──────────────────────────────────────────────────────────────

describe('Leave Request: Cancel', () => {
  let reqId2;
  let clTypeId;

  beforeAll(async () => {
    const lt = await LeaveType.findOne({ code: 'CL' });
    clTypeId = lt._id.toString();
  });

  it('POST then PATCH cancel — cancels pending request', async () => {
    const r1 = await request(app)
      .post('/api/v1/hr/leave-requests')
      .set('Authorization', `Bearer ${token}`)
      .send({ leaveTypeId: clTypeId, startDate: '2026-09-01', endDate: '2026-09-01', reason: 'Day off' });
    expect(r1.status).toBe(201);
    reqId2 = r1.body.data.request._id;

    const r2 = await request(app)
      .patch(`/api/v1/hr/leave-requests/${reqId2}/cancel`)
      .set('Authorization', `Bearer ${token}`);
    expect(r2.status).toBe(200);
    expect(r2.body.data.request.status).toBe('cancelled');
  });
});

// ── Insufficient Balance ──────────────────────────────────────────────────────

describe('Leave Request: Insufficient balance', () => {
  it('Returns 400 when balance insufficient', async () => {
    const lt = await LeaveType.findOne({ code: 'CL' });
    // Force used = allocated so remaining = 0
    await LeaveBalance.findOneAndUpdate(
      { employeeId, leaveTypeId: lt._id, year: 2026 },
      { used: 12 },
    );

    const r = await request(app)
      .post('/api/v1/hr/leave-requests')
      .set('Authorization', `Bearer ${token}`)
      .send({ leaveTypeId: lt._id.toString(), startDate: '2026-10-05', endDate: '2026-10-05', reason: 'Test' });
    expect(r.status).toBe(400);
    expect(r.body.error.code).toBe('INSUFFICIENT_BALANCE');
  });
});
