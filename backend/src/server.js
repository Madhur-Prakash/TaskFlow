require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');
const { getClient } = require('./config/redis');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 5000;

const start = async () => {
  await connectDB();
  // Eagerly connect Redis; non-fatal if unavailable
  try {
    await getClient().connect();
  } catch (err) {
    logger.warn(`Redis unavailable, caching disabled: ${err.message}`);
  }
  app.listen(PORT, () => logger.info(`Server running on port ${PORT} [${process.env.NODE_ENV}]`));
};

start().catch((err) => {
  logger.error('Failed to start server', err);
  process.exit(1);
});
