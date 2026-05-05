const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');

const errorHandler = require('./middlewares/errorHandler');
const authRoutes = require('./routes/authRoutes');
const orgRoutes = require('./routes/orgRoutes');
const taskRoutes = require('./routes/taskRoutes');
const userRoutes = require('./routes/userRoutes');

const app = express();

// Swagger UI — relaxed CSP only for /docs so assets and inline scripts load
app.use('/api/v1/docs', helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'cdn.jsdelivr.net'],
      styleSrc: ["'self'", "'unsafe-inline'", 'cdn.jsdelivr.net'],
      imgSrc: ["'self'", 'data:', 'cdn.jsdelivr.net'],
      workerSrc: ["'self'", 'blob:'],
    },
  },
}));
app.use('/api/v1/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'TaskFlow API Docs',
}));

// Security (global)
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(mongoSanitize());

// Rate limiting
app.use('/api/v1/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: 'Too many requests' }));

// Parsing
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());

// Logging
if (process.env.NODE_ENV === 'development') app.use(morgan('dev'));
if (process.env.NODE_ENV === 'production') app.use(morgan('combined'));

// Public utility routes (before any protect middleware)
app.get('/api/v1/health', (req, res) => res.json(
  {
    "API Version": '1.0.0',
    'status': 'ok',
    'timestamp': new Date().toISOString(),
    'docs': '/api/v1/docs',
    "Authors": "Madhur-Prakash"
  }
));
app.get('/api/v1/docs.json', (req, res) => res.json(swaggerSpec));
app.get('/', (req, res) => res.json({ 
  'API version': '1.0.0',
  'message': 'Welcome to TaskFlow API',
  'docs:': '/api/v1/docs',
  'health:': '/api/v1/health',
  'Authors': 'Madhur-Prakash'
}));

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/orgs', orgRoutes);
app.use('/api/v1', taskRoutes);
app.use('/api/v1/users', userRoutes);

// 404
app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found' }));

// Error handler
app.use(errorHandler);

module.exports = app;
