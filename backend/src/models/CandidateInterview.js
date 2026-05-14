const mongoose = require('mongoose');
const { Schema } = mongoose;
const ObjectId = Schema.Types.ObjectId;

const candidateInterviewSchema = new Schema({
  candidateId:  { type: ObjectId, ref: 'Candidate', required: true, index: true },
  round:        { type: Number, required: true, default: 1 },   // 1, 2, 3...
  title:        { type: String, trim: true, default: '' },       // e.g. "HR Round", "Technical"
  scheduledAt:  { type: Date, required: true },
  interviewer:  { type: ObjectId, ref: 'User', required: true },
  mode:         { type: String, enum: ['in-person', 'video', 'phone'], default: 'in-person' },
  meetingLink:  { type: String, default: '' },   // for video interviews

  // Result
  status: {
    type: String,
    enum: ['scheduled', 'completed', 'cancelled', 'no-show', 'rescheduled'],
    default: 'scheduled',
    index: true,
  },
  conductedAt:  { type: Date, default: null },
  feedback:     { type: String, trim: true, default: '' },
  rating:       { type: Number, min: 1, max: 5, default: null },
  recommendation: {
    type: String,
    enum: ['proceed', 'reject', 'hold', 'next_round', ''],
    default: '',
  },
  strengths:    { type: String, trim: true, default: '' },
  weaknesses:   { type: String, trim: true, default: '' },

  createdBy:    { type: ObjectId, ref: 'User', required: true },
  deletedAt:    { type: Date, default: null },
}, { timestamps: true });

candidateInterviewSchema.index({ candidateId: 1, round: 1 });
candidateInterviewSchema.index({ interviewer: 1, scheduledAt: 1 });
candidateInterviewSchema.index({ scheduledAt: 1, status: 1 });

module.exports = mongoose.model('CandidateInterview', candidateInterviewSchema);
