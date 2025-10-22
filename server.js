const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const helmet = require('helmet');
const csurf = require('csurf');
const cookieParser = require('cookie-parser');

// Database and models
const db = require('./models');

// Route modules
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const trainingRoutes = require('./routes/training.routes');
const documentRoutes = require('./routes/document.routes');
const complianceRoutes = require('./routes/compliance.routes');
const reportRoutes = require('./routes/report.routes');
const riskRoutes = require('./routes/risk.routes');
const incidentRoutes = require('./routes/incident.routes');
const auditRoutes = require('./routes/audit.routes');
const advancedReportRoutes = require('./routes/advanced-report.routes');
const healthRoutes = require('./routes/health.routes');

// Middleware
const auditMiddleware = require('./middleware/audit');
const { apiLimiter } = require('./middleware/rate-limit');
const { notFoundMiddleware, errorHandlerMiddleware } = require('./middleware/error-handler');
const compressionMiddleware = require('./middleware/compression');
const { httpLogger } = require('./utils/logger');

// Load environment variables
dotenv.config();

const app = express();

// Enhanced security with custom middleware
const { enhancedSecurity } = require('./middleware/security');
app.use(enhancedSecurity({
  // CSP directives for enhanced security
  cspDirectives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"],
    styleSrc: ["'self'"],
    imgSrc: ["'self'", "data:"],
    connectSrc: ["'self'"],
    fontSrc: ["'self'"],
    objectSrc: ["'none'"],
    frameSrc: ["'none'"],
    formAction: ["'self'"],
    baseUri: ["'none'"],
    upgradeInsecureRequests: []
  },

  // HSTS settings
  hstsMaxAge: '1y',
  hstsIncludeSubDomains: true,
  hstsPreload: true,

  // Permissions Policy settings
  permissionsPolicyFeatures: {
    camera: [],
    microphone: [],
    geolocation: []
  }
}));

// CORS configuration
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-access-token', 'x-csrf-token']
}));

// Apply compression middleware
app.use(compressionMiddleware());

// HTTP request logging
app.use(httpLogger);

// Body parser middleware
app.use(express.json({ limit: '1mb' })); // Limit request size
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Cookie parser middleware (required for CSRF)
app.use(cookieParser());

// Force HTTPS in production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (!req.secure && req.get('x-forwarded-proto') !== 'https') {
      return res.redirect('https://' + req.get('host') + req.url);
    }
    next();
  });
}

// Rate limiting for all API routes
app.use('/api', apiLimiter);

// Audit logging middleware
app.use(auditMiddleware);

// CSRF protection - apply after route-specific middlewares
// Exclude specific APIs that need to be called from external systems
const csrfProtection = csurf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  }
});

// Apply CSRF selectively - exclude paths that don't need CSRF
app.use((req, res, next) => {
  // Skip CSRF in test environment
  if (process.env.NODE_ENV === 'test') {
    return next();
  }

  // Paths that don't need CSRF protection
  const excludedPaths = ['/api/auth/login', '/api/health'];
  if (excludedPaths.includes(req.path)) {
    return next();
  }
  // Apply CSRF for everything else
  csrfProtection(req, res, next);
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/training', trainingRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/compliance', complianceRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/risk', riskRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/advanced-reports', advancedReportRoutes);
app.use('/api', healthRoutes);

// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
  // Set static folder with cache control
  app.use(express.static(path.join(__dirname, 'client/build'), {
    maxAge: '1y',
    setHeaders: (res, path) => {
      if (path.endsWith('.html') || path.endsWith('.js') || path.endsWith('.css')) {
        res.setHeader('Cache-Control', 'public, max-age=0');
      }
    }
  }));

  // Any route that doesn't match API will be redirected to index.html
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'client', 'build', 'index.html'));
  });
}

// 404 handler
app.use(notFoundMiddleware);

// Global error handling middleware
app.use(errorHandlerMiddleware);

const PORT = process.env.PORT || 8080;

// Only start server if this file is run directly (not imported in tests)
if (require.main === module) {
  // Sync database and start server
  db.sequelize.sync()
    .then(() => {
      console.log('Database synchronized successfully');
      app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
        console.log(`API available at http://localhost:${PORT}/api`);
        if (process.env.NODE_ENV === 'production') {
          console.log(`Frontend available at http://localhost:${PORT}`);
        } else {
          console.log(`Frontend development server should be started separately with 'npm run client'`);
        }
      });
    })
    .catch(err => {
      console.error('Failed to sync database:', err);
    });
}

module.exports = app;
