const request  = require('supertest');
const mongoose = require('mongoose');

process.env.NODE_ENV           = 'test';
process.env.MONGODB_URI        = 'mongodb://localhost:27017/ams_test_performance';
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
  'hr:performance:create', 'hr:performance:read', 'hr:performance:update', 'hr:performance:delete',
  'hr:self:evaluation:create', 'hr:self:evaluation:read',
  'hr:peer:create', 'hr:peer:read',
  'hr:employee:read', 'hr:employee:create',
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
    dateOfJoining: new Date('2026-01-01'),
    employmentStatus: 'confirmed',
    createdBy: adminId,
  });
  empId = emp._id;

  const memberEmp = await Employee.create({
    firstName: 'Team', lastName: 'Member',
    employeeCode: 'ANK-EMP-2026-002',
    userId: memberId,
    dateOfJoining: new Date('2026-01-01'),
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

// ─── KRA ─────────────────────────────────────────────────────────────────────

describe('KRA', () => {
  let kraId;

  it('creates a KRA', async () => {
    const res = await request(app)
      .post('/api/v1/hr/kras')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Lead Conversion', description: 'Sales KRA', applicableRoles: ['TEAM_MEMBER'], weightagePercent: 30 });
    expect(res.status).toBe(201);
    expect(res.body.data.kra.name).toBe('Lead Conversion');
    kraId = res.body.data.kra._id;
  });

  it('lists KRAs', async () => {
    const res = await request(app)
      .get('/api/v1/hr/kras')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.kras.length).toBeGreaterThanOrEqual(1);
  });

  it('updates a KRA', async () => {
    const res = await request(app)
      .patch(`/api/v1/hr/kras/${kraId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ weightagePercent: 40 });
    expect(res.status).toBe(200);
    expect(res.body.data.kra.weightagePercent).toBe(40);
  });

  it('soft-deletes a KRA', async () => {
    const res = await request(app)
      .delete(`/api/v1/hr/kras/${kraId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);

    const list = await request(app)
      .get('/api/v1/hr/kras')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(list.body.data.kras.find(k => k._id === kraId)).toBeUndefined();
  });
});

// ─── Performance Cycles ────────────────────────────────────────────────────────

describe('Performance Cycles', () => {
  let cycleId;

  it('creates a performance cycle', async () => {
    const res = await request(app)
      .post('/api/v1/hr/performance-cycles')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Q1 2026', type: 'quarterly', startDate: '2026-01-01', endDate: '2026-03-31' });
    expect(res.status).toBe(201);
    expect(res.body.data.cycle.status).toBe('planned');
    cycleId = res.body.data.cycle._id;
  });

  it('lists cycles', async () => {
    const res = await request(app)
      .get('/api/v1/hr/performance-cycles')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.cycles)).toBe(true);
  });

  it('activates a cycle', async () => {
    const res = await request(app)
      .patch(`/api/v1/hr/performance-cycles/${cycleId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'active' });
    expect(res.status).toBe(200);
    expect(res.body.data.cycle.status).toBe('active');
  });

  it('requires all fields on create', async () => {
    const res = await request(app)
      .post('/api/v1/hr/performance-cycles')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Missing dates' });
    expect(res.status).toBe(400);
  });

  // Export cycleId for use in subsequent tests
  afterAll(() => { global._perfCycleId = cycleId; });
});

// ─── Goals ─────────────────────────────────────────────────────────────────────

describe('Goals', () => {
  let goalId;

  beforeAll(() => { /* cycleId set by previous describe */ });

  it('sets goals for an employee', async () => {
    const cycleId = global._perfCycleId;
    const res = await request(app)
      .post(`/api/v1/hr/employees/${empId}/goals`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        cycleId,
        goals: [
          { title: 'Close 10 deals', targetValue: '10 deals', weightagePercent: 50 },
          { title: 'Improve CSAT',   targetValue: '4.5/5',    weightagePercent: 50 },
        ],
      });
    expect(res.status).toBe(201);
    expect(res.body.data.goals).toHaveLength(2);
    goalId = res.body.data.goals[0]._id;
    global._goalId = goalId;
  });

  it('lists goals filtered by cycleId', async () => {
    const cycleId = global._perfCycleId;
    const res = await request(app)
      .get(`/api/v1/hr/employees/${empId}/goals?cycleId=${cycleId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.goals.length).toBeGreaterThanOrEqual(2);
  });

  it('updates goal status to in_progress', async () => {
    const res = await request(app)
      .patch(`/api/v1/hr/employees/${empId}/goals/${goalId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'in_progress', achievedValue: '6 deals' });
    expect(res.status).toBe(200);
    expect(res.body.data.goal.status).toBe('in_progress');
    expect(res.body.data.goal.achievedValue).toBe('6 deals');
  });

  it('soft-deletes a goal', async () => {
    const cycleId = global._perfCycleId;
    // create a throwaway goal
    const cr = await request(app)
      .post(`/api/v1/hr/employees/${empId}/goals`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ cycleId, goals: [{ title: 'Temp goal', weightagePercent: 0 }] });
    const tempId = cr.body.data.goals[0]._id;

    const dr = await request(app)
      .delete(`/api/v1/hr/employees/${empId}/goals/${tempId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(dr.status).toBe(200);
  });
});

// ─── Self Evaluation ───────────────────────────────────────────────────────────

describe('Self Evaluation', () => {
  it('saves a draft self-evaluation', async () => {
    const cycleId = global._perfCycleId;
    const goalId  = global._goalId;
    const res = await request(app)
      .post(`/api/v1/hr/me/evaluations/${cycleId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        goalRatings: [{ goalId, selfRating: 4, comments: 'Good progress' }],
        strengths: 'Strong communication',
        improvements: 'Time management',
        trainingNeeds: 'Advanced negotiation',
        submit: false,
      });
    expect(res.status).toBe(200);
    expect(res.body.data.evaluation.strengths).toBe('Strong communication');
    expect(res.body.data.evaluation.submittedAt).toBeNull();
  });

  it('submits a self-evaluation (sets submittedAt)', async () => {
    const cycleId = global._perfCycleId;
    const goalId  = global._goalId;
    const res = await request(app)
      .post(`/api/v1/hr/me/evaluations/${cycleId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        goalRatings: [{ goalId, selfRating: 4, comments: 'Final' }],
        strengths: 'Leadership',
        improvements: 'Delegation',
        trainingNeeds: '',
        submit: true,
      });
    expect(res.status).toBe(200);
    expect(res.body.data.evaluation.submittedAt).toBeTruthy();
  });

  it('gets own self-evaluation', async () => {
    const cycleId = global._perfCycleId;
    const res = await request(app)
      .get(`/api/v1/hr/me/evaluations/${cycleId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.evaluation).not.toBeNull();
  });

  it('returns null evaluation when none exists', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .get(`/api/v1/hr/me/evaluations/${fakeId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.evaluation).toBeNull();
  });
});

// ─── Manager Evaluation ────────────────────────────────────────────────────────

describe('Manager Evaluation', () => {
  let managerEvalId;

  it('saves a manager evaluation draft', async () => {
    const cycleId = global._perfCycleId;
    const goalId  = global._goalId;
    const res = await request(app)
      .post(`/api/v1/hr/employees/${empId}/manager-evaluation/${cycleId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        cycleId,
        goalRatings: [{ goalId, managerRating: 4, comments: 'Solid work' }],
        overallRating: 4,
        strengths: 'Reliable team player',
        improvements: 'Initiative',
        incrementRecommendation: 8,
        promotionRecommendation: false,
        submit: false,
      });
    expect(res.status).toBe(200);
    expect(res.body.data.evaluation.overallRating).toBe(4);
    expect(res.body.data.evaluation.incrementRecommendation).toBe(8);
    managerEvalId = res.body.data.evaluation._id;
  });

  it('submits the manager evaluation', async () => {
    const cycleId = global._perfCycleId;
    const res = await request(app)
      .post(`/api/v1/hr/employees/${empId}/manager-evaluation/${cycleId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        cycleId,
        goalRatings: [],
        overallRating: 5,
        strengths: 'Outstanding',
        improvements: 'None',
        incrementRecommendation: 15,
        promotionRecommendation: true,
        submit: true,
      });
    expect(res.status).toBe(200);
    expect(res.body.data.evaluation.submittedAt).toBeTruthy();
    expect(res.body.data.evaluation.promotionRecommendation).toBe(true);
  });

  it('gets manager evaluation', async () => {
    const cycleId = global._perfCycleId;
    const res = await request(app)
      .get(`/api/v1/hr/employees/${empId}/manager-evaluation/${cycleId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.evaluation).not.toBeNull();
  });

  it('requires overallRating', async () => {
    const cycleId = global._perfCycleId;
    const res = await request(app)
      .post(`/api/v1/hr/employees/${empId}/manager-evaluation/${cycleId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ cycleId, goalRatings: [] });
    expect(res.status).toBe(400);
  });
});

// ─── Peer Feedback ─────────────────────────────────────────────────────────────

describe('Peer Feedback', () => {
  it('submits anonymous peer feedback', async () => {
    const cycleId = global._perfCycleId;
    const res = await request(app)
      .post('/api/v1/hr/peer-feedback')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        evaluateeId: empId.toString(),
        cycleId,
        ratings: { teamwork: 4, communication: 5, reliability: 4, innovation: 3, leadership: 4 },
        comments: 'Great collaborator',
        anonymous: true,
      });
    expect(res.status).toBe(201);
    expect(res.body.data.feedback.anonymous).toBe(true);
  });

  it('prevents self-feedback', async () => {
    const cycleId = global._perfCycleId;
    const res = await request(app)
      .post('/api/v1/hr/peer-feedback')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        evaluateeId: empId.toString(),
        cycleId,
        ratings: { teamwork: 3, communication: 3, reliability: 3, innovation: 3, leadership: 3 },
        anonymous: false,
      });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('SELF_FEEDBACK');
  });

  it('lists peer feedback (hides evaluatorId from non-admin for anonymous)', async () => {
    const cycleId = global._perfCycleId;
    const res = await request(app)
      .get(`/api/v1/hr/employees/${empId}/peer-feedback?cycleId=${cycleId}`)
      .set('Authorization', `Bearer ${memberToken}`);
    expect(res.status).toBe(200);
    const fb = res.body.data.feedbacks[0];
    expect(fb).toBeDefined();
    expect(fb.evaluatorId).toBeUndefined();
  });

  it('admin can see evaluatorId on anonymous feedback', async () => {
    const cycleId = global._perfCycleId;
    const res = await request(app)
      .get(`/api/v1/hr/employees/${empId}/peer-feedback?cycleId=${cycleId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.feedbacks[0].evaluatorId).toBeDefined();
  });
});

// ─── Performance View (combined) ──────────────────────────────────────────────

describe('Performance View', () => {
  it('returns combined self + manager + goals + peer summary', async () => {
    const cycleId = global._perfCycleId;
    const res = await request(app)
      .get(`/api/v1/hr/employees/${empId}/performance/${cycleId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    const { goals, selfEval, managerEval, peerSummary } = res.body.data;
    expect(Array.isArray(goals)).toBe(true);
    expect(selfEval).not.toBeNull();
    expect(managerEval).not.toBeNull();
    expect(peerSummary).not.toBeNull();
    expect(typeof peerSummary.avgTeamwork).toBe('number');
  });

  it('blocks non-admin from viewing another employee', async () => {
    const cycleId = global._perfCycleId;
    const res = await request(app)
      .get(`/api/v1/hr/employees/${empId}/performance/${cycleId}`)
      .set('Authorization', `Bearer ${memberToken}`);
    // member's employee is memberEmpId, not empId — should be forbidden
    expect(res.status).toBe(403);
  });
});

// ─── 1-on-1 Meetings ─────────────────────────────────────────────────────────

describe('One-on-One Meetings', () => {
  let meetingId;

  it('creates a 1-on-1 meeting', async () => {
    const res = await request(app)
      .post('/api/v1/hr/one-on-ones')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        employeeId: empId.toString(),
        scheduledAt: new Date(Date.now() + 86400000).toISOString(),
        agenda: 'Quarterly check-in',
      });
    expect(res.status).toBe(201);
    expect(res.body.data.meeting.status).toBe('scheduled');
    meetingId = res.body.data.meeting._id;
  });

  it('lists meetings', async () => {
    const res = await request(app)
      .get('/api/v1/hr/one-on-ones')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.meetings.length).toBeGreaterThanOrEqual(1);
  });

  it('adds notes and action items', async () => {
    const res = await request(app)
      .patch(`/api/v1/hr/one-on-ones/${meetingId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        notes: 'Discussed Q1 goals and blockers.',
        actionItems: [
          { text: 'Share deal pipeline doc', dueDate: '2026-02-01', completed: false },
        ],
      });
    expect(res.status).toBe(200);
    expect(res.body.data.meeting.notes).toBe('Discussed Q1 goals and blockers.');
    expect(res.body.data.meeting.actionItems).toHaveLength(1);
  });

  it('marks meeting completed', async () => {
    const res = await request(app)
      .patch(`/api/v1/hr/one-on-ones/${meetingId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'completed', conductedAt: new Date().toISOString() });
    expect(res.status).toBe(200);
    expect(res.body.data.meeting.status).toBe('completed');
  });

  it('requires employeeId + scheduledAt', async () => {
    const res = await request(app)
      .post('/api/v1/hr/one-on-ones')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ agenda: 'Missing required fields' });
    expect(res.status).toBe(400);
  });
});

