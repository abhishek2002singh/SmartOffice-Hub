const mongoose = require('mongoose');
const { Schema } = mongoose;

const payrollRunSchema = new Schema({
  month:          { type: Number, required: true, min: 1, max: 12 },
  year:           { type: Number, required: true },
  status:         { type: String, enum: ['draft', 'processed', 'disbursed'], default: 'draft' },
  processedBy:    { type: Schema.Types.ObjectId, ref: 'User' },
  processedAt:    { type: Date, default: null },
  disbursedBy:    { type: Schema.Types.ObjectId, ref: 'User' },
  disbursedAt:    { type: Date, default: null },
  totalEmployees: { type: Number, default: 0 },
  totalAmount:    { type: Number, default: 0 },
  notes:          { type: String, trim: true, default: '' },
  createdBy:      { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

payrollRunSchema.index({ month: 1, year: 1 }, { unique: true });

module.exports = mongoose.model('PayrollRun', payrollRunSchema);
