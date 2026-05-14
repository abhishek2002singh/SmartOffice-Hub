const mongoose = require('mongoose');

const TICKET_STATUSES   = ['open', 'in_progress', 'resolved', 'closed'];
const TICKET_PRIORITIES = ['low', 'medium', 'high', 'urgent'];

const serviceTicketSchema = new mongoose.Schema(
  {
    client:       { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true, index: true },
    subscription: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceSubscription', default: null },
    title:        { type: String, required: true, trim: true },
    description:  { type: String, trim: true },
    status:       { type: String, enum: TICKET_STATUSES, default: 'open' },
    priority:     { type: String, enum: TICKET_PRIORITIES, default: 'medium' },
    assignedTo:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    resolvedAt:   { type: Date, default: null },
    createdBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deletedAt:    { type: Date, default: null },
  },
  { timestamps: true }
);

serviceTicketSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('ServiceTicket', serviceTicketSchema);
module.exports.TICKET_STATUSES   = TICKET_STATUSES;
module.exports.TICKET_PRIORITIES = TICKET_PRIORITIES;
