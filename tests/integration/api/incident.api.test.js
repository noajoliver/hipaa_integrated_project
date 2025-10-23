/**
 * Incident API Integration Tests
 * @module tests/integration/api/incident-api
 */
const request = require('supertest');
const app = require('../../../server');
const { connect, resetAndSeed, disconnect } = require('../../utils/test-db');
const { createAuthToken } = require('../../utils/auth-helpers');
const { User, Incident, IncidentUpdate, Role } = require('../../../models');

let adminToken, userToken, complianceToken, adminUser, testUser, complianceUser, testIncident;

beforeAll(async () => {
  await connect();
  await resetAndSeed();

  // Get users with roles loaded
  adminUser = await User.findOne({
    where: { username: 'admin' },
    include: [{ model: Role, as: 'role' }]
  });
  testUser = await User.findOne({
    where: { username: 'testuser' },
    include: [{ model: Role, as: 'role' }]
  });
  complianceUser = await User.findOne({
    where: { username: 'compliance' },
    include: [{ model: Role, as: 'role' }]
  });

  adminToken = createAuthToken(adminUser);
  userToken = createAuthToken(testUser);
  complianceToken = createAuthToken(complianceUser);

  // Create test incident
  testIncident = await Incident.create({
    title: 'Unauthorized Access Attempt',
    description: 'Multiple failed login attempts detected',
    incidentDate: new Date(),
    reportedBy: testUser.id,
    reportedDate: new Date(),
    status: 'reported',
    severity: 'medium',
    category: 'Security Incident',
    location: 'Server Room A',
    affectedSystems: 'Authentication Server',
    containmentActions: 'Account locked temporarily'
  });
});

afterAll(async () => {
  await disconnect();
});

