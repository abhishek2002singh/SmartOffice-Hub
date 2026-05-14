const { z } = require('zod');

const STAGES = ['new', 'assigned', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost', 'junk'];
const PRIORITIES = ['low', 'medium', 'high'];

const utmSchema = z.object({
  utm_source:   z.string().optional(),
  utm_medium:   z.string().optional(),
  utm_campaign: z.string().optional(),
  utm_content:  z.string().optional(),
  utm_term:     z.string().optional(),
}).optional();

const createLeadSchema = z.object({
  name:            z.string().min(1, 'Name is required').max(100),
  mobile:          z.string().min(10, 'Mobile must be at least 10 digits').max(15).regex(/^\+?[0-9]{10,15}$/, 'Invalid mobile number'),
  email:           z.string().email('Invalid email').optional().or(z.literal('')),
  company:         z.string().max(100).optional(),
  designation:     z.string().max(100).optional(),
  city:            z.string().max(100).optional(),
  serviceInterest: z.array(z.string().max(100)).optional(),
  budget:          z.number().min(0).optional(),
  source:          z.string().min(1, 'Source is required'),
  subSource:       z.string().max(100).optional(),
  utmParams:       utmSchema,
  priority:        z.enum(PRIORITIES).optional(),
  value:           z.number().min(0).optional(),
  description:     z.string().max(2000).optional(),
  tags:            z.array(z.string().max(50)).optional(),
  nextFollowUp:    z.string().datetime({ offset: true }).optional().or(z.literal('')).or(z.null()),
  assignedTo:      z.string().optional().or(z.null()),
});

const updateLeadSchema = createLeadSchema.partial();

const assignLeadSchema = z.object({
  assignedTo: z.string().min(1, 'User ID required'),
});

const stageChangeSchema = z.object({
  stage:      z.enum(STAGES, { required_error: 'Stage is required' }),
  lostReason: z.string().max(500).optional(),
  note:       z.string().max(2000).optional(),
});

const activitySchema = z.object({
  type: z.enum(['note', 'call', 'email', 'meeting', 'whatsapp'], { required_error: 'Activity type required' }),
  note: z.string().min(1, 'Note is required').max(2000),
});

const bulkImportRowSchema = z.object({
  name:   z.string().min(1),
  mobile: z.string().min(10).max(15).regex(/^\+?[0-9]{10,15}$/),
  email:  z.string().email().optional().or(z.literal('')),
  company:     z.string().optional(),
  designation: z.string().optional(),
  city:        z.string().optional(),
  description: z.string().optional(),
  priority:    z.enum(PRIORITIES).optional(),
});

module.exports = {
  createLeadSchema,
  updateLeadSchema,
  assignLeadSchema,
  stageChangeSchema,
  activitySchema,
  bulkImportRowSchema,
};
