const mongoose = require('mongoose');
const { Schema } = mongoose;

const pipReviewSchema = new Schema({
  reviewedAt:   { type: Date, required: true },
  reviewedBy:   { type: Schema.Types.ObjectId, ref: 'User', required: true },
  notes:        { type: String, trim: true, default: '' },
  progressRating: { type: String, enum: ['on_track', 'needs_improvement', 'not_meeting'], required: true },
}, { _id: true });

const pipSchema = new Schema({
  employeeId:    { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
  startDate:     { type: Date, required: true },
  endDate:       { type: Date, required: true },
  reason:        { type: String, required: true, trim: true },
  expectations:  { type: [String], default: [] }, // list of improvement expectations
  reviewerId:    { type: Schema.Types.ObjectId, ref: 'User', required: true },
  status:        { type: String, enum: ['active', 'passed', 'failed', 'withdrawn'], default: 'active' },
  reviews:       { type: [pipReviewSchema], default: [] },
  closedAt:      { type: Date, default: null },
  closedBy:      { type: Schema.Types.ObjectId, ref: 'User', default: null },
  closingNotes:  { type: String, trim: true, default: '' },
  createdBy:     { type: Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy:     { type: Schema.Types.ObjectId, ref: 'User' },
  deletedAt:     { type: Date, default: null },
}, { timestamps: true });

pipSchema.index({ employeeId: 1, status: 1 });
pipSchema.index({ deletedAt: 1 });

module.exports = mongoose.model('PIP', pipSchema);
