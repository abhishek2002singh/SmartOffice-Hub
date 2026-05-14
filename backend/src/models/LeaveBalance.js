const mongoose = require('mongoose');
const { Schema } = mongoose;
const ObjectId = Schema.Types.ObjectId;

const leaveBalanceSchema = new Schema({
  employeeId:    { type: ObjectId, ref: 'Employee', required: true },
  leaveTypeId:   { type: ObjectId, ref: 'LeaveType', required: true },
  year:          { type: Number, required: true },
  allocated:     { type: Number, default: 0 },
  used:          { type: Number, default: 0 },
  carryForwarded:{ type: Number, default: 0 },
}, { timestamps: true });

// One balance per employee per leave type per year
leaveBalanceSchema.index({ employeeId: 1, leaveTypeId: 1, year: 1 }, { unique: true });
leaveBalanceSchema.index({ employeeId: 1, year: 1 });

// Virtual: remaining days available
leaveBalanceSchema.virtual('remaining').get(function () {
  return (this.allocated + this.carryForwarded) - this.used;
});

leaveBalanceSchema.set('toObject', { virtuals: true });
leaveBalanceSchema.set('toJSON',   { virtuals: true });

module.exports = mongoose.model('LeaveBalance', leaveBalanceSchema);
