const { z } = require('zod');

const INDUSTRIES = ['real_estate','education','healthcare','finance','ecommerce','hospitality','manufacturing','retail','technology','media','other'];
const BILLING_CYCLES = ['monthly','quarterly','half_yearly','annual','custom'];

const addressSchema = z.object({
  label:   z.string().optional(),
  line1:   z.string().optional(),
  city:    z.string().optional(),
  state:   z.string().optional(),
  pincode: z.string().optional(),
  isDefault: z.boolean().optional(),
});

const createClientSchema = z.object({
  name:           z.string().min(1, 'Name is required').max(100),
  companyName:    z.string().max(100).optional(),
  email:          z.string().email().optional().or(z.literal('')),
  mobile:         z.string().min(10).max(15).optional(),
  gstin:          z.string().max(20).optional(),
  pan:            z.string().max(10).optional(),
  industry:       z.enum(INDUSTRIES).optional(),
  addresses:      z.array(addressSchema).optional(),
  accountManager: z.string().optional().or(z.null()),
  notes:          z.string().max(2000).optional(),
  tags:           z.array(z.string()).optional(),
});

const updateClientSchema = createClientSchema.partial();

const contactSchema = z.object({
  name:      z.string().min(1, 'Contact name required'),
  role:      z.string().max(100).optional(),
  email:     z.string().email().optional().or(z.literal('')),
  mobile:    z.string().min(10).max(15).optional(),
  isPrimary: z.boolean().optional(),
});

const subscriptionSchema = z.object({
  service:      z.string().min(1, 'Service is required'),
  startDate:    z.string().min(1, 'Start date required'),
  renewalDate:  z.string().min(1, 'Renewal date required'),
  billingCycle: z.enum(BILLING_CYCLES),
  assignedHead: z.string().optional().or(z.null()),
  notes:        z.string().max(500).optional(),
});

const ticketSchema = z.object({
  title:        z.string().min(1, 'Title required').max(200),
  description:  z.string().max(2000).optional(),
  priority:     z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  assignedTo:   z.string().optional().or(z.null()),
  subscription: z.string().optional().or(z.null()),
});

module.exports = { createClientSchema, updateClientSchema, contactSchema, subscriptionSchema, ticketSchema };
