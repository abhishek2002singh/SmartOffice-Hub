const request  = require('supertest');
const mongoose = require('mongoose');

process.env.NODE_ENV           = 'test';
process.env.MONGODB_URI        = 'mongodb://localhost:27017/ams_test_hr';
process.env.JWT_SECRET         = 'test_jwt_secret_32_chars_minimum_x';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_32_chars_minx';
process.env.JWT_EXPIRY         = '1h';
process.env.JWT_REFRESH_EXPIRY = '7d';
process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID = '';

const { app }   = require('../src/app');
const connectDB = require('../src/config/db');
const User      = require('../src/models/User');
const Candidate = require('../src/models/Candidate');

const HR_PERMS = [
  'hr:config:read', 'hr:config:update',
  'hr:candidate:read', 'hr:candidate:create', 'hr:candidate:update', 'hr:candidate:delete',
  'hr:bulk_import:create',
  'hr:followup:read', 'hr:followup:create', 'hr:followup:update', 'hr:followup:delete',
  'hr:interview:read', 'hr:interview:create', 'hr:interview:update', 'hr:interview:delete',
];

let token;
let adminId;
let candidateId;
let followupId;
let interviewId;

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
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

// ── HRConfig ─────────────────────────────────────────────────────────────────

describe('HR Config', () => {
  it('GET /hr/config — creates and returns config singleton', async () => {
    const r = await request(app).get('/api/v1/hr/config').set('Authorization', `Bearer ${token}`);
    expect(r.status).toBe(200);
    expect(r.body.data.config).toBeDefined();
    expect(r.body.data.config.employeeId).toBeDefined();
  });

  it('PATCH /hr/config — updates attendance settings', async () => {
    const r = await request(app)
      .patch('/api/v1/hr/config')
      .set('Authorization', `Bearer ${token}`)
      .send({ attendance: { ipRestrictionEnabled: true, gracePeriodMinutes: 10, workDayHours: 9 } });
    expect(r.status).toBe(200);
    expect(r.body.data.config.attendance.gracePeriodMinutes).toBe(10);
    expect(r.body.data.config.attendance.ipRestrictionEnabled).toBe(true);
  });
});

// ── Candidates — CRUD ────────────────────────────────────────────────────────

