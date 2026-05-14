const mongoose = require('mongoose');

const dmPlatformSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
  code:        { type: String, required: true, uppercase: true, trim: true },
  description: { type: String, default: '' },
  isActive:    { type: Boolean, default: true },
  sortOrder:   { type: Number, default: 0 },
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  deletedAt:   { type: Date, default: null },
}, { timestamps: true });

dmPlatformSchema.index({ code: 1 }, { unique: true });
dmPlatformSchema.index({ deletedAt: 1, isActive: 1, sortOrder: 1 });

module.exports = mongoose.model('DMPlatform', dmPlatformSchema);
