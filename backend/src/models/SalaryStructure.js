const mongoose = require('mongoose');

const allowanceItemSchema = new mongoose.Schema({
  name:      { type: String, required: true, trim: true },
  value:     { type: Number, required: true, min: 0 },
  isPercent: { type: Boolean, default: true },  // true = % of basic, false = fixed amount
  taxable:   { type: Boolean, default: true },
}, { _id: false });

const deductionItemSchema = new mongoose.Schema({
  name:      { type: String, required: true, trim: true },
  value:     { type: Number, required: true, min: 0 },
  isPercent: { type: Boolean, default: true },
  type:      { type: String, enum: ['pf', 'esi', 'tds', 'professional_tax', 'loan', 'other'], default: 'other' },
}, { _id: false });

const salaryStructureSchema = new mongoose.Schema({
  name:         { type: String, required: true, trim: true, unique: true },
  basicPercent: { type: Number, required: true, min: 0, max: 100, default: 40 },  // % of CTC
  hraPercent:   { type: Number, required: true, min: 0, max: 100, default: 20 },  // % of basic
  allowances:   { type: [allowanceItemSchema], default: [] },
  deductions:   { type: [deductionItemSchema], default: [] },
  isActive:     { type: Boolean, default: true },
  createdBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  deletedAt:    { type: Date, default: null },
}, { timestamps: true });

salaryStructureSchema.index({ deletedAt: 1 });

module.exports = mongoose.model('SalaryStructure', salaryStructureSchema);