describe('Candidate CRUD', () => {
  it('POST /hr/candidates — creates a candidate', async () => {
    const r = await request(app)
      .post('/api/v1/hr/candidates')
      .set('Authorization', `Bearer ${token}`)
      .send({
        firstName: 'Rahul', lastName: 'Sharma',
        phone: '9999100001', email: 'rahul@test.com',
        gender: 'Male', appliedProfile: 'Sales',
        appliedFor: 'Full Time', leadSource: 'LinkedIn',
        totalExperience: 2, expectedSalary: 25000,
      });
    expect(r.status).toBe(201);
    expect(r.body.data.candidate.firstName).toBe('Rahul');
    expect(r.body.data.candidate.previouslyApplied).toBe(false);
    candidateId = r.body.data.candidate._id;
  });

  it('POST /hr/candidates — duplicate phone returns 409', async () => {
    const r = await request(app)
      .post('/api/v1/hr/candidates')
      .set('Authorization', `Bearer ${token}`)
      .send({
        firstName: 'Duplicate', phone: '9999100001',
        gender: 'Male', appliedProfile: 'DM',
        appliedFor: 'Full Time', leadSource: 'Indeed',
      });
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe('DUPLICATE_CANDIDATE');
    expect(r.body.error.duplicateId).toBeDefined();
  });

  it('POST /hr/candidates — duplicate with override succeeds and marks previouslyApplied', async () => {
    const r = await request(app)
      .post('/api/v1/hr/candidates')
      .set('Authorization', `Bearer ${token}`)
      .send({
        firstName: 'Rahul2', phone: '9999100001',
        gender: 'Male', appliedProfile: 'DM',
        appliedFor: 'Full Time', leadSource: 'Indeed',
        overrideDuplicate: true, overrideNote: 'Different profile',
      });
    expect(r.status).toBe(201);
    expect(r.body.data.candidate.previouslyApplied).toBe(true);
  });

  it('GET /hr/candidates — lists candidates with filters', async () => {
    const r = await request(app)
      .get('/api/v1/hr/candidates?appliedProfile=Sales')
      .set('Authorization', `Bearer ${token}`);
    expect(r.status).toBe(200);
    expect(r.body.data.candidates.length).toBeGreaterThan(0);
    expect(r.body.data.candidates.every(c => c.appliedProfile === 'Sales')).toBe(true);
  });

  it('GET /hr/candidates/:id — returns single candidate', async () => {
    const r = await request(app)
      .get(`/api/v1/hr/candidates/${candidateId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(r.status).toBe(200);
    expect(r.body.data.candidate._id).toBe(candidateId);
  });

  it('PATCH /hr/candidates/:id — updates candidate', async () => {
    const r = await request(app)
      .patch(`/api/v1/hr/candidates/${candidateId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ notes: 'Strong communication skills', callingStatus: 'Connected' });
    expect(r.status).toBe(200);
    expect(r.body.data.candidate.callingStatus).toBe('Connected');
  });

  it('PATCH /hr/candidates/:id/status — updates status', async () => {
    const r = await request(app)
      .patch(`/api/v1/hr/candidates/${candidateId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'Shortlisted' });
    expect(r.status).toBe(200);
    expect(r.body.data.candidate.status).toBe('Shortlisted');
  });

  it('PATCH /hr/candidates/:id/status — invalid status returns 400', async () => {
    const r = await request(app)
      .patch(`/api/v1/hr/candidates/${candidateId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'InvalidStatus' });
    expect(r.status).toBe(400);
  });
});

// ── Status pipeline ──────────────────────────────────────────────────────────

describe('Status pipeline', () => {
  it('Rejected status works and candidate appears in rejected pool query', async () => {
    await request(app).patch(`/api/v1/hr/candidates/${candidateId}/status`)
      .set('Authorization', `Bearer ${token}`).send({ status: 'Rejected' });
    const r = await request(app).get('/api/v1/hr/candidates?status=Rejected')
      .set('Authorization', `Bearer ${token}`);
    expect(r.body.data.candidates.some(c => c._id === candidateId)).toBe(true);
  });

  it('Re-activate from rejected — On Hold', async () => {
    const r = await request(app)
      .patch(`/api/v1/hr/candidates/${candidateId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'On Hold' });
    expect(r.status).toBe(200);
    expect(r.body.data.candidate.status).toBe('On Hold');
  });
});

// ── Follow-ups ───────────────────────────────────────────────────────────────

describe('Follow-ups', () => {
  it('POST followup — schedules a follow-up', async () => {
    const r = await request(app)
      .post(`/api/v1/hr/candidates/${candidateId}/followups`)
      .set('Authorization', `Bearer ${token}`)
      .send({ scheduledAt: new Date(Date.now() + 86400000).toISOString(), notes: 'Check availability' });
    expect(r.status).toBe(201);
    expect(r.body.data.followup.status).toBe('pending');
    followupId = r.body.data.followup._id;
  });

  it('GET followups — lists all followups for candidate', async () => {
    const r = await request(app)
      .get(`/api/v1/hr/candidates/${candidateId}/followups`)
      .set('Authorization', `Bearer ${token}`);
    expect(r.status).toBe(200);
    expect(r.body.data.followups.length).toBe(1);
  });

  it('PATCH followup — marks as completed', async () => {
    const r = await request(app)
      .patch(`/api/v1/hr/candidates/${candidateId}/followups/${followupId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'completed', outcome: 'Candidate is available from Monday' });
    expect(r.status).toBe(200);
    expect(r.body.data.followup.status).toBe('completed');
    expect(r.body.data.followup.completedAt).toBeTruthy();
  });
});

