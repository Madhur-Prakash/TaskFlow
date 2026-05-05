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
      origin: ['http://localhost:3000', 'http://localhost:5000', 'http://127.0.0.1:3000'],
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      credentials: true,
      allowedHeaders: ['Content-Type', 'Authorization'],
    },
  });

  // Make io accessible via app for controllers
  app.set('io', io);

  io.on('connection', (socket) => {
    console.log('[Socket.IO] Client connected:', socket.id);
    
    socket.on('joinOrg', ({ orgId }) => {
      console.log(`[Socket.IO] joinOrg: ${socket.id} joining org_${orgId}`);
      if (orgId) socket.join(`org_${orgId}`);
    });

    socket.on('leaveOrg', ({ orgId }) => {
      console.log(`[Socket.IO] leaveOrg: ${socket.id} leaving org_${orgId}`);
      if (orgId) socket.leave(`org_${orgId}`);
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket.IO] Client disconnected:', socket.id, 'reason:', reason);
    });

    socket.on('error', (error) => {
      console.error('[Socket.IO] Socket error:', socket.id, error);
    });
  });

  server.listen(PORT, () => logger.info(`Server running on port ${PORT} [${process.env.NODE_ENV}]`));
};

start().catch((err) => {
  logger.error('Failed to start server', err);
  process.exit(1);
});
