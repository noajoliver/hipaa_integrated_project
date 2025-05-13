/**
 * Compression Middleware - Reduces response size
 * @module middleware/compression
 */
const compression = require('compression');

/**
 * Determines if compression should be applied based on request and response
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @returns {Boolean} Whether to compress response
 */
const shouldCompress = (req, res) => {
  // Don't compress if client doesn't accept gzip
  if (req.headers['accept-encoding'] && !req.headers['accept-encoding'].includes('gzip')) {
    return false;
  }
  
  // Don't compress already compressed responses (images, videos, etc.)
  const contentType = res.getHeader('Content-Type') || '';
  if (
    contentType.includes('image/') ||
    contentType.includes('video/') ||
    contentType.includes('audio/') ||
    contentType.includes('application/zip') ||
    contentType.includes('application/gzip') ||
    contentType.includes('application/x-gzip') ||
    contentType.includes('application/pdf')
  ) {
    return false;
  }
  
  // Default to compression
  return true;
};

/**
 * Configures compression middleware with optimal settings
 * @returns {Function} Configured compression middleware
 */
const compressionMiddleware = () => {
  return compression({
    // Custom filter function
    filter: shouldCompress,
    // Compression level (1 = fastest, 9 = best compression)
    level: 6,
    // Minimum size threshold in bytes to compress response
    threshold: 1024, // Don't compress responses smaller than 1KB
    // The maximum length of the request body that compression is attempted on (15 MB)
    chunkSize: 16 * 1024
  });
};

module.exports = compressionMiddleware;