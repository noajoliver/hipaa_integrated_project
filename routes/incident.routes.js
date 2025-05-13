const express = require('express');
const router = express.Router();
const incidentController = require('../controllers/incident.controller');
const { authJwt, pagination } = require('../middleware');

// Apply authentication middleware to all routes
router.use(authJwt.verifyToken);

// Incident routes - add pagination to list endpoints
router.get('/', pagination, incidentController.getAllIncidents);
router.get('/:id', incidentController.getIncidentById);
router.post('/', incidentController.createIncident);
router.put('/:id', [authJwt.isComplianceOfficer], incidentController.updateIncident);
router.delete('/:id', [authJwt.isComplianceOfficer], incidentController.deleteIncident);

// Breach determination and notification routes
router.post('/:id/breach-determination', [authJwt.isComplianceOfficer], incidentController.makeBreachDetermination);
router.post('/:id/breach-notification', [authJwt.isComplianceOfficer], incidentController.recordBreachNotification);

// Incident update routes - add pagination for list endpoints
router.get('/:id/updates', pagination, incidentController.getIncidentUpdates);
router.post('/:id/updates', incidentController.addIncidentUpdate);

// Statistics route
router.get('/statistics/summary', incidentController.getIncidentStatistics);

module.exports = router;
