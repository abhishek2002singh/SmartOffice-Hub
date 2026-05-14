const mongoose = require('mongoose');
const { Schema } = mongoose;

const bonusSchema = new Schema({
  employeeId:   { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
  type:         { type: String, enum: ['performance', 'festival', 'referral', 'other'], required: true },
  amount:       { type: Number, required: true, min: 0 },
  reason:       { type: String, trim: true, default: '' },
  payableMonth: { type: Number, required: true, min: 1, max: 12 },
  payableYear:  { type: Number, required: true },
  status:       { type: String, enum: ['planned', 'included_in_payroll', 'disbursed'], default: 'planned' },
  payrollRunId: { type: Schema.Types.ObjectId, ref: 'PayrollRun', default: null },
  createdBy:    { type: Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy:    { type: Schema.Types.ObjectId, ref: 'User' },
  deletedAt:    { type: Date, default: null },
}, { timestamps: true });

bonusSchema.index({ employeeId: 1, payableYear: 1, payableMonth: 1 });
bonusSchema.index({ payrollRunId: 1 });
bonusSchema.index({ deletedAt: 1 });

module.exports = mongoose.model('Bonus', bonusSchema);
