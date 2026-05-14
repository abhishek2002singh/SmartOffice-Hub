const mongoose = require('mongoose');
const { Schema } = mongoose;

const breakdownItemSchema = new Schema({
  name:   { type: String, required: true },
  amount: { type: Number, required: true },
}, { _id: false });

const employeeSalarySchema = new Schema({
  employeeId:           { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
  structureId:          { type: Schema.Types.ObjectId, ref: 'SalaryStructure', required: true },
  ctc:                  { type: Number, required: true, min: 0 },
  basic:                { type: Number, required: true, min: 0 },
  hra:                  { type: Number, required: true, min: 0 },
  grossMonthly:         { type: Number, required: true, min: 0 },
  netMonthly:           { type: Number, required: true, min: 0 },
  allowancesBreakdown:  { type: [breakdownItemSchema], default: [] },
  deductionsBreakdown:  { type: [breakdownItemSchema], default: [] },
  effectiveFrom:        { type: Date, required: true },
  revisedReason:        { type: String, trim: true, default: '' },
  isActive:             { type: Boolean, default: true },
  createdBy:            { type: Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy:            { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

employeeSalarySchema.index({ employeeId: 1, effectiveFrom: -1 });
employeeSalarySchema.index({ employeeId: 1, isActive: 1 });

module.exports = mongoose.model('EmployeeSalary', employeeSalarySchema);
