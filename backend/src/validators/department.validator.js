const { z } = require('zod')

const skillItemSchema = z.object({
  name:     z.string().min(1).trim(),
  category: z.string().trim().optional().default('General'),
})

const createDeptSchema = z.object({
  name:        z.string().min(2).trim(),
  code:        z.string().min(2).max(10).trim().toUpperCase(),
  description: z.string().optional(),
  head:        z.string().optional().nullable(),
  skills:      z.array(skillItemSchema).optional().default([]),
})

const updateDeptSchema = createDeptSchema.partial()

module.exports = { createDeptSchema, updateDeptSchema }
