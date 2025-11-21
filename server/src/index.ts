import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import pool from './db/connection.js';
import { authMiddleware } from './middleware/auth.js';

// Import routes
import authRoutes from './routes/auth.js';
import usersRoutes from './routes/users.js';
import testTemplatesRoutes from './routes/testTemplates.js';
import antibioticsRoutes from './routes/antibiotics.js';
import clientsRoutes from './routes/clients.js';
import patientsRoutes from './routes/patients.js';
import visitsRoutes from './routes/visits.js';
import visitTestsRoutes from './routes/visitTests.js';
import signatariesRoutes from './routes/signatories.js';
import referralDoctorsRoutes from './routes/referralDoctors.js';
import auditLogsRoutes from './routes/auditLogs.js';
import branchesRoutes from './routes/branches.js';
import signaturesRoutes from './routes/signatures.js';
import dashboardRoutes from './routes/dashboard.js';
import rolePermissionsRoutes from './routes/rolePermissions.js';
import approversRoutes from './routes/approvers.js';
import patientEditRequestsRoutes from './routes/patientEditRequests.js';
import resultRejectionsRoutes from './routes/resultRejections.js';
import auditLogManagementRoutes from './routes/auditLogManagement.js';
import reportsRoutes from './routes/reports.js';
import b2bFinancialRoutes from './routes/b2bFinancial.js';
import waiversRoutes from './routes/waivers.js';
import unitsRoutes from './routes/units.js';
import publicReportsRoutes from './routes/publicReports.js';
import { initializeCleanupScheduler } from './services/auditLogCleanup.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy (needed for correct IPs behind reverse proxies/load balancers)
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Request timing middleware - log slow requests
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (duration > 1000) { // Log requests taking more than 1 second
      console.warn(`⚠️  SLOW REQUEST: ${req.method} ${req.path} took ${duration}ms`);
    }
  });
  next();
});

// Security: Validate critical environment variables
if (process.env.NODE_ENV === 'production') {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'your-secret-key-change-in-production') {
    console.error('❌ SECURITY ERROR: JWT_SECRET must be set in environment variables');
    console.error('Generate a secret with: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"');
    process.exit(1);
  }
} else {
  // Development: Warn but don't exit
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'your-secret-key-change-in-production') {
    console.warn('⚠️  WARNING: JWT_SECRET not configured. Using default (NOT SECURE FOR PRODUCTION)');
  }
}

// Security Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:", "http://localhost:5001"],
    },
  },
  crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow images to be loaded cross-origin
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// CORS Configuration
if (process.env.NODE_ENV === 'production') {
  // Production: Strict CORS
  const allowedOrigins = process.env.FRONTEND_URL
    ? [process.env.FRONTEND_URL]
    : [];

  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`⚠️  Blocked CORS request from origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));
} else {
  // Development: Permissive CORS
  app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));
}

// Rate Limiting for Authentication Endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 5 : 10, // 5 attempts in production, 10 in dev
  message: { error: 'Too many authentication attempts, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful logins
  handler: (req, res) => {
    console.warn(`⚠️  Rate limit exceeded for IP: ${req.ip} on ${req.path}`);
    res.status(429).json({
      error: 'Too many authentication attempts, please try again after 15 minutes'
    });
  }
});

// General API Rate Limiting
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // 100 req/min in production, 1000 in dev
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health';
  },
  handler: (req, res) => {
    console.warn(`⚠️  API rate limit exceeded for IP: ${req.ip} on ${req.path}`);
    res.status(429).json({
      error: 'Too many requests, please try again later'
    });
  }
});

// Body Parser Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static('public')); // Serve static files (signatures, etc.)

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ status: 'ok', timestamp: result.rows[0].now });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Database connection failed' });
  }
});

// Apply general API rate limiting to all /api routes
app.use('/api', apiLimiter);

// Routes
// Public routes (no authentication required)
app.use('/api/public/reports', publicReportsRoutes);

// Auth routes (no auth middleware needed - handles its own auth)
app.use('/api/auth', authLimiter, authRoutes);

// Protected routes (authentication required for ALL)
app.use('/api/users', authMiddleware, usersRoutes);
app.use('/api/test-templates', authMiddleware, testTemplatesRoutes);
app.use('/api/antibiotics', authMiddleware, antibioticsRoutes);
app.use('/api/clients', authMiddleware, clientsRoutes);
app.use('/api/patients', authMiddleware, patientsRoutes);
app.use('/api/visits', authMiddleware, visitsRoutes);
app.use('/api/visit-tests', authMiddleware, visitTestsRoutes);
app.use('/api/signatories', authMiddleware, signatariesRoutes);
app.use('/api/referral-doctors', authMiddleware, referralDoctorsRoutes);
app.use('/api/audit-logs', authMiddleware, auditLogsRoutes);
app.use('/api/branches', authMiddleware, branchesRoutes);
app.use('/api/signatures', authMiddleware, signaturesRoutes);
app.use('/api/dashboard', authMiddleware, dashboardRoutes);
app.use('/api/role-permissions', authMiddleware, rolePermissionsRoutes);
app.use('/api/approvers', authMiddleware, approversRoutes);
app.use('/api/patient-edit-requests', authMiddleware, patientEditRequestsRoutes);
app.use('/api/result-rejections', authMiddleware, resultRejectionsRoutes);
app.use('/api/audit-log-management', authMiddleware, auditLogManagementRoutes);
app.use('/api/reports', authMiddleware, reportsRoutes);
app.use('/api/b2b-financial', authMiddleware, b2bFinancialRoutes);
app.use('/api/waivers', authMiddleware, waiversRoutes);
app.use('/api/units', authMiddleware, unitsRoutes);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);

  // Initialize audit log cleanup scheduler
  console.log('🔧 Initializing audit log cleanup scheduler...');
  initializeCleanupScheduler();
});

