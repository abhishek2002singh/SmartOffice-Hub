const mongoose = require('mongoose');
const { Schema } = mongoose;

const attachmentSchema = new Schema({
  name:   { type: String, required: true },
  url:    { type: String, required: true },
  fileId: { type: String, default: '' },
}, { _id: false });

const sopSchema = new Schema({
  title:        { type: String, required: true, trim: true },
  slug:         { type: String, unique: true, lowercase: true, trim: true },
  categoryId:   { type: Schema.Types.ObjectId, ref: 'SOPCategory', required: true, index: true },
  description:  { type: String, default: '' },
  content:      { type: String, default: '' },
  currentVersion: { type: Number, default: 1 },

  status: {
    type: String,
    enum: ['draft', 'in_review', 'published', 'archived'],
    default: 'draft',
    index: true,
  },

  applicableTo: {
    type: String,
    enum: ['all_employees', 'specific_departments', 'specific_roles'],
    default: 'all_employees',
  },
  applicableIds: [{ type: Schema.Types.ObjectId }],

  mandatory:                   { type: Boolean, default: false },
  acknowledgementDeadlineDays: { type: Number, default: 7 },

  tags:        [{ type: String }],
  attachments: { type: [attachmentSchema], default: [] },

  publishedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  publishedAt: { type: Date, default: null },

  createdBy:    { type: Schema.Types.ObjectId, ref: 'User' },
  lastUpdatedBy:{ type: Schema.Types.ObjectId, ref: 'User' },
  updatedBy:    { type: Schema.Types.ObjectId, ref: 'User' },
  deletedAt:    { type: Date, default: null },
}, { timestamps: true });

sopSchema.index({ title: 'text', description: 'text', tags: 'text' });
sopSchema.index({ deletedAt: 1, status: 1 });

module.exports = mongoose.model('SOP', sopSchema);
