const Client              = require('../models/Client');
const ClientContact       = require('../models/ClientContact');
const ServiceSubscription = require('../models/ServiceSubscription');
const ServiceTicket       = require('../models/ServiceTicket');
const ServiceCatalog      = require('../models/ServiceCatalog');
const Lead                = require('../models/Lead');
const AppError            = require('../utils/AppError');
const { logAudit }        = require('../middleware/auditLogger');
const { calcHealthScore } = require('../utils/clientHealthScore');
const {
  createClientSchema, updateClientSchema, contactSchema, subscriptionSchema, ticketSchema,
} = require('../validators/client.validator');

// ─── LIST CLIENTS ─────────────────────────────────────────────────────────────
exports.listClients = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, sort = '-createdAt', industry, healthScore, accountManager, q } = req.query;
    const filter = { deletedAt: null };
    if (industry)       filter.industry = industry;
    if (healthScore)    filter.healthScore = healthScore;
    if (accountManager) filter.accountManager = accountManager;
    if (q) filter.$or = [
      { name:        { $regex: q, $options: 'i' } },
      { companyName: { $regex: q, $options: 'i' } },
      { mobile:      { $regex: q, $options: 'i' } },
      { email:       { $regex: q, $options: 'i' } },
    ];

    const skip  = (Number(page) - 1) * Number(limit);
    const total = await Client.countDocuments(filter);
    const clients = await Client.find(filter)
      .sort(sort).skip(skip).limit(Number(limit))
      .populate('accountManager', 'name email')
      .populate('convertedFrom', 'name mobile')
      .lean();

    res.json({ success: true, data: { clients, total, page: Number(page), limit: Number(limit) } });
  } catch (err) { next(err); }
};

// ─── GET ONE CLIENT ───────────────────────────────────────────────────────────
exports.getClient = async (req, res, next) => {
  try {
    const client = await Client.findOne({ _id: req.params.id, deletedAt: null })
      .populate('accountManager', 'name email role')
      .populate('convertedFrom', 'name mobile email source stage')
      .populate('createdBy', 'name')
      .lean();
    if (!client) return next(new AppError('Client not found', 404, 'NOT_FOUND'));
    res.json({ success: true, data: { client } });
  } catch (err) { next(err); }
};

// ─── CREATE CLIENT ────────────────────────────────────────────────────────────
exports.createClient = async (req, res, next) => {
  try {
    const parsed = createClientSchema.safeParse(req.body);
    if (!parsed.success) return next(new AppError('Validation error', 400, 'VALIDATION_ERROR', parsed.error.flatten()));

    const client = await Client.create({ ...parsed.data, createdBy: req.user.userId });
    await logAudit({ userId: req.user.userId, action: 'CREATE', resource: 'client', resourceId: client._id, after: client.toObject(), req });
    res.status(201).json({ success: true, data: { client }, message: 'Client created' });
  } catch (err) { next(err); }
};

// ─── UPDATE CLIENT ────────────────────────────────────────────────────────────
exports.updateClient = async (req, res, next) => {
  try {
    const parsed = updateClientSchema.safeParse(req.body);
    if (!parsed.success) return next(new AppError('Validation error', 400, 'VALIDATION_ERROR', parsed.error.flatten()));

    const before = await Client.findOne({ _id: req.params.id, deletedAt: null }).lean();
    if (!before) return next(new AppError('Client not found', 404, 'NOT_FOUND'));

    const after = await Client.findByIdAndUpdate(req.params.id, { ...parsed.data, updatedBy: req.user.userId }, { new: true })
      .populate('accountManager', 'name email').lean();

    await logAudit({ userId: req.user.userId, action: 'UPDATE', resource: 'client', resourceId: after._id, before, after, req });
    res.json({ success: true, data: { client: after }, message: 'Client updated' });
  } catch (err) { next(err); }
};

// ─── DELETE CLIENT ────────────────────────────────────────────────────────────
exports.deleteClient = async (req, res, next) => {
  try {
    const client = await Client.findOne({ _id: req.params.id, deletedAt: null });
    if (!client) return next(new AppError('Client not found', 404, 'NOT_FOUND'));
    const before = client.toObject();
    client.deletedAt = new Date(); client.updatedBy = req.user.userId;
    await client.save();
    await logAudit({ userId: req.user.userId, action: 'DELETE', resource: 'client', resourceId: client._id, before, req });
    res.json({ success: true, message: 'Client deleted' });
  } catch (err) { next(err); }
};

