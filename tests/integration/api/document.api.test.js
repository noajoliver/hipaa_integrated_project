/**
 * Document API Integration Tests
 * @module tests/integration/api/document-api
 */
const request = require('supertest');
const app = require('../../../server');
const { connect, resetAndSeed, disconnect } = require('../../utils/test-db');
const { generateToken } = require('../../../utils/token-manager');
const { User, Document, DocumentCategory, DocumentAcknowledgment, Role } = require('../../../models');

let adminToken, userToken, complianceToken, adminUser, testUser, complianceUser, testDocument, testCategory;

beforeAll(async () => {
  await connect();
  await resetAndSeed();

  // Get users and create compliance officer
  adminUser = await User.findOne({ where: { username: 'admin' } });
  testUser = await User.findOne({ where: { username: 'testuser' } });

  // Create compliance officer role and user
  let complianceRole = await Role.findOne({ where: { name: 'Compliance Officer' } });
  if (!complianceRole) {
    complianceRole = await Role.create({
      name: 'Compliance Officer',
      description: 'Compliance Officer role',
      permissions: { isComplianceOfficer: true }
    });
  }

  complianceUser = await User.create({
    username: 'compliance',
    email: 'compliance@example.com',
    password: '$2b$10$X.VhWnPjCWHv4.wZp.AXZOGJpVOdnl4JCJHKu/YMlMhh7.SCuW9hO',
    firstName: 'Compliance',
    lastName: 'Officer',
    position: 'Compliance Officer',
    roleId: complianceRole.id,
    accountStatus: 'active'
  });

  adminToken = generateToken({ id: adminUser.id, username: adminUser.username }).token;
  userToken = generateToken({ id: testUser.id, username: testUser.username }).token;
  complianceToken = generateToken({ id: complianceUser.id, username: complianceUser.username }).token;

  // Create test category
  testCategory = await DocumentCategory.create({
    name: 'Privacy Policies',
    description: 'HIPAA privacy-related policies'
  });

  // Create test document
  testDocument = await Document.create({
    title: 'HIPAA Privacy Policy',
    description: 'Organization-wide HIPAA privacy policy',
    filePath: '/documents/hipaa-privacy-policy.pdf',
    version: '1.0',
    status: 'active',
    documentType: 'policy',
    hipaaCategory: 'privacy',
    createdBy: complianceUser.id,
    categoryId: testCategory.id,
    reviewDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
  });
});

afterAll(async () => {
  await disconnect();
});

