const mongoose = require('mongoose');
const { Schema } = mongoose;

const leaveTypeSchema = new Schema({
  name:                  { type: String, required: true, trim: true },
  code:                  { type: String, required: true, uppercase: true, trim: true, unique: true },
  annualQuota:           { type: Number, required: true, default: 0 },
  monthlyAccrualEnabled: { type: Boolean, default: false },
  carryForwardEnabled:   { type: Boolean, default: false },
  maxCarryForward:       { type: Number, default: 0 },
  halfDayAllowed:        { type: Boolean, default: true },
  requireDocuments:      { type: Boolean, default: false },
  applicableGender:      { type: String, enum: ['all', 'male', 'female'], default: 'all' },
  isActive:              { type: Boolean, default: true },
  deletedAt:             { type: Date, default: null },
}, { timestamps: true });

// code index created by unique:true above
leaveTypeSchema.index({ isActive: 1 });

module.exports = mongoose.model('LeaveType', leaveTypeSchema);
