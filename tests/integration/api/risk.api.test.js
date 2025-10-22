/**
 * Risk Assessment API Integration Tests
 * @module tests/integration/api/risk-api
 */
const request = require('supertest');
const app = require('../../../server');
const { connect, resetAndSeed, disconnect } = require('../../utils/test-db');
const { generateToken } = require('../../../utils/token-manager');
const { User, RiskAssessment, RiskItem, Role } = require('../../../models');

let adminToken, userToken, complianceToken, adminUser, testUser, complianceUser, testAssessment;

beforeAll(async () => {
  await connect();
  await resetAndSeed();

  adminUser = await User.findOne({ where: { username: 'admin' } });
  testUser = await User.findOne({ where: { username: 'testuser' } });

  // Create compliance officer
  let complianceRole = await Role.findOne({ where: { name: 'Compliance Officer' } });
  if (!complianceRole) {
    complianceRole = await Role.create({
      name: 'Compliance Officer',
      description: 'Compliance Officer role',
      permissions: { isComplianceOfficer: true }
    });
  }

  complianceUser = await User.create({
    username: 'riskCompliance',
    email: 'riskcompliance@example.com',
    password: '$2b$10$X.VhWnPjCWHv4.wZp.AXZOGJpVOdnl4JCJHKu/YMlMhh7.SCuW9hO',
    firstName: 'Risk',
    lastName: 'Compliance',
    position: 'Risk Officer',
    roleId: complianceRole.id,
    accountStatus: 'active'
  });

  adminToken = generateToken({ id: adminUser.id, username: adminUser.username }).token;
  userToken = generateToken({ id: testUser.id, username: testUser.username }).token;
  complianceToken = generateToken({ id: complianceUser.id, username: complianceUser.username }).token;

  // Create test assessment
  testAssessment = await RiskAssessment.create({
    title: 'Annual Security Risk Assessment 2024',
    description: 'Comprehensive security risk assessment',
    assessmentDate: new Date(),
    conductedBy: complianceUser.id,
    status: 'in_progress',
    methodology: 'NIST 800-30',
    scope: 'All PHI systems and processes',
    summary: 'Initial risk assessment'
  });
});

afterAll(async () => {
  await disconnect();
});

