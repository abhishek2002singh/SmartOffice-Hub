const Lead     = require('../models/Lead');
const Client   = require('../models/Client');
const Candidate = require('../models/Candidate');
const Employee = require('../models/Employee');
const DevProject = require('../models/DevProject');
const SOP      = require('../models/SOP');

const ADMIN_ROLES = ['SUPERADMIN', 'ADMIN', 'SUBADMIN'];
const DEPT_HEAD_ROLES = ['SUPERADMIN', 'ADMIN', 'SUBADMIN', 'DEPT_HEAD'];

exports.globalSearch = async (req, res) => {
  try {
    const { q = '', modules = '' } = req.query;
    const query = q.trim();
    if (query.length < 2) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Search query must be at least 2 characters' } });
    }

    const { role, userId } = req.user;
    const requestedModules = modules ? modules.split(',').map(m => m.trim()) : ['leads', 'clients', 'candidates', 'employees', 'projects', 'sops'];
    const re = new RegExp(query, 'i');
    const results = {};

    const canSeeHR   = DEPT_HEAD_ROLES.includes(role);
    const canSeeCRM  = true; // all authenticated users
    const canSeeDev  = true;
    const canSeeSOPs = true;

    const searches = [];

    if (requestedModules.includes('leads') && canSeeCRM) {
      searches.push(
        Lead.find({ deletedAt: null, $or: [{ name: re }, { mobile: re }, { email: re }, { company: re }] })
          .select('name mobile email company stage source')
          .limit(5)
          .lean()
          .then(docs => { results.leads = docs.map(d => ({ ...d, _module: 'leads', _label: d.name, _sub: d.company || d.mobile, _url: `/crm/leads/${d._id}` })); })
      );
    }

    if (requestedModules.includes('clients') && canSeeCRM) {
      searches.push(
        Client.find({ deletedAt: null, $or: [{ name: re }, { email: re }, { mobile: re }] })
          .select('name email mobile city')
          .limit(5)
          .lean()
          .then(docs => { results.clients = docs.map(d => ({ ...d, _module: 'clients', _label: d.name, _sub: d.email || d.mobile, _url: `/crm/clients/${d._id}` })); })
      );
    }

    if (requestedModules.includes('candidates') && canSeeHR) {
      searches.push(
        Candidate.find({ deletedAt: null, $or: [{ firstName: re }, { lastName: re }, { email: re }, { mobile: re }] })
          .select('firstName lastName email mobile currentStage currentRole')
          .limit(5)
          .lean()
          .then(docs => { results.candidates = docs.map(d => ({ ...d, _module: 'candidates', _label: `${d.firstName} ${d.lastName}`, _sub: d.currentRole || d.email, _url: `/hr/candidates/${d._id}` })); })
      );
    }

    if (requestedModules.includes('employees') && canSeeHR) {
      searches.push(
        Employee.find({ deletedAt: null, $or: [{ firstName: re }, { lastName: re }, { employeeCode: re }] })
          .select('firstName lastName employeeCode designation employmentStatus')
          .limit(5)
          .lean()
          .then(docs => { results.employees = docs.map(d => ({ ...d, _module: 'employees', _label: `${d.firstName} ${d.lastName}`, _sub: d.employeeCode || d.designation, _url: `/hr/employees/${d._id}` })); })
      );
    }

    if (requestedModules.includes('projects') && canSeeDev) {
      searches.push(
        DevProject.find({ deletedAt: null, $or: [{ title: re }, { description: re }] })
          .select('title status techStack')
          .limit(5)
          .lean()
          .then(docs => { results.projects = docs.map(d => ({ ...d, _module: 'projects', _label: d.title, _sub: d.status, _url: `/dev/projects/${d._id}` })); })
      );
    }

    if (requestedModules.includes('sops') && canSeeSOPs) {
      searches.push(
        SOP.find({ deletedAt: null, status: 'published', $or: [{ title: re }, { description: re }, { tags: re }] })
          .select('title description status currentVersion')
          .limit(5)
          .lean()
          .then(docs => { results.sops = docs.map(d => ({ ...d, _module: 'sops', _label: d.title, _sub: d.description, _url: `/sops/${d._id}` })); })
      );
    }

    await Promise.all(searches);

    const total = Object.values(results).reduce((sum, arr) => sum + (arr?.length || 0), 0);
    res.json({ success: true, data: { results, total, query } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};
