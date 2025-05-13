const express = require('express');
const router = express.Router();

// Root API endpoint
router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'HIPAA Compliance Tool API',
    version: '1.0.0',
    endpoints: [
      '/auth',
      '/users',
      '/training',
      '/documents',
      '/compliance',
      '/reports',
      '/risk',
      '/incidents',
      '/audit',
      '/advanced-reports',
      '/health'
    ]
  });
});

// Health check endpoint for Docker and monitoring
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date(),
    uptime: process.uptime(),
    message: 'HIPAA Compliance Tool API is running'
  });
});

module.exports = router;
