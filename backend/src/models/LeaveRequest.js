const mongoose = require('mongoose');
const { Schema } = mongoose;
const ObjectId = Schema.Types.ObjectId;

const leaveRequestSchema = new Schema({
  employeeId:      { type: ObjectId, ref: 'Employee', required: true },
  leaveTypeId:     { type: ObjectId, ref: 'LeaveType', required: true },
  startDate:       { type: Date, required: true },
  endDate:         { type: Date, required: true },
  days:            { type: Number, required: true },
  isHalfDay:       { type: Boolean, default: false },
  halfDaySession:  { type: String, enum: ['morning', 'afternoon', ''], default: '' },
  reason:          { type: String, required: true, trim: true },
  attachments:     [{ name: String, gdriveLink: String }],
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'cancelled', 'withdrawn'],
    default: 'pending',
  },
  reviewedBy:       { type: ObjectId, ref: 'User', default: null },
  reviewedAt:       { type: Date, default: null },
  reviewerComments: { type: String, default: '' },
  cancelledAt:      { type: Date, default: null },
}, { timestamps: true });

leaveRequestSchema.index({ employeeId: 1, status: 1 });
leaveRequestSchema.index({ employeeId: 1, startDate: 1, endDate: 1 });
leaveRequestSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('LeaveRequest', leaveRequestSchema);
