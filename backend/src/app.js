require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const jwt = require('jsonwebtoken');

const connectDB = require('./config/db');
require('./models/index');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const { seedPermissions } = require('./utils/seedPermissions');

const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const deptRoutes = require('./routes/department.routes');
const notifRoutes = require('./routes/notification.routes');
const permRoutes = require('./routes/permission.routes');
const settingsRoutes = require('./routes/settings.routes');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true },
});

// Socket.io — authenticate + join personal room
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Unauthorized'));
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.userId;
    next();
  } catch {
    next(new Error('Invalid token'));
  }
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

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/departments', deptRoutes);
app.use('/api/v1/notifications', notifRoutes);
app.use('/api/v1/permissions', permRoutes);
app.use('/api/v1/settings', settingsRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const start = async () => {
  await connectDB();
  await seedPermissions();
  server.listen(PORT, () => console.log(`Server running on port ${PORT} [${process.env.NODE_ENV}]`));
};

start();

module.exports = { app, server };
