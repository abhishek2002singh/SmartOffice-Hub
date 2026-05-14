const mongoose = require('mongoose');

// e.g. { key: 'crm:lead:create', label: 'Create CRM Lead', module: 'crm' }
const permissionSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    module: { type: String, required: true, trim: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

permissionSchema.index({ module: 1 });
permissionSchema.index({ key: 1, deletedAt: 1 });

module.exports = mongoose.model('Permission', permissionSchema);
