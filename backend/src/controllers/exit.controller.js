const mongoose      = require('mongoose');
const Employee      = require('../models/Employee');
const ExitChecklist = require('../models/ExitChecklist');
const ExitInterview = require('../models/ExitInterview');
const FullAndFinalSettlement = require('../models/FullAndFinalSettlement');
const LeaveBalance  = require('../models/LeaveBalance');
const EmployeeSalary= require('../models/EmployeeSalary');
const { logAudit }  = require('../middleware/auditLogger');
const dayjs = require('dayjs');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function round2(n) { return Math.round(n * 100) / 100; }

const DEFAULT_CHECKLIST_ITEMS = [
  { key: 'knowledge_transfer',   label: 'Knowledge Transfer Completed',          completed: false },
  { key: 'asset_return',         label: 'Assets Returned (laptop, ID card, etc.)',completed: false },
  { key: 'access_revoked',       label: 'System Access Revoked',                 completed: false },
  { key: 'exit_interview',       label: 'Exit Interview Conducted',               completed: false },
  { key: 'fnf_calculation',      label: 'F&F Settlement Calculated',             completed: false },
  { key: 'relieving_letter',     label: 'Relieving Letter Issued',               completed: false },
  { key: 'experience_letter',    label: 'Experience Certificate Issued',          completed: false },
];

// ─── Resignation ─────────────────────────────────────────────────────────────

exports.submitResignation = async (req, res, next) => {
  try {
    const emp = await Employee.findOne({ userId: req.user.userId, deletedAt: null });
    if (!emp) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Employee profile not found' } });

    if (['resigned', 'relieved', 'terminated'].includes(emp.employmentStatus)) {
      return res.status(409).json({ success: false, error: { code: 'ALREADY_EXITING', message: 'Exit already initiated' } });
    }

    const { resignationDate, lastWorkingDay, reason = '', noticePeriodDays = 30 } = req.body;
    if (!resignationDate || !lastWorkingDay) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'resignationDate and lastWorkingDay required' } });
    }

    // Update employee status
    emp.employmentStatus         = 'resigned';
    emp.exitInfo.resignationDate = new Date(resignationDate);
    emp.exitInfo.exitDate        = new Date(lastWorkingDay);
    emp.exitInfo.exitReason      = reason;
    emp.exitInfo.noticePeriodEndDate = new Date(lastWorkingDay);
    emp.updatedBy = req.user.userId;
    await emp.save();

    // Create exit checklist
    const checklist = await ExitChecklist.findOneAndUpdate(
      { employeeId: emp._id },
      {
        $setOnInsert: {
          employeeId: emp._id,
          createdBy:  req.user.userId,
          items:      DEFAULT_CHECKLIST_ITEMS,
          deletedAt:  null,
        },
        $set: {
          resignationDate:  new Date(resignationDate),
          lastWorkingDay:   new Date(lastWorkingDay),
          noticePeriodDays,
          status: 'initiated',
          updatedBy: req.user.userId,
        },
      },
      { new: true, upsert: true },
    );

    await logAudit(req, 'UPDATE', 'employee', emp._id, null, { employmentStatus: 'resigned', exitInfo: emp.exitInfo });
    res.json({ success: true, data: { employee: emp, checklist } });
  } catch (err) { next(err); }
};

// ─── Exit Checklist ───────────────────────────────────────────────────────────

exports.getExitChecklist = async (req, res, next) => {
  try {
    const { id: employeeId } = req.params;
    const checklist = await ExitChecklist.findOne({ employeeId, deletedAt: null })
      .populate('items.completedBy', 'name');
    res.json({ success: true, data: { checklist } });
  } catch (err) { next(err); }
};

exports.updateExitChecklist = async (req, res, next) => {
  try {
    const { id: employeeId } = req.params;
    const { itemKey, completed, notes = '', acknowledgeManager, acknowledgeHR, lastWorkingDay } = req.body;

    const checklist = await ExitChecklist.findOne({ employeeId, deletedAt: null });
    if (!checklist) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Exit checklist not found' } });

    if (itemKey !== undefined) {
      const item = checklist.items.find(i => i.key === itemKey);
      if (!item) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Checklist item not found' } });
      item.completed   = completed;
      item.completedAt = completed ? new Date() : null;
      item.completedBy = completed ? req.user.userId : null;
      item.notes       = notes;
    }

    if (acknowledgeManager !== undefined) checklist.acknowledgedByManager = acknowledgeManager;
    if (acknowledgeHR      !== undefined) checklist.acknowledgedByHR      = acknowledgeHR;
    if (lastWorkingDay     !== undefined) checklist.lastWorkingDay = new Date(lastWorkingDay);

    // Auto-update status
    const allDone = checklist.items.every(i => i.completed);
    checklist.status    = allDone ? 'completed' : 'in_progress';
    checklist.updatedBy = req.user.userId;
    await checklist.save();

    await logAudit(req, 'UPDATE', 'exit_checklist', checklist._id, null, checklist.toObject());
    res.json({ success: true, data: { checklist } });
  } catch (err) { next(err); }
};

