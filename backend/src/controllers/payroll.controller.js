const mongoose = require('mongoose');
const SalaryStructure = require('../models/SalaryStructure');
const EmployeeSalary  = require('../models/EmployeeSalary');
const PayrollRun      = require('../models/PayrollRun');
const Payslip         = require('../models/Payslip');
const Reimbursement   = require('../models/Reimbursement');
const Bonus           = require('../models/Bonus');
const Employee        = require('../models/Employee');
const Attendance      = require('../models/Attendance');
const { logAudit }    = require('../middleware/auditLogger');

// ─── Helpers ────────────────────────────────────────────────────────────────

function round2(n) { return Math.round(n * 100) / 100; }

/**
 * Calculate annual TDS under new regime (simplified):
 * Standard deduction: ₹75,000
 * Slabs (new regime FY 2024-25):
 *   0 – 3 L      → 0%
 *   3 – 7 L      → 5%
 *   7 – 10 L     → 10%
 *   10 – 12 L    → 15%
 *   12 – 15 L    → 20%
 *   > 15 L       → 30%
 */
function calcAnnualTDS(annualGross) {
  const taxable = Math.max(0, annualGross - 75000);
  const slabs = [
    { upto: 300000,  rate: 0.00 },
    { upto: 700000,  rate: 0.05 },
    { upto: 1000000, rate: 0.10 },
    { upto: 1200000, rate: 0.15 },
    { upto: 1500000, rate: 0.20 },
    { upto: Infinity, rate: 0.30 },
  ];
  let prev = 0, tax = 0;
  for (const { upto, rate } of slabs) {
    if (taxable <= prev) break;
    const slice = Math.min(taxable, upto) - prev;
    tax += slice * rate;
    prev = upto;
  }
  // Section 87A rebate: if taxable income <= 7L, tax = 0
  if (taxable <= 700000) tax = 0;
  return round2(tax);
}

/** Days in given month */
function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

/** Pro-rate amount by paid/working days */
function proRate(amount, paidDays, workingDays) {
  if (workingDays <= 0) return 0;
  return round2((amount * paidDays) / workingDays);
}

/** Derive monthly amounts from a salary record */
function buildMonthlyComponents(sal) {
  return {
    basic:               sal.basic,
    hra:                 sal.hra,
    gross:               sal.grossMonthly,
    allowancesBreakdown: sal.allowancesBreakdown || [],
    deductionsBreakdown: sal.deductionsBreakdown || [],
  };
}

// ─── Salary Structure CRUD ──────────────────────────────────────────────────

exports.createSalaryStructure = async (req, res, next) => {
  try {
    const { name, basicPercent, hraPercent, allowances = [], deductions = [] } = req.body;
    if (!name || basicPercent == null || hraPercent == null) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'name, basicPercent, hraPercent required' } });
    }
    const struct = await SalaryStructure.create({ name, basicPercent, hraPercent, allowances, deductions, createdBy: req.user.userId });
    await logAudit(req, 'CREATE', 'salary_structure', struct._id, null, struct.toObject());
    res.status(201).json({ success: true, data: { structure: struct } });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ success: false, error: { code: 'DUPLICATE_NAME', message: 'Structure name already exists' } });
    next(err);
  }
};

exports.listSalaryStructures = async (req, res, next) => {
  try {
    const structs = await SalaryStructure.find({ deletedAt: null, isActive: true }).sort({ name: 1 });
    res.json({ success: true, data: { structures: structs } });
  } catch (err) { next(err); }
};

exports.getSalaryStructure = async (req, res, next) => {
  try {
    const struct = await SalaryStructure.findOne({ _id: req.params.id, deletedAt: null });
    if (!struct) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Structure not found' } });
    res.json({ success: true, data: { structure: struct } });
  } catch (err) { next(err); }
};

exports.updateSalaryStructure = async (req, res, next) => {
  try {
    const before = await SalaryStructure.findOne({ _id: req.params.id, deletedAt: null });
    if (!before) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Structure not found' } });
    const { name, basicPercent, hraPercent, allowances, deductions, isActive } = req.body;
    const updates = {};
    if (name != null)          updates.name         = name;
    if (basicPercent != null)  updates.basicPercent  = basicPercent;
    if (hraPercent != null)    updates.hraPercent    = hraPercent;
    if (allowances != null)    updates.allowances    = allowances;
    if (deductions != null)    updates.deductions    = deductions;
    if (isActive != null)      updates.isActive      = isActive;
    updates.updatedBy = req.user.userId;
    const struct = await SalaryStructure.findByIdAndUpdate(req.params.id, updates, { new: true });
    await logAudit(req, 'UPDATE', 'salary_structure', struct._id, before.toObject(), struct.toObject());
    res.json({ success: true, data: { structure: struct } });
  } catch (err) { next(err); }
};

