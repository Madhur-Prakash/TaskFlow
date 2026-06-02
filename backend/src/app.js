const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const basicAuth = require('express-basic-auth');
const errorHandler = require('./middlewares/errorHandler');
const authRoutes = require('./routes/authRoutes');
const orgRoutes = require('./routes/orgRoutes');
const taskRoutes = require('./routes/taskRoutes');
const userRoutes = require('./routes/userRoutes');

const app = express();

// Trust the immediate upstream proxy (zrok / nginx) only
app.set('trust proxy', 1);

// ── PARSING ──────────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());

// ── CORS ─────────────────────────────────────────────────────────────────────
// Build whitelist from env; filter out blanks so missing vars don't allow empty-string origins

const clientOrigins = process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',') : [];
const prodOrigins = process.env.PROD_URL ? process.env.PROD_URL.split(',') : [];
const allowedOrigins = [
  ...clientOrigins,
  ...prodOrigins
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow same-origin / server-to-server (no Origin header) and whitelisted origins
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('Something went wrong with CORS'));
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
    return res.status(404).json({ success: false, message: 'Not Allowed' });
  }
  // check if token exist in cookies
  if (req.cookies.docs_token === process.env.DOCS_TOKEN) {
    return next();
  }
  const token = req.query.token
  if (token !== process.env.DOCS_TOKEN){
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  // set cookie for subsequent requests
  res.cookie('docs_token', token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 10 * 60 * 1000, // 10 minutes
  })

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

app.use('/api/v1/docs', docsGuard,
  basicAuth({
    users: { 
      admin: process.env.DOCS_TOKEN
    },
    challenge: true,
    unauthorizedResponse: (req) => req.auth
      ? 'Credentials rejected'
      : 'No credentials provided',
  }),
  swaggerUi.serve, 
  swaggerUi.setup(swaggerSpec)
);

// ── GLOBAL SECURITY ──────────────────────────────────────────────────────────
app.use(helmet());
app.use(mongoSanitize());

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