// ─── PIP ───────────────────────────────────────────────────────────────────────

describe('PIP (Performance Improvement Plan)', () => {
  let pipId;

  it('creates a PIP', async () => {
    const res = await request(app)
      .post('/api/v1/hr/pips')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        employeeId: memberEmpId.toString(),
        startDate: '2026-02-01',
        endDate:   '2026-04-30',
        reason: 'Consistently missing monthly targets',
        expectations: ['Achieve 8 deals/month', 'Attend all weekly standups'],
      });
    expect(res.status).toBe(201);
    expect(res.body.data.pip.status).toBe('active');
    expect(res.body.data.pip.expectations).toHaveLength(2);
    pipId = res.body.data.pip._id;
  });

  it('prevents duplicate active PIP for same employee', async () => {
    const res = await request(app)
      .post('/api/v1/hr/pips')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        employeeId: memberEmpId.toString(),
        startDate: '2026-03-01',
        endDate:   '2026-05-31',
        reason: 'Another PIP attempt',
      });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ACTIVE_PIP_EXISTS');
  });

  it('lists PIPs', async () => {
    const res = await request(app)
      .get('/api/v1/hr/pips?status=active')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.pips.length).toBeGreaterThanOrEqual(1);
  });

  it('adds a progress review', async () => {
    const res = await request(app)
      .post(`/api/v1/hr/pips/${pipId}/reviews`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ progressRating: 'needs_improvement', notes: 'Some improvement but targets still missed' });
    expect(res.status).toBe(200);
    expect(res.body.data.pip.reviews).toHaveLength(1);
    expect(res.body.data.pip.reviews[0].progressRating).toBe('needs_improvement');
  });

  it('closes a PIP with outcome', async () => {
    const res = await request(app)
      .patch(`/api/v1/hr/pips/${pipId}/close`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'failed', closingNotes: 'Targets not met after 3 months' });
    expect(res.status).toBe(200);
    expect(res.body.data.pip.status).toBe('failed');
    expect(res.body.data.pip.closingNotes).toBe('Targets not met after 3 months');
  });

  it('allows new PIP after previous is closed', async () => {
    const res = await request(app)
      .post('/api/v1/hr/pips')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        employeeId: memberEmpId.toString(),
        startDate: '2026-05-01',
        endDate:   '2026-07-31',
        reason: 'New PIP after closure',
      });
    expect(res.status).toBe(201);
    expect(res.body.data.pip.status).toBe('active');
    // close this one too to keep data clean
    await request(app)
      .patch(`/api/v1/hr/pips/${res.body.data.pip._id}/close`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'withdrawn', closingNotes: 'Withdrawn for test cleanup' });
  });
});

// ─── Performance Report ────────────────────────────────────────────────────────

describe('Performance Report', () => {
  it('returns org-wide report for a cycle', async () => {
    const cycleId = global._perfCycleId;
    const res = await request(app)
      .get(`/api/v1/hr/reports/performance?cycleId=${cycleId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    const { totalEvaluated, distribution, topPerformers } = res.body.data;
    expect(typeof totalEvaluated).toBe('number');
    expect(distribution).toBeDefined();
    expect(Array.isArray(topPerformers)).toBe(true);
  });

  it('requires cycleId', async () => {
    const res = await request(app)
      .get('/api/v1/hr/reports/performance')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(400);
  });
});
