const mongoose = require('mongoose');
const { Schema } = mongoose;

const exitInterviewSchema = new Schema({
  employeeId:  { type: Schema.Types.ObjectId, ref: 'Employee', required: true, unique: true },
  conductedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  conductedAt: { type: Date },
  reasons: [{
    type: String,
    enum: ['better_opportunity', 'compensation', 'work_life', 'manager', 'role', 'personal', 'relocation', 'other'],
  }],
  feedback:          { type: String, default: '' },
  suggestions:       { type: String, default: '' },
  wouldRecommend:    { type: String, enum: ['yes', 'no', 'maybe'], default: 'yes' },
  eligibleForRehire: { type: Boolean, default: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

exitInterviewSchema.index({ employeeId: 1 });

module.exports = mongoose.model('ExitInterview', exitInterviewSchema);
