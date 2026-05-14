const mongoose  = require('mongoose');
const Employee   = require('../models/Employee');
const Attendance = require('../models/Attendance');
const Holiday    = require('../models/Holiday');
const LeaveType  = require('../models/LeaveType');
const LeaveBalance  = require('../models/LeaveBalance');
const LeaveRequest  = require('../models/LeaveRequest');
const HRConfig      = require('../models/HRConfig');
const { logAudit }  = require('../middleware/auditLogger');

// ── Helpers ────────────────────────────────────────────────────────────────────

function toMidnight(d) {
  const dt = new Date(d);
  dt.setUTCHours(0, 0, 0, 0);
  return dt;
}

async function getHRCfg() {
  let cfg = await HRConfig.findOne({ _singleton: 'hr_config' });
  if (!cfg) cfg = await HRConfig.create({});
  return cfg;
}

// Count working days between start and end (inclusive), excluding weekends + holidays
async function countWorkingDays(start, end) {
  const s = toMidnight(start);
  const e = toMidnight(end);
  const holidays = await Holiday.find({ deletedAt: null, date: { $gte: s, $lte: e } }).lean();
  const hSet = new Set(holidays.map(h => h.date.toISOString().slice(0, 10)));
  let count = 0;
  const cur = new Date(s);
  while (cur <= e) {
    const dow = cur.getUTCDay();
    if (dow !== 0 && dow !== 6 && !hSet.has(cur.toISOString().slice(0, 10))) count++;
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return count;
}

// Ensure LeaveBalance exists for employee + leaveType + year (lazy create)
async function ensureBalance(employeeId, leaveTypeId, year) {
  const lt = await LeaveType.findById(leaveTypeId).lean();
  if (!lt) return null;
  const bal = await LeaveBalance.findOneAndUpdate(
    { employeeId, leaveTypeId, year },
    { $setOnInsert: { allocated: lt.annualQuota, used: 0, carryForwarded: 0 } },
    { new: true, upsert: true },
  );
  return bal;
}

function getClientIP(req) {
  return (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress || req.ip || '';
}

// ══════════════════════════════════════════════════════════════════════════════
// ATTENDANCE — CHECK-IN / CHECK-OUT
// ══════════════════════════════════════════════════════════════════════════════

exports.checkIn = async (req, res) => {
  try {
    const employee = await Employee.findOne({ userId: req.user.userId, deletedAt: null });
    if (!employee) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Employee profile not found. Contact HR.' } });

    const cfg = await getHRCfg();
    const { ipRestrictionEnabled, ipWhitelist = [], wfhEnabled, gracePeriodMinutes = 15 } = cfg.attendance || {};

    const isWFH    = req.body.isWFH === true;
    const notes    = req.body.notes || '';
    const clientIP = getClientIP(req);

    // IP restriction check (skip for WFH)
    if (ipRestrictionEnabled && !isWFH) {
      if (ipWhitelist.length && !ipWhitelist.includes(clientIP)) {
        return res.status(403).json({ success: false, error: { code: 'IP_RESTRICTED', message: 'Check-in only allowed from office network' } });
      }
    }
    if (isWFH && !wfhEnabled) {
      return res.status(400).json({ success: false, error: { code: 'WFH_DISABLED', message: 'WFH check-in is not enabled' } });
    }

    const today = toMidnight(new Date());

    // Prevent duplicate check-in
    const existing = await Attendance.findOne({ employeeId: employee._id, date: today });
    if (existing?.checkIn) {
      return res.status(409).json({ success: false, error: { code: 'ALREADY_CHECKED_IN', message: 'Already checked in today' } });
    }

    // Determine status: present / late / wfh
    const now = new Date();
    const workStart = new Date(today); workStart.setUTCHours(3, 30, 0, 0); // 9 AM IST = 3:30 UTC
    const graceEnd  = new Date(workStart); graceEnd.setMinutes(graceEnd.getMinutes() + gracePeriodMinutes);

    let status = isWFH ? 'wfh' : (now > graceEnd ? 'late' : 'present');

    const attendance = await Attendance.findOneAndUpdate(
      { employeeId: employee._id, date: today },
      { checkIn: now, status, isWFH, ipAddress: clientIP, notes },
      { new: true, upsert: true },
    );

    res.json({ success: true, data: { attendance }, message: `Checked in at ${now.toISOString()}` });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

exports.checkOut = async (req, res) => {
  try {
    const employee = await Employee.findOne({ userId: req.user.userId, deletedAt: null });
    if (!employee) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Employee profile not found' } });

    const today      = toMidnight(new Date());
    const attendance = await Attendance.findOne({ employeeId: employee._id, date: today });

    if (!attendance?.checkIn) return res.status(400).json({ success: false, error: { code: 'NOT_CHECKED_IN', message: 'No check-in found for today' } });
    if (attendance.checkOut) return res.status(409).json({ success: false, error: { code: 'ALREADY_CHECKED_OUT', message: 'Already checked out today' } });

    const cfg = await getHRCfg();
    const halfDayHours = cfg.attendance?.halfDayHours || 4;

    const now = new Date();
    const workHours = (now - attendance.checkIn) / 3600000;

    let status = attendance.status;
    if (status === 'present' || status === 'late') {
      if (workHours < halfDayHours) status = 'half_day';
    }

    attendance.checkOut  = now;
    attendance.workHours = Math.round(workHours * 100) / 100;
    attendance.status    = status;
    if (req.body.notes) attendance.notes = req.body.notes;
    await attendance.save();

    res.json({ success: true, data: { attendance }, message: `Checked out — ${attendance.workHours}h logged` });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

// GET /hr/attendance/me  — employee's own attendance (date range)
exports.getMyAttendance = async (req, res) => {
  try {
    const employee = await Employee.findOne({ userId: req.user.userId, deletedAt: null });
    if (!employee) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Employee profile not found' } });

    const { from, to } = req.query;
    const filter = { employeeId: employee._id };
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = toMidnight(from);
      if (to)   filter.date.$lte = toMidnight(to);
    }

    const records = await Attendance.find(filter).sort('date').lean();
    const todayRecord = await Attendance.findOne({ employeeId: employee._id, date: toMidnight(new Date()) }).lean();

    res.json({ success: true, data: { records, todayRecord } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

// GET /hr/attendance  — HR view (any employee, date range)
exports.getAttendance = async (req, res) => {
  try {
    const { employeeId, from, to, status } = req.query;
    const filter = {};
    if (employeeId) filter.employeeId = employeeId;
    if (status)     filter.status     = status;
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = toMidnight(from);
      if (to)   filter.date.$lte = toMidnight(to);
    }

    const records = await Attendance.find(filter)
      .sort({ date: -1 })
      .populate('employeeId', 'firstName lastName employeeCode')
      .lean();

    res.json({ success: true, data: { records, total: records.length } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

// POST /hr/attendance/manual  — HR manual override
exports.manualAttendance = async (req, res) => {
  try {
    const { employeeId, date, status, checkIn, checkOut, notes, workHours } = req.body;
    if (!employeeId || !date || !status) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'employeeId, date and status required' } });

    const day = toMidnight(date);
    const record = await Attendance.findOneAndUpdate(
      { employeeId, date: day },
      {
        status,
        checkIn:   checkIn  ? new Date(checkIn)  : null,
        checkOut:  checkOut ? new Date(checkOut) : null,
        workHours: workHours ? +workHours : null,
        notes:     notes || '',
        modifiedBy: req.user.userId,
      },
      { new: true, upsert: true },
    );

    await logAudit({ userId: req.user.userId, action: 'UPDATE', resource: 'attendance', resourceId: record._id, after: { employeeId, date, status }, req });
    res.json({ success: true, data: { record }, message: 'Attendance updated' });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// HOLIDAYS
// ══════════════════════════════════════════════════════════════════════════════

exports.listHolidays = async (req, res) => {
  try {
    const { year } = req.query;
    const filter = { deletedAt: null };
    if (year) {
      filter.date = { $gte: new Date(`${year}-01-01`), $lte: new Date(`${year}-12-31`) };
    }
    const holidays = await Holiday.find(filter).sort('date');
    res.json({ success: true, data: { holidays } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

exports.createHoliday = async (req, res) => {
  try {
    const { date, name, type, applicableTo } = req.body;
    if (!date || !name) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'date and name required' } });

    const holiday = await Holiday.create({ date: toMidnight(date), name, type: type || 'national', applicableTo: applicableTo || 'all' });
    await logAudit({ userId: req.user.userId, action: 'CREATE', resource: 'holiday', resourceId: holiday._id, after: holiday.toObject(), req });
    res.status(201).json({ success: true, data: { holiday } });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ success: false, error: { code: 'DUPLICATE', message: 'Holiday already exists on this date' } });
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

exports.updateHoliday = async (req, res) => {
  try {
    const holiday = await Holiday.findOne({ _id: req.params.id, deletedAt: null });
    if (!holiday) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Holiday not found' } });

    ['name', 'type', 'applicableTo'].forEach(k => { if (req.body[k]) holiday[k] = req.body[k]; });
    if (req.body.date) holiday.date = toMidnight(req.body.date);
    await holiday.save();
    res.json({ success: true, data: { holiday } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

exports.deleteHoliday = async (req, res) => {
  try {
    const holiday = await Holiday.findOne({ _id: req.params.id, deletedAt: null });
    if (!holiday) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Holiday not found' } });
    holiday.deletedAt = new Date();
    await holiday.save();
    res.json({ success: true, message: 'Holiday removed' });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// LEAVE TYPES
// ══════════════════════════════════════════════════════════════════════════════

exports.listLeaveTypes = async (req, res) => {
  try {
    const types = await LeaveType.find({ deletedAt: null }).sort('code');
    res.json({ success: true, data: { leaveTypes: types } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

exports.createLeaveType = async (req, res) => {
  try {
    const lt = await LeaveType.create({ ...req.body });
    await logAudit({ userId: req.user.userId, action: 'CREATE', resource: 'leave_type', resourceId: lt._id, after: lt.toObject(), req });
    res.status(201).json({ success: true, data: { leaveType: lt } });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ success: false, error: { code: 'DUPLICATE', message: 'Leave type code already exists' } });
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

exports.updateLeaveType = async (req, res) => {
  try {
    const lt = await LeaveType.findOne({ _id: req.params.id, deletedAt: null });
    if (!lt) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Leave type not found' } });

    const immutable = ['_id', 'code'];
    Object.keys(req.body).forEach(k => { if (!immutable.includes(k)) lt[k] = req.body[k]; });
    await lt.save();
    await logAudit({ userId: req.user.userId, action: 'UPDATE', resource: 'leave_type', resourceId: lt._id, after: lt.toObject(), req });
    res.json({ success: true, data: { leaveType: lt } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

exports.deleteLeaveType = async (req, res) => {
  try {
    const lt = await LeaveType.findOne({ _id: req.params.id, deletedAt: null });
    if (!lt) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Leave type not found' } });
    lt.deletedAt = new Date();
    await lt.save();
    res.json({ success: true, message: 'Leave type deactivated' });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// LEAVE BALANCES
// ══════════════════════════════════════════════════════════════════════════════

// GET /hr/employees/:id/leave-balances
exports.getLeaveBalances = async (req, res) => {
  try {
    const year = +(req.query.year || new Date().getFullYear());
    const leaveTypes = await LeaveType.find({ deletedAt: null, isActive: true }).lean();

    // Lazy-create balances for any missing types
    const balances = await Promise.all(
      leaveTypes.map(lt => ensureBalance(req.params.id, lt._id, year)),
    );

    const result = balances.filter(Boolean).map(b => ({
      ...b.toObject(),
      leaveType: leaveTypes.find(lt => lt._id.toString() === b.leaveTypeId.toString()),
    }));

    res.json({ success: true, data: { balances: result, year } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// LEAVE REQUESTS
// ══════════════════════════════════════════════════════════════════════════════

// POST /hr/leave-requests
exports.applyLeave = async (req, res) => {
  try {
    const employee = await Employee.findOne({ userId: req.user.userId, deletedAt: null });
    if (!employee) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Employee profile not found' } });

    const { leaveTypeId, startDate, endDate, reason, isHalfDay, halfDaySession } = req.body;
    if (!leaveTypeId || !startDate || !endDate || !reason) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'leaveTypeId, startDate, endDate, reason required' } });
    }

    const lt = await LeaveType.findOne({ _id: leaveTypeId, deletedAt: null, isActive: true });
    if (!lt) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Leave type not found' } });

    if (!lt.halfDayAllowed && isHalfDay) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Half-day not allowed for this leave type' } });
    }

    const s = toMidnight(startDate);
    const e = toMidnight(endDate);
    if (s > e) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'startDate must be before endDate' } });

    const days = isHalfDay ? 0.5 : await countWorkingDays(s, e);
    if (days === 0) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'No working days in selected range' } });

    // Check balance (LOP type has code LOP, skip balance check)
    if (lt.code !== 'LOP') {
      const year = s.getUTCFullYear();
      const balance = await ensureBalance(employee._id, leaveTypeId, year);
      const remaining = (balance.allocated + balance.carryForwarded) - balance.used;
      if (remaining < days) {
        return res.status(400).json({ success: false, error: { code: 'INSUFFICIENT_BALANCE', message: `Insufficient leave balance. Available: ${remaining}, Requested: ${days}`, available: remaining } });
      }
    }

    const request = await LeaveRequest.create({
      employeeId: employee._id,
      leaveTypeId,
      startDate: s, endDate: e, days,
      isHalfDay: isHalfDay || false,
      halfDaySession: halfDaySession || '',
      reason,
    });

    await logAudit({ userId: req.user.userId, action: 'CREATE', resource: 'leave_request', resourceId: request._id, after: { days, leaveTypeId, startDate, endDate }, req });
    res.status(201).json({ success: true, data: { request }, message: `Leave request submitted for ${days} day(s)` });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

// GET /hr/me/leave-requests
exports.getMyLeaveRequests = async (req, res) => {
  try {
    const employee = await Employee.findOne({ userId: req.user.userId, deletedAt: null });
    if (!employee) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Employee profile not found' } });

    const { status, year } = req.query;
    const filter = { employeeId: employee._id };
    if (status) filter.status = status;
    if (year) {
      filter.startDate = { $gte: new Date(`${year}-01-01`), $lte: new Date(`${year}-12-31`) };
    }

    const requests = await LeaveRequest.find(filter)
      .sort('-createdAt')
      .populate('leaveTypeId', 'name code')
      .populate('reviewedBy', 'name');

    res.json({ success: true, data: { requests } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

// PATCH /hr/leave-requests/:id/review  — manager / HR approves or rejects
exports.reviewLeave = async (req, res) => {
  try {
    const { status, reviewerComments } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'status must be approved or rejected' } });
    }

    const request = await LeaveRequest.findOne({ _id: req.params.id, status: 'pending' });
    if (!request) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Pending leave request not found' } });

    const before = { status: request.status };

    if (status === 'approved') {
      // Deduct from balance (skip LOP)
      const lt = await LeaveType.findById(request.leaveTypeId).lean();
      if (lt && lt.code !== 'LOP') {
        const year = request.startDate.getUTCFullYear();
        await LeaveBalance.findOneAndUpdate(
          { employeeId: request.employeeId, leaveTypeId: request.leaveTypeId, year },
          { $inc: { used: request.days } },
          { upsert: true },
        );
      }

      // Mark attendance as 'leave' for each working day in range
      const holidayList = await Holiday.find({
        deletedAt: null, date: { $gte: request.startDate, $lte: request.endDate },
      }).lean();
      const hSet = new Set(holidayList.map(h => h.date.toISOString().slice(0, 10)));

      const cur = new Date(request.startDate);
      while (cur <= request.endDate) {
        const dow  = cur.getUTCDay();
        const dStr = cur.toISOString().slice(0, 10);
        if (dow !== 0 && dow !== 6 && !hSet.has(dStr)) {
          await Attendance.findOneAndUpdate(
            { employeeId: request.employeeId, date: new Date(cur) },
            { $setOnInsert: { status: 'leave', notes: `Leave: ${lt?.code || ''}` } },
            { upsert: true },
          );
        }
        cur.setUTCDate(cur.getUTCDate() + 1);
      }
    }

    request.status           = status;
    request.reviewedBy       = req.user.userId;
    request.reviewedAt       = new Date();
    request.reviewerComments = reviewerComments || '';
    await request.save();

    await logAudit({ userId: req.user.userId, action: 'UPDATE', resource: 'leave_request', resourceId: request._id, before, after: { status, reviewerComments }, req });
    res.json({ success: true, data: { request }, message: `Leave ${status}` });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

// PATCH /hr/leave-requests/:id/cancel  — employee cancels own pending request
exports.cancelLeave = async (req, res) => {
  try {
    const employee = await Employee.findOne({ userId: req.user.userId, deletedAt: null });
    if (!employee) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Employee profile not found' } });

    const request = await LeaveRequest.findOne({ _id: req.params.id, employeeId: employee._id, status: 'pending' });
    if (!request) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Pending leave request not found' } });

    request.status      = 'cancelled';
    request.cancelledAt = new Date();
    await request.save();

    res.json({ success: true, data: { request }, message: 'Leave request cancelled' });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

// GET /hr/leave-requests/team  — manager sees all requests of direct reports
exports.getTeamLeaveRequests = async (req, res) => {
  try {
    // Find this user's employee record
    const managerEmp = await Employee.findOne({ userId: req.user.userId, deletedAt: null });
    const { status } = req.query;

    let employeeFilter = {};
    if (managerEmp) {
      // Get all employees who report to this manager
      const reports = await Employee.find({ reportingManagerId: managerEmp._id, deletedAt: null }).lean();
      const reportIds = reports.map(e => e._id);
      if (!reportIds.length && !['ADMIN', 'SUPERADMIN'].includes(req.user.role)) {
        return res.json({ success: true, data: { requests: [] } });
      }
      if (reportIds.length) employeeFilter.employeeId = { $in: reportIds };
    }

    const filter = { ...employeeFilter };
    if (status) filter.status = status;

    const requests = await LeaveRequest.find(filter)
      .sort('-createdAt')
      .populate('employeeId', 'firstName lastName employeeCode')
      .populate('leaveTypeId', 'name code')
      .populate('reviewedBy', 'name');

    res.json({ success: true, data: { requests } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

// GET /hr/employees/:id/leave-history
exports.getLeaveHistory = async (req, res) => {
  try {
    const { year } = req.query;
    const filter = { employeeId: req.params.id };
    if (year) filter.startDate = { $gte: new Date(`${year}-01-01`), $lte: new Date(`${year}-12-31`) };

    const requests = await LeaveRequest.find(filter)
      .sort('-startDate')
      .populate('leaveTypeId', 'name code')
      .populate('reviewedBy', 'name');

    res.json({ success: true, data: { requests } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};
