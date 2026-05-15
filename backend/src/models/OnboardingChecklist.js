const mongoose = require('mongoose');
const { Schema } = mongoose;

const checklistItemSchema = new Schema({
  title:          { type: String, required: true },
  description:    { type: String, default: '' },
  type: {
    type: String,
    enum: ['read_sop', 'complete_task', 'submit_document', 'attend_meeting', 'online_form'],
    default: 'complete_task',
  },
  sopId:          { type: Schema.Types.ObjectId, ref: 'SOP', default: null },
  daysFromJoining:{ type: Number, default: 1 },
  mandatory:      { type: Boolean, default: true },
  assignedRole:   { type: String, enum: ['HR', 'Manager', 'IT', 'Self'], default: 'Self' },
  sortOrder:      { type: Number, default: 0 },
}, { _id: true });

const onboardingChecklistSchema = new Schema({
  name:        { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  applicableTo: {
    type: String,
    enum: ['all', 'department', 'role'],
    default: 'all',
  },
  applicableIds: [{ type: Schema.Types.ObjectId }],
  items:      { type: [checklistItemSchema], default: [] },
  isDefault:  { type: Boolean, default: false },
  createdBy:  { type: Schema.Types.ObjectId, ref: 'User' },
  updatedBy:  { type: Schema.Types.ObjectId, ref: 'User' },
  deletedAt:  { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model('OnboardingChecklist', onboardingChecklistSchema);
