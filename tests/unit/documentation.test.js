/**
 * Unit tests for Phase 6 documentation improvements
 * These tests validate the JSDoc comments and API documentation
 * @module tests/unit/documentation
 */
const fs = require('fs');
const path = require('path');

describe('Documentation Quality (Phase 6)', () => {
  
  describe('JSDoc Documentation', () => {
    
    it('should have proper JSDoc comments in document.model.js', () => {
      const filePath = path.join(__dirname, '../../models/document.model.js');
      const fileContent = fs.readFileSync(filePath, 'utf8');
      
      // Check for @module tag
      expect(fileContent).toContain('@module models/document');
      
      // Check for @class tag
      expect(fileContent).toContain('@class Document');
      
      // Check for @property tags
      expect(fileContent).toContain('@property {number} id');
      expect(fileContent).toContain('@property {string} title');
      
      // Check for method documentation
      expect(fileContent).toContain('@method associate');
    });
    
    it('should have proper JSDoc comments in document.controller.js', () => {
      const filePath = path.join(__dirname, '../../controllers/document.controller.js');
      const fileContent = fs.readFileSync(filePath, 'utf8');
      
      // Check for @module tag
      expect(fileContent).toContain('@module controllers/document');
      
      // Check for function documentation
      expect(fileContent).toContain('@function getAllDocuments');
      expect(fileContent).toContain('@function getDocumentById');
      expect(fileContent).toContain('@function createDocument');
      
      // Check for route information
      expect(fileContent).toContain('@route GET /api/documents');
      expect(fileContent).toContain('@route POST /api/documents');
      
      // Check for parameter documentation
      expect(fileContent).toContain('@param {Object} req');
      expect(fileContent).toContain('@param {Object} res');
    });
    
    it('should have proper JSDoc comments in user.controller.js', () => {
      const filePath = path.join(__dirname, '../../controllers/user.controller.js');
      const fileContent = fs.readFileSync(filePath, 'utf8');
      
      // Check for @module tag
      expect(fileContent).toContain('@module controllers/user');
      
      // Check for function documentation
      expect(fileContent).toContain('@function getAllUsers');
      
      // Check for parameter documentation
      expect(fileContent).toContain('@param {Object} req');
      expect(fileContent).toContain('@param {Object} res');
    });
  });
  
  describe('API Documentation', () => {
    
    it('should have OpenAPI documentation for document management', () => {
      const filePath = path.join(__dirname, '../../api_documentation/document_api.json');
      expect(fs.existsSync(filePath)).toBe(true);
      
      const apiDoc = require(filePath);
      
      // Validate OpenAPI structure
      expect(apiDoc).toHaveProperty('openapi');
      expect(apiDoc).toHaveProperty('info');
      expect(apiDoc).toHaveProperty('paths');
      
      // Check document endpoints
      expect(apiDoc.paths).toHaveProperty('/documents');
      expect(apiDoc.paths).toHaveProperty('/documents/{id}');
      
      // Check schemas
      expect(apiDoc.components.schemas).toHaveProperty('Document');
      expect(apiDoc.components.schemas).toHaveProperty('DocumentCategory');
      expect(apiDoc.components.schemas).toHaveProperty('DocumentAcknowledgment');
    });
    
    it('should have OpenAPI documentation for authentication', () => {
      const filePath = path.join(__dirname, '../../api_documentation/authentication/auth_api.json');
      expect(fs.existsSync(filePath)).toBe(true);
      
      const apiDoc = require(filePath);
      
      // Validate OpenAPI structure
      expect(apiDoc).toHaveProperty('openapi');
      expect(apiDoc).toHaveProperty('info');
      expect(apiDoc).toHaveProperty('paths');
      
      // Check authentication endpoints
      expect(apiDoc.paths).toHaveProperty('/auth/login');
      expect(apiDoc.paths).toHaveProperty('/auth/logout');
      
      // Check MFA endpoints
      expect(apiDoc.paths).toHaveProperty('/auth/mfa/setup');
      expect(apiDoc.paths).toHaveProperty('/auth/mfa/verify');
    });
    
    it('should have a documentation index file', () => {
      const filePath = path.join(__dirname, '../../api_documentation/index.json');
      expect(fs.existsSync(filePath)).toBe(true);
      
      const apiDoc = require(filePath);
      
      // Validate main index structure
      expect(apiDoc).toHaveProperty('openapi');
      expect(apiDoc).toHaveProperty('info');
      expect(apiDoc).toHaveProperty('tags');
      
      // Check for tags/documentation sections
      const tagNames = apiDoc.tags.map(tag => tag.name);
      expect(tagNames).toContain('Authentication');
      expect(tagNames).toContain('Documents');
      expect(tagNames).toContain('Users');
    });
  });
  
  describe('Documentation Summary', () => {
    
    it('should have a Phase 6 documentation summary', () => {
      const filePath = path.join(__dirname, '../../phase6-documentation-summary.md');
      expect(fs.existsSync(filePath)).toBe(true);
      
      const fileContent = fs.readFileSync(filePath, 'utf8');
      
      // Check for main sections
      expect(fileContent).toContain('# Phase 6: Documentation and Maintainability');
      expect(fileContent).toContain('## Documentation Enhancements');
      expect(fileContent).toContain('## Maintainability Improvements');
      
      // Check for content details
      expect(fileContent).toContain('JSDoc Documentation');
      expect(fileContent).toContain('API Documentation');
      expect(fileContent).toContain('OpenAPI');
    });
  });
});