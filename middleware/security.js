/**
 * Security Middleware - Enhanced security protections
 * @module middleware/security
 */
const crypto = require('crypto');
const ms = require('ms');

/**
 * Advanced Content Security Policy configuration
 * HIPAA compliance requires strict CSP to prevent XSS
 * 
 * @param {Object} options - CSP configuration options
 * @returns {Function} Express middleware
 */
const contentSecurityPolicy = (options = {}) => {
  return (req, res, next) => {
    // Generate random nonce for inline scripts (if enabled)
    const nonce = crypto.randomBytes(16).toString('base64');
    res.locals.cspNonce = nonce;

    // Merge default CSP directives with custom options
    const directives = {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", `'nonce-${nonce}'`],
      styleSrc: ["'self'", options.devMode ? "'unsafe-inline'" : `'nonce-${nonce}'`],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      frameAncestors: ["'none'"],
      formAction: ["'self'"],
      baseUri: ["'none'"],
      manifestSrc: ["'self'"],
      workerSrc: ["'self'"],
      ...options.directives
    };

    // Build the CSP header value
    const cspHeader = Object.entries(directives)
      .filter(([, sources]) => sources && sources.length)
      .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
      .join('; ');

    // Set CSP header based on options
    if (options.reportOnly) {
      res.setHeader('Content-Security-Policy-Report-Only', cspHeader);
    } else {
      res.setHeader('Content-Security-Policy', cspHeader);
    }

    next();
  };
};

/**
 * Strict Transport Security middleware
 * Ensures HTTPS is always used
 * 
 * @param {Object} options - HSTS configuration options
 * @returns {Function} Express middleware
 */
const strictTransportSecurity = (options = {}) => {
  const maxAge = options.maxAge || '1y'; // Default to 1 year
  const maxAgeInSeconds = Math.floor(ms(maxAge) / 1000);
  
  return (req, res, next) => {
    const headerValue = `max-age=${maxAgeInSeconds}${options.includeSubDomains ? '; includeSubDomains' : ''}${options.preload ? '; preload' : ''}`;
    res.setHeader('Strict-Transport-Security', headerValue);
    next();
  };
};

/**
 * Permissions Policy middleware
 * Restricts browser features (previously Feature-Policy)
 * 
 * @param {Object} options - Feature permissions configuration
 * @returns {Function} Express middleware
 */
const permissionsPolicy = (options = {}) => {
  // Default restrictive policy appropriate for healthcare applications
  const defaultFeatures = {
    accelerometer: [],
    'ambient-light-sensor': [],
    autoplay: [],
    battery: [],
    camera: [],
    'display-capture': [],
    'document-domain': [],
    'encrypted-media': [],
    'execution-while-not-rendered': [],
    'execution-while-out-of-viewport': [],
    fullscreen: ["'self'"],
    geolocation: [],
    gyroscope: [],
    magnetometer: [],
    microphone: [],
    midi: [],
    'navigation-override': [],
    payment: [],
    'picture-in-picture': [],
    'publickey-credentials-get': ["'self'"],
    'screen-wake-lock': [],
    'sync-xhr': ["'self'"],
    usb: [],
    ...options.features
  };

  // Build the Permissions-Policy header value
  const policyHeader = Object.entries(defaultFeatures)
    .map(([feature, allowlist]) => {
      if (allowlist.length === 0) {
        return `${feature}=()`;
      }
      return `${feature}=(${allowlist.join(' ')})`;
    })
    .join(', ');

  return (req, res, next) => {
    res.setHeader('Permissions-Policy', policyHeader);
    next();
  };
};

/**
 * HTTP Security Headers middleware
 * Sets various security-related HTTP headers
 * 
 * @returns {Function} Express middleware
 */
const securityHeaders = () => {
  return (req, res, next) => {
    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // Controls how much referrer information is included with requests
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Legacy XSS protection for older browsers
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');
    
    // Disable caching for sensitive pages
    if (req.path.includes('/api/auth/') || req.path.includes('/api/users/')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Surrogate-Control', 'no-store');
    }
    
    next();
  };
};

/**
 * Clear Site Data middleware for logout operations
 * Clears all site data when a user logs out
 * 
 * @returns {Function} Express middleware
 */
const clearSiteData = () => {
  return (req, res, next) => {
    // Set header to clear all types of site data
    res.setHeader('Clear-Site-Data', '"cache", "cookies", "storage", "executionContexts"');
    next();
  };
};

/**
 * Enhanced security middleware that applies all security measures
 * @param {Object} options - Configuration options
 * @returns {Function} Express middleware
 */
const enhancedSecurity = (options = {}) => {
  const isDev = process.env.NODE_ENV !== 'production';
  
  return (req, res, next) => {
    // Apply all security middlewares
    contentSecurityPolicy({ 
      devMode: isDev,
      reportOnly: options.reportOnlyCSP || false,
      directives: options.cspDirectives || {}
    })(req, res, () => {
      if (!isDev) {
        strictTransportSecurity({ 
          maxAge: options.hstsMaxAge || '1y',
          includeSubDomains: options.hstsIncludeSubDomains !== false,
          preload: options.hstsPreload || false
        })(req, res, () => {
          permissionsPolicy({
            features: options.permissionsPolicyFeatures || {}
          })(req, res, () => {
            securityHeaders()(req, res, next);
          });
        });
      } else {
        // Skip HSTS in development
        permissionsPolicy({
          features: options.permissionsPolicyFeatures || {}
        })(req, res, () => {
          securityHeaders()(req, res, next);
        });
      }
    });
  };
};

module.exports = {
  contentSecurityPolicy,
  strictTransportSecurity,
  permissionsPolicy,
  securityHeaders,
  clearSiteData,
  enhancedSecurity
};