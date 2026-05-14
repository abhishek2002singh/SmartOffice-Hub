const mongoose = require('mongoose');
const { Schema } = mongoose;

const reimbursementSchema = new Schema({
  employeeId:    { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
  type:          { type: String, enum: ['travel', 'food', 'internet', 'medical', 'other'], required: true },
  amount:        { type: Number, required: true, min: 0 },
  billDate:      { type: Date, required: true },
  description:   { type: String, trim: true, default: '' },
  billAttachment: { type: String, default: '' },  // gdrive link
  status:        { type: String, enum: ['pending', 'approved', 'rejected', 'paid'], default: 'pending' },
  payrollRunId:  { type: Schema.Types.ObjectId, ref: 'PayrollRun', default: null },
  reviewedBy:    { type: Schema.Types.ObjectId, ref: 'User', default: null },
  reviewedAt:    { type: Date, default: null },
  reviewerNotes: { type: String, trim: true, default: '' },
  createdBy:     { type: Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy:     { type: Schema.Types.ObjectId, ref: 'User' },
  deletedAt:     { type: Date, default: null },
}, { timestamps: true });

reimbursementSchema.index({ employeeId: 1, status: 1 });
reimbursementSchema.index({ payrollRunId: 1 });
reimbursementSchema.index({ deletedAt: 1 });

module.exports = mongoose.model('Reimbursement', reimbursementSchema);
