const mongoose = require('mongoose');
const { Schema } = mongoose;

const fnfSchema = new Schema({
  employeeId:    { type: Schema.Types.ObjectId, ref: 'Employee', required: true, unique: true },
  exitDate:      { type: Date, required: true },

  // Earnings
  pendingSalary:    { type: Number, default: 0 },  // pro-rated last month salary
  leaveEncashment:  { type: Number, default: 0 },  // unused EL encashment
  gratuity:         { type: Number, default: 0 },  // (15/26) * basic * years
  bonus:            { type: Number, default: 0 },  // pending performance/festival bonus

  // Deductions
  deductions: [{
    description: { type: String },
    amount:      { type: Number, default: 0 },
  }],
  totalDeductions: { type: Number, default: 0 },

  netPayable: { type: Number, default: 0 },

  notes:       { type: String, default: '' },
  status:      { type: String, enum: ['pending', 'approved', 'disbursed'], default: 'pending' },
  processedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  processedAt: { type: Date },
  disbursedAt: { type: Date },
  disbursedBy: { type: Schema.Types.ObjectId, ref: 'User' },

  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

fnfSchema.index({ employeeId: 1 });
fnfSchema.index({ status: 1 });

module.exports = mongoose.model('FullAndFinalSettlement', fnfSchema);
