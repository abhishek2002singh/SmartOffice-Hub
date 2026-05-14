const mongoose = require('mongoose');

// Dynamic fields: can be platform-wide (client=null) or client-specific
const dmCustomFieldSchema = new mongoose.Schema({
  platform:    { type: mongoose.Schema.Types.ObjectId, ref: 'DMPlatform', required: true, index: true },
  client:      { type: mongoose.Schema.Types.ObjectId, ref: 'Client', default: null, index: true },
  label:       { type: String, required: true, trim: true },
  fieldType:   { type: String, enum: ['text', 'number', 'dropdown'], default: 'text' },
  options:     [{ type: String, trim: true }], // for dropdown type
  isRequired:  { type: Boolean, default: false },
  sortOrder:   { type: Number, default: 0 },
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  deletedAt:   { type: Date, default: null },
}, { timestamps: true });

dmCustomFieldSchema.index({ platform: 1, client: 1, deletedAt: 1 });

module.exports = mongoose.model('DMCustomField', dmCustomFieldSchema);