// ─── Exit Interview ───────────────────────────────────────────────────────────

exports.saveExitInterview = async (req, res, next) => {
  try {
    const { id: employeeId } = req.params;
    const { reasons = [], feedback = '', suggestions = '', wouldRecommend = 'yes', eligibleForRehire = true } = req.body;

    const interview = await ExitInterview.findOneAndUpdate(
      { employeeId },
      {
        $set: {
          conductedBy: req.user.userId,
          conductedAt: new Date(),
          reasons, feedback, suggestions, wouldRecommend, eligibleForRehire,
          updatedBy: req.user.userId,
        },
        $setOnInsert: { createdBy: req.user.userId },
      },
      { new: true, upsert: true },
    );

    // Mark checklist item done
    await ExitChecklist.updateOne(
      { employeeId, 'items.key': 'exit_interview' },
      {
        $set: {
          'items.$.completed':   true,
          'items.$.completedAt': new Date(),
          'items.$.completedBy': req.user.userId,
        },
      },
    );

    // Flag on employee
    await Employee.updateOne({ _id: employeeId }, { 'exitInfo.exitInterviewDone': true, updatedBy: req.user.userId });

    await logAudit(req, 'UPDATE', 'exit_interview', interview._id, null, interview.toObject());
    res.json({ success: true, data: { interview } });
  } catch (err) { next(err); }
};

exports.getExitInterview = async (req, res, next) => {
  try {
    const { id: employeeId } = req.params;
    const interview = await ExitInterview.findOne({ employeeId })
      .populate('conductedBy', 'name');
    res.json({ success: true, data: { interview } });
  } catch (err) { next(err); }
};

// ─── Full & Final Settlement ─────────────────────────────────────────────────

exports.calculateFnF = async (req, res, next) => {
  try {
    const { id: employeeId } = req.params;

    const emp = await Employee.findOne({ _id: employeeId, deletedAt: null });
    if (!emp) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Employee not found' } });

    if (!['resigned', 'terminated', 'absconding'].includes(emp.employmentStatus)) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Employee has not resigned or been terminated' } });
    }

    const exitDate = emp.exitInfo?.exitDate || new Date();

    // Get active salary record
    const sal = await EmployeeSalary.findOne({ employeeId, isActive: true });
    const monthlyBasic  = sal?.basic         || 0;
    const monthlyGross  = sal?.grossMonthly  || 0;

    // Pending salary: pro-rate current month up to exit date
    const exitDay     = dayjs(exitDate);
    const daysInMonth = exitDay.daysInMonth();
    const daysWorked  = exitDay.date();
    const pendingSalary = round2((monthlyGross * daysWorked) / daysInMonth);

    // Leave encashment: unused Earned Leave balance × (basic / 26)
    const elBalance = await LeaveBalance.findOne({ employeeId, year: new Date().getFullYear() })
      .populate({ path: 'leaveTypeId', match: { code: 'EL' } });
    const unusedEL = elBalance?.leaveTypeId ? (elBalance.remaining || 0) : 0;
    const dailyBasic     = round2(monthlyBasic / 26);
    const leaveEncashment = round2(unusedEL * dailyBasic);

    // Gratuity: (15 / 26) * basic * completed_years (only if ≥ 5 years)
    const yearsOfService = dayjs(exitDate).diff(dayjs(emp.dateOfJoining), 'year');
    const gratuity = yearsOfService >= 5
      ? round2((15 / 26) * monthlyBasic * yearsOfService)
      : 0;

    // Accept custom values from body (HR can override calculated amounts)
    const {
      pendingSalary:   customPending   = pendingSalary,
      leaveEncashment: customEL        = leaveEncashment,
      gratuity:        customGratuity  = gratuity,
      bonus:           customBonus     = 0,
      deductions:      customDeductions= [],
      notes            = '',
    } = req.body;

    const totalDeductions = round2(customDeductions.reduce((s, d) => s + (d.amount || 0), 0));
    const netPayable = round2(customPending + customEL + customGratuity + customBonus - totalDeductions);

    const fnf = await FullAndFinalSettlement.findOneAndUpdate(
      { employeeId },
      {
        $set: {
          exitDate,
          pendingSalary:   customPending,
          leaveEncashment: customEL,
          gratuity:        customGratuity,
          bonus:           customBonus,
          deductions:      customDeductions,
          totalDeductions,
          netPayable,
          notes,
          updatedBy: req.user.userId,
        },
        $setOnInsert: { createdBy: req.user.userId, status: 'pending' },
      },
      { new: true, upsert: true },
    );

    await logAudit(req, 'UPDATE', 'fnf_settlement', fnf._id, null, fnf.toObject());
    res.json({ success: true, data: { fnf, calculated: { pendingSalary, leaveEncashment, gratuity, yearsOfService } } });
  } catch (err) { next(err); }
};

