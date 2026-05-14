const mongoose = require('mongoose');

const gdTaskRevisionSchema = new mongoose.Schema({
  task:          { type: mongoose.Schema.Types.ObjectId, ref: 'GDTask', required: true, index: true },
  version:       { type: Number, required: true },
  requestedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  revisionNotes: { type: String, required: true },
  resolvedAt:    { type: Date, default: null },
}, { timestamps: true });

gdTaskRevisionSchema.index({ task: 1, version: 1 });

module.exports = mongoose.model('GDTaskRevision', gdTaskRevisionSchema);
