const express = require('express');
const router = express.Router();
const complianceController = require('../controllers/compliance.controller');
const { authJwt } = require('../middleware');

// Apply authentication middleware to all routes
router.use(authJwt.verifyToken);

// Requirement routes
router.get('/requirements', complianceController.getAllRequirements);
router.get('/requirements/:id', complianceController.getRequirementById);
router.post('/requirements', [authJwt.isComplianceOfficer], complianceController.createRequirement);
router.put('/requirements/:id', [authJwt.isComplianceOfficer], complianceController.updateRequirement);
router.delete('/requirements/:id', [authJwt.isComplianceOfficer], complianceController.deleteRequirement);

// Assessment routes
router.get('/assessments', complianceController.getAllAssessments);
router.get('/assessments/:id', complianceController.getAssessmentById);
router.post('/assessments', [authJwt.isComplianceOfficer], complianceController.createAssessment);
router.put('/assessments/:id', [authJwt.isComplianceOfficer], complianceController.updateAssessment);

// Statistics route
router.get('/statistics', complianceController.getComplianceStatistics);

module.exports = router;
