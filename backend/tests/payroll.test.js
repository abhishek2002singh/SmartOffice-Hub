const request  = require('supertest');
const mongoose = require('mongoose');

process.env.NODE_ENV           = 'test';
process.env.MONGODB_URI        = 'mongodb://localhost:27017/ams_test_payroll';
process.env.JWT_SECRET         = 'test_jwt_secret_32_chars_minimum_x';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_32_chars_minx';
process.env.JWT_EXPIRY         = '1h';
process.env.JWT_REFRESH_EXPIRY = '7d';
process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID = '';

const { app }   = require('../src/app');
const connectDB = require('../src/config/db');
const User      = require('../src/models/User');
const Employee  = require('../src/models/Employee');
const Attendance = require('../src/models/Attendance');

const ADMIN_PERMS = [
  'hr:employee:read', 'hr:employee:create', 'hr:employee:update',
  'hr:salary:read', 'hr:salary:update',
  'hr:payroll:process', 'hr:payroll:disburse',
  'hr:reimbursement:create', 'hr:reimbursement:read', 'hr:reimbursement:update',
  'hr:bonus:create', 'hr:bonus:read', 'hr:bonus:update',
  'hr:self:read', 'hr:self:update',
  'hr:attendance:read', 'hr:attendance:create', 'hr:attendance:update',
];

let token;
let adminId;
let employeeId;
let structureId;

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) await connectDB();
  await mongoose.connection.dropDatabase();

  const admin = await User.create({
    name: 'Payroll Admin', email: 'payroll@test.com',
    password: 'password123', role: 'SUPERADMIN',
    permissions: ADMIN_PERMS,
    createdBy: new mongoose.Types.ObjectId(),
  });
  adminId = admin._id;

  const emp = await Employee.create({
    firstName: 'Priya', lastName: 'Sharma',
    employeeCode: 'ANK-EMP-2026-001',
    userId: adminId,
    dateOfJoining: new Date('2026-01-01'),
    employmentStatus: 'confirmed',
    createdBy: adminId,
  });
  employeeId = emp._id;

  const res = await request(app).post('/api/v1/auth/login').send({ email: 'payroll@test.com', password: 'password123' });
  token = res.body.data.accessToken;
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

// ── Salary Structures ─────────────────────────────────────────────────────────