exports.deleteSalaryStructure = async (req, res, next) => {
  try {
    const struct = await SalaryStructure.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      { deletedAt: new Date(), updatedBy: req.user.userId },
      { new: true },
    );
    if (!struct) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Structure not found' } });
    await logAudit(req, 'DELETE', 'salary_structure', struct._id, null, null);
    res.json({ success: true, message: 'Structure deactivated' });
  } catch (err) { next(err); }
};

// ─── Employee Salary Assignment ─────────────────────────────────────────────

/**
 * Compute derived monthly fields from CTC + structure:
 *   basic        = CTC/12 * basicPercent/100
 *   hra          = basic * hraPercent/100
 *   allowances   = structure.allowances mapped to amounts
 *   grossMonthly = basic + hra + sum(allowances)
 *   deductions   = structure.deductions mapped to amounts (PF/ESI/etc.)
 *   netMonthly   = gross - sum(deductions)
 */
function computeSalaryFromCTC(ctc, structure) {
  const monthlyCtc = ctc / 12;
  const basic = round2(monthlyCtc * structure.basicPercent / 100);
  const hra   = round2(basic * structure.hraPercent / 100);

  const allowancesBreakdown = structure.allowances.map(a => ({
    name:   a.name,
    amount: a.isPercent ? round2(basic * a.value / 100) : round2(a.value),
  }));

  const grossMonthly = round2(basic + hra + allowancesBreakdown.reduce((s, a) => s + a.amount, 0));

  const deductionsBreakdown = structure.deductions.map(d => {
    if (d.type === 'pf')  return { name: d.name, amount: round2(Math.min(basic, 15000) * 0.12) };
    if (d.type === 'esi') return { name: d.name, amount: grossMonthly <= 21000 ? round2(grossMonthly * 0.0075) : 0 };
    return { name: d.name, amount: d.isPercent ? round2(basic * d.value / 100) : round2(d.value) };
  });

  const netMonthly = round2(grossMonthly - deductionsBreakdown.reduce((s, d) => s + d.amount, 0));

  return { basic, hra, grossMonthly, netMonthly, allowancesBreakdown, deductionsBreakdown };
}

exports.assignSalary = async (req, res, next) => {
  try {
    const { id: employeeId } = req.params;
    const { structureId, ctc, effectiveFrom, revisedReason = '' } = req.body;
    if (!structureId || !ctc || !effectiveFrom) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'structureId, ctc, effectiveFrom required' } });
    }
    const emp = await Employee.findOne({ _id: employeeId, deletedAt: null });
    if (!emp) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Employee not found' } });
    const structure = await SalaryStructure.findOne({ _id: structureId, deletedAt: null });
    if (!structure) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Salary structure not found' } });

    // Deactivate previous active record
    await EmployeeSalary.updateMany({ employeeId, isActive: true }, { isActive: false });

    const derived = computeSalaryFromCTC(ctc, structure);
    const sal = await EmployeeSalary.create({
      employeeId, structureId, ctc, effectiveFrom, revisedReason,
      isActive: true, createdBy: req.user.userId,
      ...derived,
    });

    await logAudit(req, 'CREATE', 'employee_salary', sal._id, null, sal.toObject());
    res.status(201).json({ success: true, data: { salary: sal } });
  } catch (err) { next(err); }
};

exports.getSalaryHistory = async (req, res, next) => {
  try {
    const { id: employeeId } = req.params;
    const history = await EmployeeSalary.find({ employeeId })
      .populate('structureId', 'name')
      .sort({ effectiveFrom: -1 });
    res.json({ success: true, data: { history } });
  } catch (err) { next(err); }
};

// ─── Payroll Engine ──────────────────────────────────────────────────────────

/**
 * Count LOP days for an employee in a given month.
 * LOP = days that are NOT weekend, NOT holiday, NOT leave, and employee is absent.
 */