describe('Document API Endpoints', () => {
  describe('GET /api/documents', () => {
    it('should return all documents for authenticated user', async () => {
      const response = await request(app)
        .get('/api/documents')
        .set('x-access-token', userToken)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/documents?page=1&limit=10')
        .set('x-access-token', userToken)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination).toHaveProperty('page', 1);
      expect(response.body.pagination).toHaveProperty('limit', 10);
    });

    it('should reject unauthenticated requests', async () => {
      await request(app)
        .get('/api/documents')
        .expect(401);
    });
  });

  describe('GET /api/documents/:id', () => {
    it('should return a specific document', async () => {
      const response = await request(app)
        .get(`/api/documents/${testDocument.id}`)
        .set('x-access-token', userToken)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('id', testDocument.id);
      expect(response.body.data).toHaveProperty('title', 'HIPAA Privacy Policy');
    });

    it('should return 404 for non-existent document', async () => {
      await request(app)
        .get('/api/documents/99999')
        .set('x-access-token', userToken)
        .expect(404);
    });

    it('should return 400 for invalid document ID', async () => {
      await request(app)
        .get('/api/documents/invalid-id')
        .set('x-access-token', userToken)
        .expect(400);
    });
  });

  describe('POST /api/documents', () => {
    it('should create a new document with compliance officer privileges', async () => {
      const newDocument = {
        title: 'Security Policy',
        description: 'Organization security policy',
        filePath: '/documents/security-policy.pdf',
        version: '1.0',
        status: 'active',
        documentType: 'policy',
        hipaaCategory: 'security',
        categoryId: testCategory.id,
        reviewDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      };

      const response = await request(app)
        .post('/api/documents')
        .set('x-access-token', complianceToken)
        .send(newDocument)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('title', 'Security Policy');
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('createdBy', complianceUser.id);
    });

    it('should reject document creation without compliance officer privileges', async () => {
      const newDocument = {
        title: 'Unauthorized Document',
        description: 'This should fail',
        filePath: '/documents/unauthorized.pdf',
        version: '1.0',
        status: 'active',
        documentType: 'policy',
        hipaaCategory: 'general'
      };

      await request(app)
        .post('/api/documents')
        .set('x-access-token', userToken)
        .send(newDocument)
        .expect(403);
    });

    it('should reject document with missing required fields', async () => {
      const invalidDocument = {
        title: 'Incomplete Document'
        // Missing required fields
      };

      await request(app)
        .post('/api/documents')
        .set('x-access-token', complianceToken)
        .send(invalidDocument)
        .expect(400);
    });

    it('should reject document with invalid documentType', async () => {
      const invalidDocument = {
        title: 'Invalid Type',
        description: 'Testing invalid document type',
        filePath: '/documents/invalid.pdf',
        version: '1.0',
        status: 'active',
        documentType: 'invalid-type',
        hipaaCategory: 'general'
      };

      await request(app)
        .post('/api/documents')
        .set('x-access-token', complianceToken)
        .send(invalidDocument)
        .expect(400);
    });

    it('should reject document with invalid hipaaCategory', async () => {
      const invalidDocument = {
        title: 'Invalid Category',
        description: 'Testing invalid HIPAA category',
        filePath: '/documents/invalid.pdf',
        version: '1.0',
        status: 'active',
        documentType: 'policy',
        hipaaCategory: 'invalid-category'
      };

      await request(app)
        .post('/api/documents')
        .set('x-access-token', complianceToken)
        .send(invalidDocument)
        .expect(400);
    });

    it('should reject document with invalid categoryId', async () => {
      const invalidDocument = {
        title: 'Invalid Category ID',
        description: 'Testing invalid category reference',
        filePath: '/documents/invalid.pdf',
        version: '1.0',
        status: 'active',
        documentType: 'policy',
        hipaaCategory: 'general',
        categoryId: 99999
      };

      await request(app)
        .post('/api/documents')
        .set('x-access-token', complianceToken)
        .send(invalidDocument)
        .expect(400);
    });
  });

  describe('PUT /api/documents/:id', () => {
    it('should update an existing document with compliance officer privileges', async () => {
      const updates = {
        description: 'Updated HIPAA privacy policy',
        version: '1.1'
      };

      const response = await request(app)
        .put(`/api/documents/${testDocument.id}`)
        .set('x-access-token', complianceToken)
        .send(updates)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('description', 'Updated HIPAA privacy policy');
      expect(response.body.data).toHaveProperty('version', '1.1');
    });

    it('should reject update without compliance officer privileges', async () => {
      const updates = {
        description: 'Unauthorized update'
      };

      await request(app)
        .put(`/api/documents/${testDocument.id}`)
        .set('x-access-token', userToken)
        .send(updates)
        .expect(403);
    });

    it('should return 404 when updating non-existent document', async () => {
      const updates = {
        description: 'Update for non-existent document'
      };

      await request(app)
        .put('/api/documents/99999')
        .set('x-access-token', complianceToken)
        .send(updates)
        .expect(404);
    });
  });

  describe('DELETE /api/documents/:id', () => {
    it('should soft delete a document with compliance officer privileges', async () => {
      // Create a document to delete
      const docToDelete = await Document.create({
        title: 'Document to Delete',
        description: 'This will be deleted',
        filePath: '/documents/delete-me.pdf',
        version: '1.0',
        status: 'active',
        documentType: 'form',
        hipaaCategory: 'general',
        createdBy: complianceUser.id
      });

      const response = await request(app)
        .delete(`/api/documents/${docToDelete.id}`)
        .set('x-access-token', complianceToken)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);

      // Verify it's soft deleted
      const deletedDoc = await Document.findByPk(docToDelete.id, { paranoid: false });
      expect(deletedDoc.deletedAt).not.toBeNull();
    });

    it('should reject delete without compliance officer privileges', async () => {
      await request(app)
        .delete(`/api/documents/${testDocument.id}`)
        .set('x-access-token', userToken)
        .expect(403);
    });

    it('should return 404 when deleting non-existent document', async () => {
      await request(app)
        .delete('/api/documents/99999')
        .set('x-access-token', complianceToken)
        .expect(404);
    });
  });
});

