const mongoose = require('mongoose');
const { Schema } = mongoose;

const checklistItemSchema = new Schema({
  key:         { type: String, required: true },
  label:       { type: String, required: true },
  completed:   { type: Boolean, default: false },
  completedAt: { type: Date, default: null },
  completedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  notes:       { type: String, default: '' },
}, { _id: false });

const exitChecklistSchema = new Schema({
  employeeId:        { type: Schema.Types.ObjectId, ref: 'Employee', required: true, unique: true },
  resignationDate:   { type: Date },
  lastWorkingDay:    { type: Date },
  noticePeriodDays:  { type: Number, default: 30 },
  acknowledgedByManager: { type: Boolean, default: false },
  acknowledgedByHR:      { type: Boolean, default: false },

  items: {
    type: [checklistItemSchema],
    default: () => [
      { key: 'knowledge_transfer',   label: 'Knowledge Transfer Completed' },
      { key: 'asset_return',         label: 'Assets Returned (laptop, ID card, etc.)' },
      { key: 'access_revoked',       label: 'System Access Revoked' },
      { key: 'exit_interview',       label: 'Exit Interview Conducted' },
      { key: 'fnf_calculation',      label: 'F&F Settlement Calculated' },
      { key: 'relieving_letter',     label: 'Relieving Letter Issued' },
      { key: 'experience_letter',    label: 'Experience Certificate Issued' },
    ],
  },

  status: {
    type: String,
    enum: ['initiated', 'in_progress', 'completed'],
    default: 'initiated',
  },

  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

// employeeId index comes from unique:true on the field — no need for a separate index declaration

module.exports = mongoose.model('ExitChecklist', exitChecklistSchema);
