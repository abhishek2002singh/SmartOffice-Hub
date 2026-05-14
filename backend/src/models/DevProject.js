const mongoose = require('mongoose');

const devProjectSchema = new mongoose.Schema({
  clientId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  name:         { type: String, required: true, trim: true },
  type:         { type: String, required: true, enum: ['website', 'web_app', 'ecommerce', 'mobile_app', 'api', 'custom'] },
  ecommercePlatform: { type: String, enum: ['shopify', 'woocommerce', 'magento', 'custom', null], default: null },
  description:  { type: String, trim: true },
  scope:        { type: String, trim: true },
  deliverables: [{ type: String, trim: true }],
  status: {
    type: String,
    enum: ['planning', 'active', 'on_hold', 'completed', 'maintenance', 'cancelled'],
    default: 'planning',
  },
  priority: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },
  startDate:      { type: Date },
  plannedEndDate: { type: Date },
  actualEndDate:  { type: Date },
  projectManager: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  leadDeveloper:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  teamMembers:    [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  techStack:      [{ type: String, trim: true }],

  // Optional repo / URL fields
  codeRepoUrl:    { type: String, trim: true },
  stagingUrl:     { type: String, trim: true },
  productionUrl:  { type: String, trim: true },

  // Link back to CRM
  sourceTicketId: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceTicket' },

  // AMC — auto-set on project completion, duration configurable
  amcEnabled:        { type: Boolean, default: false },
  amcDurationMonths: { type: Number, default: 12 },
  amcStartDate:      { type: Date },
  amcEndDate:        { type: Date },

  // Time tracking always on (mandatory per decisions)
  timeTrackingEnabled: { type: Boolean, default: true },

  customFields: { type: mongoose.Schema.Types.Mixed },

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

devProjectSchema.index({ clientId: 1 });
devProjectSchema.index({ status: 1 });
devProjectSchema.index({ projectManager: 1 });
devProjectSchema.index({ leadDeveloper: 1 });
devProjectSchema.index({ createdAt: -1 });
devProjectSchema.index({ deletedAt: 1 });

module.exports = mongoose.model('DevProject', devProjectSchema);
