const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { authJwt } = require('../middleware');

// Apply authentication middleware to all routes
router.use(authJwt.verifyToken);

// Role routes - must come before /:id routes
router.get('/roles', userController.getAllRoles);
router.post('/roles', [authJwt.isAdmin], userController.createRole);

// Department routes - must come before /:id routes
router.get('/departments', userController.getAllDepartments);
router.post('/departments', [authJwt.isAdmin], userController.createDepartment);

// User routes
router.get('/', userController.getAllUsers);
router.get('/:id', userController.getUserById);
router.post('/', [authJwt.isAdmin], userController.createUser);
router.put('/:id', [authJwt.isAdmin], userController.updateUser);
router.delete('/:id', [authJwt.isAdmin], userController.deleteUser);

module.exports = router;