async function getLOPDays(employeeId, year, month) {
  const startDate = new Date(Date.UTC(year, month - 1, 1));
  const endDate   = new Date(Date.UTC(year, month, 0, 23, 59, 59));

  const records = await Attendance.find({
    employeeId,
    date: { $gte: startDate, $lte: endDate },
    status: 'absent',
  }).lean();

  return records.length;
}

/** Count paid days = working days in month - LOP days */
async function getWorkingAndPaidDays(employeeId, year, month) {
  const totalDays = daysInMonth(year, month);
  let workingDays = 0;

  for (let d = 1; d <= totalDays; d++) {
    const dt = new Date(Date.UTC(year, month - 1, d));
    const dow = dt.getUTCDay();
    if (dow === 0 || dow === 6) continue; // weekend
    workingDays++;
  }

  const lopDays  = await getLOPDays(employeeId, year, month);
  const paidDays = Math.max(0, workingDays - lopDays);
  return { workingDays, paidDays, lopDays };
}

exports.processPayroll = async (req, res, next) => {
  try {
    const { month, year } = req.body;
    if (!month || !year) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'month and year required' } });
    }

    // Create or reuse draft run
    let run = await PayrollRun.findOne({ month, year });
    if (run && run.status !== 'draft') {
      return res.status(409).json({ success: false, error: { code: 'PAYROLL_ALREADY_PROCESSED', message: 'Payroll already processed for this period' } });
    }
    if (!run) {
      run = await PayrollRun.create({ month, year, status: 'draft', createdBy: req.user.userId });
    }

    // Get all active employees (exclude resigned/terminated/relieved/absconding)
    const employees = await Employee.find({ deletedAt: null, employmentStatus: { $in: ['probation', 'confirmed'] } }).lean();

    let totalAmount = 0;
    let totalEmployees = 0;
    const payslips = [];

    for (const emp of employees) {
      const sal = await EmployeeSalary.findOne({ employeeId: emp._id, isActive: true }).populate('structureId');
      if (!sal) continue; // skip employees with no salary assigned

      const { workingDays, paidDays, lopDays } = await getWorkingAndPaidDays(emp._id, year, month);
      const { basic, hra, allowancesBreakdown } = buildMonthlyComponents(sal);

      // Pro-rate
      const basicEarned = proRate(basic, paidDays, workingDays);
      const hraEarned   = proRate(hra, paidDays, workingDays);
      const proRatedAllowances = allowancesBreakdown.map(a => ({
        name:   a.name,
        amount: proRate(a.amount, paidDays, workingDays),
      }));

      // Bonuses for this month
      const bonuses = await Bonus.find({
        employeeId: emp._id, payableMonth: month, payableYear: year,
        status: 'planned', deletedAt: null,
      }).lean();
      const bonusAmount = bonuses.reduce((s, b) => s + b.amount, 0);

      // Approved reimbursements not yet included in payroll
      const reimbursements = await Reimbursement.find({
        employeeId: emp._id, status: 'approved', payrollRunId: null, deletedAt: null,
      }).lean();
      const reimbursementAmount = reimbursements.reduce((s, r) => s + r.amount, 0);

      const grossEarnings = round2(basicEarned + hraEarned
        + proRatedAllowances.reduce((s, a) => s + a.amount, 0)
        + bonusAmount + reimbursementAmount);

      // PF: 12% of basic (employee share), capped at ₹15,000 basic
      const pfEmployee = round2(Math.min(basicEarned, 15000) * 0.12);
      const pfEmployer = pfEmployee; // equal employer share

      // ESI: applicable only if gross <= ₹21,000
      const esiEmployee = grossEarnings <= 21000 ? round2(grossEarnings * 0.0075) : 0;
      const esiEmployer = grossEarnings <= 21000 ? round2(grossEarnings * 0.0325) : 0;

      // TDS: annualise gross, calculate, divide by 12
      const annualGross = grossEarnings * 12;
      const annualTDS   = calcAnnualTDS(annualGross);
      const tdsAmount   = round2(annualTDS / 12);

      const totalDeductions = round2(pfEmployee + esiEmployee + tdsAmount);
      const netPay = round2(grossEarnings - totalDeductions);

      // Upsert payslip
      const existingPayslip = await Payslip.findOne({ payrollRunId: run._id, employeeId: emp._id });
      const payslipData = {
        payrollRunId: run._id, employeeId: emp._id, month, year,
        workingDays, paidDays, lopDays,
        basicEarned, hraEarned,
        allowancesBreakdown: proRatedAllowances,
        bonusAmount, reimbursementAmount,
        grossEarnings,
        pfEmployee, pfEmployer, esiEmployee, esiEmployer, tdsAmount,
        totalDeductions, netPay,
      };

      let slip;
      if (existingPayslip) {
        slip = await Payslip.findByIdAndUpdate(existingPayslip._id, payslipData, { new: true });
      } else {
        slip = await Payslip.create(payslipData);
      }
      payslips.push(slip);

      // Mark bonuses as included
      if (bonuses.length) {
        await Bonus.updateMany(
          { _id: { $in: bonuses.map(b => b._id) } },
          { status: 'included_in_payroll', payrollRunId: run._id },
        );
      }
      // Link reimbursements to this run
      if (reimbursements.length) {
        await Reimbursement.updateMany(
          { _id: { $in: reimbursements.map(r => r._id) } },
          { payrollRunId: run._id },
        );
      }

      totalAmount += netPay;
      totalEmployees++;
    }

    // Update run totals + mark processed
    run = await PayrollRun.findByIdAndUpdate(run._id, {
      status: 'processed',
      processedBy: req.user.userId,
      processedAt: new Date(),
      totalEmployees,
      totalAmount: round2(totalAmount),
    }, { new: true });

    await logAudit(req, 'UPDATE', 'payroll_run', run._id, null, run.toObject());
    res.json({ success: true, data: { run, payslips } });
  } catch (err) { next(err); }
};

