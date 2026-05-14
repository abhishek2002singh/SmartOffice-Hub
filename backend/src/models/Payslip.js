const mongoose = require('mongoose');
const { Schema } = mongoose;

const earnItemSchema = new Schema({
  name:   { type: String, required: true },
  amount: { type: Number, required: true },
}, { _id: false });

const payslipSchema = new Schema({
  payrollRunId:         { type: Schema.Types.ObjectId, ref: 'PayrollRun', required: true },
  employeeId:           { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
  month:                { type: Number, required: true, min: 1, max: 12 },
  year:                 { type: Number, required: true },

  workingDays:          { type: Number, required: true },
  paidDays:             { type: Number, required: true },
  lopDays:              { type: Number, default: 0 },

  basicEarned:          { type: Number, default: 0 },
  hraEarned:            { type: Number, default: 0 },
  allowancesBreakdown:  { type: [earnItemSchema], default: [] },
  bonusAmount:          { type: Number, default: 0 },
  reimbursementAmount:  { type: Number, default: 0 },
  grossEarnings:        { type: Number, default: 0 },

  pfEmployee:           { type: Number, default: 0 },  // 12% of basic (employee share)
  pfEmployer:           { type: Number, default: 0 },  // 12% of basic (employer share)
  esiEmployee:          { type: Number, default: 0 },  // 0.75% of gross if gross <= 21000
  esiEmployer:          { type: Number, default: 0 },  // 3.25% of gross if gross <= 21000
  tdsAmount:            { type: Number, default: 0 },
  otherDeductions:      { type: [earnItemSchema], default: [] },
  totalDeductions:      { type: Number, default: 0 },

  netPay:               { type: Number, default: 0 },
  generatedPdfLink:     { type: String, default: '' },
}, { timestamps: true });

payslipSchema.index({ payrollRunId: 1, employeeId: 1 }, { unique: true });
payslipSchema.index({ employeeId: 1, year: 1, month: 1 });

module.exports = mongoose.model('Payslip', payslipSchema);
