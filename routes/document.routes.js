/**
 * Document Routes - Defines API routes for document-related operations
 * @module routes/document
 */
const express = require('express');
const router = express.Router();
const documentController = require('../controllers/document.controller');
const { authJwt, pagination } = require('../middleware');

/**
 * Apply authentication middleware to all document routes
 * @name verifyToken
 * @function
 * @memberof module:routes/document
 */
router.use(authJwt.verifyToken);

/**
 * Document CRUD routes
 * @name document-routes
 * @memberof module:routes/document
 */

/**
 * GET /api/documents - Get all documents with pagination
 * @name GetAllDocuments
 * @function
 * @memberof module:routes/document
 * @inner
 */
router.get('/', pagination, documentController.getAllDocuments);

/**
 * GET /api/documents/:id - Get a document by ID
 * @name GetDocumentById
 * @function
 * @memberof module:routes/document
 * @inner
 */
router.get('/:id', documentController.getDocumentById);

/**
 * POST /api/documents - Create a new document
 * @name CreateDocument
 * @function
 * @memberof module:routes/document
 * @inner
 * @requires isComplianceOfficer - Role-based access control middleware
 */
router.post('/', [authJwt.isComplianceOfficer], documentController.createDocument);

/**
 * PUT /api/documents/:id - Update a document
 * @name UpdateDocument
 * @function
 * @memberof module:routes/document
 * @inner
 * @requires isComplianceOfficer - Role-based access control middleware
 */
router.put('/:id', [authJwt.isComplianceOfficer], documentController.updateDocument);

/**
 * DELETE /api/documents/:id - Delete (archive) a document
 * @name DeleteDocument
 * @function
 * @memberof module:routes/document
 * @inner
 * @requires isComplianceOfficer - Role-based access control middleware
 */
router.delete('/:id', [authJwt.isComplianceOfficer], documentController.deleteDocument);

/**
 * Document category routes
 * @name category-routes
 * @memberof module:routes/document
 */

/**
 * GET /api/documents/categories - Get all document categories
 * @name GetAllCategories
 * @function
 * @memberof module:routes/document
 * @inner
 */
router.get('/categories', documentController.getAllCategories);

/**
 * POST /api/documents/categories - Create a new document category
 * @name CreateCategory
 * @function
 * @memberof module:routes/document
 * @inner
 * @requires isComplianceOfficer - Role-based access control middleware
 */
router.post('/categories', [authJwt.isComplianceOfficer], documentController.createCategory);

/**
 * Document acknowledgment routes
 * @name acknowledgment-routes
 * @memberof module:routes/document
 */

/**
 * POST /api/documents/:documentId/acknowledge - Acknowledge a document
 * @name AcknowledgeDocument
 * @function
 * @memberof module:routes/document
 * @inner
 */
router.post('/:documentId/acknowledge', documentController.acknowledgeDocument);

/**
 * GET /api/documents/:documentId/acknowledgments - Get all acknowledgments for a document
 * @name GetDocumentAcknowledgments
 * @function
 * @memberof module:routes/document
 * @inner
 */
router.get('/:documentId/acknowledgments', pagination, documentController.getDocumentAcknowledgments);

/**
 * GET /api/documents/user/acknowledgments - Get current user's document acknowledgments
 * @name GetUserAcknowledgments
 * @function
 * @memberof module:routes/document
 * @inner
 */
router.get('/user/acknowledgments', pagination, documentController.getUserAcknowledgments);

/**
 * GET /api/documents/requiring/acknowledgment - Get documents requiring acknowledgment
 * @name GetDocumentsRequiringAcknowledgment
 * @function
 * @memberof module:routes/document
 * @inner
 */
router.get('/requiring/acknowledgment', pagination, documentController.getDocumentsRequiringAcknowledgment);

/**
 * Document statistics route
 * @name statistics-route
 * @memberof module:routes/document
 */

/**
 * GET /api/documents/statistics - Get document statistics
 * @name GetDocumentStatistics
 * @function
 * @memberof module:routes/document
 * @inner
 */
router.get('/statistics', documentController.getDocumentStatistics);

module.exports = router;
