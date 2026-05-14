const mongoose = require('mongoose');

const GD_TYPES    = ['video', 'reel', 'image', 'carousel', 'poster', 'thumbnail', 'banner', 'other'];
const GD_STATUSES = ['new', 'in_progress', 'submitted', 'revision_requested', 'approved', 'delivered_to_client'];
const PRIORITIES  = ['high', 'medium', 'low'];

const gdTaskSchema = new mongoose.Schema({
  title:         { type: String, required: true, trim: true },
  brief:         { type: String, default: '' },
  type:          { type: String, enum: GD_TYPES, required: true },
  status:        { type: String, enum: GD_STATUSES, default: 'new' },
  priority:      { type: String, enum: PRIORITIES, default: 'medium' },

  client:        { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true, index: true },
  assignedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User',   required: true },
  assignedTo:    { type: mongoose.Schema.Types.ObjectId, ref: 'User',   default: null, index: true },

  referenceLinks: [{ type: String, trim: true }],

  assignedDate:  { type: Date, default: Date.now },
  dueDate:       { type: Date, default: null },
  submittedAt:   { type: Date, default: null },
  approvedAt:    { type: Date, default: null },
  deliveredAt:   { type: Date, default: null },
  completedDate: { type: Date, default: null },

  // Delivery info (when DM marks "Delivered to Client")
  deliveryMethod: { type: String, enum: ['whatsapp', 'email', 'call', 'other'], default: null },
  deliveryNotes:  { type: String, default: '' },

  // Cross-module link (from DM)
  sourceModule:  { type: String, enum: ['dm', 'direct', 'other'], default: 'direct' },
  sourceTaskId:  { type: mongoose.Schema.Types.ObjectId, default: null },

  // Google Drive folder for this task's files
  gdriveFolderId: { type: String, default: null },

  revisionCount: { type: Number, default: 0 },

  createdBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  deletedAt:  { type: Date, default: null },
}, { timestamps: true });

gdTaskSchema.index({ status: 1, deletedAt: 1 });
gdTaskSchema.index({ assignedTo: 1, status: 1, deletedAt: 1 });
gdTaskSchema.index({ client: 1, deletedAt: 1 });
gdTaskSchema.index({ dueDate: 1, status: 1 });

module.exports = mongoose.model('GDTask', gdTaskSchema);
