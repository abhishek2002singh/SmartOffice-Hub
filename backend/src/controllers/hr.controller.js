const mongoose  = require('mongoose');
const crypto    = require('crypto');
const XLSX      = require('xlsx');
const Candidate          = require('../models/Candidate');
const CandidateFollowup  = require('../models/CandidateFollowup');
const CandidateInterview = require('../models/CandidateInterview');
const HRConfig           = require('../models/HRConfig');
const Employee           = require('../models/Employee');
const EmployeeDocument   = require('../models/EmployeeDocument');
const EmployeeFamilyMember = require('../models/EmployeeFamilyMember');
const User               = require('../models/User');
const Department         = require('../models/Department');
const { logAudit } = require('../middleware/auditLogger');

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getConfig() {
  let cfg = await HRConfig.findOne({ _singleton: 'hr_config' });
  if (!cfg) cfg = await HRConfig.create({});
  return cfg;
}

async function generateEmployeeCode() {
  const cfg = await getConfig();
  const { prefix = 'ANK-EMP', includeYear = true, nextSequence = 1, padLength = 3 } = cfg.employeeId || {};
  const seq  = String(nextSequence).padStart(padLength, '0');
  const year = new Date().getFullYear();
  const code = includeYear ? `${prefix}-${year}-${seq}` : `${prefix}-${seq}`;
  await HRConfig.updateOne({ _singleton: 'hr_config' }, { $inc: { 'employeeId.nextSequence': 1 } });
  return code;
}

function generateTempPassword() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let pwd = '';
  for (let i = 0; i < 10; i++) {
    pwd += chars.charAt(crypto.randomInt(0, chars.length));
  }
  return pwd + '@1';
}

function getDefaultPermissions(designation = '', deptName = '') {
  const role = designation.toLowerCase();
  const dept = deptName.toLowerCase();
  const base = [
    'self:profile:read', 'self:profile:update',
    'self:leave:apply', 'self:payslip:read',
    'self:attendance:checkin', 'sops:read',
  ];
  if (dept.includes('sales')) {
    if (role.includes('head') || role.includes('manager'))
      return [...base, 'crm:lead:read', 'crm:lead:update', 'crm:client:read', 'crm:report:read', 'hr:team:read'];
    return [...base, 'crm:lead:create', 'crm:lead:read', 'crm:lead:update', 'crm:client:read', 'crm:communication:create'];
  }
  if (dept.includes('digital') || dept.includes('dm') || dept.includes('marketing')) {
    if (role.includes('head') || role.includes('manager'))
      return [...base, 'dm:daily_log:read', 'dm:audit_report:approve', 'dm:client_platform:manage', 'hr:team:read'];
    return [...base, 'dm:daily_log:create', 'dm:daily_log:read', 'dm:audit_report:create', 'gd:task:create'];
  }
  if (dept.includes('graphic') || dept.includes('gd') || dept.includes('design') || dept.includes('video')) {
    if (role.includes('head') || role.includes('manager'))
      return [...base, 'gd:task:read', 'gd:task:update', 'gd:team:manage', 'hr:team:read'];
    return [...base, 'gd:task:read', 'gd:task:update', 'gd:file:upload', 'gd:comment:create'];
  }
  if (dept.includes('dev') || dept.includes('development') || dept.includes('tech')) {
    if (role.includes('head') || role.includes('manager') || role.includes('lead'))
      return [...base, 'dev:project:read', 'dev:project:update', 'dev:handover:accept', 'dev:team:manage', 'hr:team:read'];
    return [...base, 'dev:project:read', 'dev:task:create', 'dev:task:update', 'dev:bug:create', 'dev:time_log:create'];
  }
  if (dept.includes('hr') || dept.includes('human')) {
    if (role.includes('head') || role.includes('manager'))
      return [...base, 'hr:candidate:read', 'hr:candidate:create', 'hr:employee:read', 'hr:employee:update', 'hr:attendance:read', 'hr:leave:read', 'hr:payroll:read', 'sops:create'];
    return [...base, 'hr:candidate:read', 'hr:candidate:create', 'hr:employee:read', 'hr:attendance:read', 'hr:leave:read'];
  }
  return base;
}

// Attempt Google Drive upload — returns { fileId, webViewLink } or nulls on failure
async function tryDriveUpload(buffer, mimeType, fileName, folderId) {
  try {
    const { uploadFileToDrive } = require('../services/gdrive.service');
    return await uploadFileToDrive(buffer, mimeType, fileName, folderId);
  } catch (_) {
    return { fileId: '', webViewLink: '' };
  }
}

async function detectDuplicate(phone, email, excludeId = null) {
  const q = { deletedAt: null };
  if (excludeId) q._id = { $ne: excludeId };
  const orClauses = [];
  if (phone) orClauses.push({ phone });
  if (email) orClauses.push({ email });
  if (!orClauses.length) return null;
  return Candidate.findOne({ ...q, $or: orClauses }).lean();
}

