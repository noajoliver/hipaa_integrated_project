const express = require('express');
const router = express.Router();
const reportController = require('../controllers/report.controller');
const { authJwt } = require('../middleware');

// Apply authentication middleware to all routes
router.use(authJwt.verifyToken);

// Dashboard metrics
router.get('/dashboard-metrics', reportController.getDashboardMetrics);

// Training status by department
router.get('/training-by-department', reportController.getTrainingStatusByDepartment);

// Compliance status by category
router.get('/compliance-by-category', reportController.getComplianceStatusByCategory);

// Document acknowledgment status
router.get('/document-acknowledgments', reportController.getDocumentAcknowledgmentStatus);

// Upcoming due dates
router.get('/upcoming-due-dates', reportController.getUpcomingDueDates);

// Generate compliance report
router.post('/generate-compliance-report', reportController.generateComplianceReport);

module.exports = router;
