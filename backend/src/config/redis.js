const Redis = require('ioredis');
const logger = require('../utils/logger');

let client = null;

const getClient = () => {
  if (client) return client;

  client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    lazyConnect: true,
  });

  client.on('connect', () => logger.info('Redis connected'));
  client.on('error', (err) => {
    logger.warn(`Redis error: ${err.message}`);
    client = null; // reset so next call retries
  });

  return client;
};

module.exports = { getClient };
