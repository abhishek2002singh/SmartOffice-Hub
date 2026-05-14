const mongoose        = require('mongoose');
const dayjs           = require('dayjs');
const DMPlatform      = require('../models/DMPlatform');
const DMAuditMetric   = require('../models/DMAuditMetric');
const DMAuditReport   = require('../models/DMAuditReport');
const DMAuditReportEntry = require('../models/DMAuditReportEntry');
const { logAudit }    = require('../middleware/auditLogger');

// ─── Metrics Master ────────────────────────────────────────────────────────────

exports.listMetrics = async (req, res, next) => {
  try {
    const metrics = await DMAuditMetric.find({ platform: req.params.platformId, deletedAt: null })
      .sort({ sortOrder: 1 });
    res.json({ success: true, data: { metrics } });
  } catch (err) { next(err); }
};

exports.createMetric = async (req, res, next) => {
  try {
    const { platformId } = req.params;
    const { title, description, valueType, unit, sortOrder } = req.body;
    const metric = await DMAuditMetric.create({
      platform: platformId, title, description, valueType: valueType || 'text',
      unit: unit || '', sortOrder: sortOrder || 0, createdBy: req.user.userId,
    });
    await logAudit({ userId: req.user.userId, action: 'CREATE', resource: 'dm_audit_metric', resourceId: metric._id, before: null, after: metric.toObject(), req });
    res.status(201).json({ success: true, data: { metric } });
  } catch (err) { next(err); }
};

exports.updateMetric = async (req, res, next) => {
  try {
    const before = await DMAuditMetric.findById(req.params.metricId).lean();
    const metric = await DMAuditMetric.findByIdAndUpdate(
      req.params.metricId,
      { ...req.body, updatedBy: req.user.userId },
      { new: true }
    );
    if (!metric) return res.status(404).json({ success: false, error: { message: 'Metric not found' } });
    await logAudit({ userId: req.user.userId, action: 'UPDATE', resource: 'dm_audit_metric', resourceId: metric._id, before, after: metric.toObject(), req });
    res.json({ success: true, data: { metric } });
  } catch (err) { next(err); }
};

exports.deleteMetric = async (req, res, next) => {
  try {
    const metric = await DMAuditMetric.findByIdAndUpdate(
      req.params.metricId,
      { deletedAt: new Date(), updatedBy: req.user.userId },
      { new: true }
    );
    if (!metric) return res.status(404).json({ success: false, error: { message: 'Metric not found' } });
    await logAudit({ userId: req.user.userId, action: 'DELETE', resource: 'dm_audit_metric', resourceId: metric._id, before: metric.toObject(), after: null, req });
    res.json({ success: true, message: 'Metric removed' });
  } catch (err) { next(err); }
};

// ─── Reports ──────────────────────────────────────────────────────────────────

