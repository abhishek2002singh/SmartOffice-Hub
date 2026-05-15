const mongoose = require('mongoose');
const { Schema } = mongoose;

const goalManagerRatingSchema = new Schema({
  goalId:         { type: Schema.Types.ObjectId, ref: 'Goal', required: true },
  managerRating:  { type: Number, min: 1, max: 5, required: true },
  comments:       { type: String, trim: true, default: '' },
}, { _id: false });

const managerEvaluationSchema = new Schema({
  employeeId:               { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
  managerId:                { type: Schema.Types.ObjectId, ref: 'User', required: true },
  cycleId:                  { type: Schema.Types.ObjectId, ref: 'PerformanceCycle', required: true },
  goalRatings:              { type: [goalManagerRatingSchema], default: [] },
  overallRating:            { type: Number, min: 1, max: 5, required: true },
  strengths:                { type: String, trim: true, default: '' },
  improvements:             { type: String, trim: true, default: '' },
  incrementRecommendation:  { type: Number, default: 0 },  // % increment recommended
  promotionRecommendation:  { type: Boolean, default: false },
  submittedAt:              { type: Date, default: null },
  createdBy:                { type: Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy:                { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

managerEvaluationSchema.index({ employeeId: 1, cycleId: 1 }, { unique: true });

module.exports = mongoose.model('ManagerEvaluation', managerEvaluationSchema);
