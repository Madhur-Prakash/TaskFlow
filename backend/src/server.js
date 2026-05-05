require('dotenv').config();
const http = require('http');
const app = require('./app');
const connectDB = require('./config/db');
const { getClient } = require('./config/redis');
const logger = require('./utils/logger');
const { Server } = require('socket.io');

const PORT = Number(process.env.PORT) || 5000;

const start = async () => {
  await connectDB();
  // Eagerly connect Redis; non-fatal if unavailable
  try {
    await getClient().connect();
  } catch (err) {
    logger.warn(`Redis unavailable, caching disabled: ${err.message}`);
  }

  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || '*',
      methods: ['GET', 'POST', 'PATCH', 'DELETE'],
      credentials: true,
    },
  });

  // Make io accessible via app for controllers
  app.set('io', io);

  const { verifyToken } = require('./utils/jwt');
  const orgRepo = require('./repositories/orgRepo');

  io.use(async (socket, next) => {
    try {
      const cookieHeader = socket.handshake.headers.cookie || '';
      const parts = cookieHeader.split(';').map((c) => c.trim());
      const accessCookie = parts.find((p) => p.startsWith('accessToken='));
      if (!accessCookie) return next(new Error('Authentication error'));
      const token = decodeURIComponent(accessCookie.split('=')[1]);
      const decoded = verifyToken(token, process.env.JWT_SECRET);
      socket.data.userId = decoded.id;
      return next();
    } catch (err) {
      return next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    socket.on('joinOrg', async ({ orgId }) => {
      try {
        if (!orgId) return;
        const org = await orgRepo.findByIdRaw(orgId);
        if (!org) return;
        const userId = socket.data.userId;
        const isMember = org.owner.toString() === userId || org.members.some((m) => m.user.toString() === userId);
        if (isMember) socket.join(`org_${orgId}`);
      } catch (err) {
        // ignore
      }
    });

    socket.on('leaveOrg', ({ orgId }) => {
      if (orgId) socket.leave(`org_${orgId}`);
    });
  });

  server.listen(PORT, () => logger.info(`Server running on port ${PORT} [${process.env.NODE_ENV}]`));
};

start().catch((err) => {
  logger.error('Failed to start server', err);
  process.exit(1);
});
