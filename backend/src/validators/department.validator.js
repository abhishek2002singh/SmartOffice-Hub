const { z } = require('zod')

const createDeptSchema = z.object({
  name: z.string().min(2).trim(),
  code: z.string().min(2).max(10).trim().toUpperCase(),
  description: z.string().optional(),
  head: z.string().optional().nullable(),
})

const updateDeptSchema = createDeptSchema.partial()

module.exports = { createDeptSchema, updateDeptSchema }