exports.getFnF = async (req, res, next) => {
  try {
    const { id: employeeId } = req.params;
    const fnf = await FullAndFinalSettlement.findOne({ employeeId, deletedAt: null })
      .populate('processedBy', 'name')
      .populate('disbursedBy', 'name');
    res.json({ success: true, data: { fnf } });
  } catch (err) { next(err); }
};

exports.approveFnF = async (req, res, next) => {
  try {
    const { id: employeeId } = req.params;
    const fnf = await FullAndFinalSettlement.findOne({ employeeId, deletedAt: null });
    if (!fnf) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'F&F not found' } });
    if (fnf.status !== 'pending') return res.status(409).json({ success: false, error: { code: 'INVALID_STATUS', message: `Cannot approve: status is ${fnf.status}` } });

    fnf.status      = 'approved';
    fnf.processedBy = req.user.userId;
    fnf.processedAt = new Date();
    fnf.updatedBy   = req.user.userId;
    await fnf.save();

    await logAudit(req, 'UPDATE', 'fnf_settlement', fnf._id, null, fnf.toObject());
    res.json({ success: true, data: { fnf } });
  } catch (err) { next(err); }
};

exports.disburseFnF = async (req, res, next) => {
  try {
    const { id: employeeId } = req.params;
    const fnf = await FullAndFinalSettlement.findOne({ employeeId, deletedAt: null });
    if (!fnf) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'F&F not found' } });
    if (fnf.status !== 'approved') return res.status(409).json({ success: false, error: { code: 'INVALID_STATUS', message: 'F&F must be approved before disbursement' } });

    fnf.status      = 'disbursed';
    fnf.disbursedAt = new Date();
    fnf.disbursedBy = req.user.userId;
    fnf.updatedBy   = req.user.userId;
    await fnf.save();

    // Mark employee as relieved and update exitInfo settlement status
    await Employee.updateOne(
      { _id: employeeId },
      { employmentStatus: 'relieved', 'exitInfo.finalSettlementStatus': 'disbursed', updatedBy: req.user.userId },
    );

    await logAudit(req, 'UPDATE', 'fnf_settlement', fnf._id, null, fnf.toObject());
    res.json({ success: true, data: { fnf } });
  } catch (err) { next(err); }
};

// ─── PDF Generation ───────────────────────────────────────────────────────────