describe('Salary Structures CRUD', () => {
  it('POST /hr/salary-structures — creates structure', async () => {
    const r = await request(app)
      .post('/api/v1/hr/salary-structures')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Standard',
        basicPercent: 40,
        hraPercent: 20,
        allowances: [{ name: 'Travel', value: 1500, isPercent: false, taxable: false }],
        deductions: [{ name: 'PF', value: 12, isPercent: true, type: 'pf' }],
      });
    expect(r.status).toBe(201);
    expect(r.body.data.structure.name).toBe('Standard');
    structureId = r.body.data.structure._id;
  });

  it('GET /hr/salary-structures — lists structures', async () => {
    const r = await request(app)
      .get('/api/v1/hr/salary-structures')
      .set('Authorization', `Bearer ${token}`);
    expect(r.status).toBe(200);
    expect(r.body.data.structures.length).toBe(1);
  });

  it('POST /hr/salary-structures — 409 on duplicate name', async () => {
    const r = await request(app)
      .post('/api/v1/hr/salary-structures')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Standard', basicPercent: 40, hraPercent: 20 });
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe('DUPLICATE_NAME');
  });

  it('PATCH /hr/salary-structures/:id — updates name', async () => {
    const r = await request(app)
      .patch(`/api/v1/hr/salary-structures/${structureId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Standard Plan' });
    expect(r.status).toBe(200);
    expect(r.body.data.structure.name).toBe('Standard Plan');
  });
});

// ── Employee Salary Assignment ─────────────────────────────────────────────────

describe('Employee Salary Assignment', () => {
  it('POST /hr/employees/:id/salary — assigns salary', async () => {
    const r = await request(app)
      .post(`/api/v1/hr/employees/${employeeId}/salary`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        structureId,
        ctc: 360000,  // ₹30,000/month gross
        effectiveFrom: '2026-01-01',
        revisedReason: 'Initial assignment',
      });
    expect(r.status).toBe(201);
    expect(r.body.data.salary.ctc).toBe(360000);
    expect(r.body.data.salary.basic).toBeGreaterThan(0);
    expect(r.body.data.salary.grossMonthly).toBeGreaterThan(0);
    expect(r.body.data.salary.netMonthly).toBeGreaterThan(0);
    expect(r.body.data.salary.isActive).toBe(true);
  });

  it('POST salary again — deactivates previous, creates new active record', async () => {
    const r = await request(app)
      .post(`/api/v1/hr/employees/${employeeId}/salary`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        structureId,
        ctc: 480000,  // revised up
        effectiveFrom: '2026-04-01',
        revisedReason: 'Annual appraisal',
      });
    expect(r.status).toBe(201);
    expect(r.body.data.salary.ctc).toBe(480000);

    const hist = await request(app)
      .get(`/api/v1/hr/employees/${employeeId}/salary-history`)
      .set('Authorization', `Bearer ${token}`);
    expect(hist.status).toBe(200);
    expect(hist.body.data.history.length).toBe(2);
    const active = hist.body.data.history.find(h => h.isActive);
    expect(active.ctc).toBe(480000);
  });

  it('Derived fields: basic = 40% of monthly CTC, HRA = 20% of basic', async () => {
    const hist = await request(app)
      .get(`/api/v1/hr/employees/${employeeId}/salary-history`)
      .set('Authorization', `Bearer ${token}`);
    const active = hist.body.data.history.find(h => h.isActive);
    const monthlyCtc = 480000 / 12;
    const expectedBasic = Math.round(monthlyCtc * 0.40 * 100) / 100;
    const expectedHRA   = Math.round(expectedBasic * 0.20 * 100) / 100;
    expect(active.basic).toBeCloseTo(expectedBasic, 1);
    expect(active.hra).toBeCloseTo(expectedHRA, 1);
  });
});

// ── Payroll Run ────────────────────────────────────────────────────────────────

describe('Payroll: Process + Disburse', () => {
  let runId;
  let payslipId;
  const month = 4; // April
  const year  = 2026;

  it('POST /hr/payroll/process — creates payroll run with payslips', async () => {
    const r = await request(app)
      .post('/api/v1/hr/payroll/process')
      .set('Authorization', `Bearer ${token}`)
      .send({ month, year });
    expect(r.status).toBe(200);
    expect(r.body.data.run.status).toBe('processed');
    expect(r.body.data.run.totalEmployees).toBe(1);
    expect(r.body.data.run.totalAmount).toBeGreaterThan(0);
    expect(r.body.data.payslips.length).toBe(1);
    runId    = r.body.data.run._id;
    payslipId = r.body.data.payslips[0]._id;
  });

  it('POST /hr/payroll/process again — 409 on duplicate period', async () => {
    const r = await request(app)
      .post('/api/v1/hr/payroll/process')
      .set('Authorization', `Bearer ${token}`)
      .send({ month, year });
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe('PAYROLL_ALREADY_PROCESSED');
  });

  it('GET /hr/payroll — lists runs', async () => {
    const r = await request(app)
      .get('/api/v1/hr/payroll')
      .set('Authorization', `Bearer ${token}`);
    expect(r.status).toBe(200);
    expect(r.body.data.runs.length).toBeGreaterThan(0);
  });

  it('GET /hr/payroll/:id — returns run with payslips', async () => {
    const r = await request(app)
      .get(`/api/v1/hr/payroll/${runId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(r.status).toBe(200);
    expect(r.body.data.payslips.length).toBe(1);
  });

  it('Payslip: grossEarnings = basic + hra + allowances', async () => {
    const r = await request(app)
      .get(`/api/v1/hr/payslips/${payslipId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(r.status).toBe(200);
    const slip = r.body.data.slip;
    const sumEarnings = slip.basicEarned + slip.hraEarned
      + slip.allowancesBreakdown.reduce((s, a) => s + a.amount, 0)
      + slip.bonusAmount + slip.reimbursementAmount;
    expect(Math.abs(sumEarnings - slip.grossEarnings)).toBeLessThan(0.1);
  });

  it('Payslip: netPay = gross - totalDeductions', async () => {
    const r = await request(app)
      .get(`/api/v1/hr/payslips/${payslipId}`)
      .set('Authorization', `Bearer ${token}`);
    const slip = r.body.data.slip;
    expect(Math.abs(slip.netPay - (slip.grossEarnings - slip.totalDeductions))).toBeLessThan(0.1);
  });

  it('GET /hr/me/payslips — employee sees own payslips', async () => {
    const r = await request(app)
      .get('/api/v1/hr/me/payslips')
      .set('Authorization', `Bearer ${token}`);
    expect(r.status).toBe(200);
    expect(r.body.data.payslips.length).toBeGreaterThan(0);
  });

  it('PATCH /hr/payroll/:id/disburse — marks disbursed', async () => {
    const r = await request(app)
      .patch(`/api/v1/hr/payroll/${runId}/disburse`)
      .set('Authorization', `Bearer ${token}`);
    expect(r.status).toBe(200);
    expect(r.body.data.run.status).toBe('disbursed');
    expect(r.body.data.run.disbursedAt).toBeTruthy();
  });

  it('PATCH disburse again — 400 invalid state', async () => {
    const r = await request(app)
      .patch(`/api/v1/hr/payroll/${runId}/disburse`)
      .set('Authorization', `Bearer ${token}`);
    expect(r.status).toBe(400);
    expect(r.body.error.code).toBe('INVALID_STATE');
  });
});

// ── LOP Deduction ─────────────────────────────────────────────────────────────

describe('Payroll: LOP deduction from absent days', () => {
  it('Absent days reduce paidDays in payslip', async () => {
    // Mark employee absent on 2026-05-04 (Monday)
    await Attendance.create({
      employeeId,
      date: new Date('2026-05-04T00:00:00.000Z'),
      status: 'absent',
    });

    const r = await request(app)
      .post('/api/v1/hr/payroll/process')
      .set('Authorization', `Bearer ${token}`)
      .send({ month: 5, year: 2026 });
    expect(r.status).toBe(200);
    const slip = r.body.data.payslips[0];
    expect(slip.lopDays).toBe(1);
    expect(slip.paidDays).toBe(slip.workingDays - 1);
    // paidDays < workingDays confirms LOP deduction reduced paid days
    expect(slip.paidDays).toBeLessThan(slip.workingDays);
  });
});

// ── Reimbursements ─────────────────────────────────────────────────────────────

describe('Reimbursements', () => {
  let reimbId;

  it('POST /hr/reimbursements — submits request', async () => {
    const r = await request(app)
      .post('/api/v1/hr/reimbursements')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'travel', amount: 500, billDate: '2026-04-10', description: 'Cab to client' });
    expect(r.status).toBe(201);
    expect(r.body.data.reimbursement.status).toBe('pending');
    reimbId = r.body.data.reimbursement._id;
  });

  it('GET /hr/reimbursements — lists pending', async () => {
    const r = await request(app)
      .get('/api/v1/hr/reimbursements?status=pending')
      .set('Authorization', `Bearer ${token}`);
    expect(r.status).toBe(200);
    expect(r.body.data.reimbursements.some(x => x._id === reimbId)).toBe(true);
  });

  it('PATCH /hr/reimbursements/:id/review — approves', async () => {
    const r = await request(app)
      .patch(`/api/v1/hr/reimbursements/${reimbId}/review`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'approved', reviewerNotes: 'Looks valid' });
    expect(r.status).toBe(200);
    expect(r.body.data.reimbursement.status).toBe('approved');
  });

  it('PATCH review again — 409 already reviewed', async () => {
    const r = await request(app)
      .patch(`/api/v1/hr/reimbursements/${reimbId}/review`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'rejected' });
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe('INVALID_STATE');
  });
});

// ── Bonuses ──────────────────────────────────────────────────────────────────

describe('Bonus Management', () => {
  let bonusId;

  it('POST /hr/bonuses — creates bonus', async () => {
    const r = await request(app)
      .post('/api/v1/hr/bonuses')
      .set('Authorization', `Bearer ${token}`)
      .send({ employeeId: employeeId.toString(), type: 'festival', amount: 5000, reason: 'Diwali', payableMonth: 10, payableYear: 2026 });
    expect(r.status).toBe(201);
    expect(r.body.data.bonus.status).toBe('planned');
    bonusId = r.body.data.bonus._id;
  });

  it('GET /hr/bonuses — lists bonuses', async () => {
    const r = await request(app)
      .get('/api/v1/hr/bonuses?year=2026')
      .set('Authorization', `Bearer ${token}`);
    expect(r.status).toBe(200);
    expect(r.body.data.bonuses.length).toBeGreaterThan(0);
  });

  it('PATCH /hr/bonuses/:id — updates amount', async () => {
    const r = await request(app)
      .patch(`/api/v1/hr/bonuses/${bonusId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 6000 });
    expect(r.status).toBe(200);
    expect(r.body.data.bonus.amount).toBe(6000);
  });

  it('Payroll includes planned bonus in same month', async () => {
    // bonus month=10, year=2026
    const r = await request(app)
      .post('/api/v1/hr/payroll/process')
      .set('Authorization', `Bearer ${token}`)
      .send({ month: 10, year: 2026 });
    expect(r.status).toBe(200);
    const slip = r.body.data.payslips[0];
    expect(slip.bonusAmount).toBe(6000);
    expect(slip.grossEarnings).toBeGreaterThan(slip.basicEarned + slip.hraEarned);
  });

  it('DELETE /hr/bonuses/:id — returns 404 if not planned', async () => {
    // bonus is now included_in_payroll after process
    const r = await request(app)
      .delete(`/api/v1/hr/bonuses/${bonusId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(r.status).toBe(404); // status != planned, can't delete
  });
});

// ── Form 16 Placeholder ───────────────────────────────────────────────────────

describe('Form 16 Estimate', () => {
  it('GET /hr/employees/:id/form16 — returns estimate', async () => {
    const r = await request(app)
      .get(`/api/v1/hr/employees/${employeeId}/form16?fy=2025-26`)
      .set('Authorization', `Bearer ${token}`);
    expect(r.status).toBe(200);
    expect(r.body.data.fy).toBe('2025-26');
    expect(r.body.data.note).toContain('display-only');
  });

  it('GET /hr/employees/:id/form16 — 400 without fy param', async () => {
    const r = await request(app)
      .get(`/api/v1/hr/employees/${employeeId}/form16`)
      .set('Authorization', `Bearer ${token}`);
    expect(r.status).toBe(400);
  });
});

// ── Bank File ─────────────────────────────────────────────────────────────────

describe('Bank Disbursement File', () => {
  it('GET /hr/payroll/:id/bank-file — returns CSV', async () => {
    // Find the April 2026 run (status: disbursed)
    const list = await request(app)
      .get('/api/v1/hr/payroll?year=2026')
      .set('Authorization', `Bearer ${token}`);
    const disbursed = list.body.data.runs.find(r => r.status === 'disbursed');
    expect(disbursed).toBeDefined();

    const r = await request(app)
      .get(`/api/v1/hr/payroll/${disbursed._id}/bank-file`)
      .set('Authorization', `Bearer ${token}`);
    expect(r.status).toBe(200);
    expect(r.headers['content-type']).toContain('text/csv');
    expect(r.text).toContain('Employee Code');
  });
});