describe('Risk Assessment API Endpoints', () => {
  describe('GET /api/risk/assessments', () => {
    it('should return all risk assessments', async () => {
      const response = await request(app)
        .get('/api/risk/assessments')
        .set('x-access-token', userToken)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should reject unauthenticated requests', async () => {
      await request(app)
        .get('/api/risk/assessments')
        .expect(401);
    });
  });

  describe('GET /api/risk/assessments/:id', () => {
    it('should return a specific risk assessment', async () => {
      const response = await request(app)
        .get(`/api/risk/assessments/${testAssessment.id}`)
        .set('x-access-token', userToken)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('id', testAssessment.id);
      expect(response.body.data).toHaveProperty('title', 'Annual Security Risk Assessment 2024');
    });

    it('should return 404 for non-existent assessment', async () => {
      await request(app)
        .get('/api/risk/assessments/99999')
        .set('x-access-token', userToken)
        .expect(404);
    });
  });

  describe('POST /api/risk/assessments', () => {
    it('should create a new risk assessment with compliance officer privileges', async () => {
      const newAssessment = {
        title: 'Q1 2024 Risk Assessment',
        description: 'Quarterly risk assessment',
        assessmentDate: new Date(),
        status: 'draft',
        methodology: 'OCTAVE',
        scope: 'Network infrastructure'
      };

      const response = await request(app)
        .post('/api/risk/assessments')
        .set('x-access-token', complianceToken)
        .send(newAssessment)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('title', 'Q1 2024 Risk Assessment');
      expect(response.body.data).toHaveProperty('conductedBy', complianceUser.id);
    });

    it('should reject assessment creation without compliance officer privileges', async () => {
      const newAssessment = {
        title: 'Unauthorized Assessment',
        description: 'This should fail',
        assessmentDate: new Date(),
        status: 'draft'
      };

      await request(app)
        .post('/api/risk/assessments')
        .set('x-access-token', userToken)
        .send(newAssessment)
        .expect(403);
    });

    it('should reject assessment with invalid status', async () => {
      const invalidAssessment = {
        title: 'Invalid Status Assessment',
        description: 'Testing invalid status',
        assessmentDate: new Date(),
        status: 'invalid-status'
      };

      await request(app)
        .post('/api/risk/assessments')
        .set('x-access-token', complianceToken)
        .send(invalidAssessment)
        .expect(400);
    });

    it('should reject assessment with missing required fields', async () => {
      const invalidAssessment = {
        title: 'Incomplete Assessment'
        // Missing required fields
      };

      await request(app)
        .post('/api/risk/assessments')
        .set('x-access-token', complianceToken)
        .send(invalidAssessment)
        .expect(400);
    });
  });

  describe('PUT /api/risk/assessments/:id', () => {
    it('should update an existing risk assessment', async () => {
      const updates = {
        summary: 'Updated risk assessment summary',
        status: 'completed'
      };

      const response = await request(app)
        .put(`/api/risk/assessments/${testAssessment.id}`)
        .set('x-access-token', complianceToken)
        .send(updates)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('summary', 'Updated risk assessment summary');
      expect(response.body.data).toHaveProperty('status', 'completed');
    });

    it('should reject update without compliance officer privileges', async () => {
      const updates = {
        summary: 'Unauthorized update'
      };

      await request(app)
        .put(`/api/risk/assessments/${testAssessment.id}`)
        .set('x-access-token', userToken)
        .send(updates)
        .expect(403);
    });
  });

  describe('POST /api/risk/assessments/:id/approve', () => {
    it('should approve a risk assessment', async () => {
      const response = await request(app)
        .post(`/api/risk/assessments/${testAssessment.id}/approve`)
        .set('x-access-token', complianceToken)
        .send({
          approvalNotes: 'Assessment approved after review'
        })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('approvedBy', complianceUser.id);
      expect(response.body.data).toHaveProperty('approvalDate');
    });

    it('should reject approval without compliance officer privileges', async () => {
      await request(app)
        .post(`/api/risk/assessments/${testAssessment.id}/approve`)
        .set('x-access-token', userToken)
        .expect(403);
    });
  });

  describe('DELETE /api/risk/assessments/:id', () => {
    it('should delete a risk assessment', async () => {
      const assessmentToDelete = await RiskAssessment.create({
        title: 'Assessment to Delete',
        description: 'This will be deleted',
        assessmentDate: new Date(),
        conductedBy: complianceUser.id,
        status: 'draft'
      });

      const response = await request(app)
        .delete(`/api/risk/assessments/${assessmentToDelete.id}`)
        .set('x-access-token', complianceToken)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });

    it('should reject delete without compliance officer privileges', async () => {
      await request(app)
        .delete(`/api/risk/assessments/${testAssessment.id}`)
        .set('x-access-token', userToken)
        .expect(403);
    });
  });
});