exports.generateRelievingLetter = async (req, res, next) => {
  try {
    const { id: employeeId } = req.params;
    const emp = await Employee.findOne({ _id: employeeId, deletedAt: null })
      .populate('departmentId', 'name')
      .populate('reportingManagerId', 'firstName lastName');
    if (!emp) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Employee not found' } });

    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ margin: 60, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="relieving_letter_${emp.employeeCode}.pdf"`);
    doc.pipe(res);

    const exitDate  = emp.exitInfo?.exitDate  ? dayjs(emp.exitInfo.exitDate).format('DD MMMM YYYY')  : '—';
    const joinDate  = emp.dateOfJoining       ? dayjs(emp.dateOfJoining).format('DD MMMM YYYY')      : '—';
    const issueDate = dayjs().format('DD MMMM YYYY');
    const fullName  = `${emp.firstName} ${emp.middleName || ''} ${emp.lastName}`.replace(/\s+/g, ' ').trim();

    // Header
    doc.fillColor('#1A3A6B').fontSize(20).font('Helvetica-Bold').text('ANK DIGITAL MEDIA', { align: 'center' });
    doc.fillColor('#666').fontSize(10).font('Helvetica').text('ankdigitalmedia.com | 09999779817', { align: 'center' });
    doc.moveDown(0.5);
    doc.fillColor('#1E6FD9').fontSize(14).font('Helvetica-Bold').text('RELIEVING LETTER', { align: 'center' });
    doc.moveDown(1);

    doc.fillColor('#000').fontSize(11).font('Helvetica');
    doc.text(`Date: ${issueDate}`, { align: 'right' });
    doc.moveDown(0.5);
    doc.text(`To,`);
    doc.text(`${fullName}`);
    doc.text(emp.currentAddress || '');
    doc.moveDown(1);

    doc.text(`Dear ${emp.firstName},`);
    doc.moveDown(0.5);
    doc.text(
      `This is to certify that ${fullName} (Employee Code: ${emp.employeeCode}) was employed with ANK Digital Media as ${emp.designation || 'Team Member'} in the ${emp.departmentId?.name || ''} department from ${joinDate} to ${exitDate}.`,
      { lineGap: 4 }
    );
    doc.moveDown(0.5);
    doc.text(
      `We wish to confirm that ${emp.firstName} has been relieved from the services of our organization effective ${exitDate}. All their dues and obligations have been settled as per company policy.`,
      { lineGap: 4 }
    );
    doc.moveDown(0.5);
    doc.text(`We wish ${emp.firstName} all the best for their future endeavours.`, { lineGap: 4 });
    doc.moveDown(2);

    doc.text('For ANK Digital Media');
    doc.moveDown(3);
    doc.text('Authorized Signatory');
    doc.text('ANK Digital Media');

    doc.end();
  } catch (err) { next(err); }
};

exports.generateExperienceLetter = async (req, res, next) => {
  try {
    const { id: employeeId } = req.params;
    const emp = await Employee.findOne({ _id: employeeId, deletedAt: null })
      .populate('departmentId', 'name');
    if (!emp) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Employee not found' } });

    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ margin: 60, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="experience_letter_${emp.employeeCode}.pdf"`);
    doc.pipe(res);

    const exitDate  = emp.exitInfo?.exitDate  ? dayjs(emp.exitInfo.exitDate).format('DD MMMM YYYY')  : dayjs().format('DD MMMM YYYY');
    const joinDate  = emp.dateOfJoining       ? dayjs(emp.dateOfJoining).format('DD MMMM YYYY')      : '—';
    const issueDate = dayjs().format('DD MMMM YYYY');
    const fullName  = `${emp.firstName} ${emp.middleName || ''} ${emp.lastName}`.replace(/\s+/g, ' ').trim();
    const yearsOfService = dayjs(emp.exitInfo?.exitDate || new Date()).diff(dayjs(emp.dateOfJoining), 'year');
    const monthsExtra    = dayjs(emp.exitInfo?.exitDate || new Date()).diff(dayjs(emp.dateOfJoining), 'month') % 12;

    const duration = yearsOfService > 0
      ? `${yearsOfService} year${yearsOfService > 1 ? 's' : ''}${monthsExtra > 0 ? ` and ${monthsExtra} month${monthsExtra > 1 ? 's' : ''}` : ''}`
      : `${monthsExtra} month${monthsExtra !== 1 ? 's' : ''}`;

    doc.fillColor('#1A3A6B').fontSize(20).font('Helvetica-Bold').text('ANK DIGITAL MEDIA', { align: 'center' });
    doc.fillColor('#666').fontSize(10).font('Helvetica').text('ankdigitalmedia.com | 09999779817', { align: 'center' });
    doc.moveDown(0.5);
    doc.fillColor('#1E6FD9').fontSize(14).font('Helvetica-Bold').text('EXPERIENCE CERTIFICATE', { align: 'center' });
    doc.moveDown(1);

    doc.fillColor('#000').fontSize(11).font('Helvetica');
    doc.text(`Date: ${issueDate}`, { align: 'right' });
    doc.text(`Ref: ${emp.employeeCode}/EXP/${dayjs().year()}`, { align: 'right' });
    doc.moveDown(1);

    doc.text('To Whom It May Concern,');
    doc.moveDown(0.5);
    doc.text(
      `This is to certify that ${fullName} was employed with ANK Digital Media as ${emp.designation || 'Team Member'} in the ${emp.departmentId?.name || ''} department from ${joinDate} to ${exitDate}, a period of approximately ${duration}.`,
      { lineGap: 4 }
    );
    doc.moveDown(0.5);
    doc.text(
      `During the tenure of employment, ${emp.firstName} demonstrated dedication, professionalism, and commitment to their responsibilities. ${emp.firstName} was found to be sincere and hardworking throughout their service with us.`,
      { lineGap: 4 }
    );
    doc.moveDown(0.5);
    doc.text(
      `We wish ${emp.firstName} all the success in their future endeavours and recommend them to prospective employers.`,
      { lineGap: 4 }
    );
    doc.moveDown(2);

    doc.text('For ANK Digital Media');
    doc.moveDown(3);
    doc.text('Authorized Signatory');
    doc.text('ANK Digital Media');

    doc.end();
  } catch (err) { next(err); }
};