// ══════════════════════════════════════════════════════════════════════════════
// HR CONFIG (skill matrices + settings)
// ══════════════════════════════════════════════════════════════════════════════

exports.getHRConfig = async (req, res) => {
  try {
    const cfg = await getConfig();
    res.json({ success: true, data: { config: cfg } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

exports.updateHRConfig = async (req, res) => {
  try {
    const cfg = await getConfig();
    const allowed = ['employeeId', 'attendance', 'payroll', 'performance', 'exit', 'skillMatrices'];
    allowed.forEach(k => { if (req.body[k] !== undefined) cfg[k] = req.body[k]; });
    await cfg.save();
    await logAudit({ userId: req.user.userId, action: 'UPDATE', resource: 'hr_config', resourceId: cfg._id, req });
    res.json({ success: true, data: { config: cfg }, message: 'HR config updated' });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// CANDIDATES — CRUD
// ══════════════════════════════════════════════════════════════════════════════

exports.listCandidates = async (req, res) => {
  try {
    const {
      q, status, appliedProfile, appliedFor, leadSource,
      gender, priority, callingStatus,
      minExp, maxExp, minSalary, maxSalary,
      skills,
      page = 1, limit = 20, sort = '-createdAt',
    } = req.query;

    const filter = { deletedAt: null };
    if (req.query.showConverted !== 'true') filter.convertedToEmployee = { $ne: true };
    if (status)         filter.status = status;
    if (appliedProfile) filter.appliedProfile = appliedProfile;
    if (appliedFor)     filter.appliedFor = appliedFor;
    if (leadSource)     filter.leadSource = leadSource;
    if (gender)         filter.gender = gender;
    if (priority)       filter.priority = priority;
    if (callingStatus)  filter.callingStatus = callingStatus;

    if (minExp !== undefined || maxExp !== undefined) {
      filter.totalExperience = {};
      if (minExp !== undefined) filter.totalExperience.$gte = +minExp;
      if (maxExp !== undefined) filter.totalExperience.$lte = +maxExp;
    }
    if (minSalary !== undefined || maxSalary !== undefined) {
      filter.expectedSalary = {};
      if (minSalary !== undefined) filter.expectedSalary.$gte = +minSalary;
      if (maxSalary !== undefined) filter.expectedSalary.$lte = +maxSalary;
    }
    if (skills) {
      const skillList = (Array.isArray(skills) ? skills : [skills]).map(s => s.trim()).filter(Boolean);
      if (skillList.length) filter['skills.skill'] = { $in: skillList };
    }
    if (q) {
      const rx = { $regex: q, $options: 'i' };
      filter.$or = [
        { firstName: rx }, { lastName: rx }, { email: rx },
        { phone: rx }, { previousCompany: rx },
      ];
    }

    const skip = (page - 1) * limit;
    const [candidates, total] = await Promise.all([
      Candidate.find(filter).sort(sort).skip(skip).limit(+limit)
        .populate('createdBy', 'name').lean(),
      Candidate.countDocuments(filter),
    ]);

    res.json({ success: true, data: { candidates, total, page: +page, pages: Math.ceil(total / limit) } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

exports.getCandidate = async (req, res) => {
  try {
    const candidate = await Candidate.findOne({ _id: req.params.id, deletedAt: null })
      .populate('createdBy', 'name')
      .populate('updatedBy', 'name')
      .populate('duplicateOf', 'firstName lastName phone');

    if (!candidate) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Candidate not found' } });
    res.json({ success: true, data: { candidate } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

exports.createCandidate = async (req, res) => {
  try {
    const { phone, email, overrideDuplicate, overrideNote, ...rest } = req.body;

    // Duplicate detection
    const dup = await detectDuplicate(phone, email);
    if (dup && !overrideDuplicate) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'DUPLICATE_CANDIDATE',
          message: 'Candidate with same phone/email already exists',
          duplicateId: dup._id,
          duplicateName: [dup.firstName, dup.lastName].join(' '),
        },
      });
    }

    const candidate = await Candidate.create({
      ...rest,
      phone,
      email,
      previouslyApplied: !!dup,
      duplicateOf:        dup ? dup._id : null,
      duplicateOverrideNote: dup && overrideDuplicate ? (overrideNote || 'HR override') : '',
      createdBy: req.user.userId,
    });

    await logAudit({ userId: req.user.userId, action: 'CREATE', resource: 'candidate', resourceId: candidate._id, after: candidate.toObject(), req });
    res.status(201).json({ success: true, data: { candidate }, message: 'Candidate added' });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

exports.updateCandidate = async (req, res) => {
  try {
    const candidate = await Candidate.findOne({ _id: req.params.id, deletedAt: null });
    if (!candidate) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Candidate not found' } });

    const before = candidate.toObject();
    const immutable = ['_id', 'createdBy', 'createdAt', 'previouslyApplied', 'duplicateOf'];
    Object.keys(req.body).forEach(k => { if (!immutable.includes(k)) candidate[k] = req.body[k]; });
    candidate.updatedBy = req.user.userId;
    await candidate.save();

    await logAudit({ userId: req.user.userId, action: 'UPDATE', resource: 'candidate', resourceId: candidate._id, before, after: candidate.toObject(), req });
    res.json({ success: true, data: { candidate } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { status, notes } = req.body;
    const valid = ['New', 'Shortlisted', 'Interview Done', 'Selected', 'Rejected', 'On Hold'];
    if (!valid.includes(status)) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid status' } });

    const candidate = await Candidate.findOne({ _id: req.params.id, deletedAt: null });
    if (!candidate) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Candidate not found' } });

    const before = { status: candidate.status };
    candidate.status = status;
    if (notes) candidate.notes = notes;
    candidate.updatedBy = req.user.userId;
    await candidate.save();

    await logAudit({ userId: req.user.userId, action: 'UPDATE', resource: 'candidate', resourceId: candidate._id, before, after: { status }, req });
    res.json({ success: true, data: { candidate }, message: `Status → ${status}` });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

exports.deleteCandidate = async (req, res) => {
  try {
    const candidate = await Candidate.findOne({ _id: req.params.id, deletedAt: null });
    if (!candidate) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Candidate not found' } });

    candidate.deletedAt = new Date();
    candidate.updatedBy = req.user.userId;
    await candidate.save();

    await logAudit({ userId: req.user.userId, action: 'DELETE', resource: 'candidate', resourceId: candidate._id, req });
    res.json({ success: true, message: 'Candidate deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// BULK IMPORT (Excel / CSV)
// ══════════════════════════════════════════════════════════════════════════════

// Normalize enum values from CSV (be tolerant of user variations)
const VALID_PROFILES   = ['Sales', 'DM', 'GD', 'Development', 'HR', 'Admin'];
const VALID_FOR        = ['Internship', 'Full Time', 'Part Time', 'Freelance', 'WFH'];
const VALID_SOURCES    = ['Internshala', 'Workindia', 'Indeed', 'LinkedIn', 'Walk-in', 'Reference', 'Others'];
const VALID_GENDERS    = ['Male', 'Female', 'Other'];

function normalizeProfile(val) {
  if (!val) return 'Sales';
  const v = String(val).toLowerCase();
  if (v.includes('sales'))       return 'Sales';
  if (v.includes('dm') || v.includes('digital') || v.includes('market')) return 'DM';
  if (v.includes('gd') || v.includes('graphic') || v.includes('design') || v.includes('video') || v.includes('ui') || v.includes('ux')) return 'GD';
  if (v.includes('dev') || v.includes('engineer') || v.includes('software') || v.includes('frontend') || v.includes('backend') || v.includes('full') || v.includes('qa') || v.includes('devops') || v.includes('system') || v.includes('data')) return 'Development';
  if (v.includes('hr') || v.includes('human') || v.includes('talent') || v.includes('recruit')) return 'HR';
  if (v.includes('admin') || v.includes('finance') || v.includes('operation') || v.includes('project') || v.includes('business') || v.includes('legal') || v.includes('content') || v.includes('product') || v.includes('manager') || v.includes('coordinator')) return 'Admin';
  return VALID_PROFILES.includes(val) ? val : 'Sales';
}

function normalizeSource(val) {
  if (!val) return 'Others';
  const v = String(val).toLowerCase();
  if (v.includes('internshala')) return 'Internshala';
  if (v.includes('workindia'))   return 'Workindia';
  if (v.includes('indeed'))      return 'Indeed';
  if (v.includes('linkedin'))    return 'LinkedIn';
  if (v.includes('walk'))        return 'Walk-in';
  if (v.includes('refer'))       return 'Reference';
  if (v.includes('naukri') || v.includes('shine') || v.includes('monster') || v.includes('apna')) return 'Others';
  return VALID_SOURCES.includes(val) ? val : 'Others';
}

function normalizeFor(val) {
  if (!val) return 'Full Time';
  const v = String(val).toLowerCase();
  if (v.includes('intern'))   return 'Internship';
  if (v.includes('part'))     return 'Part Time';
  if (v.includes('freelan'))  return 'Freelance';
  if (v.includes('wfh') || v.includes('remote') || v.includes('work from home')) return 'WFH';
  return VALID_FOR.includes(val) ? val : 'Full Time';
}

function normalizeGender(val) {
  if (!val) return 'Male';
  const v = String(val).toLowerCase();
  if (v === 'female' || v === 'f') return 'Female';
  if (v === 'other')               return 'Other';
  return 'Male';
}

exports.bulkImport = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'No file uploaded' } });

    const wb   = XLSX.read(req.file.buffer, { type: 'buffer' });
    const ws   = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

    if (!rows.length) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Empty file' } });

    const results = { inserted: 0, duplicates: [], errors: [] };
    const CHUNK = 50;

    for (let i = 0; i < rows.length; i += CHUNK) {
      const chunk = rows.slice(i, i + CHUNK);
      const docs  = [];

      for (const row of chunk) {
        const phone = String(row.phone || row.Phone || row.mobile || '').trim();
        const email = String(row.email || row.Email || '').trim().toLowerCase();
        const firstName = String(row.firstName || row['First Name'] || row.first_name || '').trim();

        if (!phone || !firstName) {
          results.errors.push({ row: i + chunk.indexOf(row) + 2, reason: 'Missing phone or firstName' });
          continue;
        }

        const dup = await detectDuplicate(phone, email || null);
        if (dup) {
          results.duplicates.push({ phone, name: firstName, duplicateId: dup._id });
          continue;
        }

        const rawProfile = String(row.appliedProfile || row['Applied Profile'] || row.profile || '').trim();
        const rawSource  = String(row.leadSource     || row['Lead Source']     || '').trim();
        const rawFor     = String(row.appliedFor     || row['Applied For']     || '').trim();
        const rawGender  = String(row.gender         || row.Gender             || '').trim();

        docs.push({
          firstName,
          lastName:        String(row.lastName  || row['Last Name']  || '').trim(),
          phone,
          email:           email || undefined,
          gender:          normalizeGender(rawGender),
          appliedProfile:  normalizeProfile(rawProfile),
          appliedFor:      normalizeFor(rawFor),
          leadSource:      normalizeSource(rawSource),
          totalExperience: +row.totalExperience || +row['Experience (Years)'] || 0,
          expectedSalary:  +row.expectedSalary  || +row['Expected Salary']  || null,
          lastSalary:      +row.lastSalary       || +row['Last Salary']      || null,
          previousCompany: String(row.previousCompany || row['Previous Company'] || '').trim(),
          notes:           String(row.notes || row.Notes || '').trim(),
          previouslyApplied: false,
          createdBy: req.user.userId,
        });
      }

      if (docs.length) {
        await Candidate.insertMany(docs, { ordered: false });
        results.inserted += docs.length;
      }
    }

    await logAudit({ userId: req.user.userId, action: 'CREATE', resource: 'candidate_bulk_import', resourceId: null, after: { inserted: results.inserted }, req });
    res.status(201).json({ success: true, data: results, message: `${results.inserted} candidates imported` });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// FOLLOW-UPS
// ══════════════════════════════════════════════════════════════════════════════

exports.listFollowups = async (req, res) => {
  try {
    const followups = await CandidateFollowup.find({ candidateId: req.params.id, deletedAt: null })
      .sort('scheduledAt')
      .populate('createdBy', 'name')
      .populate('completedBy', 'name');
    res.json({ success: true, data: { followups } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

exports.createFollowup = async (req, res) => {
  try {
    const candidate = await Candidate.findOne({ _id: req.params.id, deletedAt: null });
    if (!candidate) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Candidate not found' } });

    const followup = await CandidateFollowup.create({
      candidateId: req.params.id,
      scheduledAt: req.body.scheduledAt,
      notes:       req.body.notes || '',
      createdBy:   req.user.userId,
    });

    await logAudit({ userId: req.user.userId, action: 'CREATE', resource: 'candidate_followup', resourceId: followup._id, after: followup.toObject(), req });
    res.status(201).json({ success: true, data: { followup } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

exports.updateFollowup = async (req, res) => {
  try {
    const followup = await CandidateFollowup.findOne({ _id: req.params.followupId, candidateId: req.params.id, deletedAt: null });
    if (!followup) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Followup not found' } });

    const before = followup.toObject();
    const { status, notes, scheduledAt, outcome } = req.body;
    if (status)      followup.status      = status;
    if (notes)       followup.notes       = notes;
    if (scheduledAt) followup.scheduledAt = new Date(scheduledAt);
    if (outcome)     followup.outcome     = outcome;

    if (status === 'completed' && !followup.completedAt) {
      followup.completedAt = new Date();
      followup.completedBy = req.user.userId;
    }
    await followup.save();

    await logAudit({ userId: req.user.userId, action: 'UPDATE', resource: 'candidate_followup', resourceId: followup._id, before, after: followup.toObject(), req });
    res.json({ success: true, data: { followup } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

exports.deleteFollowup = async (req, res) => {
  try {
    const followup = await CandidateFollowup.findOne({ _id: req.params.followupId, candidateId: req.params.id, deletedAt: null });
    if (!followup) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Followup not found' } });
    followup.deletedAt = new Date();
    await followup.save();
    await logAudit({ userId: req.user.userId, action: 'DELETE', resource: 'candidate_followup', resourceId: followup._id, req });
    res.json({ success: true, message: 'Followup deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// INTERVIEWS
// ══════════════════════════════════════════════════════════════════════════════

exports.listInterviews = async (req, res) => {
  try {
    const interviews = await CandidateInterview.find({ candidateId: req.params.id, deletedAt: null })
      .sort('round')
      .populate('interviewer', 'name email')
      .populate('createdBy', 'name');
    res.json({ success: true, data: { interviews } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

exports.createInterview = async (req, res) => {
  try {
    const candidate = await Candidate.findOne({ _id: req.params.id, deletedAt: null });
    if (!candidate) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Candidate not found' } });

    // Auto-assign round number
    const lastRound = await CandidateInterview.findOne({ candidateId: req.params.id, deletedAt: null }).sort('-round');
    const round = req.body.round || ((lastRound?.round || 0) + 1);

    const interview = await CandidateInterview.create({
      candidateId: req.params.id,
      round,
      title:       req.body.title || '',
      scheduledAt: req.body.scheduledAt,
      interviewer: req.body.interviewer,
      mode:        req.body.mode || 'in-person',
      meetingLink: req.body.meetingLink || '',
      createdBy:   req.user.userId,
    });

    // Auto-update candidate callingStatus if this is round 1
    if (round === 1) {
      candidate.status = 'Shortlisted';
      candidate.updatedBy = req.user.userId;
      await candidate.save();
    }

    await logAudit({ userId: req.user.userId, action: 'CREATE', resource: 'candidate_interview', resourceId: interview._id, after: interview.toObject(), req });
    res.status(201).json({ success: true, data: { interview } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

exports.updateInterview = async (req, res) => {
  try {
    const interview = await CandidateInterview.findOne({ _id: req.params.interviewId, candidateId: req.params.id, deletedAt: null });
    if (!interview) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Interview not found' } });

    const before = interview.toObject();
    const fields = ['scheduledAt', 'interviewer', 'mode', 'meetingLink', 'title', 'status', 'feedback', 'rating', 'recommendation', 'strengths', 'weaknesses', 'conductedAt'];
    fields.forEach(f => { if (req.body[f] !== undefined) interview[f] = req.body[f]; });

    if (req.body.status === 'completed' && !interview.conductedAt) {
      interview.conductedAt = new Date();
    }
    await interview.save();

    // When interview is completed — auto-update candidate status to 'Interview Done'
    if (req.body.status === 'completed') {
      await Candidate.findByIdAndUpdate(req.params.id, { status: 'Interview Done', updatedBy: req.user.userId });
    }

    await logAudit({ userId: req.user.userId, action: 'UPDATE', resource: 'candidate_interview', resourceId: interview._id, before, after: interview.toObject(), req });
    res.json({ success: true, data: { interview } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

exports.deleteInterview = async (req, res) => {
  try {
    const interview = await CandidateInterview.findOne({ _id: req.params.interviewId, candidateId: req.params.id, deletedAt: null });
    if (!interview) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Interview not found' } });
    interview.deletedAt = new Date();
    await interview.save();
    await logAudit({ userId: req.user.userId, action: 'DELETE', resource: 'candidate_interview', resourceId: interview._id, req });
    res.json({ success: true, message: 'Interview deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// INTERVIEW SCHEDULER — upcoming interviews across all candidates
// ══════════════════════════════════════════════════════════════════════════════

exports.interviewSchedule = async (req, res) => {
  try {
    const { from, to, interviewerId } = req.query;
    const filter = { deletedAt: null, status: { $in: ['scheduled', 'rescheduled'] } };
    if (from || to) {
      filter.scheduledAt = {};
      if (from) filter.scheduledAt.$gte = new Date(from);
      if (to)   filter.scheduledAt.$lte = new Date(to);
    }
    if (interviewerId) filter.interviewer = interviewerId;

    const interviews = await CandidateInterview.find(filter)
      .sort('scheduledAt')
      .populate('candidateId', 'firstName lastName phone appliedProfile')
      .populate('interviewer', 'name email')
      .lean();

    res.json({ success: true, data: { interviews } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// HR DASHBOARD
// ══════════════════════════════════════════════════════════════════════════════

exports.hrDashboard = async (req, res) => {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const weekEnd = new Date(today); weekEnd.setDate(today.getDate() + 7);

    const [byStatus, byProfile, todayInterviews, recentCandidates, total] = await Promise.all([
      Candidate.aggregate([
        { $match: { deletedAt: null } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Candidate.aggregate([
        { $match: { deletedAt: null } },
        { $group: { _id: '$appliedProfile', count: { $sum: 1 } } },
      ]),
      CandidateInterview.find({
        deletedAt: null,
        status: { $in: ['scheduled', 'rescheduled'] },
        scheduledAt: { $gte: today, $lte: weekEnd },
      }).populate('candidateId', 'firstName lastName appliedProfile').sort('scheduledAt').limit(10),
      Candidate.find({ deletedAt: null }).sort('-createdAt').limit(8)
        .select('firstName lastName phone appliedProfile status createdAt').lean(),
      Candidate.countDocuments({ deletedAt: null }),
    ]);

    const statusCounts = {};
    byStatus.forEach(s => { statusCounts[s._id] = s.count; });
    const profileCounts = {};
    byProfile.forEach(p => { profileCounts[p._id] = p.count; });

    res.json({ success: true, data: { total, statusCounts, profileCounts, todayInterviews, recentCandidates } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// WEEK 16 — EMPLOYEES
// ══════════════════════════════════════════════════════════════════════════════

// POST /hr/employees/onboard/:candidateId
exports.onboardEmployee = async (req, res) => {
  try {
    const candidate = await Candidate.findOne({ _id: req.params.candidateId, deletedAt: null });
    if (!candidate) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Candidate not found' } });
    if (candidate.convertedToEmployee) return res.status(409).json({ success: false, error: { code: 'ALREADY_ONBOARDED', message: 'Candidate already onboarded as employee' } });

    const {
      dateOfJoining, designation, departmentId, reportingManagerId,
      employmentType, officeLocation,
      officialEmail, bankDetails, statutory,
      currentCTC, salaryStructureId,
    } = req.body;

    if (!dateOfJoining) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'dateOfJoining is required' } });

    // Generate employee code
    const employeeCode = await generateEmployeeCode();

    // Determine role from designation
    const isHead = /head|manager|director|vp|lead/i.test(designation || '');
    const userRole = isHead ? 'DEPT_HEAD' : 'TEAM_MEMBER';

    // Resolve department name for permission mapping
    const deptDoc = departmentId ? await Department.findById(departmentId).lean() : null;
    const deptName = deptDoc?.name || '';
    const autoPermissions = getDefaultPermissions(designation, deptName);

    // Always create an AMS User account; use generated email if no officialEmail
    let userId = null;
    let tempPassword = null;
    const emailToUse = officialEmail
      ? officialEmail.toLowerCase()
      : `${employeeCode.toLowerCase()}@ank.internal`;
    const existingUser = await User.findOne({ email: emailToUse });
    if (existingUser) {
      userId = existingUser._id;
      // Sync department + role if not set
      let changed = false;
      if (departmentId && !existingUser.department) { existingUser.department = departmentId; changed = true; }
      if (!existingUser.permissions?.length) { existingUser.permissions = autoPermissions; changed = true; }
      if (changed) { existingUser.updatedBy = req.user.userId; await existingUser.save(); }
    } else {
      tempPassword = generateTempPassword();
      const newUser = await User.create({
        name:        `${candidate.firstName} ${candidate.lastName}`.trim(),
        email:       emailToUse,
        password:    tempPassword,
        role:        userRole,
        department:  departmentId || null,
        permissions: autoPermissions,
        createdBy:   req.user.userId,
      });
      userId = newUser._id;
    }

    const employee = await Employee.create({
      employeeCode,
      userId,
      candidateId: candidate._id,
      firstName:   candidate.firstName,
      middleName:  candidate.middleName || '',
      lastName:    candidate.lastName   || '',
      dob:         candidate.dob,
      gender:      candidate.gender,
      maritalStatus: candidate.maritalStatus || 'Unmarried',
      personalEmail: candidate.email || '',
      officialEmail: officialEmail || '',
      phone:         candidate.phone,
      currentAddress: candidate.address || '',
      designation,
      departmentId,
      reportingManagerId,
      dateOfJoining:  new Date(dateOfJoining),
      employmentType: employmentType || 'Full Time',
      officeLocation: officeLocation || 'Delhi',
      bankDetails:    bankDetails || {},
      statutory:      statutory   || {},
      currentCTC:     currentCTC  || null,
      salaryStructureId: salaryStructureId || null,
      createdBy: req.user.userId,
    });

    // Mark candidate as converted
    candidate.convertedToEmployee = true;
    candidate.employeeId = employee._id;
    candidate.status     = 'Selected';
    candidate.updatedBy  = req.user.userId;
    await candidate.save();

    await logAudit({ userId: req.user.userId, action: 'CREATE', resource: 'employee', resourceId: employee._id, after: { employeeCode, candidateId: candidate._id }, req });
    res.status(201).json({
      success: true,
      data: {
        employee,
        loginCredentials: tempPassword ? {
          email:       emailToUse,
          tempPassword,
          loginUrl:    `${process.env.FRONTEND_URL || ''}/login`,
          note:        'Share these credentials with the employee. They can change the password after first login.',
        } : null,
      },
      message: `Employee ${employeeCode} onboarded successfully${tempPassword ? '. AMS account created.' : '.'}`,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

// GET /hr/employees
exports.listEmployees = async (req, res) => {
  try {
    const {
      q, departmentId, designation, employmentStatus, employmentType,
      officeLocation, reportingManagerId,
      page = 1, limit = 20, sort = '-dateOfJoining',
    } = req.query;

    const filter = { deletedAt: null };
    if (departmentId)      filter.departmentId      = departmentId;
    if (employmentStatus)  filter.employmentStatus  = employmentStatus;
    if (employmentType)    filter.employmentType    = employmentType;
    if (officeLocation)    filter.officeLocation    = officeLocation;
    if (reportingManagerId) filter.reportingManagerId = reportingManagerId;
    if (designation) filter.designation = { $regex: designation, $options: 'i' };
    if (q) {
      const rx = { $regex: q, $options: 'i' };
      filter.$or = [{ firstName: rx }, { lastName: rx }, { officialEmail: rx }, { employeeCode: rx }, { phone: rx }];
    }

    const skip = (page - 1) * limit;
    const [employees, total] = await Promise.all([
      Employee.find(filter)
        .select('-bankDetails -statutory')
        .sort(sort).skip(skip).limit(+limit)
        .populate('departmentId', 'name')
        .populate('reportingManagerId', 'firstName lastName employeeCode')
        .populate('userId', 'name email')
        .lean(),
      Employee.countDocuments(filter),
    ]);

    res.json({ success: true, data: { employees, total, page: +page, pages: Math.ceil(total / limit) } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

// GET /hr/employees/:id
exports.getEmployee = async (req, res) => {
  try {
    const employee = await Employee.findOne({ _id: req.params.id, deletedAt: null })
      .populate('departmentId', 'name')
      .populate('reportingManagerId', 'firstName lastName employeeCode')
      .populate('userId', 'name email role')
      .populate('candidateId', 'firstName lastName appliedProfile');

    if (!employee) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Employee not found' } });

    // Mask sensitive fields for non-admin roles
    const canViewSensitive = ['ADMIN', 'SUPERADMIN'].includes(req.user.role);
    const empObj = employee.toObject();
    if (!canViewSensitive) {
      delete empObj.bankDetails;
      delete empObj.statutory;
      delete empObj.currentCTC;
    }

    res.json({ success: true, data: { employee: empObj } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

// PATCH /hr/employees/:id
exports.updateEmployee = async (req, res) => {
  try {
    const employee = await Employee.findOne({ _id: req.params.id, deletedAt: null });
    if (!employee) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Employee not found' } });

    const before = employee.toObject();
    const immutable = ['_id', 'employeeCode', 'candidateId', 'userId', 'createdBy', 'createdAt'];
    Object.keys(req.body).forEach(k => { if (!immutable.includes(k)) employee[k] = req.body[k]; });
    employee.updatedBy = req.user.userId;
    await employee.save();

    await logAudit({ userId: req.user.userId, action: 'UPDATE', resource: 'employee', resourceId: employee._id, before, after: employee.toObject(), req });
    res.json({ success: true, data: { employee } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

// POST /hr/employees/:id/exit
exports.initiateExit = async (req, res) => {
  try {
    const employee = await Employee.findOne({ _id: req.params.id, deletedAt: null });
    if (!employee) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Employee not found' } });

    const { exitDate, exitReason, resignationDate, noticePeriodEndDate, finalSettlementStatus } = req.body;
    if (!exitDate || !exitReason) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'exitDate and exitReason required' } });

    const before = { employmentStatus: employee.employmentStatus, exitInfo: employee.exitInfo };
    employee.employmentStatus  = 'resigned';
    employee.exitInfo = {
      exitDate:             new Date(exitDate),
      exitReason,
      resignationDate:      resignationDate ? new Date(resignationDate) : null,
      noticePeriodEndDate:  noticePeriodEndDate ? new Date(noticePeriodEndDate) : null,
      finalSettlementStatus: finalSettlementStatus || 'pending',
      exitInterviewDone:    false,
    };
    employee.updatedBy = req.user.userId;
    await employee.save();

    await logAudit({ userId: req.user.userId, action: 'UPDATE', resource: 'employee', resourceId: employee._id, before, after: { employmentStatus: 'resigned', exitInfo: employee.exitInfo }, req });
    res.json({ success: true, data: { employee }, message: 'Exit initiated' });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

// ── EMPLOYEE SELF-SERVICE ────────────────────────────────────────────────────

// GET /hr/me/profile
exports.getMyProfile = async (req, res) => {
  try {
    const employee = await Employee.findOne({ userId: req.user.userId, deletedAt: null })
      .select('-bankDetails -statutory -currentCTC -salaryStructureId')
      .populate('departmentId', 'name')
      .populate('reportingManagerId', 'firstName lastName employeeCode');

    if (!employee) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Employee profile not found' } });
    res.json({ success: true, data: { employee } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

// PATCH /hr/me/profile
exports.updateMyProfile = async (req, res) => {
  try {
    const employee = await Employee.findOne({ userId: req.user.userId, deletedAt: null });
    if (!employee) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Employee profile not found' } });

    // Only allow self-editable personal fields
    const selfEditable = ['personalEmail', 'phone', 'altPhone', 'currentAddress', 'permanentAddress',
      'emergencyContactName', 'emergencyContactPhone', 'emergencyContactRelation', 'bloodGroup'];
    const before = employee.toObject();
    selfEditable.forEach(k => { if (req.body[k] !== undefined) employee[k] = req.body[k]; });
    employee.updatedBy = req.user.userId;
    await employee.save();

    await logAudit({ userId: req.user.userId, action: 'UPDATE', resource: 'employee_self', resourceId: employee._id, before, after: employee.toObject(), req });
    res.json({ success: true, data: { employee }, message: 'Profile updated' });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

// ── EMPLOYEE DOCUMENTS ────────────────────────────────────────────────────────

// GET /hr/employees/:id/documents
exports.listDocuments = async (req, res) => {
  try {
    const docs = await EmployeeDocument.find({ employeeId: req.params.id, deletedAt: null })
      .sort('-createdAt')
      .populate('uploadedBy', 'name');
    res.json({ success: true, data: { documents: docs } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

// POST /hr/employees/:id/documents  (multipart/form-data)
exports.uploadDocument = async (req, res) => {
  try {
    const employee = await Employee.findOne({ _id: req.params.id, deletedAt: null });
    if (!employee) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Employee not found' } });

    if (!req.file) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'No file uploaded' } });

    const { type, expiresAt } = req.body;
    if (!type) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Document type is required' } });

    // Attempt Google Drive upload into employee's folder
    const folderName = `${employee.employeeCode || employee._id}`;
    const drive = await tryDriveUpload(req.file.buffer, req.file.mimetype, req.file.originalname, folderName);

    const doc = await EmployeeDocument.create({
      employeeId:   employee._id,
      type,
      name:         req.file.originalname,
      gdriveFileId: drive.fileId   || '',
      gdriveLink:   drive.webViewLink || '',
      mimeType:     req.file.mimetype,
      sizeBytes:    req.file.size,
      expiresAt:    expiresAt ? new Date(expiresAt) : null,
      uploadedBy:   req.user.userId,
    });

    await logAudit({ userId: req.user.userId, action: 'CREATE', resource: 'employee_document', resourceId: doc._id, after: { employeeId: employee._id, type, name: doc.name }, req });
    res.status(201).json({ success: true, data: { document: doc } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

// DELETE /hr/employees/:id/documents/:docId
exports.deleteDocument = async (req, res) => {
  try {
    const doc = await EmployeeDocument.findOne({ _id: req.params.docId, employeeId: req.params.id, deletedAt: null });
    if (!doc) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Document not found' } });
    doc.deletedAt = new Date();
    await doc.save();
    await logAudit({ userId: req.user.userId, action: 'DELETE', resource: 'employee_document', resourceId: doc._id, req });
    res.json({ success: true, message: 'Document deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

// ── FAMILY MEMBERS ────────────────────────────────────────────────────────────

// GET /hr/employees/:id/family
exports.listFamilyMembers = async (req, res) => {
  try {
    const members = await EmployeeFamilyMember.find({ employeeId: req.params.id, deletedAt: null }).sort('relation');
    res.json({ success: true, data: { members } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

// POST /hr/employees/:id/family
exports.addFamilyMember = async (req, res) => {
  try {
    const employee = await Employee.findOne({ _id: req.params.id, deletedAt: null });
    if (!employee) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Employee not found' } });

    const { name, relation, dob, contact, isNominee } = req.body;
    if (!name || !relation) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'name and relation required' } });

    const member = await EmployeeFamilyMember.create({
      employeeId: employee._id,
      name, relation, contact: contact || '',
      dob: dob ? new Date(dob) : null,
      isNominee: isNominee || false,
    });

    await logAudit({ userId: req.user.userId, action: 'CREATE', resource: 'employee_family', resourceId: member._id, after: member.toObject(), req });
    res.status(201).json({ success: true, data: { member } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

// PATCH /hr/employees/:id/family/:memberId
exports.updateFamilyMember = async (req, res) => {
  try {
    const member = await EmployeeFamilyMember.findOne({ _id: req.params.memberId, employeeId: req.params.id, deletedAt: null });
    if (!member) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Family member not found' } });

    ['name', 'relation', 'contact', 'isNominee'].forEach(k => { if (req.body[k] !== undefined) member[k] = req.body[k]; });
    if (req.body.dob) member.dob = new Date(req.body.dob);
    await member.save();
    res.json({ success: true, data: { member } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

// DELETE /hr/employees/:id/family/:memberId
exports.deleteFamilyMember = async (req, res) => {
  try {
    const member = await EmployeeFamilyMember.findOne({ _id: req.params.memberId, employeeId: req.params.id, deletedAt: null });
    if (!member) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Family member not found' } });
    member.deletedAt = new Date();
    await member.save();
    res.json({ success: true, message: 'Family member removed' });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};
