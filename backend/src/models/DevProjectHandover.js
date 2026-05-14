const mongoose = require('mongoose');

const devHandoverSchema = new mongoose.Schema({
  serviceTicketId:      { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceTicket' },
  clientId:             { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  salesPerson:          { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  handoverDate:         { type: Date, default: Date.now },
  originalRequirement:  { type: String, trim: true },
  scopeDocument:        { type: String, trim: true }, // Google Drive link
  agreedTimeline:       { type: String, trim: true },
  clientContactDetails: { type: String, trim: true },
  specialNotes:         { type: String, trim: true },
  status: {
    type: String,
    enum: ['pending_review', 'accepted', 'clarification_needed', 'rejected'],
    default: 'pending_review',
  },
  acceptedBy:         { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  acceptedAt:         { type: Date },
  clarificationNotes: { type: String, trim: true },
  projectId:          { type: mongoose.Schema.Types.ObjectId, ref: 'DevProject' }, // set after acceptance
  // Auto-escalation: if not reviewed in X days, flag to Admin
  escalateAfterDays: { type: Number, default: 3 },
  escalatedAt:       { type: Date },
  createdBy:         { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy:         { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  deletedAt:         { type: Date, default: null },
}, { timestamps: true });

devHandoverSchema.index({ status: 1 });
devHandoverSchema.index({ clientId: 1 });
devHandoverSchema.index({ serviceTicketId: 1 });
devHandoverSchema.index({ createdAt: -1 });

module.exports = mongoose.model('DevProjectHandover', devHandoverSchema);
