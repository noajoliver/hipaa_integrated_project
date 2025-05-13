const express = require('express');
const router = express.Router();
const riskController = require('../controllers/risk.controller');
const { authJwt } = require('../middleware');

// Apply authentication middleware to all routes
router.use(authJwt.verifyToken);

// Risk assessment routes
router.get('/assessments', riskController.getAllRiskAssessments);
router.get('/assessments/:id', riskController.getRiskAssessmentById);
router.post('/assessments', [authJwt.isComplianceOfficer], riskController.createRiskAssessment);
router.put('/assessments/:id', [authJwt.isComplianceOfficer], riskController.updateRiskAssessment);
router.post('/assessments/:id/approve', [authJwt.isComplianceOfficer], riskController.approveRiskAssessment);
router.delete('/assessments/:id', [authJwt.isComplianceOfficer], riskController.deleteRiskAssessment);

// Risk item routes
router.get('/assessments/:assessmentId/items', riskController.getRiskItemsByAssessment);
router.get('/items/:id', riskController.getRiskItemById);
router.post('/items', [authJwt.isComplianceOfficer], riskController.createRiskItem);
router.put('/items/:id', [authJwt.isComplianceOfficer], riskController.updateRiskItem);
router.delete('/items/:id', [authJwt.isComplianceOfficer], riskController.deleteRiskItem);

// Statistics route
router.get('/statistics', riskController.getRiskStatistics);

module.exports = router;