// ─── AUTO-CONVERT LEAD TO CLIENT ──────────────────────────────────────────────
exports.convertLeadToClient = async (leadId, userId) => {
  const lead = await Lead.findById(leadId).populate('source').lean();
  if (!lead) return null;

  const existing = await Client.findOne({ convertedFrom: leadId, deletedAt: null });
  if (existing) return existing;

  const client = await Client.create({
    name:          lead.name,
    companyName:   lead.company,
    email:         lead.email,
    mobile:        lead.mobile,
    convertedFrom: lead._id,
    accountManager: lead.assignedTo || null,
    onboardingDate: new Date(),
    createdBy:     userId,
  });

  // auto-create a handover ticket
  await ServiceTicket.create({
    client:      client._id,
    title:       `Onboarding: ${lead.name}`,
    description: `Lead converted to client. Services interested: ${lead.serviceInterest?.join(', ') || 'Not specified'}`,
    priority:    'medium',
    createdBy:   userId,
  });

  await Lead.findByIdAndUpdate(leadId, { convertedTo: client._id, convertedAt: new Date() });

  return client;
};

// ─── CONTACTS ─────────────────────────────────────────────────────────────────
exports.listContacts = async (req, res, next) => {
  try {
    const contacts = await ClientContact.find({ client: req.params.id, deletedAt: null }).sort('-isPrimary').lean();
    res.json({ success: true, data: { contacts } });
  } catch (err) { next(err); }
};

exports.addContact = async (req, res, next) => {
  try {
    const parsed = contactSchema.safeParse(req.body);
    if (!parsed.success) return next(new AppError('Validation error', 400, 'VALIDATION_ERROR', parsed.error.flatten()));

    if (parsed.data.isPrimary) {
      await ClientContact.updateMany({ client: req.params.id }, { isPrimary: false });
    }
    const contact = await ClientContact.create({ client: req.params.id, ...parsed.data });
    res.status(201).json({ success: true, data: { contact } });
  } catch (err) { next(err); }
};

exports.updateContact = async (req, res, next) => {
  try {
    const parsed = contactSchema.partial().safeParse(req.body);
    if (!parsed.success) return next(new AppError('Validation error', 400, 'VALIDATION_ERROR', parsed.error.flatten()));

    if (parsed.data.isPrimary) {
      await ClientContact.updateMany({ client: req.params.id }, { isPrimary: false });
    }
    const contact = await ClientContact.findByIdAndUpdate(req.params.contactId, parsed.data, { new: true });
    res.json({ success: true, data: { contact } });
  } catch (err) { next(err); }
};

exports.deleteContact = async (req, res, next) => {
  try {
    await ClientContact.findByIdAndUpdate(req.params.contactId, { deletedAt: new Date() });
    res.json({ success: true, message: 'Contact removed' });
  } catch (err) { next(err); }
};

// ─── SUBSCRIPTIONS ─────────────────────────────────────────────────────────────
exports.listSubscriptions = async (req, res, next) => {
  try {
    const subs = await ServiceSubscription.find({ client: req.params.id, deletedAt: null })
      .populate('service', 'name code category')
      .populate('assignedHead', 'name')
      .sort('-startDate').lean();
    res.json({ success: true, data: { subscriptions: subs } });
  } catch (err) { next(err); }
};

exports.addSubscription = async (req, res, next) => {
  try {
    const parsed = subscriptionSchema.safeParse(req.body);
    if (!parsed.success) return next(new AppError('Validation error', 400, 'VALIDATION_ERROR', parsed.error.flatten()));

    const client = await Client.findOne({ _id: req.params.id, deletedAt: null });
    if (!client) return next(new AppError('Client not found', 404, 'NOT_FOUND'));

    const sub = await ServiceSubscription.create({ client: req.params.id, ...parsed.data, createdBy: req.user.userId });

    const health = await calcHealthScore(req.params.id);
    await Client.findByIdAndUpdate(req.params.id, { healthScore: health });

    await logAudit({ userId: req.user.userId, action: 'CREATE', resource: 'subscription', resourceId: sub._id, after: sub.toObject(), req });
    res.status(201).json({ success: true, data: { subscription: sub }, message: 'Subscription added' });
  } catch (err) { next(err); }
};