describe('Incident API Endpoints', () => {
  describe('GET /api/incidents', () => {
    it('should return all incidents with pagination', async () => {
      const response = await request(app)
        .get('/api/incidents')
        .set('x-access-token', userToken)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should support pagination parameters', async () => {
      const response = await request(app)
        .get('/api/incidents?page=1&limit=10')
        .set('x-access-token', userToken)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination).toHaveProperty('page', 1);
      expect(response.body.pagination).toHaveProperty('limit', 10);
    });

    it('should filter by status', async () => {
      const response = await request(app)
        .get('/api/incidents?status=reported')
        .set('x-access-token', userToken)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      response.body.data.forEach(incident => {
        expect(incident.status).toBe('reported');
      });
    });

    it('should filter by severity', async () => {
      const response = await request(app)
        .get('/api/incidents?severity=medium')
        .set('x-access-token', userToken)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      response.body.data.forEach(incident => {
        expect(incident.severity).toBe('medium');
      });
    });

    it('should reject unauthenticated requests', async () => {
      await request(app)
        .get('/api/incidents')
        .expect(401);
    });
  });

  describe('GET /api/incidents/:id', () => {
    it('should return a specific incident', async () => {
      const response = await request(app)
        .get(`/api/incidents/${testIncident.id}`)
        .set('x-access-token', userToken)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('id', testIncident.id);
      expect(response.body.data).toHaveProperty('title', 'Unauthorized Access Attempt');
    });

    it('should return 404 for non-existent incident', async () => {
      await request(app)
        .get('/api/incidents/99999')
        .set('x-access-token', userToken)
        .expect(404);
    });

    it('should return 400 for invalid incident ID', async () => {
      await request(app)
        .get('/api/incidents/invalid-id')
        .set('x-access-token', userToken)
        .expect(400);
    });
  });

  describe('POST /api/incidents', () => {
    it('should create a new incident (any authenticated user)', async () => {
      const newIncident = {
        title: 'PHI Disclosure Incident',
        description: 'Accidental email sent to wrong recipient',
        incidentDate: new Date(),
        severity: 'high',
        category: 'Privacy Breach',
        location: 'Administrative Office',
        affectedSystems: 'Email System',
        affectedData: 'Patient health records (5 records)',
        containmentActions: 'Email recalled, recipient notified'
      };

      const response = await request(app)
        .post('/api/incidents')
        .set('x-access-token', userToken)
        .send(newIncident)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('title', 'PHI Disclosure Incident');
      expect(response.body.data).toHaveProperty('reportedBy', testUser.id);
      expect(response.body.data).toHaveProperty('status', 'reported');
    });

    it('should reject incident with missing required fields', async () => {
      const invalidIncident = {
        title: 'Incomplete Incident'
        // Missing required fields
      };

      await request(app)
        .post('/api/incidents')
        .set('x-access-token', userToken)
        .send(invalidIncident)
        .expect(400);
    });

    it('should reject incident with invalid severity', async () => {
      const invalidIncident = {
        title: 'Invalid Severity',
        description: 'Testing invalid severity',
        incidentDate: new Date(),
        severity: 'invalid-severity',
        category: 'Test'
      };

      await request(app)
        .post('/api/incidents')
        .set('x-access-token', userToken)
        .send(invalidIncident)
        .expect(400);
    });

    it('should reject incident with invalid status', async () => {
      const invalidIncident = {
        title: 'Invalid Status',
        description: 'Testing invalid status',
        incidentDate: new Date(),
        severity: 'medium',
        category: 'Test',
        status: 'invalid-status'
      };

      await request(app)
        .post('/api/incidents')
        .set('x-access-token', userToken)
        .send(invalidIncident)
        .expect(400);
    });

    it('should reject incident with future incidentDate', async () => {
      const invalidIncident = {
        title: 'Future Incident',
        description: 'Incident cannot be in the future',
        incidentDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        severity: 'medium',
        category: 'Test'
      };

      await request(app)
        .post('/api/incidents')
        .set('x-access-token', userToken)
        .send(invalidIncident)
        .expect(400);
    });
  });

  describe('PUT /api/incidents/:id', () => {
    it('should update an incident with compliance officer privileges', async () => {
      const updates = {
        status: 'under_investigation',
        assignedTo: complianceUser.id,
        remediationPlan: 'Review access logs and interview staff'
      };

      const response = await request(app)
        .put(`/api/incidents/${testIncident.id}`)
        .set('x-access-token', complianceToken)
        .send(updates)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('status', 'under_investigation');
      expect(response.body.data).toHaveProperty('assignedTo', complianceUser.id);
    });

    it('should reject update without compliance officer privileges', async () => {
      const updates = {
        status: 'closed'
      };

      await request(app)
        .put(`/api/incidents/${testIncident.id}`)
        .set('x-access-token', userToken)
        .send(updates)
        .expect(403);
    });

    it('should return 404 when updating non-existent incident', async () => {
      const updates = {
        status: 'under_investigation'
      };

      await request(app)
        .put('/api/incidents/99999')
        .set('x-access-token', complianceToken)
        .send(updates)
        .expect(404);
    });
  });

  describe('DELETE /api/incidents/:id', () => {
    it('should soft delete an incident with compliance officer privileges', async () => {
      const incidentToDelete = await Incident.create({
        title: 'Incident to Delete',
        description: 'This will be deleted',
        incidentDate: new Date(),
        reportedBy: testUser.id,
        reportedDate: new Date(),
        status: 'reported',
        severity: 'low',
        category: 'Test'
      });

      const response = await request(app)
        .delete(`/api/incidents/${incidentToDelete.id}`)
        .set('x-access-token', complianceToken)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);

      // Verify soft delete
      const deletedIncident = await Incident.findByPk(incidentToDelete.id, { paranoid: false });
      expect(deletedIncident.deletedAt).not.toBeNull();
    });

    it('should reject delete without compliance officer privileges', async () => {
      await request(app)
        .delete(`/api/incidents/${testIncident.id}`)
        .set('x-access-token', userToken)
        .expect(403);
    });
  });

  describe('POST /api/incidents/:id/breach-determination', () => {
    let breachIncident;

    beforeEach(async () => {
      breachIncident = await Incident.create({
        title: 'Potential Breach Incident',
        description: 'PHI exposed to unauthorized party',
        incidentDate: new Date(),
        reportedBy: testUser.id,
        reportedDate: new Date(),
        status: 'under_investigation',
        severity: 'critical',
        category: 'Privacy Breach',
        affectedData: 'Patient records (50 individuals)'
      });
    });

    it('should make breach determination with compliance officer privileges', async () => {
      const determination = {
        isBreachable: true,
        breachDeterminationNotes: 'Meets criteria for reportable breach under HIPAA'
      };

      const response = await request(app)
        .post(`/api/incidents/${breachIncident.id}/breach-determination`)
        .set('x-access-token', complianceToken)
        .send(determination)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('isBreachable', true);
      expect(response.body.data).toHaveProperty('breachDeterminationDate');
      expect(response.body.data).toHaveProperty('breachDeterminationBy', complianceUser.id);
    });

    it('should reject breach determination without compliance officer privileges', async () => {
      const determination = {
        isBreachable: true
      };

      await request(app)
        .post(`/api/incidents/${breachIncident.id}/breach-determination`)
        .set('x-access-token', userToken)
        .send(determination)
        .expect(403);
    });

    it('should reject determination on non-existent incident', async () => {
      const determination = {
        isBreachable: false
      };

      await request(app)
        .post('/api/incidents/99999/breach-determination')
        .set('x-access-token', complianceToken)
        .send(determination)
        .expect(404);
    });
  });

  describe('POST /api/incidents/:id/breach-notification', () => {
    let breachableIncident;

    beforeEach(async () => {
      breachableIncident = await Incident.create({
        title: 'Confirmed Breach',
        description: 'Reportable breach confirmed',
        incidentDate: new Date(),
        reportedBy: testUser.id,
        reportedDate: new Date(),
        status: 'under_investigation',
        severity: 'critical',
        category: 'Privacy Breach',
        isBreachable: true,
        breachDeterminationDate: new Date(),
        breachDeterminationBy: complianceUser.id
      });
    });

    it('should record breach notification with compliance officer privileges', async () => {
      const notification = {
        breachNotificationDate: new Date(),
        notificationDetails: 'OCR notified, affected individuals notified'
      };

      const response = await request(app)
        .post(`/api/incidents/${breachableIncident.id}/breach-notification`)
        .set('x-access-token', complianceToken)
        .send(notification)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('breachNotificationDate');
    });

    it('should reject notification on non-breachable incident', async () => {
      const nonBreachIncident = await Incident.create({
        title: 'Non-Breach Incident',
        description: 'Not a reportable breach',
        incidentDate: new Date(),
        reportedBy: testUser.id,
        reportedDate: new Date(),
        status: 'reported',
        severity: 'low',
        category: 'Security Incident',
        isBreachable: false
      });

      const notification = {
        breachNotificationDate: new Date()
      };

      await request(app)
        .post(`/api/incidents/${nonBreachIncident.id}/breach-notification`)
        .set('x-access-token', complianceToken)
        .send(notification)
        .expect(400);
    });
  });
});

