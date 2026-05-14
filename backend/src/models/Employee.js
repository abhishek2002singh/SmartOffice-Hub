const mongoose = require('mongoose');
const { Schema } = mongoose;
const ObjectId = Schema.Types.ObjectId;

// Sensitive fields are encrypted via mongoose-encryption.
// Keys come from env: ENCRYPTION_KEY (32-byte hex) and SIGNING_KEY (64-byte hex).
// If keys are missing (e.g. test env), encryption is skipped gracefully.

const employeeSchema = new Schema({
  // ── Identity ──────────────────────────────────────────────────────────────
  employeeCode:  { type: String, unique: true, sparse: true },  // ANK-EMP-2026-001 (auto-generated)
  userId:        { type: ObjectId, ref: 'User', default: null },       // AMS login account
  candidateId:   { type: ObjectId, ref: 'Candidate', default: null }, // source candidate record

  // ── Personal Info ─────────────────────────────────────────────────────────
  firstName:     { type: String, required: true, trim: true },
  middleName:    { type: String, trim: true, default: '' },
  lastName:      { type: String, trim: true, default: '' },
  dob:           { type: Date },
  gender:        { type: String, enum: ['Male', 'Female', 'Other'] },
  maritalStatus: { type: String, enum: ['Married', 'Unmarried', 'Other'], default: 'Unmarried' },
  bloodGroup:    { type: String, trim: true, default: '' },
  emergencyContactName:   { type: String, trim: true, default: '' },
  emergencyContactPhone:  { type: String, trim: true, default: '' },
  emergencyContactRelation: { type: String, trim: true, default: '' },

  // ── Contact Info ──────────────────────────────────────────────────────────
  personalEmail: { type: String, lowercase: true, trim: true, default: '' },
  officialEmail: { type: String, lowercase: true, trim: true, default: '' },
  phone:         { type: String, trim: true },
  altPhone:      { type: String, trim: true, default: '' },
  currentAddress:   { type: String, trim: true, default: '' },
  permanentAddress: { type: String, trim: true, default: '' },

  // ── Employment Info ───────────────────────────────────────────────────────
  designation:        { type: String, trim: true, default: '' },
  departmentId:       { type: ObjectId, ref: 'Department', default: null },
  reportingManagerId: { type: ObjectId, ref: 'Employee', default: null },
  dateOfJoining:      { type: Date, required: true },
  employmentType:     { type: String, enum: ['Full Time', 'Part Time', 'Internship', 'Freelance', 'Contract'], default: 'Full Time' },
  employmentStatus:   { type: String, enum: ['probation', 'confirmed', 'resigned', 'terminated', 'relieved', 'absconding'], default: 'probation' },
  probationEndDate:   { type: Date, default: null },
  confirmationDate:   { type: Date, default: null },
  officeLocation:     { type: String, trim: true, default: 'Delhi' },

  // ── Sensitive fields (encrypted at rest) ─────────────────────────────────
  // These are stored in a nested object so encryption can target the whole block.
  bankDetails: {
    accountNumber: { type: String, default: '' },
    ifsc:          { type: String, default: '' },
    bankName:      { type: String, default: '' },
    branch:        { type: String, default: '' },
    accountType:   { type: String, enum: ['Savings', 'Current', ''], default: '' },
  },
  statutory: {
    panNumber:  { type: String, default: '' },
    aadhaarNumber: { type: String, default: '' },
    uanNumber:  { type: String, default: '' },  // UAN for PF
    esiNumber:  { type: String, default: '' },
    pfNumber:   { type: String, default: '' },
  },

  // ── Salary (link to structure — set in Week 18 payroll) ──────────────────
  salaryStructureId: { type: ObjectId, ref: 'SalaryStructure', default: null },
  currentCTC:        { type: Number, default: null },  // CTC in rupees/year

  // ── Exit ─────────────────────────────────────────────────────────────────
  exitInfo: {
    exitDate:           { type: Date, default: null },
    exitReason:         { type: String, trim: true, default: '' },
    resignationDate:    { type: Date, default: null },
    noticePeriodEndDate:{ type: Date, default: null },
    finalSettlementStatus: { type: String, enum: ['pending', 'processed', 'disbursed', ''], default: '' },
    exitInterviewDone:  { type: Boolean, default: false },
  },

  // ── Audit ─────────────────────────────────────────────────────────────────
  createdBy: { type: ObjectId, ref: 'User', required: true },
  updatedBy: { type: ObjectId, ref: 'User' },
  deletedAt: { type: Date, default: null },

}, { timestamps: true });

// Indexes (employeeCode index created by unique:true above — not duplicated)
employeeSchema.index({ userId: 1 });
employeeSchema.index({ departmentId: 1, employmentStatus: 1 });
employeeSchema.index({ reportingManagerId: 1 });
employeeSchema.index({ dateOfJoining: -1 });
employeeSchema.index({ deletedAt: 1 });

// Field-level encryption for sensitive data (bank + statutory)
// Keys must be provided in .env; skipped in test env automatically if not set.
try {
  const encryptPlugin = require('mongoose-encryption');
  const encKey  = process.env.ENCRYPTION_KEY;
  const signKey = process.env.SIGNING_KEY;
  if (encKey && signKey) {
    employeeSchema.plugin(encryptPlugin, {
      encryptionKey: encKey,
      signingKey:    signKey,
      encryptedFields: ['bankDetails', 'statutory'],
    });
  }
} catch (_) { /* mongoose-encryption optional in test */ }

// Virtual: full name
employeeSchema.virtual('fullName').get(function () {
  return [this.firstName, this.middleName, this.lastName].filter(Boolean).join(' ');
});

module.exports = mongoose.model('Employee', employeeSchema);
