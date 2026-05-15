const mongoose = require('mongoose');
const { Schema } = mongoose;

const peerFeedbackSchema = new Schema({
  evaluateeId:  { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
  evaluatorId:  { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
  cycleId:      { type: Schema.Types.ObjectId, ref: 'PerformanceCycle', required: true },
  anonymous:    { type: Boolean, default: true },
  // 5-point ratings on key dimensions
  ratings: {
    teamwork:       { type: Number, min: 1, max: 5 },
    communication:  { type: Number, min: 1, max: 5 },
    reliability:    { type: Number, min: 1, max: 5 },
    innovation:     { type: Number, min: 1, max: 5 },
    leadership:     { type: Number, min: 1, max: 5 },
  },
  comments:    { type: String, trim: true, default: '' },
  submittedAt: { type: Date, default: null },
  createdBy:   { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

peerFeedbackSchema.index({ evaluateeId: 1, cycleId: 1 });
peerFeedbackSchema.index({ evaluatorId: 1, cycleId: 1 });
// One feedback per evaluator-evaluatee-cycle
peerFeedbackSchema.index({ evaluateeId: 1, evaluatorId: 1, cycleId: 1 }, { unique: true });

module.exports = mongoose.model('PeerFeedback', peerFeedbackSchema);
