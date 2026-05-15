const mongoose = require('mongoose');
const { Schema } = mongoose;

const sopVersionSchema = new Schema({
  sopId:         { type: Schema.Types.ObjectId, ref: 'SOP', required: true, index: true },
  versionNumber: { type: Number, required: true },
  content:       { type: String, required: true },
  changeLog:     { type: String, default: '' },
  status:        { type: String, enum: ['draft', 'published', 'archived'], default: 'draft' },
  createdBy:     { type: Schema.Types.ObjectId, ref: 'User' },
  publishedAt:   { type: Date, default: null },
}, { timestamps: true });

sopVersionSchema.index({ sopId: 1, versionNumber: 1 }, { unique: true });

module.exports = mongoose.model('SOPVersion', sopVersionSchema);
