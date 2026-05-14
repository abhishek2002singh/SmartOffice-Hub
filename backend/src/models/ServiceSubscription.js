const mongoose = require('mongoose');

const BILLING_CYCLES = ['monthly', 'quarterly', 'half_yearly', 'annual', 'custom'];
const SUB_STATUSES   = ['active', 'paused', 'cancelled', 'expired'];

const serviceSubscriptionSchema = new mongoose.Schema(
  {
    client:        { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true, index: true },
    service:       { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceCatalog', required: true },
    startDate:     { type: Date, required: true },
    renewalDate:   { type: Date, required: true, index: true },
    billingCycle:  { type: String, enum: BILLING_CYCLES, required: true },
    status:        { type: String, enum: SUB_STATUSES, default: 'active' },
    assignedHead:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    notes:         { type: String, trim: true },
    alertsSent:    [{ type: Number }],
    createdBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deletedAt:     { type: Date, default: null },
  },
  { timestamps: true }
);

serviceSubscriptionSchema.index({ renewalDate: 1, status: 1 });

module.exports = mongoose.model('ServiceSubscription', serviceSubscriptionSchema);
module.exports.BILLING_CYCLES = BILLING_CYCLES;
module.exports.SUB_STATUSES   = SUB_STATUSES;
