const mongoose = require('mongoose');
const { Schema } = mongoose;
const ObjectId = Schema.Types.ObjectId;

const candidateFollowupSchema = new Schema({
  candidateId:  { type: ObjectId, ref: 'Candidate', required: true, index: true },
  scheduledAt:  { type: Date, required: true },
  notes:        { type: String, trim: true, default: '' },
  status:       { type: String, enum: ['pending', 'completed', 'missed', 'rescheduled'], default: 'pending' },
  completedAt:  { type: Date, default: null },
  completedBy:  { type: ObjectId, ref: 'User', default: null },
  outcome:      { type: String, trim: true, default: '' },  // what happened
  createdBy:    { type: ObjectId, ref: 'User', required: true },
  deletedAt:    { type: Date, default: null },
}, { timestamps: true });

candidateFollowupSchema.index({ candidateId: 1, scheduledAt: 1 });
candidateFollowupSchema.index({ scheduledAt: 1, status: 1 });  // for upcoming reminders

module.exports = mongoose.model('CandidateFollowup', candidateFollowupSchema);
