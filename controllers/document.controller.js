/**
 * Document Controller - Handles HTTP requests for document-related operations
 * @module controllers/document
 */
const { Document, DocumentCategory, DocumentAcknowledgment, User, sequelize } = require('../models');
const { Op } = require('sequelize');
const fs = require('fs');
const path = require('path');

/**
 * Get all active documents
 * @async
 * @function getAllDocuments
 *
 * @route GET /api/documents
 * @access Private
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 *
 * @returns {Object} JSON response with array of documents
 * @throws {Error} If retrieval fails
 */
exports.getAllDocuments = async (req, res) => {
  try {
    // Get pagination parameters from middleware
    const { limit, offset, page } = req.pagination || { limit: 20, offset: 0, page: 1 };

    const { count, rows: documents } = await Document.findAndCountAll({
      where: {
        status: {
          [Op.ne]: 'archived'
        }
      },
      include: [
        {
          model: DocumentCategory,
          as: 'category'
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName']
        }
      ],
      limit,
      offset,
      order: [['title', 'ASC']]
    });

    // Calculate pagination metadata
    const totalPages = Math.ceil(count / limit);

    return res.status(200).json({
      success: true,
      data: documents,
      pagination: {
        page,
        limit,
        total: count,
        totalPages
      }
    });
  } catch (error) {
    console.error('Error getting documents:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve documents',
      error: error.message
    });
  }
};

/**
 * Get document by ID
 * @async
 * @function getDocumentById
 *
 * @route GET /api/documents/:id
 * @access Private
 *
 * @param {Object} req - Express request object
 * @param {Object} req.params - Request parameters
 * @param {string} req.params.id - Document ID to retrieve
 * @param {Object} res - Express response object
 *
 * @returns {Object} JSON response with document data
 * @throws {Error} If document not found or retrieval fails
 */
exports.getDocumentById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const document = await Document.findByPk(id, {
      include: [
        {
          model: DocumentCategory,
          as: 'category'
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName']
        }
      ]
    });
    
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: document
    });
  } catch (error) {
    console.error('Error getting document:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve document',
      error: error.message
    });
  }
};

/**
 * Create a new document
 * @async
 * @function createDocument
 *
 * @route POST /api/documents
 * @access Private
 *
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body containing document data
 * @param {string} req.body.title - Title of the document
 * @param {string} [req.body.description] - Description of the document
 * @param {number} [req.body.categoryId] - ID of the document category
 * @param {string} [req.body.version] - Version of the document (defaults to '1.0')
 * @param {string} [req.body.documentType] - Type of document (policy, procedure, etc.)
 * @param {string} [req.body.hipaaCategory] - HIPAA category of the document
 * @param {string} [req.body.reviewDate] - Date when document should be reviewed
 * @param {Object} req.file - Uploaded file information (if provided)
 * @param {Object} req.user - Authenticated user information
 * @param {number} req.user.id - ID of the authenticated user (creator)
 * @param {Object} res - Express response object
 *
 * @returns {Object} JSON response with newly created document data
 * @throws {Error} If creation fails or validation errors occur
 */