describe('Document Category API Endpoints', () => {
  describe('GET /api/documents/categories', () => {
    it('should return all document categories', async () => {
      const response = await request(app)
        .get('/api/documents/categories')
        .set('x-access-token', userToken)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('POST /api/documents/categories', () => {
    it('should create a new category with compliance officer privileges', async () => {
      const newCategory = {
        name: 'Security Policies',
        description: 'HIPAA security-related policies'
      };

      const response = await request(app)
        .post('/api/documents/categories')
        .set('x-access-token', complianceToken)
        .send(newCategory)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('name', 'Security Policies');
    });

    it('should reject category creation without compliance officer privileges', async () => {
      const newCategory = {
        name: 'Unauthorized Category',
        description: 'This should fail'
      };

      await request(app)
        .post('/api/documents/categories')
        .set('x-access-token', userToken)
        .send(newCategory)
        .expect(403);
    });

    it('should reject duplicate category names', async () => {
      const duplicateCategory = {
        name: 'Privacy Policies', // Already exists
        description: 'Duplicate name'
      };

      await request(app)
        .post('/api/documents/categories')
        .set('x-access-token', complianceToken)
        .send(duplicateCategory)
        .expect(400);
    });
  });
});

describe('Document Acknowledgment API Endpoints', () => {
  beforeEach(async () => {
    // Clean up acknowledgments before each test
    await DocumentAcknowledgment.destroy({ where: {}, force: true });
  });

  describe('POST /api/documents/:documentId/acknowledge', () => {
    it('should acknowledge a document', async () => {
      const response = await request(app)
        .post(`/api/documents/${testDocument.id}/acknowledge`)
        .set('x-access-token', userToken)
        .send({
          ipAddress: '127.0.0.1',
          notes: 'I have read and understood this policy'
        })
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('userId', testUser.id);
      expect(response.body.data).toHaveProperty('documentId', testDocument.id);
      expect(response.body.data).toHaveProperty('acknowledgmentDate');
    });

    it('should prevent duplicate acknowledgments', async () => {
      // First acknowledgment
      await request(app)
        .post(`/api/documents/${testDocument.id}/acknowledge`)
        .set('x-access-token', userToken)
        .send({ ipAddress: '127.0.0.1' })
        .expect(201);

      // Attempt duplicate acknowledgment
      await request(app)
        .post(`/api/documents/${testDocument.id}/acknowledge`)
        .set('x-access-token', userToken)
        .send({ ipAddress: '127.0.0.1' })
        .expect(400);
    });

    it('should return 404 for non-existent document', async () => {
      await request(app)
        .post('/api/documents/99999/acknowledge')
        .set('x-access-token', userToken)
        .send({ ipAddress: '127.0.0.1' })
        .expect(404);
    });
  });

  describe('GET /api/documents/:documentId/acknowledgments', () => {
    beforeEach(async () => {
      // Create an acknowledgment
      await DocumentAcknowledgment.create({
        userId: testUser.id,
        documentId: testDocument.id,
        acknowledgmentDate: new Date(),
        ipAddress: '127.0.0.1'
      });
    });

    it('should return all acknowledgments for a document', async () => {
      const response = await request(app)
        .get(`/api/documents/${testDocument.id}/acknowledgments`)
        .set('x-access-token', complianceToken)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0]).toHaveProperty('documentId', testDocument.id);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get(`/api/documents/${testDocument.id}/acknowledgments?page=1&limit=10`)
        .set('x-access-token', complianceToken)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('pagination');
    });
  });

  describe('GET /api/documents/user/acknowledgments', () => {
    beforeEach(async () => {
      // Create an acknowledgment for test user
      await DocumentAcknowledgment.create({
        userId: testUser.id,
        documentId: testDocument.id,
        acknowledgmentDate: new Date(),
        ipAddress: '127.0.0.1'
      });
    });

    it('should return current user\'s acknowledgments', async () => {
      const response = await request(app)
        .get('/api/documents/user/acknowledgments')
        .set('x-access-token', userToken)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0]).toHaveProperty('userId', testUser.id);
    });
  });

  describe('GET /api/documents/requiring/acknowledgment', () => {
    it('should return documents requiring acknowledgment', async () => {
      const response = await request(app)
        .get('/api/documents/requiring/acknowledgment')
        .set('x-access-token', testUser)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toBeInstanceOf(Array);
    });
  });
});

