const express = require('express');
const router = express.Router();
const incidentController = require('../controllers/incident.controller');
const { authJwt, pagination } = require('../middleware');
const { validateIdParam } = require('../middleware/validation');

// Apply authentication middleware to all routes
router.use(authJwt.verifyToken);

// Statistics route - MUST come before /:id routes
router.get('/statistics/summary', incidentController.getIncidentStatistics);

// Incident routes - add pagination to list endpoints
router.get('/', pagination, incidentController.getAllIncidents);
router.get('/:id', validateIdParam('id'), incidentController.getIncidentById);
router.post('/', incidentController.createIncident);
router.put('/:id', [authJwt.isComplianceOfficer, validateIdParam('id')], incidentController.updateIncident);
router.delete('/:id', [authJwt.isComplianceOfficer, validateIdParam('id')], incidentController.deleteIncident);

// Breach determination and notification routes
router.post('/:id/breach-determination', [authJwt.isComplianceOfficer, validateIdParam('id')], incidentController.makeBreachDetermination);
router.post('/:id/breach-notification', [authJwt.isComplianceOfficer, validateIdParam('id')], incidentController.recordBreachNotification);

// Incident update routes - add pagination for list endpoints
router.get('/:id/updates', [validateIdParam('id'), pagination], incidentController.getIncidentUpdates);
router.post('/:id/updates', validateIdParam('id'), incidentController.addIncidentUpdate);

module.exports = router;
