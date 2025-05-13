const express = require('express');
const router = express.Router();
const auditController = require('../controllers/audit.controller');
const { authJwt, pagination } = require('../middleware');

// Apply authentication middleware to all routes
router.use(authJwt.verifyToken);

// Only compliance officers and admins can access audit logs
router.use([authJwt.isComplianceOfficer]);

// Audit log routes - add pagination for listing
router.get('/', pagination, auditController.getAuditLogs);
router.get('/statistics', auditController.getAuditLogStatistics);
router.get('/export', auditController.exportAuditLogs);
router.get('/filters', auditController.getAuditLogFilters);
router.get('/:id', auditController.getAuditLogById);

module.exports = router;
