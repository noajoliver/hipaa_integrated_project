/**
 * Application Configuration
 * @module config/app-config
 */

const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

/**
 * Application configuration object
 */
const config = {
  // Server configuration
  server: {
    port: process.env.PORT || 8080,
    env: process.env.NODE_ENV || 'development',
    clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
    apiUrl: process.env.API_URL || 'http://localhost:8080/api'
  },
  
  // JWT configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key-should-be-in-env-file',
    expiresIn: process.env.JWT_EXPIRATION || '8h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRATION || '7d'
  },
  
  // Database configuration (imported from database.js)
  
  // Redis configuration
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    enabled: process.env.REDIS_ENABLED === 'true'
  },
  
  // CORS configuration
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-access-token', 'x-csrf-token']
  },
  
  // Rate limiting configuration
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX) || 100, // Limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false
  },
  
  // Password policy configuration
  passwordPolicy: {
    minLength: parseInt(process.env.PASSWORD_MIN_LENGTH) || 12,
    requireUppercase: process.env.PASSWORD_REQUIRE_UPPERCASE !== 'false',
    requireLowercase: process.env.PASSWORD_REQUIRE_LOWERCASE !== 'false',
    requireNumbers: process.env.PASSWORD_REQUIRE_NUMBERS !== 'false',
    requireSymbols: process.env.PASSWORD_REQUIRE_SYMBOLS !== 'false',
    maxHistory: parseInt(process.env.PASSWORD_MAX_HISTORY) || 5,
    expiryDays: parseInt(process.env.PASSWORD_EXPIRY_DAYS) || 90
  },
  
  // Session configuration
  session: {
    secureCookies: process.env.NODE_ENV === 'production',
    cookieMaxAge: parseInt(process.env.COOKIE_MAX_AGE) || 24 * 60 * 60 * 1000 // 24 hours
  },
  
  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || 'app.log'
  },
  
  // Email configuration
  email: {
    enabled: process.env.EMAIL_ENABLED === 'true',
    from: process.env.EMAIL_FROM || 'no-reply@hipaa-compliance-app.com',
    smtp: {
      host: process.env.EMAIL_SMTP_HOST,
      port: parseInt(process.env.EMAIL_SMTP_PORT) || 587,
      secure: process.env.EMAIL_SMTP_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_SMTP_USER,
        pass: process.env.EMAIL_SMTP_PASS
      }
    }
  }
};

module.exports = config;