exports.listPayrollRuns = async (req, res, next) => {
  try {
    const { year } = req.query;
    const filter = {};
    if (year) filter.year = parseInt(year, 10);
    const runs = await PayrollRun.find(filter).sort({ year: -1, month: -1 }).populate('processedBy', 'name').populate('disbursedBy', 'name');
    res.json({ success: true, data: { runs } });
  } catch (err) { next(err); }
};

exports.getPayrollRun = async (req, res, next) => {
  try {
    const run = await PayrollRun.findById(req.params.id).populate('processedBy', 'name').populate('disbursedBy', 'name');
    if (!run) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Payroll run not found' } });
    const payslips = await Payslip.find({ payrollRunId: run._id })
      .populate({ path: 'employeeId', select: 'firstName lastName employeeCode' });
    res.json({ success: true, data: { run, payslips } });
  } catch (err) { next(err); }
};

exports.disbursePayroll = async (req, res, next) => {
  try {
    const run = await PayrollRun.findById(req.params.id);
    if (!run) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Payroll run not found' } });
    if (run.status !== 'processed') {
      return res.status(400).json({ success: false, error: { code: 'INVALID_STATE', message: 'Only processed payrolls can be disbursed' } });
    }
    const before = run.toObject();
    run.status      = 'disbursed';
    run.disbursedBy  = req.user.userId;
    run.disbursedAt  = new Date();
    await run.save();
    await logAudit(req, 'UPDATE', 'payroll_run', run._id, before, run.toObject());
    res.json({ success: true, data: { run } });
  } catch (err) { next(err); }
};

