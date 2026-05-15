const dayjs = require('dayjs');
const Lead     = require('../models/Lead');
const Client   = require('../models/Client');
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const LeaveRequest = require('../models/LeaveRequest');
const Reimbursement = require('../models/Reimbursement');
const DevProject = require('../models/DevProject');
const DevBug   = require('../models/DevBug');
const GDTask   = require('../models/GDTask');
const SOP      = require('../models/SOP');
const SOPAcknowledgement = require('../models/SOPAcknowledgement');
const AuditLog = require('../models/AuditLog');
const SOPApproval = require('../models/SOPApproval');

exports.masterDashboard = async (req, res) => {
  try {
    const now    = dayjs();
    const startOfMonth = now.startOf('month').toDate();
    const endOfMonth   = now.endOf('month').toDate();
    const today        = now.startOf('day').toDate();
    const todayEnd     = now.endOf('day').toDate();

    const [
      // CRM
      totalLeads,
      newLeadsThisMonth,
      wonLeadsThisMonth,
      lostLeadsThisMonth,
      totalClients,
      activeClients,
      // Lead stage breakdown
      leadsByStage,

      // HR
      totalEmployees,
      confirmedEmployees,
      joiningThisMonth,
      pendingLeaveRequests,
      pendingReimbursements,
      attendanceToday,

      // Dev
      activeDevProjects,
      completedDevProjects,
      openBugs,
      criticalBugs,

      // GD
      pendingGDTasks,
      inProgressGDTasks,

      // SOPs
      publishedSOPs,
      pendingSOPApprovals,

      // Recent audit activity
      recentAudit,
    ] = await Promise.all([
      // CRM
      Lead.countDocuments({ deletedAt: null }),
      Lead.countDocuments({ deletedAt: null, createdAt: { $gte: startOfMonth, $lte: endOfMonth } }),
      Lead.countDocuments({ deletedAt: null, stage: 'won', updatedAt: { $gte: startOfMonth, $lte: endOfMonth } }),
      Lead.countDocuments({ deletedAt: null, stage: 'lost', updatedAt: { $gte: startOfMonth, $lte: endOfMonth } }),
      Client.countDocuments({ deletedAt: null }),
      Client.countDocuments({ deletedAt: null, healthScore: { $in: ['green', 'yellow'] } }),
      Lead.aggregate([
        { $match: { deletedAt: null } },
        { $group: { _id: '$stage', count: { $sum: 1 } } },
      ]),

      // HR
      Employee.countDocuments({ deletedAt: null }),
      Employee.countDocuments({ deletedAt: null, employmentStatus: 'confirmed' }),
      Employee.countDocuments({ deletedAt: null, dateOfJoining: { $gte: startOfMonth, $lte: endOfMonth } }),
      LeaveRequest.countDocuments({ deletedAt: null, status: 'pending' }),
      Reimbursement.countDocuments({ deletedAt: null, status: 'pending' }),
      Attendance.countDocuments({ deletedAt: null, checkInTime: { $gte: today, $lte: todayEnd } }),

      // Dev
      DevProject.countDocuments({ deletedAt: null, status: 'active' }),
      DevProject.countDocuments({ deletedAt: null, status: 'completed' }),
      DevBug.countDocuments({ deletedAt: null, status: { $nin: ['closed', 'wont_fix', 'duplicate', 'verified'] } }),
      DevBug.countDocuments({ deletedAt: null, severity: 'critical', status: { $nin: ['closed', 'wont_fix', 'duplicate', 'verified'] } }),

      // GD
      GDTask.countDocuments({ deletedAt: null, status: 'new' }),
      GDTask.countDocuments({ deletedAt: null, status: 'in_progress' }),

      // SOPs
      SOP.countDocuments({ deletedAt: null, status: 'published' }),
      SOPApproval.countDocuments({ deletedAt: null, status: 'pending' }),

      // Audit
      AuditLog.find({}).sort({ createdAt: -1 }).limit(10).select('action resource resourceId userId createdAt').lean(),
    ]);

    // Pending acknowledgements: published mandatory SOPs total expected acks vs actual
    const mandatorySOPs = await SOP.find({ deletedAt: null, status: 'published', mandatory: true }).select('_id currentVersion').lean();
    const totalAcknowledgements = await SOPAcknowledgement.countDocuments({ deletedAt: null, sopId: { $in: mandatorySOPs.map(s => s._id) } });

    // Pipeline value: count leads in active stages
    const pipelineLeads = await Lead.find({ deletedAt: null, stage: { $in: ['assigned', 'contacted', 'qualified', 'proposal', 'negotiation'] } }).select('value').lean();
    const pipelineValue = pipelineLeads.reduce((sum, l) => sum + (l.value || 0), 0);

    // Stage breakdown map
    const stageMap = {};
    leadsByStage.forEach(s => { stageMap[s._id] = s.count; });

    res.json({
      success: true,
      data: {
        crm: {
          totalLeads,
          newLeadsThisMonth,
          wonLeadsThisMonth,
          lostLeadsThisMonth,
          conversionRate: totalLeads ? Math.round((wonLeadsThisMonth / (wonLeadsThisMonth + lostLeadsThisMonth || 1)) * 100) : 0,
          totalClients,
          activeClients,
          pipelineValue,
          stageBreakdown: stageMap,
        },
        hr: {
          totalEmployees,
          confirmedEmployees,
          joiningThisMonth,
          pendingLeaveRequests,
          pendingReimbursements,
          attendanceToday,
        },
        dev: {
          activeProjects: activeDevProjects,
          completedProjects: completedDevProjects,
          openBugs,
          criticalBugs,
        },
        gd: {
          pendingTasks: pendingGDTasks,
          inProgressTasks: inProgressGDTasks,
        },
        sops: {
          published: publishedSOPs,
          pendingApprovals: pendingSOPApprovals,
          mandatorySOPs: mandatorySOPs.length,
          totalAcknowledgements,
        },
        recentActivity: recentAudit,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};