describe('Incident Update API Endpoints', () => {
  describe('GET /api/incidents/:id/updates', () => {
    beforeEach(async () => {
      await IncidentUpdate.create({
        incidentId: testIncident.id,
        updateDate: new Date(),
        updatedBy: complianceUser.id,
        updateType: 'status_change',
        previousStatus: 'reported',
        newStatus: 'under_investigation',
        description: 'Investigation started'
      });
    });

    it('should return all updates for an incident', async () => {
      const response = await request(app)
        .get(`/api/incidents/${testIncident.id}/updates`)
        .set('x-access-token', userToken)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get(`/api/incidents/${testIncident.id}/updates?page=1&limit=10`)
        .set('x-access-token', userToken)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('pagination');
    });
  });

  describe('POST /api/incidents/:id/updates', () => {
    it('should add an update to an incident', async () => {
      const update = {
        updateType: 'investigation',
        description: 'Reviewed access logs, no unauthorized access found'
      };

      const response = await request(app)
        .post(`/api/incidents/${testIncident.id}/updates`)
        .set('x-access-token', complianceToken)
        .send(update)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('incidentId', testIncident.id);
      expect(response.body.data).toHaveProperty('updatedBy', complianceUser.id);
      expect(response.body.data).toHaveProperty('updateType', 'investigation');
    });

    it('should reject update with invalid updateType', async () => {
      const update = {
        updateType: 'invalid-type',
        description: 'Invalid update type'
      };

      await request(app)
        .post(`/api/incidents/${testIncident.id}/updates`)
        .set('x-access-token', complianceToken)
        .send(update)
        .expect(400);
    });

    it('should reject update on non-existent incident', async () => {
      const update = {
        updateType: 'comment',
        description: 'Update for non-existent incident'
      };

      await request(app)
        .post('/api/incidents/99999/updates')
        .set('x-access-token', complianceToken)
        .send(update)
        .expect(404);
    });
  });
});

describe('Incident Statistics API', () => {
  describe('GET /api/incidents/statistics/summary', () => {
    it('should return incident statistics', async () => {
      const response = await request(app)
        .get('/api/incidents/statistics/summary')
        .set('x-access-token', complianceToken)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('totalIncidents');
      expect(response.body.data).toHaveProperty('incidentsBySeverity');
      expect(response.body.data).toHaveProperty('incidentsByStatus');
      expect(response.body.data).toHaveProperty('incidentsByCategory');
      expect(response.body.data).toHaveProperty('breachableIncidents');
    });
  });
});

describe('Incident API Error Handling', () => {
  it('should handle SQL injection attempts', async () => {
    const sqlInjection = {
      title: "'; DROP TABLE incidents; --",
      description: 'SQL injection attempt',
      incidentDate: new Date(),
      severity: 'low',
      category: 'Test'
    };

    const response = await request(app)
      .post('/api/incidents')
      .set('x-access-token', userToken)
      .send(sqlInjection)
      .expect(201);

    expect(response.body.data.title).toBe("'; DROP TABLE incidents; --");
  });

  it('should handle XSS attempts', async () => {
    const xssAttempt = {
      title: '<script>alert("XSS")</script>',
      description: '<img src=x onerror=alert("XSS")>',
      incidentDate: new Date(),
      severity: 'low',
      category: 'Test'
    };

    const response = await request(app)
      .post('/api/incidents')
      .set('x-access-token', userToken)
      .send(xssAttempt)
      .expect(201);

    expect(response.body.data.title).toBe('<script>alert("XSS")</script>');
  });
});
