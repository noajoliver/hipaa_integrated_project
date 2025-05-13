const express = require('express');
const router = express.Router();
const trainingController = require('../controllers/training.controller');
const { authJwt } = require('../middleware');

// Apply authentication middleware to all routes
router.use(authJwt.verifyToken);

// Course routes
router.get('/courses', trainingController.getAllCourses);
router.get('/courses/:id', trainingController.getCourseById);
router.post('/courses', [authJwt.isAdmin], trainingController.createCourse);
router.put('/courses/:id', [authJwt.isAdmin], trainingController.updateCourse);
router.delete('/courses/:id', [authJwt.isAdmin], trainingController.deleteCourse);

// Assignment routes
router.get('/assignments', trainingController.getAllAssignments);
router.get('/assignments/:id', trainingController.getAssignmentById);
router.get('/assignments/user/:userId', trainingController.getUserAssignments);
router.post('/assignments', [authJwt.isAdmin], trainingController.createAssignment);
router.put('/assignments/:id', trainingController.updateAssignmentStatus);
router.post('/assignments/:id/complete', trainingController.completeAssignment);

// Statistics route
router.get('/statistics', trainingController.getTrainingStatistics);

module.exports = router;