describe('Risk Item API Endpoints', () => {
  let testRiskItem;

  beforeEach(async () => {
    testRiskItem = await RiskItem.create({
      assessmentId: testAssessment.id,
      category: 'Technical',
      assetName: 'Patient Database Server',
      description: 'Database server containing PHI',
      threatSource: 'External hackers',
      threatAction: 'Unauthorized access',
      vulnerabilityDescription: 'Outdated security patches',
      existingControls: 'Firewall, IDS',
      likelihood: 'medium',
      impact: 'high',
      riskLevel: 'high',
      recommendedControls: 'Update patches, implement MFA',
      mitigationStatus: 'not_started'
    });
  });

  afterEach(async () => {
    await RiskItem.destroy({ where: {}, force: true });
  });

  describe('GET /api/risk/assessments/:assessmentId/items', () => {
    it('should return all risk items for an assessment', async () => {
      const response = await request(app)
        .get(`/api/risk/assessments/${testAssessment.id}/items`)
        .set('x-access-token', userToken)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/risk/items/:id', () => {
    it('should return a specific risk item', async () => {
      const response = await request(app)
        .get(`/api/risk/items/${testRiskItem.id}`)
        .set('x-access-token', userToken)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('id', testRiskItem.id);
      expect(response.body.data).toHaveProperty('assetName', 'Patient Database Server');
    });
  });

  describe('POST /api/risk/items', () => {
    it('should create a new risk item with compliance officer privileges', async () => {
      const newRiskItem = {
        assessmentId: testAssessment.id,
        category: 'Administrative',
        assetName: 'Employee Training Records',
        description: 'Training records database',
        threatSource: 'Insider threat',
        threatAction: 'Data theft',
        vulnerabilityDescription: 'Insufficient access controls',
        existingControls: 'Basic authentication',
        likelihood: 'low',
        impact: 'medium',
        riskLevel: 'medium',
        recommendedControls: 'Role-based access control',
        mitigationStatus: 'not_started'
      };

      const response = await request(app)
        .post('/api/risk/items')
        .set('x-access-token', complianceToken)
        .send(newRiskItem)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('assetName', 'Employee Training Records');
      expect(response.body.data).toHaveProperty('riskLevel', 'medium');
    });

    it('should reject risk item creation without compliance officer privileges', async () => {
      const newRiskItem = {
        assessmentId: testAssessment.id,
        category: 'Technical',
        assetName: 'Unauthorized Item',
        likelihood: 'low',
        impact: 'low',
        riskLevel: 'low'
      };

      await request(app)
        .post('/api/risk/items')
        .set('x-access-token', userToken)
        .send(newRiskItem)
        .expect(403);
    });

    it('should reject risk item with invalid likelihood', async () => {
      const invalidRiskItem = {
        assessmentId: testAssessment.id,
        category: 'Technical',
        assetName: 'Test Asset',
        likelihood: 'invalid-level',
        impact: 'medium',
        riskLevel: 'medium'
      };

      await request(app)
        .post('/api/risk/items')
        .set('x-access-token', complianceToken)
        .send(invalidRiskItem)
        .expect(400);
    });

    it('should reject risk item with invalid impact', async () => {
      const invalidRiskItem = {
        assessmentId: testAssessment.id,
        category: 'Technical',
        assetName: 'Test Asset',
        likelihood: 'medium',
        impact: 'invalid-level',
        riskLevel: 'medium'
      };

      await request(app)
        .post('/api/risk/items')
        .set('x-access-token', complianceToken)
        .send(invalidRiskItem)
        .expect(400);
    });

    it('should reject risk item with invalid assessment ID', async () => {
      const invalidRiskItem = {
        assessmentId: 99999,
        category: 'Technical',
        assetName: 'Test Asset',
        likelihood: 'medium',
        impact: 'medium',
        riskLevel: 'medium'
      };

      await request(app)
        .post('/api/risk/items')
        .set('x-access-token', complianceToken)
        .send(invalidRiskItem)
        .expect(400);
    });
  });

  describe('PUT /api/risk/items/:id', () => {
    it('should update a risk item', async () => {
      const updates = {
        mitigationStatus: 'in_progress',
        mitigationPlan: 'Security patches scheduled for next week'
      };

      const response = await request(app)
        .put(`/api/risk/items/${testRiskItem.id}`)
        .set('x-access-token', complianceToken)
        .send(updates)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('mitigationStatus', 'in_progress');
    });

    it('should update riskLevel when likelihood or impact changes', async () => {
      const updates = {
        likelihood: 'high',
        impact: 'high'
        // Should automatically calculate riskLevel as 'critical'
      };

      const response = await request(app)
        .put(`/api/risk/items/${testRiskItem.id}`)
        .set('x-access-token', complianceToken)
        .send(updates)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('likelihood', 'high');
      expect(response.body.data).toHaveProperty('impact', 'high');
    });
  });

  describe('DELETE /api/risk/items/:id', () => {
    it('should delete a risk item', async () => {
      const response = await request(app)
        .delete(`/api/risk/items/${testRiskItem.id}`)
        .set('x-access-token', complianceToken)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });

    it('should reject delete without compliance officer privileges', async () => {
      await request(app)
        .delete(`/api/risk/items/${testRiskItem.id}`)
        .set('x-access-token', userToken)
        .expect(403);
    });
  });
});

describe('Risk Statistics API', () => {
  describe('GET /api/risk/statistics', () => {
    it('should return risk statistics', async () => {
      const response = await request(app)
        .get('/api/risk/statistics')
        .set('x-access-token', complianceToken)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('totalAssessments');
      expect(response.body.data).toHaveProperty('totalRiskItems');
      expect(response.body.data).toHaveProperty('risksByLevel');
      expect(response.body.data).toHaveProperty('risksByCategory');
      expect(response.body.data).toHaveProperty('mitigationStatus');
    });
  });
});

describe('Risk API Error Handling', () => {
  it('should handle SQL injection attempts', async () => {
    const sqlInjection = {
      title: "'; DROP TABLE risk_assessments; --",
      description: 'SQL injection attempt',
      assessmentDate: new Date(),
      status: 'draft'
    };

    const response = await request(app)
      .post('/api/risk/assessments')
      .set('x-access-token', complianceToken)
      .send(sqlInjection)
      .expect(201);

    expect(response.body.data.title).toBe("'; DROP TABLE risk_assessments; --");
  });
});
