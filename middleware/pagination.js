/**
 * Pagination Middleware
 * 
 * This middleware extracts pagination parameters from the request
 * and attaches them to the request object for use by controllers.
 * 
 * @module middleware/pagination
 */

/**
 * Middleware function to process pagination parameters
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const paginationMiddleware = (req, res, next) => {
  try {
    // Extract page and limit from query parameters
    const page = parseInt(req.query.page, 10) || 1;
    
    // Default limit is 20, but can be overridden
    // Max limit is 100 to prevent excessive data transfer
    const requestedLimit = parseInt(req.query.limit, 10) || 20;
    const limit = Math.min(requestedLimit, 100);
    
    // Calculate offset
    const offset = (page - 1) * limit;
    
    // Sort parameters
    const sortField = req.query.sortBy || 'createdAt';
    const sortDirection = req.query.sortDir?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    
    // Attach pagination parameters to request object
    req.pagination = {
      page,
      limit,
      offset,
      sortField,
      sortDirection
    };
    
    next();
  } catch (error) {
    console.error('Error in pagination middleware:', error);
    // Continue processing even if pagination fails
    // Default values will be used by controllers
    req.pagination = {
      page: 1,
      limit: 20,
      offset: 0,
      sortField: 'createdAt',
      sortDirection: 'DESC'
    };
    next();
  }
};

module.exports = paginationMiddleware;