describe('Document Statistics API', () => {
  describe('GET /api/documents/statistics', () => {
    it('should return document statistics', async () => {
      const response = await request(app)
        .get('/api/documents/statistics')
        .set('x-access-token', complianceToken)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('totalDocuments');
      expect(response.body.data).toHaveProperty('activeDocuments');
      expect(response.body.data).toHaveProperty('documentsByType');
      expect(response.body.data).toHaveProperty('documentsByCategory');
      expect(response.body.data).toHaveProperty('totalAcknowledgments');
    });
  });
});

describe('Document API Error Handling', () => {
  it('should handle SQL injection attempts', async () => {
    const sqlInjection = {
      title: "'; DROP TABLE documents; --",
      description: 'SQL injection attempt',
      filePath: '/documents/inject.pdf',
      version: '1.0',
      status: 'active',
      documentType: 'policy',
      hipaaCategory: 'general'
    };

    const response = await request(app)
      .post('/api/documents')
      .set('x-access-token', complianceToken)
      .send(sqlInjection)
      .expect(201);

    // Verify the data was escaped and not executed
    expect(response.body.data.title).toBe("'; DROP TABLE documents; --");
  });

  it('should handle XSS attempts in document fields', async () => {
    const xssAttempt = {
      title: '<script>alert("XSS")</script>',
      description: '<img src=x onerror=alert("XSS")>',
      filePath: '/documents/xss.pdf',
      version: '1.0',
      status: 'active',
      documentType: 'policy',
      hipaaCategory: 'general'
    };

    const response = await request(app)
      .post('/api/documents')
      .set('x-access-token', complianceToken)
      .send(xssAttempt)
      .expect(201);

    // Verify XSS payload is stored but should be escaped when rendered
    expect(response.body.data.title).toBe('<script>alert("XSS")</script>');
  });

  it('should handle concurrent acknowledgment attempts', async () => {
    // Simulate race condition with Promise.all
    const promises = [
      request(app)
        .post(`/api/documents/${testDocument.id}/acknowledge`)
        .set('x-access-token', userToken)
        .send({ ipAddress: '127.0.0.1' }),
      request(app)
        .post(`/api/documents/${testDocument.id}/acknowledge`)
        .set('x-access-token', userToken)
        .send({ ipAddress: '127.0.0.1' })
    ];

    const results = await Promise.all(promises.map(p => p.catch(e => e)));

    // One should succeed, one should fail
    const successCount = results.filter(r => r.status === 201).length;
    const failCount = results.filter(r => r.status === 400).length;

    expect(successCount).toBe(1);
    expect(failCount).toBe(1);
  });
});
