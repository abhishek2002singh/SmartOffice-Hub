const PERMISSIONS = [
  // Core
  { key: 'core:users:view',       label: 'View Users',            module: 'core' },
  { key: 'core:users:create',     label: 'Create Users',          module: 'core' },
  { key: 'core:users:edit',       label: 'Edit Users',            module: 'core' },
  { key: 'core:users:delete',     label: 'Delete Users',          module: 'core' },
  { key: 'core:depts:view',       label: 'View Departments',      module: 'core' },
  { key: 'core:depts:create',     label: 'Create Departments',    module: 'core' },
  { key: 'core:depts:edit',       label: 'Edit Departments',      module: 'core' },
  { key: 'core:audit:view',       label: 'View Audit Logs',       module: 'core' },
  // CRM
  { key: 'crm:lead:view',         label: 'View Leads',            module: 'crm' },
  { key: 'crm:lead:create',       label: 'Create Leads',          module: 'crm' },
  { key: 'crm:lead:edit',         label: 'Edit Leads',            module: 'crm' },
  { key: 'crm:lead:delete',       label: 'Delete Leads',          module: 'crm' },
  { key: 'crm:client:view',       label: 'View Clients',          module: 'crm' },
  { key: 'crm:client:create',     label: 'Create Clients',        module: 'crm' },
  // DM
  { key: 'dm:task:view',          label: 'View DM Tasks',         module: 'dm' },
  { key: 'dm:task:create',        label: 'Create DM Tasks',       module: 'dm' },
  { key: 'dm:report:generate',    label: 'Generate DM Reports',   module: 'dm' },
  // GD
  { key: 'gd:task:view',          label: 'View GD Tasks',         module: 'gd' },
  { key: 'gd:task:create',        label: 'Create GD Tasks',       module: 'gd' },
  // Dev
  { key: 'dev:project:view',      label: 'View Dev Projects',     module: 'dev' },
  { key: 'dev:project:create',    label: 'Create Dev Projects',   module: 'dev' },
  { key: 'dev:bug:view',          label: 'View Bugs',             module: 'dev' },
  { key: 'dev:bug:create',        label: 'Create Bugs',           module: 'dev' },
  // HR
  { key: 'hr:employee:view',      label: 'View Employees',        module: 'hr' },
  { key: 'hr:employee:create',    label: 'Create Employees',      module: 'hr' },
  { key: 'hr:payroll:view',       label: 'View Payroll',          module: 'hr' },
  { key: 'hr:attendance:view',    label: 'View Attendance',       module: 'hr' },
];

module.exports = PERMISSIONS;
