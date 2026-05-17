const mongoose = require('mongoose');
const { Schema } = mongoose;
const ObjectId = Schema.Types.ObjectId;

const candidateSchema = new Schema({
  // ── Personal ──────────────────────────────────────────────────────────────
  firstName:     { type: String, required: true, trim: true },
  middleName:    { type: String, trim: true, default: '' },
  lastName:      { type: String, trim: true, default: '' },
  dob:           { type: Date },
  gender:        { type: String, enum: ['Male', 'Female', 'Other'], required: true },
  maritalStatus: { type: String, enum: ['Married', 'Unmarried', 'Other'], default: 'Unmarried' },

  // ── Contact ───────────────────────────────────────────────────────────────
  phone:    { type: String, required: true, trim: true, index: true },
  altPhone: { type: String, trim: true, default: '' },
  email:    { type: String, lowercase: true, trim: true, index: true },
  address:  { type: String, trim: true, default: '' },

  // ── Background ────────────────────────────────────────────────────────────
  education:         { type: String, trim: true, default: '' },
  lastSalary:        { type: Number, default: null },
  previousCompany:   { type: String, trim: true, default: '' },
  previousProfile:   { type: String, trim: true, default: '' },
  totalExperience:   { type: Number, default: 0 },   // in years (decimal: 1.5 = 1.5 years)
  expectedSalary:    { type: Number, default: null },

  // ── Application ───────────────────────────────────────────────────────────
  appliedDate: { type: Date, default: Date.now },
  leadSource:  {
    type: String,
    enum: ['Internshala', 'Workindia', 'Indeed', 'LinkedIn', 'Walk-in', 'Reference', 'Others'],
    required: true,
  },
  referenceName:    { type: String, trim: true, default: '' },

  // Profile being applied for
  appliedProfile: {
    type: String,
    enum: ['Sales', 'DM', 'GD', 'Development', 'HR', 'Admin'],
    required: true,
  },
  appliedFor: {
    type: String,
    enum: ['Internship', 'Full Time', 'Part Time', 'Freelance', 'WFH'],
    required: true,
  },

  // ── Status & Tracking ─────────────────────────────────────────────────────
  status: {
    type: String,
    enum: ['New', 'Shortlisted', 'Interview Done', 'Selected', 'Rejected', 'On Hold'],
    default: 'New',
    index: true,
  },
  priority:      { type: String, enum: ['High', 'Medium', 'Low'], default: 'Medium' },
  callingStatus: {
    type: String,
    enum: ['Not Called', 'Ringing', 'Busy', 'Not Connected', 'Rejected', 'Switched Off', 'Connected'],
    default: 'Not Called',
  },
  notes: { type: String, trim: true, default: '' },

  // ── Skills (profile-specific — stored as [{ skill, proficiency }]) ────────
  skills: [{
    skill:       { type: String, required: true },
    proficiency: { type: String, enum: ['Beginner', 'Intermediate', 'Expert'], default: 'Beginner' },
  }],

  // ── Languages ─────────────────────────────────────────────────────────────
  languagesKnown: { type: [String], default: [] },

  // ── Files (Google Drive links) ────────────────────────────────────────────
  cvLink:        { type: String, default: '' },
  portfolioLink: { type: String, default: '' },  // mainly for GD candidates

  // ── Duplicate Detection ───────────────────────────────────────────────────
  previouslyApplied:     { type: Boolean, default: false },
  duplicateOf:           { type: ObjectId, ref: 'Candidate', default: null },
  duplicateOverrideNote: { type: String, default: '' },  // HR override reason

  // ── Conversion ────────────────────────────────────────────────────────────
  convertedToEmployee:   { type: Boolean, default: false },
  employeeId:            { type: ObjectId, ref: 'Employee', default: null },

  // ── Audit ─────────────────────────────────────────────────────────────────
  createdBy: { type: ObjectId, ref: 'User', required: true },
  updatedBy: { type: ObjectId, ref: 'User' },
  deletedAt: { type: Date, default: null },

}, { timestamps: true });

// Compound indexes for dedup + filtering
candidateSchema.index({ phone: 1, deletedAt: 1 });
candidateSchema.index({ email: 1, deletedAt: 1 });
candidateSchema.index({ appliedProfile: 1, status: 1, deletedAt: 1 });
candidateSchema.index({ createdAt: -1 });
candidateSchema.index({ 'skills.skill': 1 });

// Virtual: full name
candidateSchema.virtual('fullName').get(function () {
  return [this.firstName, this.middleName, this.lastName].filter(Boolean).join(' ');
});

module.exports = mongoose.model('Candidate', candidateSchema);