// ── Interviews ───────────────────────────────────────────────────────────────

describe('Interviews', () => {
  it('POST interview — schedules round 1', async () => {
    const r = await request(app)
      .post(`/api/v1/hr/candidates/${candidateId}/interviews`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'HR Round',
        scheduledAt: new Date(Date.now() + 86400000).toISOString(),
        interviewer: adminId,
        mode: 'in-person',
      });
    expect(r.status).toBe(201);
    expect(r.body.data.interview.round).toBe(1);
    interviewId = r.body.data.interview._id;
  });

  it('GET interviews — lists all interviews for candidate', async () => {
    const r = await request(app)
      .get(`/api/v1/hr/candidates/${candidateId}/interviews`)
      .set('Authorization', `Bearer ${token}`);
    expect(r.status).toBe(200);
    expect(r.body.data.interviews.length).toBe(1);
  });

  it('PATCH interview — adds feedback and marks completed, candidate → Interview Done', async () => {
    const r = await request(app)
      .patch(`/api/v1/hr/candidates/${candidateId}/interviews/${interviewId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'completed', feedback: 'Good communication', rating: 4, recommendation: 'proceed' });
    expect(r.status).toBe(200);
    expect(r.body.data.interview.rating).toBe(4);
    expect(r.body.data.interview.recommendation).toBe('proceed');

    // Candidate status should auto-update to 'Interview Done'
    const cr = await request(app).get(`/api/v1/hr/candidates/${candidateId}`).set('Authorization', `Bearer ${token}`);
    expect(cr.body.data.candidate.status).toBe('Interview Done');
  });

  it('Schedule auto-assigns round 2', async () => {
    const r = await request(app)
      .post(`/api/v1/hr/candidates/${candidateId}/interviews`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        scheduledAt: new Date(Date.now() + 172800000).toISOString(),
        interviewer: adminId, mode: 'video', meetingLink: 'https://meet.google.com/xyz',
      });
    expect(r.status).toBe(201);
    expect(r.body.data.interview.round).toBe(2);
  });
});

// ── Interview Scheduler ──────────────────────────────────────────────────────

describe('Interview Scheduler', () => {
  it('GET /hr/interviews/schedule — returns upcoming scheduled interviews', async () => {
    const r = await request(app)
      .get('/api/v1/hr/interviews/schedule')
      .set('Authorization', `Bearer ${token}`);
    expect(r.status).toBe(200);
    expect(Array.isArray(r.body.data.interviews)).toBe(true);
    // round 2 is still 'scheduled'
    expect(r.body.data.interviews.length).toBeGreaterThan(0);
  });
});

// ── HR Dashboard ─────────────────────────────────────────────────────────────

describe('HR Dashboard', () => {
  it('GET /hr/dashboard — returns status counts and recent candidates', async () => {
    const r = await request(app).get('/api/v1/hr/dashboard').set('Authorization', `Bearer ${token}`);
    expect(r.status).toBe(200);
    expect(r.body.data.total).toBeGreaterThan(0);
    expect(r.body.data.statusCounts).toBeDefined();
    expect(r.body.data.recentCandidates).toBeDefined();
  });
});

// ── Soft delete ──────────────────────────────────────────────────────────────

describe('Soft delete', () => {
  it('DELETE /hr/candidates/:id — soft deletes, not visible in list', async () => {
    const created = await request(app)
      .post('/api/v1/hr/candidates')
      .set('Authorization', `Bearer ${token}`)
      .send({ firstName: 'ToDelete', phone: '9111111199', gender: 'Male', appliedProfile: 'HR', appliedFor: 'Full Time', leadSource: 'Others' });
    const delId = created.body.data.candidate._id;

    await request(app).delete(`/api/v1/hr/candidates/${delId}`).set('Authorization', `Bearer ${token}`);
    const r = await request(app).get(`/api/v1/hr/candidates/${delId}`).set('Authorization', `Bearer ${token}`);
    expect(r.status).toBe(404);
  });
});
