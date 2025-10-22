/**
 * Document Routes - Defines API routes for document-related operations
 * @module routes/document
 */
const express = require('express');
const router = express.Router();
const documentController = require('../controllers/document.controller');
const { authJwt, pagination } = require('../middleware');
const { validateIdParam } = require('../middleware/validation');

/**
 * Apply authentication middleware to all document routes
 * @name verifyToken
 * @function
 * @memberof module:routes/document
 */
router.use(authJwt.verifyToken);

/**
 * Special routes MUST come before parameterized routes
 * These routes would otherwise match /:id pattern
 */

/**
 * GET /api/documents/categories - Get all document categories
 * @name GetAllCategories
 */
router.get('/categories', documentController.getAllCategories);

/**
 * POST /api/documents/categories - Create a new document category
 * @name CreateCategory
 */
router.post('/categories', [authJwt.isComplianceOfficer], documentController.createCategory);

/**
 * GET /api/documents/user/acknowledgments - Get current user's document acknowledgments
 * @name GetUserAcknowledgments
 */
router.get('/user/acknowledgments', pagination, documentController.getUserAcknowledgments);

/**
 * GET /api/documents/requiring/acknowledgment - Get documents requiring acknowledgment
 * @name GetDocumentsRequiringAcknowledgment
 */
router.get('/requiring/acknowledgment', pagination, documentController.getDocumentsRequiringAcknowledgment);

/**
 * GET /api/documents/statistics - Get document statistics
 * @name GetDocumentStatistics
 */
router.get('/statistics', documentController.getDocumentStatistics);

/**
 * Document CRUD routes with ID parameter
 */

/**
 * GET /api/documents - Get all documents with pagination
 * @name GetAllDocuments
 */
router.get('/', pagination, documentController.getAllDocuments);

/**
 * GET /api/documents/:id - Get a document by ID
 * @name GetDocumentById
 */
router.get('/:id', validateIdParam('id'), documentController.getDocumentById);

/**
 * POST /api/documents - Create a new document
 * @name CreateDocument
 */
router.post('/', [authJwt.isComplianceOfficer], documentController.createDocument);

/**
 * PUT /api/documents/:id - Update a document
 * @name UpdateDocument
 */
router.put('/:id', [authJwt.isComplianceOfficer, validateIdParam('id')], documentController.updateDocument);

/**
 * DELETE /api/documents/:id - Delete (archive) a document
 * @name DeleteDocument
 */
router.delete('/:id', [authJwt.isComplianceOfficer, validateIdParam('id')], documentController.deleteDocument);

/**
 * Document acknowledgment routes with documentId parameter
 */

/**
 * POST /api/documents/:documentId/acknowledge - Acknowledge a document
 * @name AcknowledgeDocument
 */
router.post('/:documentId/acknowledge', validateIdParam('documentId'), documentController.acknowledgeDocument);

/**
 * GET /api/documents/:documentId/acknowledgments - Get all acknowledgments for a document
 * @name GetDocumentAcknowledgments
 */
router.get('/:documentId/acknowledgments', [validateIdParam('documentId'), pagination], documentController.getDocumentAcknowledgments);

module.exports = router;