/** CSV bank disbursement file */
exports.getBankFile = async (req, res, next) => {
  try {
    const run = await PayrollRun.findById(req.params.id);
    if (!run) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Payroll run not found' } });

    const payslips = await Payslip.find({ payrollRunId: run._id })
      .populate({ path: 'employeeId', select: 'firstName lastName employeeCode bankDetails' });

    const rows = [
      'Employee Code,Employee Name,Account Number,IFSC,Bank Name,Net Pay',
      ...payslips.map(p => {
        const emp = p.employeeId;
        const bank = emp?.bankDetails || {};
        return [
          emp?.employeeCode || '',
          `${emp?.firstName || ''} ${emp?.lastName || ''}`.trim(),
          bank.accountNumber || '',
          bank.ifsc || '',
          bank.bankName || '',
          p.netPay,
        ].join(',');
      }),
    ];

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="payroll_${run.year}_${String(run.month).padStart(2,'0')}.csv"`);
    res.send(rows.join('\n'));
  } catch (err) { next(err); }
};

// ─── Payslip ─────────────────────────────────────────────────────────────────

exports.listMyPayslips = async (req, res, next) => {
  try {
    const emp = await Employee.findOne({ userId: req.user.userId, deletedAt: null });
    if (!emp) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Employee profile not found' } });

    const payslips = await Payslip.find({ employeeId: emp._id })
      .sort({ year: -1, month: -1 })
      .populate('payrollRunId', 'status disbursedAt');

    res.json({ success: true, data: { payslips } });
  } catch (err) { next(err); }
};

exports.getPayslip = async (req, res, next) => {
  try {
    const slip = await Payslip.findById(req.params.id)
      .populate({ path: 'employeeId', select: 'firstName lastName employeeCode designation departmentId dateOfJoining bankDetails', populate: { path: 'departmentId', select: 'name' } })
      .populate('payrollRunId', 'month year status disbursedAt');

    if (!slip) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Payslip not found' } });

    // Non-admin can only view own payslip
    const isAdmin = ['ADMIN', 'SUPERADMIN'].includes(req.user.role);
    if (!isAdmin) {
      const emp = await Employee.findOne({ userId: req.user.userId, deletedAt: null });
      if (!emp || slip.employeeId._id.toString() !== emp._id.toString()) {
        return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } });
      }
    }
    res.json({ success: true, data: { slip } });
  } catch (err) { next(err); }
};

exports.getPayslipPDF = async (req, res, next) => {
  try {
    const slip = await Payslip.findById(req.params.id)
      .populate({ path: 'employeeId', select: 'firstName lastName employeeCode designation departmentId', populate: { path: 'departmentId', select: 'name' } })
      .populate('payrollRunId', 'month year');

    if (!slip) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Payslip not found' } });

    // Access guard
    const isAdmin = ['ADMIN', 'SUPERADMIN'].includes(req.user.role);
    if (!isAdmin) {
      const emp = await Employee.findOne({ userId: req.user.userId, deletedAt: null });
      if (!emp || slip.employeeId._id.toString() !== emp._id.toString()) {
        return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } });
      }
    }

    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ margin: 40, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="payslip_${slip.year}_${String(slip.month).padStart(2,'0')}.pdf"`);
    doc.pipe(res);

    const MONTHS = ['', 'January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'];
    const emp = slip.employeeId;

    // Header
    doc.fillColor('#1E6FD9').fontSize(22).font('Helvetica-Bold').text('ANK Digital Media', { align: 'center' });
    doc.fillColor('#444').fontSize(10).font('Helvetica').text('ankdigitalmedia.com · 09999779817', { align: 'center' });
    doc.moveDown(0.5);
    doc.fillColor('#0A1628').fontSize(14).font('Helvetica-Bold')
       .text(`Salary Slip — ${MONTHS[slip.month]} ${slip.year}`, { align: 'center' });

    doc.moveDown(0.5);
    doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor('#1E6FD9').lineWidth(2).stroke();
    doc.moveDown(0.5);

    // Employee info
    const infoY = doc.y;
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#666').text('EMPLOYEE DETAILS', 40, infoY);
    doc.font('Helvetica').fillColor('#222');
    const info = [
      ['Name', `${emp.firstName} ${emp.lastName}`],
      ['Employee Code', emp.employeeCode],
      ['Designation', emp.designation || '—'],
      ['Department', emp.departmentId?.name || '—'],
      ['Working Days', `${slip.workingDays}`],
      ['Paid Days', `${slip.paidDays}`],
      ['LOP Days', `${slip.lopDays}`],
    ];
    info.forEach(([label, val], i) => {
      const x = (i % 2 === 0) ? 40 : 300;
      const y = infoY + 14 + Math.floor(i / 2) * 14;
      doc.fontSize(9).text(`${label}: `, x, y, { continued: true }).font('Helvetica-Bold').text(val);
      doc.font('Helvetica');
    });

    doc.moveDown(3);
    doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor('#ddd').lineWidth(1).stroke();
    doc.moveDown(0.5);

    // Earnings table
    const tableTop = doc.y;
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#1E6FD9')
       .text('EARNINGS', 40, tableTop)
       .text('AMOUNT (₹)', 350, tableTop, { width: 100, align: 'right' });
    doc.font('Helvetica').fillColor('#222');

    let ty = tableTop + 14;
    const earns = [
      ['Basic', slip.basicEarned],
      ['HRA', slip.hraEarned],
      ...(slip.allowancesBreakdown || []).map(a => [a.name, a.amount]),
    ];
    if (slip.bonusAmount > 0)         earns.push(['Bonus', slip.bonusAmount]);
    if (slip.reimbursementAmount > 0) earns.push(['Reimbursements', slip.reimbursementAmount]);

    earns.forEach(([label, amt]) => {
      doc.fontSize(9).text(label, 40, ty).text(`₹${amt.toFixed(2)}`, 350, ty, { width: 100, align: 'right' });
      ty += 13;
    });

    doc.moveTo(40, ty).lineTo(455, ty).strokeColor('#ddd').lineWidth(0.5).stroke();
    ty += 5;
    doc.font('Helvetica-Bold').fontSize(9)
       .text('Gross Earnings', 40, ty)
       .text(`₹${slip.grossEarnings.toFixed(2)}`, 350, ty, { width: 100, align: 'right' });
    ty += 20;

    // Deductions table
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#1E6FD9')
       .text('DEDUCTIONS', 40, ty)
       .text('AMOUNT (₹)', 350, ty, { width: 100, align: 'right' });
    doc.font('Helvetica').fillColor('#222');
    ty += 14;

    const deds = [
      ['PF (Employee 12%)', slip.pfEmployee],
      ['ESI (Employee 0.75%)', slip.esiEmployee],
      ['TDS', slip.tdsAmount],
      ...(slip.otherDeductions || []).map(d => [d.name, d.amount]),
    ].filter(([, amt]) => amt > 0);

    deds.forEach(([label, amt]) => {
      doc.fontSize(9).text(label, 40, ty).text(`₹${amt.toFixed(2)}`, 350, ty, { width: 100, align: 'right' });
      ty += 13;
    });

    doc.moveTo(40, ty).lineTo(455, ty).strokeColor('#ddd').lineWidth(0.5).stroke();
    ty += 5;
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#333')
       .text('Total Deductions', 40, ty)
       .text(`₹${slip.totalDeductions.toFixed(2)}`, 350, ty, { width: 100, align: 'right' });
    ty += 20;

    // Net pay box
    doc.roundedRect(40, ty, 515, 35, 5).fillAndStroke('#1E6FD9', '#1E6FD9');
    doc.fillColor('#fff').font('Helvetica-Bold').fontSize(13)
       .text(`NET PAY: ₹${slip.netPay.toFixed(2)}`, 40, ty + 10, { align: 'center', width: 515 });

    ty += 55;
    doc.fillColor('#999').fontSize(8).font('Helvetica')
       .text('This is a system-generated payslip. No signature required.', 40, ty, { align: 'center' });

    doc.end();
  } catch (err) { next(err); }
};

