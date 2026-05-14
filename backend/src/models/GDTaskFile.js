const mongoose = require('mongoose');

const gdTaskFileSchema = new mongoose.Schema({
  task:          { type: mongoose.Schema.Types.ObjectId, ref: 'GDTask', required: true, index: true },
  fileType:      { type: String, enum: ['draft', 'final', 'reference'], default: 'draft' },
  fileName:      { type: String, required: true, trim: true },
  mimeType:      { type: String, default: '' },
  fileSize:      { type: Number, default: 0 }, // bytes
  version:       { type: Number, default: 1 },
  gdriveFileId:  { type: String, default: null },
  gdriveLink:    { type: String, default: null },
  thumbnailLink: { type: String, default: null },
  uploadedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  deletedAt:     { type: Date, default: null },
}, { timestamps: true });

gdTaskFileSchema.index({ task: 1, deletedAt: 1, version: -1 });

module.exports = mongoose.model('GDTaskFile', gdTaskFileSchema);
