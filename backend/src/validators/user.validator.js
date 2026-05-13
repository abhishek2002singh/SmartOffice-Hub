const { z } = require('zod')

const ROLES = ['SUPERADMIN', 'ADMIN', 'SUBADMIN', 'DEPT_HEAD', 'TEAM_MEMBER']

const createUserSchema = z.object({
  name: z.string().min(2).trim(),
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(6),
  role: z.enum(ROLES).default('TEAM_MEMBER'),
  department: z.string().optional().nullable(),
  phone: z.string().optional(),
})

const updateUserSchema = z.object({
  name: z.string().min(2).trim().optional(),
  role: z.enum(ROLES).optional(),
  department: z.string().optional().nullable(),
  phone: z.string().optional(),
  isActive: z.boolean().optional(),
  permissions: z.array(z.string()).optional(),
})

module.exports = { createUserSchema, updateUserSchema }
