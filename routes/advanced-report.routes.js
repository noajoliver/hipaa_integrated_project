const express = require('express');
const router = express.Router();
const advancedReportController = require('../controllers/advanced-report.controller');
const { authJwt } = require('../middleware');

// Apply authentication middleware to all routes
router.use(authJwt.verifyToken);

// Only compliance officers and admins can access advanced reports
router.use(authJwt.isComplianceOfficerOrAdmin);

// Report routes
router.get('/types', advancedReportController.getReportTypes);
router.post('/comprehensive', advancedReportController.generateComprehensiveReport);
router.post('/executive-summary', advancedReportController.generateExecutiveSummaryReport);
router.post('/custom', advancedReportController.generateCustomReport);

module.exports = router;