// ─── Reimbursements ──────────────────────────────────────────────────────────

exports.submitReimbursement = async (req, res, next) => {
  try {
    const emp = await Employee.findOne({ userId: req.user.userId, deletedAt: null });
    if (!emp) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Employee profile not found' } });

    const { type, amount, billDate, description = '', billAttachment = '' } = req.body;
    if (!type || !amount || !billDate) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'type, amount, billDate required' } });
    }
    const r = await Reimbursement.create({ employeeId: emp._id, type, amount, billDate, description, billAttachment, status: 'pending', createdBy: req.user.userId });
    await logAudit(req, 'CREATE', 'reimbursement', r._id, null, r.toObject());
    res.status(201).json({ success: true, data: { reimbursement: r } });
  } catch (err) { next(err); }
};

exports.listReimbursements = async (req, res, next) => {
  try {
    const isAdmin = ['ADMIN', 'SUPERADMIN'].includes(req.user.role);
    let filter = { deletedAt: null };

    if (!isAdmin) {
      const emp = await Employee.findOne({ userId: req.user.userId, deletedAt: null });
      if (!emp) return res.json({ success: true, data: { reimbursements: [] } });
      filter.employeeId = emp._id;
    }

    if (req.query.status) filter.status = req.query.status;

    const reimbursements = await Reimbursement.find(filter)
      .sort({ createdAt: -1 })
      .populate({ path: 'employeeId', select: 'firstName lastName employeeCode' });
    res.json({ success: true, data: { reimbursements } });
  } catch (err) { next(err); }
};

exports.reviewReimbursement = async (req, res, next) => {
  try {
    const { status, reviewerNotes = '' } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'status must be approved or rejected' } });
    }
    const before = await Reimbursement.findOne({ _id: req.params.id, deletedAt: null });
    if (!before) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Reimbursement not found' } });
    if (before.status !== 'pending') {
      return res.status(409).json({ success: false, error: { code: 'INVALID_STATE', message: 'Reimbursement already reviewed' } });
    }
    const r = await Reimbursement.findByIdAndUpdate(req.params.id, {
      status, reviewerNotes, reviewedBy: req.user.userId, reviewedAt: new Date(), updatedBy: req.user.userId,
    }, { new: true });
    await logAudit(req, 'UPDATE', 'reimbursement', r._id, before.toObject(), r.toObject());
    res.json({ success: true, data: { reimbursement: r } });
  } catch (err) { next(err); }
};

