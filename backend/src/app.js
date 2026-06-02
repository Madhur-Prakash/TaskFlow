const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');

const errorHandler = require('./middlewares/errorHandler');
const authRoutes = require('./routes/authRoutes');
const orgRoutes = require('./routes/orgRoutes');
const taskRoutes = require('./routes/taskRoutes');
const userRoutes = require('./routes/userRoutes');

const app = express();

// Trust the immediate upstream proxy (zrok / nginx) only
app.set('trust proxy', 1);

// ── CORS ─────────────────────────────────────────────────────────────────────
// Build whitelist from env; filter out blanks so missing vars don't allow empty-string origins
const allowedOrigins = [
  process.env.CLIENT_URL,
  process.env.PROD_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow same-origin / server-to-server (no Origin header) and whitelisted origins
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
}));

// ── INTERNAL PROXY SECRET ────────────────────────────────────────────────────
// When INTERNAL_PROXY_SECRET is set, every /api request must carry the matching
// X-Internal-Proxy header, which the CRA dev proxy injects automatically.
// This prevents direct API access that bypasses the frontend entirely.
if (process.env.INTERNAL_PROXY_SECRET) {
  app.use('/api', (req, res, next) => {
    if (req.headers['x-internal-proxy'] !== process.env.INTERNAL_PROXY_SECRET) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    next();
  });
}

// ── SWAGGER DOCS GUARD ───────────────────────────────────────────────────────
// Docs are disabled entirely in production.
// In development they require the DOCS_TOKEN query param or header.
const docsGuard = (req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ success: false, message: 'Not found' });
  }
  const token = req.query.token || req.headers['x-docs-token'];
  if (!token || token !== process.env.DOCS_TOKEN) {
    return res.status(401).json({ success: false, message: 'Docs access requires a valid token (?token=<DOCS_TOKEN>)' });
  }
  next();
};

// Relaxed CSP only for the docs path so Swagger UI assets load
app.use('/api/v1/docs', docsGuard, helmet({
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

// ── GLOBAL SECURITY ──────────────────────────────────────────────────────────
app.use(helmet());
app.use(mongoSanitize());

// ── PARSING ──────────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());

// ── LOGGING ──────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV === 'development') app.use(morgan('dev'));
if (process.env.NODE_ENV === 'production') app.use(morgan('combined'));

// ── PUBLIC UTILITY ROUTES ────────────────────────────────────────────────────
app.get('/api/v1/health', (req, res) => res.json(
  {
    "API Version": '1.0.0',
    'status': 'ok',
    'timestamp': new Date().toISOString(),
    'docs': '/api/v1/docs',
    "Authors": "Madhur-Prakash"
  }
));
app.get('/api/v1/docs.json', docsGuard, (req, res) => res.json(swaggerSpec));
app.get('/', (req, res) => res.json(
  {
  "API Version": "1.0.0",
  "status": "ok",
  "timestamp": "2026-06-02T17:35:37.801Z",
  "docs": "/api/v1/docs",
  "Authors": "Madhur-Prakash"
}
));

// ── APPLICATION ROUTES ───────────────────────────────────────────────────────
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/orgs', orgRoutes);
app.use('/api/v1', taskRoutes);
app.use('/api/v1/users', userRoutes);

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found' }));

// ── ERROR HANDLER ────────────────────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