exports.createDocument = async (req, res) => {
  try {
    const {
      title,
      description,
      categoryId,
      version,
      documentType,
      hipaaCategory,
      reviewDate
    } = req.body;

    // Validate required fields
    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'Title is required'
      });
    }

    if (!description) {
      return res.status(400).json({
        success: false,
        message: 'Description is required'
      });
    }

    // Validate documentType enum
    const validDocumentTypes = ['policy', 'procedure', 'form', 'template', 'reference', 'other'];
    if (documentType && !validDocumentTypes.includes(documentType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid documentType. Must be one of: ${validDocumentTypes.join(', ')}`
      });
    }

    // Validate hipaaCategory enum
    const validHipaaCategories = ['privacy', 'security', 'breach_notification', 'general', 'other'];
    if (hipaaCategory && !validHipaaCategories.includes(hipaaCategory)) {
      return res.status(400).json({
        success: false,
        message: `Invalid hipaaCategory. Must be one of: ${validHipaaCategories.join(', ')}`
      });
    }

    // Validate categoryId if provided
    if (categoryId) {
      const category = await DocumentCategory.findByPk(categoryId);
      if (!category) {
        return res.status(400).json({
          success: false,
          message: 'Invalid categoryId: Document category not found'
        });
      }
    }

    // Handle file upload if present
    let filePath = null;
    if (req.file) {
      filePath = `/uploads/documents/${req.file.filename}`;
    }

    // Get the current user from auth middleware
    const createdBy = req.user.id;

    const newDocument = await Document.create({
      title,
      description,
      categoryId,
      filePath,
      version: version || '1.0',
      status: 'active',
      reviewDate: reviewDate ? new Date(reviewDate) : null,
      documentType: documentType || 'policy',
      hipaaCategory: hipaaCategory || 'general',
      createdBy
    });

    return res.status(201).json({
      success: true,
      message: 'Document created successfully',
      data: newDocument
    });
  } catch (error) {
    console.error('Error creating document:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create document',
      error: error.message
    });
  }
};

/**
 * Update a document
 * @async
 * @function updateDocument
 *
 * @route PUT /api/documents/:id
 * @access Private
 *
 * @param {Object} req - Express request object
 * @param {Object} req.params - Request parameters
 * @param {string} req.params.id - Document ID to update
 * @param {Object} req.body - Request body containing document data to update
 * @param {string} [req.body.title] - Updated title of the document
 * @param {string} [req.body.description] - Updated description of the document
 * @param {number} [req.body.categoryId] - Updated category ID
 * @param {string} [req.body.version] - Updated version number
 * @param {string} [req.body.status] - Updated status (draft, active, archived)
 * @param {string} [req.body.documentType] - Updated document type
 * @param {string} [req.body.hipaaCategory] - Updated HIPAA category
 * @param {string} [req.body.reviewDate] - Updated review date
 * @param {Object} [req.file] - Updated file information (if provided)
 * @param {Object} res - Express response object
 *
 * @returns {Object} JSON response with updated document data
 * @throws {Error} If document not found or update fails
 */
exports.updateDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      title, 
      description, 
      categoryId, 
      version, 
      status,
      documentType, 
      hipaaCategory,
      reviewDate
    } = req.body;
    
    const document = await Document.findByPk(id);
    
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }
    
    // Handle file upload if present
    let filePath = document.filePath;
    if (req.file) {
      // Delete old file if exists
      if (document.filePath) {
        const oldFilePath = path.join(__dirname, '..', document.filePath);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }
      filePath = `/uploads/documents/${req.file.filename}`;
    }
    
    // Update document
    await document.update({
      title: title || document.title,
      description: description !== undefined ? description : document.description,
      categoryId: categoryId || document.categoryId,
      filePath,
      version: version || document.version,
      status: status || document.status,
      reviewDate: reviewDate ? new Date(reviewDate) : document.reviewDate,
      documentType: documentType || document.documentType,
      hipaaCategory: hipaaCategory || document.hipaaCategory
    });
    
    return res.status(200).json({
      success: true,
      message: 'Document updated successfully',
      data: document
    });
  } catch (error) {
    console.error('Error updating document:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update document',
      error: error.message
    });
  }
};

/**
 * Delete a document (soft delete by archiving)
 * @async
 * @function deleteDocument
 *
 * @route DELETE /api/documents/:id
 * @access Private
 *
 * @param {Object} req - Express request object
 * @param {Object} req.params - Request parameters
 * @param {string} req.params.id - Document ID to delete/archive
 * @param {Object} res - Express response object
 *
 * @returns {Object} JSON response with success message
 * @throws {Error} If document not found or archiving fails
 */
exports.deleteDocument = async (req, res) => {
  try {
    const { id } = req.params;

    const document = await Document.findByPk(id);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Soft delete the document (sets deletedAt timestamp)
    await document.destroy();

    return res.status(200).json({
      success: true,
      message: 'Document deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting document:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete document',
      error: error.message
    });
  }
};

/**
 * Get all document categories
 * @async
 * @function getAllCategories
 *
 * @route GET /api/documents/categories
 * @access Private
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 *
 * @returns {Object} JSON response with array of document categories
 * @throws {Error} If retrieval fails
 */
exports.getAllCategories = async (req, res) => {
  try {
    const categories = await DocumentCategory.findAll({
      include: [
        {
          model: DocumentCategory,
          as: 'parent'
        }
      ],
      order: [['name', 'ASC']]
    });
    
    return res.status(200).json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Error getting document categories:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve document categories',
      error: error.message
    });
  }
};

/**
 * Create a new document category
 * @async
 * @function createCategory
 *
 * @route POST /api/documents/categories
 * @access Private
 *
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body containing category data
 * @param {string} req.body.name - Name of the new category
 * @param {string} [req.body.description] - Description of the new category
 * @param {number} [req.body.parentId] - Parent category ID if this is a subcategory
 * @param {Object} res - Express response object
 *
 * @returns {Object} JSON response with newly created category data
 * @throws {Error} If creation fails or validation errors occur
 */
exports.createCategory = async (req, res) => {
  try {
    const { name, description, parentId } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Name is required'
      });
    }

    // Check for duplicate category name
    const existingCategory = await DocumentCategory.findOne({
      where: { name }
    });

    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: 'Category with this name already exists'
      });
    }

    const newCategory = await DocumentCategory.create({
      name,
      description,
      parentId
    });

    return res.status(201).json({
      success: true,
      message: 'Document category created successfully',
      data: newCategory
    });
  } catch (error) {
    console.error('Error creating document category:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create document category',
      error: error.message
    });
  }
};

/**
 * Acknowledge a document by user
 * @async
 * @function acknowledgeDocument
 *
 * @route POST /api/documents/:documentId/acknowledge
 * @access Private
 *
 * @param {Object} req - Express request object
 * @param {Object} req.params - Request parameters
 * @param {string} req.params.documentId - Document ID to acknowledge
 * @param {Object} req.body - Request body
 * @param {string} [req.body.notes] - Notes regarding the acknowledgment
 * @param {Object} req.user - Authenticated user information
 * @param {number} req.user.id - ID of the authenticated user
 * @param {Object} res - Express response object
 *
 * @returns {Object} JSON response with acknowledgment data
 * @throws {Error} If document not found, already acknowledged, or operation fails
 */
exports.acknowledgeDocument = async (req, res) => {
  try {
    const { documentId } = req.params;
    const { notes } = req.body;
    const userId = req.user.id;
    
    // Check if document exists
    const document = await Document.findByPk(documentId);
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }
    
    // Check if already acknowledged
    const existingAcknowledgment = await DocumentAcknowledgment.findOne({
      where: {
        documentId,
        userId
      }
    });
    
    if (existingAcknowledgment) {
      return res.status(400).json({
        success: false,
        message: 'Document already acknowledged'
      });
    }
    
    // Create acknowledgment
    const acknowledgment = await DocumentAcknowledgment.create({
      documentId,
      userId,
      acknowledgmentDate: new Date(),
      ipAddress: req.ip,
      notes
    });
    
    return res.status(201).json({
      success: true,
      message: 'Document acknowledged successfully',
      data: acknowledgment
    });
  } catch (error) {
    console.error('Error acknowledging document:', error);

    // Handle unique constraint violation (concurrent acknowledgment attempts)
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        success: false,
        message: 'Document already acknowledged'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to acknowledge document',
      error: error.message
    });
  }
};

/**
 * Get all acknowledgments for a specific document
 * @async
 * @function getDocumentAcknowledgments
 *
 * @route GET /api/documents/:documentId/acknowledgments
 * @access Private
 *
 * @param {Object} req - Express request object
 * @param {Object} req.params - Request parameters
 * @param {string} req.params.documentId - Document ID to get acknowledgments for
 * @param {Object} res - Express response object
 *
 * @returns {Object} JSON response with array of document acknowledgments
 * @throws {Error} If document not found or retrieval fails
 */
exports.getDocumentAcknowledgments = async (req, res) => {
  try {
    const { documentId } = req.params;

    // Check if document exists
    const document = await Document.findByPk(documentId);
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Get pagination parameters from middleware
    const { limit, offset, page } = req.pagination || { limit: 20, offset: 0, page: 1 };

    const { count, rows: acknowledgments } = await DocumentAcknowledgment.findAndCountAll({
      where: { documentId },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ],
      limit,
      offset,
      order: [['acknowledgmentDate', 'DESC']]
    });

    // Calculate pagination metadata
    const totalPages = Math.ceil(count / limit);

    return res.status(200).json({
      success: true,
      data: acknowledgments,
      pagination: {
        page,
        limit,
        total: count,
        totalPages
      }
    });
  } catch (error) {
    console.error('Error getting document acknowledgments:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve document acknowledgments',
      error: error.message
    });
  }
};

/**
 * Get all document acknowledgments for the current user
 * @async
 * @function getUserAcknowledgments
 *
 * @route GET /api/documents/user/acknowledgments
 * @access Private
 *
 * @param {Object} req - Express request object
 * @param {Object} req.user - Authenticated user information
 * @param {number} req.user.id - ID of the authenticated user
 * @param {Object} res - Express response object
 *
 * @returns {Object} JSON response with array of user's document acknowledgments
 * @throws {Error} If retrieval fails
 */
exports.getUserAcknowledgments = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const acknowledgments = await DocumentAcknowledgment.findAll({
      where: { userId },
      include: [
        {
          model: Document,
          as: 'document',
          include: [
            {
              model: DocumentCategory,
              as: 'category'
            }
          ]
        }
      ],
      order: [['acknowledgmentDate', 'DESC']]
    });
    
    return res.status(200).json({
      success: true,
      data: acknowledgments
    });
  } catch (error) {
    console.error('Error getting user document acknowledgments:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve user document acknowledgments',
      error: error.message
    });
  }
};

/**
 * Get all documents requiring acknowledgment by the current user
 * @async
 * @function getDocumentsRequiringAcknowledgment
 *
 * @route GET /api/documents/requiring-acknowledgment
 * @access Private
 *
 * @param {Object} req - Express request object
 * @param {Object} req.user - Authenticated user information
 * @param {number} req.user.id - ID of the authenticated user
 * @param {Object} [req.pagination] - Pagination information from middleware
 * @param {number} [req.pagination.page] - Current page number
 * @param {number} [req.pagination.limit] - Number of items per page
 * @param {number} [req.pagination.offset] - Offset for pagination
 * @param {Object} res - Express response object
 *
 * @returns {Object} JSON response with array of documents requiring acknowledgment
 * @throws {Error} If retrieval fails
 */
exports.getDocumentsRequiringAcknowledgment = async (req, res) => {
  try {
    const userId = req.user.id;
    const { Op, literal, fn, col } = require('sequelize');

    // Get documents requiring acknowledgment - optimized query to avoid N+1 problem
    // This uses a LEFT JOIN with subquery to check for acknowledgments in a single query
    const documentsRequiringAcknowledgment = await Document.findAll({
      where: {
        status: 'active',
        // Use a correlated subquery to check if this document has been acknowledged
        id: {
          [Op.notIn]: literal(`(
            SELECT "documentId"
            FROM "document_acknowledgments"
            WHERE "userId" = ${userId}
          )`)
        }
      },
      include: [
        {
          model: DocumentCategory,
          as: 'category'
        }
      ],
      // Add pagination
      ...(req.pagination && {
        limit: req.pagination.limit,
        offset: req.pagination.offset
      })
    });

    // Get total count for pagination
    const totalCount = await Document.count({
      where: {
        status: 'active',
        id: {
          [Op.notIn]: literal(`(
            SELECT "documentId"
            FROM "document_acknowledgments"
            WHERE "userId" = ${userId}
          )`)
        }
      }
    });

    return res.status(200).json({
      success: true,
      data: documentsRequiringAcknowledgment,
      meta: req.pagination ? {
        total: totalCount,
        page: req.pagination.page,
        limit: req.pagination.limit,
        totalPages: Math.ceil(totalCount / req.pagination.limit)
      } : undefined
    });
  } catch (error) {
    console.error('Error getting documents requiring acknowledgment:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve documents requiring acknowledgment',
      error: error.message
    });
  }
};

/**
 * Get document statistics
 * @async
 * @function getDocumentStatistics
 *
 * @route GET /api/documents/statistics
 * @access Private/Admin
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 *
 * @returns {Object} JSON response with document statistics data
 * @throws {Error} If retrieval fails
 */
exports.getDocumentStatistics = async (req, res) => {
  try {
    // Total documents (all statuses)
    const totalDocuments = await Document.count();

    // Active documents only
    const activeDocuments = await Document.count({
      where: { status: 'active' }
    });

    // Documents by type
    const documentsByType = await Document.findAll({
      attributes: [
        'documentType',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where: { status: 'active' },
      group: ['documentType']
    });

    // Documents by HIPAA category
    const documentsByCategory = await Document.findAll({
      attributes: [
        'hipaaCategory',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where: { status: 'active' },
      group: ['hipaaCategory']
    });

    // Documents requiring review
    const documentsRequiringReview = await Document.count({
      where: {
        status: 'active',
        reviewDate: {
          [Op.lt]: new Date()
        }
      }
    });

    // Total acknowledgments
    const totalAcknowledgments = await DocumentAcknowledgment.count();

    return res.status(200).json({
      success: true,
      data: {
        totalDocuments,
        activeDocuments,
        documentsByType,
        documentsByCategory,
        documentsRequiringReview,
        totalAcknowledgments
      }
    });
  } catch (error) {
    console.error('Error getting document statistics:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve document statistics',
      error: error.message
    });
  }
};
