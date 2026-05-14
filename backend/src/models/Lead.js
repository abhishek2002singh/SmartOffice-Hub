const mongoose = require('mongoose');
const { calculateLeadScore, getLeadHeat } = require('../utils/leadScoring');

const STAGES = ['new', 'assigned', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost', 'junk'];
const PRIORITIES = ['low', 'medium', 'high'];

const leadSchema = new mongoose.Schema(
  {
    name:        { type: String, required: true, trim: true },
    mobile:      { type: String, required: true, trim: true, index: true },
    email:       { type: String, lowercase: true, trim: true, default: '' },
    company:     { type: String, trim: true },
    designation: { type: String, trim: true },
    city:        { type: String, trim: true },

    serviceInterest: [{ type: String, trim: true }],
    budget:          { type: Number, default: 0 },

    source:    { type: mongoose.Schema.Types.ObjectId, ref: 'LeadSource', required: true },
    subSource: { type: String, trim: true },
    utmParams: {
      utm_source:   { type: String, trim: true },
      utm_medium:   { type: String, trim: true },
      utm_campaign: { type: String, trim: true },
      utm_content:  { type: String, trim: true },
      utm_term:     { type: String, trim: true },
    },

    priority:  { type: String, enum: PRIORITIES, default: 'medium' },
    stage:     { type: String, enum: STAGES, default: 'new', index: true },
    leadScore: { type: Number, default: 0, min: 0, max: 100 },

    value:        { type: Number, default: 0 },
    description:  { type: String, trim: true },
    tags:         [{ type: String, trim: true }],
    lostReason:   { type: String, trim: true },
    nextFollowUp: { type: Date, default: null },

    assignedTo:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    convertedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', default: null },
    convertedAt: { type: Date, default: null },

    isDuplicate: { type: Boolean, default: false },
    duplicateOf: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', default: null },
    importBatch: { type: String, trim: true },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

leadSchema.index({ createdAt: -1 });
leadSchema.index({ assignedTo: 1 });
leadSchema.index({ deletedAt: 1 });
leadSchema.index({ stage: 1, createdAt: -1 });
leadSchema.index({ source: 1 });
leadSchema.index({ city: 1 });
leadSchema.index({ mobile: 1, email: 1 });
leadSchema.index({ nextFollowUp: 1 });
leadSchema.index({ leadScore: -1 });

leadSchema.pre('save', function (next) {
  this.leadScore = calculateLeadScore(this.toObject());
  next();
});

leadSchema.virtual('heat').get(function () {
  return getLeadHeat(this.leadScore);
});

leadSchema.set('toJSON',   { virtuals: true });
leadSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Lead', leadSchema);
module.exports.STAGES     = STAGES;
module.exports.PRIORITIES = PRIORITIES;
