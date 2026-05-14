const mongoose = require('mongoose');

const dmClientPlatformSchema = new mongoose.Schema({
  client:      { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true, index: true },
  platform:    { type: mongoose.Schema.Types.ObjectId, ref: 'DMPlatform', required: true, index: true },
  isActive:    { type: Boolean, default: true },
  startDate:   { type: Date, default: Date.now },
  assignedTo:  [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // DM executives
  notes:       { type: String, default: '' },
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  deletedAt:   { type: Date, default: null },
}, { timestamps: true });

dmClientPlatformSchema.index({ client: 1, platform: 1 }, { unique: true, partialFilterExpression: { deletedAt: null } });
dmClientPlatformSchema.index({ client: 1, deletedAt: 1 });

module.exports = mongoose.model('DMClientPlatform', dmClientPlatformSchema);
