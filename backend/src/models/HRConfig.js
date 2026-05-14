const mongoose = require('mongoose');

// Singleton document — only one HRConfig per AMS instance.
// All HR policy settings are stored here so admins can change them
// via UI without code deployments.
const hrConfigSchema = new mongoose.Schema({
  _singleton: { type: String, default: 'hr_config', unique: true, immutable: true },

  // ── Employee ID ───────────────────────────────────────────────────────────
  employeeId: {
    prefix:        { type: String, default: 'ANK-EMP' },
    includeYear:   { type: Boolean, default: true },   // ANK-EMP-2026-001
    nextSequence:  { type: Number, default: 1 },
    padLength:     { type: Number, default: 3 },       // zero-pad to 3 digits
  },

  // ── Attendance ────────────────────────────────────────────────────────────
  attendance: {
    ipWhitelist:          { type: [String], default: [] },  // office IPs
    ipRestrictionEnabled: { type: Boolean, default: false },
    wfhEnabled:           { type: Boolean, default: true },
    wfhRequiresApproval:  { type: Boolean, default: true },
    gracePeriodMinutes:   { type: Number, default: 15 },
    workDayHours:         { type: Number, default: 9 },
    halfDayHours:         { type: Number, default: 4.5 },
  },

  // ── Payroll ───────────────────────────────────────────────────────────────
  payroll: {
    cycleType:     { type: String, enum: ['calendar', 'custom'], default: 'calendar' },
    cycleStartDay: { type: Number, default: 1, min: 1, max: 28 },  // used when cycleType='custom'
    currency:      { type: String, default: 'INR' },

    // PF
    pfEnabled:         { type: Boolean, default: true },
    pfRate:            { type: Number, default: 12 },   // % of basic
    pfApplicableToAll: { type: Boolean, default: true },
    pfSalaryThreshold: { type: Number, default: 0 },    // 0 = no threshold

    // ESI
    esiEnabled:   { type: Boolean, default: true },
    esiRate:      { type: Number, default: 0.75 },      // employee share %
    esiRateEmployer: { type: Number, default: 3.25 },
    esiThreshold: { type: Number, default: 21000 },     // gross salary limit

    // TDS slabs (per annum income, rate in %)
    tdsSlabs: {
      type: [{
        fromIncome: Number,
        toIncome:   Number,   // null = no upper limit
        rate:       Number,
        label:      String,
      }],
      default: [
        { fromIncome: 0,       toIncome: 300000,  rate: 0,  label: 'Nil' },
        { fromIncome: 300001,  toIncome: 600000,  rate: 5,  label: '5%' },
        { fromIncome: 600001,  toIncome: 900000,  rate: 10, label: '10%' },
        { fromIncome: 900001,  toIncome: 1200000, rate: 15, label: '15%' },
        { fromIncome: 1200001, toIncome: 1500000, rate: 20, label: '20%' },
        { fromIncome: 1500001, toIncome: null,    rate: 30, label: '30%' },
      ],
    },
  },

  // ── Performance ───────────────────────────────────────────────────────────
  performance: {
    cycleType: { type: String, enum: ['quarterly', 'half_yearly', 'annual'], default: 'quarterly' },
    enable360Feedback: { type: Boolean, default: false },
    pip: {
      triggerType: { type: String, enum: ['manual', 'auto'], default: 'manual' },
      autoTriggerAfterConsecutiveLowRatings: { type: Number, default: 2 },
      lowRatingThreshold: { type: Number, default: 2 },  // rating <= this = low
    },
  },

  // ── Exit ─────────────────────────────────────────────────────────────────
  exit: {
    interviewMandatory:              { type: Boolean, default: true },
    interviewMandatoryAfterMonths:   { type: Number, default: 6 },
    noticePeriodDays:                { type: Number, default: 30 },
    gratuityEligibleAfterYears:      { type: Number, default: 5 },
  },

  // ── Skill Matrices (per applied profile, fully editable) ──────────────────
  // Each profile has an array of skill names. Admin can add/remove skills.
  // Skills are stored as { name, category } where category groups them in UI.
  skillMatrices: {
    type: Map,
    of: [{
      name:     String,
      category: { type: String, default: 'General' },
    }],
    default: () => new Map(),
  },

}, { timestamps: true });

module.exports = mongoose.model('HRConfig', hrConfigSchema);