// ─── HR Master Dashboard ─────────────────────────────────────────────────────

exports.getHRDashboard = async (req, res, next) => {
  try {
    const now   = dayjs();
    const today = now.toDate();
    const monthStart = now.startOf('month').toDate();
    const monthEnd   = now.endOf('month').toDate();

    const [
      totalEmployees,
      byDept,
      joiningsThisMonth,
      exitsThisMonth,
      probationExpiring,
      pendingLeaveCount,
      pendingReimbursementCount,
      birthdays,
      openPositions,
    ] = await Promise.all([
      // Total active employees
      Employee.countDocuments({ employmentStatus: { $in: ['probation', 'confirmed'] }, deletedAt: null }),

      // By department
      Employee.aggregate([
        { $match: { employmentStatus: { $in: ['probation', 'confirmed'] }, deletedAt: null } },
        { $group: { _id: '$departmentId', count: { $sum: 1 } } },
        { $lookup: { from: 'departments', localField: '_id', foreignField: '_id', as: 'dept' } },
        { $project: { count: 1, deptName: { $arrayElemAt: ['$dept.name', 0] } } },
      ]),

      // Joinings this month
      Employee.countDocuments({ dateOfJoining: { $gte: monthStart, $lte: monthEnd }, deletedAt: null }),

      // Exits this month
      Employee.countDocuments({
        employmentStatus: { $in: ['resigned', 'terminated', 'relieved'] },
        'exitInfo.exitDate': { $gte: monthStart, $lte: monthEnd },
        deletedAt: null,
      }),

      // Probation ending in next 30 days
      Employee.find({
        employmentStatus: 'probation',
        probationEndDate: { $gte: today, $lte: now.add(30, 'day').toDate() },
        deletedAt: null,
      }).select('firstName lastName employeeCode probationEndDate').limit(10).lean(),

      // Pending leave requests
      require('../models/LeaveRequest').countDocuments({ status: 'pending' }),

      // Pending reimbursements
      require('../models/Reimbursement').countDocuments({ status: 'pending' }),

      // Birthdays this week (match month+day regardless of year)
      Employee.find({
        dob: { $exists: true, $ne: null },
        employmentStatus: { $in: ['probation', 'confirmed'] },
        deletedAt: null,
      }).select('firstName lastName dob employeeCode').lean().then(emps => {
        const weekStart = now.startOf('week');
        const weekEnd   = now.endOf('week');
        return emps.filter(e => {
          if (!e.dob) return false;
          const d = dayjs(e.dob);
          const thisYear = d.year(now.year());
          return thisYear.isAfter(weekStart.subtract(1, 'day')) && thisYear.isBefore(weekEnd.add(1, 'day'));
        });
      }),

      // Open candidate positions (active candidates not yet selected)
      require('../models/Candidate').countDocuments({ status: { $in: ['New', 'Shortlisted', 'Interview Done'] }, deletedAt: null }),
    ]);

    const totalActive = totalEmployees;
    const attritionRate = totalActive > 0 ? round2((exitsThisMonth / totalActive) * 100) : 0;

    res.json({
      success: true,
      data: {
        totalEmployees:            totalActive,
        byDepartment:              byDept,
        joiningsThisMonth,
        exitsThisMonth,
        attritionRate,
        probationExpiringSoon:     probationExpiring,
        pendingLeaveRequests:      pendingLeaveCount,
        pendingReimbursements:     pendingReimbursementCount,
        birthdaysThisWeek:         birthdays,
        openCandidatePositions:    openPositions,
      },
    });
  } catch (err) { next(err); }
};
