require('dotenv').config();
const http = require('http');
const app = require('./app');
const connectDB = require('./config/db');
const { getClient } = require('./config/redis');
const logger = require('./utils/logger');
const { Server } = require('socket.io');
const { verifyToken } = require('./utils/jwt');
const Organization = require('./models/Organization');

const PORT = Number(process.env.PORT) || 5000;

// Parse raw cookie header without an extra dependency
function parseCookieHeader(header = '') {
  return header.split(';').reduce((acc, pair) => {
    const idx = pair.indexOf('=');
    if (idx > 0) {
      acc[pair.slice(0, idx).trim()] = decodeURIComponent(pair.slice(idx + 1).trim());
    }
    return acc;
  }, {});
}

const start = async () => {
  await connectDB();
  try {
    await getClient().connect();
  } catch (err) {
    logger.warn(`Redis unavailable, caching disabled: ${err.message}`);
  }

  const server = http.createServer(app);

  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5000',
    process.env.CLIENT_URL,
    process.env.PROD_URL,
  ].filter(Boolean);

  const io = new Server(server, {
    cors: {
      origin: (origin, cb) => {
        if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
        cb(new Error(`Socket CORS blocked: ${origin}`));
      },
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      credentials: true,
    },
  });

  // ── SOCKET.IO AUTH MIDDLEWARE ─────────────────────────────────────────────
  // Verify the JWT from the httpOnly cookie before accepting any connection.
  // withCredentials:true in the client means the browser sends cookies on the
  // initial HTTP upgrade request, so the token is available here.
  io.use((socket, next) => {
    const cookies = parseCookieHeader(socket.request.headers.cookie);
    const token = cookies.accessToken;
    if (!token) return next(new Error('Authentication required'));
    try {
      const decoded = verifyToken(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      socket.userRole = decoded.role;
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  app.set('io', io);

  io.on('connection', (socket) => {
    logger.info(`[Socket.IO] connected: ${socket.id} (user: ${socket.userId})`);

    socket.on('joinOrg', async ({ orgId }) => {
      if (!orgId) return;
      try {
        const org = await Organization.findById(orgId).select('owner members');
        if (!org) return;
        const isMember =
          org.owner.toString() === socket.userId ||
          org.members.some((m) => m.user.toString() === socket.userId);
        if (isMember) {
          socket.join(`org_${orgId}`);
          logger.info(`[Socket.IO] ${socket.id} joined org_${orgId}`);
        }
      } catch {
        // Silently ignore — do not expose internal errors over the socket
      }
    });

    socket.on('leaveOrg', ({ orgId }) => {
      if (orgId) socket.leave(`org_${orgId}`);
    });

    socket.on('disconnect', (reason) => {
      logger.info(`[Socket.IO] disconnected: ${socket.id} reason: ${reason}`);
    });

    socket.on('error', (error) => {
      logger.error(`[Socket.IO] error on ${socket.id}:`, error);
    });
  });

  server.listen(PORT, () => logger.info(`Server running on port ${PORT} [${process.env.NODE_ENV}]`));
};

start().catch((err) => {
  logger.error('Failed to start server', err);
  process.exit(1);
});