exports.listReports = async (req, res, next) => {
  try {
    const { clientId, platformId, status, page = 1, limit = 20 } = req.query;
    const filter = { deletedAt: null };
    if (clientId)  filter.client   = clientId;
    if (platformId) filter.platform = platformId;
    if (status)    filter.status   = status;

    const [reports, total] = await Promise.all([
      DMAuditReport.find(filter)
        .populate('client', 'name companyName')
        .populate('platform', 'name code')
        .populate('generatedBy', 'name')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit)),
      DMAuditReport.countDocuments(filter),
    ]);
    res.json({ success: true, data: { reports, total, page: Number(page), pages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
};

// Generate a new report skeleton — creates report + empty entries for all platform metrics
exports.generateReport = async (req, res, next) => {
  try {
    const { clientId, platformId, periodDays, startDate } = req.body;
    if (![7, 15, 30, 60, 90].includes(Number(periodDays))) {
      return res.status(400).json({ success: false, error: { message: 'periodDays must be 7, 15, 30, 60, or 90' } });
    }

    const start = dayjs(startDate);
    const end   = start.add(Number(periodDays) - 1, 'day');

    const report = await DMAuditReport.create({
      client: clientId, platform: platformId,
      periodDays: Number(periodDays),
      startDate: start.toDate(), endDate: end.toDate(),
      generatedBy: req.user.userId, createdBy: req.user.userId,
    });

    // Auto-create empty entries for every active metric of this platform
    const metrics = await DMAuditMetric.find({ platform: platformId, deletedAt: null, isActive: true }).sort({ sortOrder: 1 });
    if (metrics.length > 0) {
      await DMAuditReportEntry.insertMany(
        metrics.map((m) => ({ report: report._id, metric: m._id, value: null }))
      );
    }

    await logAudit({ userId: req.user.userId, action: 'CREATE', resource: 'dm_audit_report', resourceId: report._id, before: null, after: report.toObject(), req });

    const populated = await DMAuditReport.findById(report._id)
      .populate('client', 'name companyName')
      .populate('platform', 'name code');
    res.status(201).json({ success: true, data: { report: populated } });
  } catch (err) { next(err); }
};

// Get report with all entries
exports.getReport = async (req, res, next) => {
  try {
    const report = await DMAuditReport.findById(req.params.id)
      .populate('client', 'name companyName')
      .populate('platform', 'name code')
      .populate('generatedBy', 'name');
    if (!report || report.deletedAt) return res.status(404).json({ success: false, error: { message: 'Report not found' } });

    const entries = await DMAuditReportEntry.find({ report: report._id })
      .populate('metric', 'title valueType unit sortOrder')
      .sort({ 'metric.sortOrder': 1 });

    res.json({ success: true, data: { report, entries } });
  } catch (err) { next(err); }
};

// Save/update metric entries (bulk patch)
exports.saveEntries = async (req, res, next) => {
  try {
    const { id } = req.params;
    // req.body.entries = [{ metricId, value, notes }, ...]
    const ops = (req.body.entries || []).map(({ metricId, value, notes }) =>
      DMAuditReportEntry.findOneAndUpdate(
        { report: id, metric: metricId },
        { value, notes: notes || '', updatedBy: req.user.userId },
        { upsert: true, new: true }
      )
    );
    await Promise.all(ops);

    // Also update narrative fields if provided
    const narrativeFields = ['achievements', 'challenges', 'recommendations', 'nextGoals'];
    const narrativeUpdate = {};
    narrativeFields.forEach((f) => { if (req.body[f] !== undefined) narrativeUpdate[f] = req.body[f]; });
    if (Object.keys(narrativeUpdate).length > 0) {
      narrativeUpdate.updatedBy = req.user.userId;
      await DMAuditReport.findByIdAndUpdate(id, narrativeUpdate);
    }

    res.json({ success: true, message: 'Entries saved' });
  } catch (err) { next(err); }
};

// Publish report
exports.publishReport = async (req, res, next) => {
  try {
    const before  = await DMAuditReport.findById(req.params.id).lean();
    const report  = await DMAuditReport.findByIdAndUpdate(
      req.params.id,
      { status: 'published', publishedAt: new Date(), updatedBy: req.user.userId },
      { new: true }
    );
    if (!report) return res.status(404).json({ success: false, error: { message: 'Report not found' } });
    await logAudit({ userId: req.user.userId, action: 'UPDATE', resource: 'dm_audit_report', resourceId: report._id, before, after: report.toObject(), req });
    res.json({ success: true, data: { report } });
  } catch (err) { next(err); }
};

exports.deleteReport = async (req, res, next) => {
  try {
    const report = await DMAuditReport.findByIdAndUpdate(
      req.params.id,
      { deletedAt: new Date(), updatedBy: req.user.userId },
      { new: true }
    );
    if (!report) return res.status(404).json({ success: false, error: { message: 'Report not found' } });
    await logAudit({ userId: req.user.userId, action: 'DELETE', resource: 'dm_audit_report', resourceId: report._id, before: report.toObject(), after: null, req });
    res.json({ success: true, message: 'Report deleted' });
  } catch (err) { next(err); }
};

// Period comparison: two reports side by side
exports.compareReports = async (req, res, next) => {
  try {
    const { report1Id, report2Id } = req.query;
    if (!report1Id || !report2Id) {
      return res.status(400).json({ success: false, error: { message: 'report1Id and report2Id required' } });
    }

    const [r1, r2, e1, e2] = await Promise.all([
      DMAuditReport.findById(report1Id).populate('client', 'name companyName').populate('platform', 'name'),
      DMAuditReport.findById(report2Id).populate('client', 'name companyName').populate('platform', 'name'),
      DMAuditReportEntry.find({ report: report1Id }).populate('metric', 'title valueType unit sortOrder'),
      DMAuditReportEntry.find({ report: report2Id }).populate('metric', 'title valueType unit sortOrder'),
    ]);

    // Build comparison rows: metric title → { r1value, r2value, delta, trend }
    const metricMap = {};
    e1.forEach((e) => {
      const key = e.metric?.title;
      if (!key) return;
      metricMap[key] = { metric: e.metric, r1: e.value, r2: null, delta: null, trend: null };
    });
    e2.forEach((e) => {
      const key = e.metric?.title;
      if (!key) return;
      if (!metricMap[key]) metricMap[key] = { metric: e.metric, r1: null, r2: e.value, delta: null, trend: null };
      else metricMap[key].r2 = e.value;
    });

    // Calculate delta for numeric metrics
    Object.values(metricMap).forEach((row) => {
      const v1 = Number(row.r1);
      const v2 = Number(row.r2);
      if (!isNaN(v1) && !isNaN(v2) && row.r1 !== null && row.r2 !== null) {
        row.delta = v2 - v1;
        row.trend = v2 > v1 ? 'up' : v2 < v1 ? 'down' : 'flat';
      }
    });

    const comparison = Object.values(metricMap).sort((a, b) => (a.metric?.sortOrder ?? 0) - (b.metric?.sortOrder ?? 0));
    res.json({ success: true, data: { report1: r1, report2: r2, comparison } });
  } catch (err) { next(err); }
};

// PDF Export
exports.exportPDF = async (req, res, next) => {
  try {
    const report = await DMAuditReport.findById(req.params.id)
      .populate('client', 'name companyName')
      .populate('platform', 'name code')
      .populate('generatedBy', 'name');
    if (!report || report.deletedAt) return res.status(404).json({ success: false, error: { message: 'Report not found' } });

    const entries = await DMAuditReportEntry.find({ report: report._id })
      .populate('metric', 'title valueType unit sortOrder')
      .sort({ 'metric.sortOrder': 1 });

    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="audit-report-${report._id}.pdf"`);
    doc.pipe(res);

    // ── Colors ──
    const DEEP_NAVY   = '#0A1628';
    const BRAND_BLUE  = '#1A3A6B';
    const ACTION_BLUE = '#1E6FD9';
    const ORANGE      = '#FF6B00';
    const CYAN        = '#00C6FF';

    // ── Header ──
    doc.rect(0, 0, doc.page.width, 90).fill(DEEP_NAVY);
    doc.fontSize(22).fillColor('#FFFFFF').font('Helvetica-Bold')
      .text('ANK Digital Media', 50, 20, { continued: false });
    doc.fontSize(10).fillColor(CYAN)
      .text('ankdigitalmedia.com  |  09999779817', 50, 46);
    doc.fontSize(8).fillColor('#9CA3AF')
      .text('Generated by AMS — ANK Management System', 50, 62);

    // Right side: report type badge
    doc.fontSize(14).fillColor(ORANGE).font('Helvetica-Bold')
      .text(`${report.periodDays}-Day Audit Report`, 350, 28, { align: 'right', width: 200 });
    doc.fontSize(9).fillColor('#9CA3AF').font('Helvetica')
      .text(`${report.platform.name}`, 350, 48, { align: 'right', width: 200 });

    doc.moveDown(4);

    // ── Client & Period Info ──
    doc.rect(50, 110, doc.page.width - 100, 60).fill('#F0F4FF').stroke(BRAND_BLUE);
    doc.fontSize(13).fillColor(DEEP_NAVY).font('Helvetica-Bold')
      .text(report.client.companyName || report.client.name, 62, 120);
    doc.fontSize(9).fillColor('#374151').font('Helvetica')
      .text(`Platform: ${report.platform.name}   |   Period: ${report.periodDays} days   |   ${new Date(report.startDate).toLocaleDateString('en-IN')} – ${new Date(report.endDate).toLocaleDateString('en-IN')}`, 62, 138)
      .text(`Status: ${report.status.toUpperCase()}   |   Generated by: ${report.generatedBy?.name || 'System'}   |   Date: ${new Date().toLocaleDateString('en-IN')}`, 62, 152);

    doc.y = 185; doc.x = 50;

    // ── Metrics Table ──
    doc.fontSize(12).fillColor(ACTION_BLUE).font('Helvetica-Bold').text('Metrics', 50, doc.y);
    doc.moveDown(0.4);

    const rowH = 22;
    const col1 = 50, col2 = 340;
    const tableWidth = doc.page.width - 100;

    // Header row
    doc.rect(col1, doc.y, tableWidth, rowH).fill(BRAND_BLUE);
    doc.fontSize(9).fillColor('#FFFFFF').font('Helvetica-Bold')
      .text('Metric', col1 + 6, doc.y + 6)
      .text('Value', col2 + 6, doc.y + 6);
    doc.y += rowH;

    let rowIndex = 0;
    for (const entry of entries) {
      if (!entry.metric) continue;
      const isEven = rowIndex % 2 === 0;
      const bg = isEven ? '#F9FAFB' : '#FFFFFF';

      // Page break check
      if (doc.y + rowH > doc.page.height - 80) {
        doc.addPage();
        doc.y = 50;
      }

      doc.rect(col1, doc.y, tableWidth, rowH).fill(bg).stroke('#E5E7EB');
      doc.fontSize(8).fillColor('#111827').font('Helvetica')
        .text(entry.metric.title, col1 + 6, doc.y + 7, { width: 280, ellipsis: true });

      const valStr = entry.value !== null && entry.value !== undefined ? String(entry.value) : '—';
      doc.fontSize(8).fillColor(entry.value !== null ? ACTION_BLUE : '#9CA3AF').font('Helvetica-Bold')
        .text(valStr, col2 + 6, doc.y + 7, { width: 180 });

      doc.y += rowH;
      rowIndex++;
    }

    // ── Narrative Sections ──
    const narratives = [
      { label: 'Key Achievements', value: report.achievements },
      { label: 'Challenges Faced', value: report.challenges },
      { label: 'Recommendations', value: report.recommendations },
      { label: 'Goals for Next Period', value: report.nextGoals },
    ].filter((n) => n.value);

    if (narratives.length > 0) {
      doc.moveDown(1);
      if (doc.y > doc.page.height - 120) doc.addPage();

      narratives.forEach(({ label, value }) => {
        if (doc.y > doc.page.height - 80) doc.addPage();
        doc.fontSize(11).fillColor(ACTION_BLUE).font('Helvetica-Bold').text(label, 50, doc.y);
        doc.moveDown(0.3);
        doc.fontSize(9).fillColor('#374151').font('Helvetica').text(value, 50, doc.y, { width: tableWidth, lineGap: 3 });
        doc.moveDown(1);
      });
    }

    // ── Footer ──
    const footerY = doc.page.height - 50;
    doc.rect(0, footerY, doc.page.width, 50).fill(DEEP_NAVY);
    doc.fontSize(7).fillColor('#6B7280')
      .text('This report is confidential and prepared by ANK Digital Media for internal and client use only.', 50, footerY + 10, { align: 'center', width: doc.page.width - 100 })
      .text(`ANK Digital Media  |  ankdigitalmedia.com  |  Report ID: ${report._id}`, 50, footerY + 24, { align: 'center', width: doc.page.width - 100 });

    doc.end();
  } catch (err) { next(err); }
};