exports.updateSubscription = async (req, res, next) => {
  try {
    const parsed = subscriptionSchema.partial().safeParse(req.body);
    if (!parsed.success) return next(new AppError('Validation error', 400, 'VALIDATION_ERROR', parsed.error.flatten()));

    const sub = await ServiceSubscription.findByIdAndUpdate(
      req.params.subId, { ...parsed.data, updatedBy: req.user.userId }, { new: true }
    ).populate('service', 'name code');

    const health = await calcHealthScore(req.params.id);
    await Client.findByIdAndUpdate(req.params.id, { healthScore: health });

    res.json({ success: true, data: { subscription: sub } });
  } catch (err) { next(err); }
};

// ─── TICKETS ──────────────────────────────────────────────────────────────────
exports.listTickets = async (req, res, next) => {
  try {
    const tickets = await ServiceTicket.find({ client: req.params.id, deletedAt: null })
      .populate('assignedTo', 'name')
      .populate('subscription', 'service')
      .sort('-createdAt').lean();
    res.json({ success: true, data: { tickets } });
  } catch (err) { next(err); }
};

exports.addTicket = async (req, res, next) => {
  try {
    const parsed = ticketSchema.safeParse(req.body);
    if (!parsed.success) return next(new AppError('Validation error', 400, 'VALIDATION_ERROR', parsed.error.flatten()));

    const ticket = await ServiceTicket.create({ client: req.params.id, ...parsed.data, createdBy: req.user.userId });
    await logAudit({ userId: req.user.userId, action: 'CREATE', resource: 'ticket', resourceId: ticket._id, after: ticket.toObject(), req });

    // Auto-create Dev handover if ticket is linked to a web/dev service
    if (parsed.data.subscription) {
      try {
        const sub = await ServiceSubscription.findById(parsed.data.subscription).populate('service');
        if (sub?.service?.category === 'web') {
          const DevProjectHandover = require('../models/DevProjectHandover');
          await DevProjectHandover.create({
            serviceTicketId:     ticket._id,
            clientId:            req.params.id,
            salesPerson:         req.user.userId,
            handoverDate:        new Date(),
            originalRequirement: parsed.data.description || parsed.data.title,
            status:              'pending_review',
            createdBy:           req.user.userId,
          });
        }
      } catch (_) { /* handover creation is best-effort — don't fail the ticket */ }
    }

    res.status(201).json({ success: true, data: { ticket } });
  } catch (err) { next(err); }
};

exports.updateTicket = async (req, res, next) => {
  try {
    const parsed = ticketSchema.partial().safeParse(req.body);
    if (!parsed.success) return next(new AppError('Validation error', 400, 'VALIDATION_ERROR', parsed.error.flatten()));

    const update = { ...parsed.data, updatedBy: req.user.userId };
    if (parsed.data.status === 'resolved') update.resolvedAt = new Date();

    const ticket = await ServiceTicket.findByIdAndUpdate(req.params.ticketId, update, { new: true })
      .populate('assignedTo', 'name');

    if (parsed.data.status === 'urgent' || parsed.data.priority === 'urgent') {
      const health = await calcHealthScore(req.params.id);
      await Client.findByIdAndUpdate(req.params.id, { healthScore: health });
    }

    res.json({ success: true, data: { ticket } });
  } catch (err) { next(err); }
};

// ─── SERVICE CATALOG ──────────────────────────────────────────────────────────
exports.listServices = async (_req, res, next) => {
  try {
    const services = await ServiceCatalog.find({ isActive: true, deletedAt: null }).sort('category name').lean();
    res.json({ success: true, data: { services } });
  } catch (err) { next(err); }
};

exports.createService = async (req, res, next) => {
  try {
    const service = await ServiceCatalog.create({ ...req.body, createdBy: req.user.userId });
    res.status(201).json({ success: true, data: { service } });
  } catch (err) { next(err); }
};

exports.updateService = async (req, res, next) => {
  try {
    const service = await ServiceCatalog.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: { service } });
  } catch (err) { next(err); }
};

// ─── REFRESH HEALTH SCORE ─────────────────────────────────────────────────────
exports.refreshHealth = async (req, res, next) => {
  try {
    const health = await calcHealthScore(req.params.id);
    const client = await Client.findByIdAndUpdate(req.params.id, { healthScore: health }, { new: true });
    res.json({ success: true, data: { healthScore: client.healthScore } });
  } catch (err) { next(err); }
};
