require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const jwt = require('jsonwebtoken');

require('./models/index');
const { errorHandler, notFound } = require('./middleware/errorHandler');

const authRoutes     = require('./routes/auth.routes');
const userRoutes     = require('./routes/user.routes');
const deptRoutes     = require('./routes/department.routes');
const notifRoutes    = require('./routes/notification.routes');
const permRoutes     = require('./routes/permission.routes');
const settingsRoutes = require('./routes/settings.routes');
const auditRoutes    = require('./routes/auditLog.routes');
const profileRoutes  = require('./routes/profile.routes');
const leadRoutes     = require('./routes/lead.routes');
const clientRoutes   = require('./routes/client.routes');
const crmRoutes      = require('./routes/crm.routes');
const dmRoutes       = require('./routes/dm.routes');
const dmAuditRoutes  = require('./routes/dmAudit.routes');
const gdRoutes       = require('./routes/gd.routes');
const devRoutes      = require('./routes/dev.routes');
const hrRoutes       = require('./routes/hr.routes');
const sopRoutes          = require('./routes/sop.routes');
const onboardingRoutes   = require('./routes/onboarding.routes');
const searchRoutes       = require('./routes/search.routes');
const dashboardRoutes    = require('./routes/dashboard.routes');

const app    = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true },
});

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Unauthorized'));
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.userId;
    next();
  } catch { next(new Error('Invalid token')); }
});

io.on('connection', (socket) => {
  socket.join(`user:${socket.userId}`);
  socket.on('disconnect', () => {});
});

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(morgan(process.env.NODE_ENV === 'development' ? 'dev' : 'combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use((req, _res, next) => { req.io = io; next(); });

app.get('/api/v1/health', (_req, res) => res.json({ success: true, message: 'AMS API is running' }));

app.use('/api/v1/auth',          authRoutes);
app.use('/api/v1/users',         userRoutes);
app.use('/api/v1/departments',   deptRoutes);
app.use('/api/v1/notifications', notifRoutes);
app.use('/api/v1/permissions',   permRoutes);
app.use('/api/v1/settings',      settingsRoutes);
app.use('/api/v1/audit-logs',    auditRoutes);
app.use('/api/v1/profile',       profileRoutes);
app.use('/api/v1/crm/leads',     leadRoutes);
app.use('/api/v1/crm/clients',   clientRoutes);
app.use('/api/v1/crm',           crmRoutes);
app.use('/api/v1/dm',            dmRoutes);
app.use('/api/v1/dm',            dmAuditRoutes);
app.use('/api/v1/gd',            gdRoutes);
app.use('/api/v1/dev',           devRoutes);
app.use('/api/v1/hr',            hrRoutes);
app.use('/api/v1/sops',          sopRoutes);
app.use('/api/v1/onboarding',    onboardingRoutes);
app.use('/api/v1/search',        searchRoutes);
app.use('/api/v1/dashboard',     dashboardRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = { app, server, io };
