/**
 * Logger - Centralized logging utility for the application
 * @module utils/logger
 */
const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define log level based on environment
const level = () => {
  const env = process.env.NODE_ENV || 'development';
  const isDevelopment = env === 'development';
  return isDevelopment ? 'debug' : 'http';
};

// Define log colors
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

// Add colors to winston
winston.addColors(colors);

// Define log format
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp', 'label'] }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message} ${
      Object.keys(info.metadata).length ? JSON.stringify(info.metadata) : ''
    }`
  )
);

// Define transport for logs
const transports = [
  // Console transport
  new winston.transports.Console(),
  
  // File transport for all logs
  new winston.transports.File({
    filename: path.join(logsDir, 'all.log'),
    level: 'debug',
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }),
  
  // File transport for error logs
  new winston.transports.File({
    filename: path.join(logsDir, 'error.log'),
    level: 'error',
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }),
];

// Create winston logger
const logger = winston.createLogger({
  level: level(),
  levels,
  format,
  transports,
  exceptionHandlers: [
    new winston.transports.File({ filename: path.join(logsDir, 'exceptions.log') })
  ],
  rejectionHandlers: [
    new winston.transports.File({ filename: path.join(logsDir, 'rejections.log') })
  ]
});

/**
 * Log request details for HTTP requests
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const httpLogger = (req, res, next) => {
  // Don't log health checks and static assets to reduce noise
  if (req.path.startsWith('/health') || req.path.startsWith('/public')) {
    return next();
  }
  
  // Track request timing
  const start = Date.now();
  
  // Log when the request completes
  res.on('finish', () => {
    const duration = Date.now() - start;
    const message = `${req.method} ${req.url} ${res.statusCode} - ${duration}ms`;
    
    // Log with appropriate level based on status code
    if (res.statusCode >= 500) {
      logger.error(message, { 
        ip: req.ip, 
        user: req.user ? req.user.id : 'anonymous',
        userAgent: req.get('User-Agent')
      });
    } else if (res.statusCode >= 400) {
      logger.warn(message, { 
        ip: req.ip, 
        user: req.user ? req.user.id : 'anonymous' 
      });
    } else {
      logger.http(message);
    }
    
    // Log slow requests
    if (duration > 1000) {
      logger.warn(`SLOW REQUEST: ${message}`, { 
        duration, 
        path: req.path,
        query: req.query 
      });
    }
  });
  
  next();
};

// Performance logger for monitoring function execution time
logger.perf = (name, fn, ...args) => {
  const start = Date.now();
  const result = fn(...args);
  const duration = Date.now() - start;
  
  // Log slow operations (over 100ms)
  if (duration > 100) {
    logger.warn(`SLOW OPERATION: ${name} - ${duration}ms`);
  } else {
    logger.debug(`PERF: ${name} - ${duration}ms`);
  }
  
  return result;
};

// Async performance logger
logger.perfAsync = async (name, fn, ...args) => {
  const start = Date.now();
  const result = await fn(...args);
  const duration = Date.now() - start;
  
  // Log slow operations (over 100ms)
  if (duration > 100) {
    logger.warn(`SLOW OPERATION: ${name} - ${duration}ms`);
  } else {
    logger.debug(`PERF: ${name} - ${duration}ms`);
  }
  
  return result;
};

module.exports = {
  logger,
  httpLogger,
  // Export convenience methods
  error: logger.error.bind(logger),
  warn: logger.warn.bind(logger),
  info: logger.info.bind(logger),
  http: logger.http.bind(logger),
  debug: logger.debug.bind(logger),
  perf: logger.perf.bind(logger),
  perfAsync: logger.perfAsync.bind(logger)
};