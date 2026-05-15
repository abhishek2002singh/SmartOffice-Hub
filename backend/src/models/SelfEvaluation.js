const mongoose = require('mongoose');
const { Schema } = mongoose;

const goalSelfRatingSchema = new Schema({
  goalId:      { type: Schema.Types.ObjectId, ref: 'Goal', required: true },
  selfRating:  { type: Number, min: 1, max: 5, required: true },
  comments:    { type: String, trim: true, default: '' },
}, { _id: false });

const selfEvaluationSchema = new Schema({
  employeeId:    { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
  cycleId:       { type: Schema.Types.ObjectId, ref: 'PerformanceCycle', required: true },
  goalRatings:   { type: [goalSelfRatingSchema], default: [] },
  strengths:     { type: String, trim: true, default: '' },
  improvements:  { type: String, trim: true, default: '' },
  trainingNeeds: { type: String, trim: true, default: '' },
  submittedAt:   { type: Date, default: null },
  createdBy:     { type: Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy:     { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

selfEvaluationSchema.index({ employeeId: 1, cycleId: 1 }, { unique: true });

module.exports = mongoose.model('SelfEvaluation', selfEvaluationSchema);
