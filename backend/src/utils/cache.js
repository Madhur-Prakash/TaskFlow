const { getClient } = require('../config/redis');
const logger = require('./logger');

const DEFAULT_TTL = 30; // seconds

const cache = {
  async get(key) {
    try {
      const val = await getClient()?.get(key);
      return val ? JSON.parse(val) : null;
    } catch (err) {
      logger.warn(`cache.get failed [${key}]: ${err.message}`);
      return null;
    }
  },

  async set(key, value, ttl = DEFAULT_TTL) {
    try {
      await getClient()?.set(key, JSON.stringify(value), 'EX', ttl);
    } catch (err) {
      logger.warn(`cache.set failed [${key}]: ${err.message}`);
    }
  },

  async del(...keys) {
    try {
      if (keys.length) await getClient()?.del(...keys);
    } catch (err) {
      logger.warn(`cache.del failed [${keys}]: ${err.message}`);
    }
  },

  // Deletes all keys matching a glob pattern e.g. "tasks:orgId:*"
  async delPattern(pattern) {
    try {
      const redis = getClient();
      if (!redis) return;
      const keys = await redis.keys(pattern);
      if (keys.length) await redis.del(...keys);
    } catch (err) {
      logger.warn(`cache.delPattern failed [${pattern}]: ${err.message}`);
    }
  },
};

module.exports = cache;