// ─── Bonuses ─────────────────────────────────────────────────────────────────

exports.createBonus = async (req, res, next) => {
  try {
    const { employeeId, type, amount, reason = '', payableMonth, payableYear } = req.body;
    if (!employeeId || !type || !amount || !payableMonth || !payableYear) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'employeeId, type, amount, payableMonth, payableYear required' } });
    }
    const b = await Bonus.create({ employeeId, type, amount, reason, payableMonth, payableYear, status: 'planned', createdBy: req.user.userId });
    await logAudit(req, 'CREATE', 'bonus', b._id, null, b.toObject());
    res.status(201).json({ success: true, data: { bonus: b } });
  } catch (err) { next(err); }
};

exports.listBonuses = async (req, res, next) => {
  try {
    const filter = { deletedAt: null };
    if (req.query.employeeId) filter.employeeId = req.query.employeeId;
    if (req.query.year)       filter.payableYear = parseInt(req.query.year, 10);
    if (req.query.status)     filter.status = req.query.status;

    const bonuses = await Bonus.find(filter)
      .sort({ payableYear: -1, payableMonth: -1 })
      .populate({ path: 'employeeId', select: 'firstName lastName employeeCode' });
    res.json({ success: true, data: { bonuses } });
  } catch (err) { next(err); }
};

exports.updateBonus = async (req, res, next) => {
  try {
    const before = await Bonus.findOne({ _id: req.params.id, deletedAt: null });
    if (!before) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Bonus not found' } });
    if (before.status !== 'planned') {
      return res.status(409).json({ success: false, error: { code: 'INVALID_STATE', message: 'Only planned bonuses can be edited' } });
    }
    const { type, amount, reason, payableMonth, payableYear } = req.body;
    const updates = { updatedBy: req.user.userId };
    if (type)          updates.type          = type;
    if (amount != null) updates.amount        = amount;
    if (reason)        updates.reason        = reason;
    if (payableMonth)  updates.payableMonth  = payableMonth;
    if (payableYear)   updates.payableYear   = payableYear;
    const b = await Bonus.findByIdAndUpdate(req.params.id, updates, { new: true });
    await logAudit(req, 'UPDATE', 'bonus', b._id, before.toObject(), b.toObject());
    res.json({ success: true, data: { bonus: b } });
  } catch (err) { next(err); }
};

exports.deleteBonus = async (req, res, next) => {
  try {
    const b = await Bonus.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null, status: 'planned' },
      { deletedAt: new Date(), updatedBy: req.user.userId },
      { new: true },
    );
    if (!b) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Bonus not found or cannot be deleted' } });
    await logAudit(req, 'DELETE', 'bonus', b._id, null, null);
    res.json({ success: true, message: 'Bonus deleted' });
  } catch (err) { next(err); }
};

// ─── Form 16 Placeholder ──────────────────────────────────────────────────────

exports.getForm16 = async (req, res, next) => {
  try {
    const { id: employeeId } = req.params;
    const { fy } = req.query; // e.g. "2025-26"
    if (!fy) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'fy query param required (e.g. 2025-26)' } });

    const [fyStart] = fy.split('-').map(Number);
    const payslips = await Payslip.find({
      employeeId,
      $or: [
        { year: fyStart, month: { $gte: 4 } },
        { year: fyStart + 1, month: { $lte: 3 } },
      ],
    }).lean();

    const totalGross = payslips.reduce((s, p) => s + p.grossEarnings, 0);
    const totalTDS   = payslips.reduce((s, p) => s + p.tdsAmount, 0);
    const totalPF    = payslips.reduce((s, p) => s + p.pfEmployee, 0);

    res.json({
      success: true,
      data: {
        note: 'This is a display-only estimate. No e-filing integration.',
        fy,
        employeeId,
        totalGrossEarnings: round2(totalGross),
        totalTDSDeducted: round2(totalTDS),
        totalPFContributed: round2(totalPF),
        payslipCount: payslips.length,
      },
    });
  } catch (err) { next(err); }
};
