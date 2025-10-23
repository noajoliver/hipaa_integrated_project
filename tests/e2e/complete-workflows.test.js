/**
 * End-to-End Workflow Tests
 * Tests complete user workflows across the application
 * @module tests/e2e/complete-workflows
 */
const request = require('supertest');
const app = require('../../server');
const { connect, resetAndSeed, disconnect } = require('../utils/test-db');
const { generateToken } = require('../../utils/token-manager');
const { User, TrainingCourse, TrainingAssignment, Document, RiskAssessment, RiskItem, Incident, Role } = require('../../models');

let adminToken, userToken, complianceToken, adminUser, testUser, complianceUser;

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
    username: 'e2eCompliance',
    email: 'e2ecompliance@example.com',
    password: '$2b$10$X.VhWnPjCWHv4.wZp.AXZOGJpVOdnl4JCJHKu/YMlMhh7.SCuW9hO',
    firstName: 'E2E',
    lastName: 'Compliance',
    position: 'Compliance Officer',
    roleId: complianceRole.id,
    accountStatus: 'active'
  });

  adminToken = generateToken({ id: adminUser.id, username: adminUser.username }).token;
  userToken = generateToken({ id: testUser.id, username: testUser.username }).token;
  complianceToken = generateToken({ id: complianceUser.id, username: complianceUser.username }).token;
});

afterAll(async () => {
  await disconnect();
});

describe('E2E: Complete Training Workflow', () => {
  let courseId, assignmentId;

  it('Step 1: Admin creates a new training course', async () => {
    const courseData = {
      title: 'E2E HIPAA Privacy Training',
      description: 'Complete HIPAA privacy training',
      contentType: 'video',
      durationMinutes: 60,
      frequencyDays: 365,
      version: '1.0',
      status: 'active',
      content: 'https://example.com/training',
      passingScore: 80
    };

    const response = await request(app)
      .post('/api/training/courses')
      .set('x-access-token', adminToken)
      .send(courseData)
      .expect(201);

    expect(response.body.success).toBe(true);
    courseId = response.body.data.id;
  });

  it('Step 2: Admin assigns course to user', async () => {
    const assignmentData = {
      userId: testUser.id,
      courseId: courseId,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    };

    const response = await request(app)
      .post('/api/training/assignments')
      .set('x-access-token', adminToken)
      .send(assignmentData)
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe('assigned');
    assignmentId = response.body.data.id;
  });

  it('Step 3: User views their assignments', async () => {
    const response = await request(app)
      .get(`/api/training/assignments/user/${testUser.id}`)
      .set('x-access-token', userToken)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.length).toBeGreaterThan(0);

    const assignment = response.body.data.find(a => a.id === assignmentId);
    expect(assignment).toBeDefined();
    expect(assignment.status).toBe('assigned');
  });

  it('Step 4: User starts the training', async () => {
    const response = await request(app)
      .put(`/api/training/assignments/${assignmentId}`)
      .set('x-access-token', userToken)
      .send({ status: 'in_progress' })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe('in_progress');
  });

  it('Step 5: User completes the training with passing score', async () => {
    const response = await request(app)
      .post(`/api/training/assignments/${assignmentId}/complete`)
      .set('x-access-token', userToken)
      .send({ score: 95 })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe('completed');
    expect(response.body.data.score).toBe(95);
    expect(response.body.data.completionDate).toBeDefined();
  });

  it('Step 6: Admin verifies completion in statistics', async () => {
    const response = await request(app)
      .get('/api/training/statistics')
      .set('x-access-token', adminToken)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.completedAssignments).toBeGreaterThan(0);
  });
});

describe('E2E: Complete Document Acknowledgment Workflow', () => {
  let documentId;

  it('Step 1: Compliance officer creates a new policy document', async () => {
    const documentData = {
      title: 'E2E Privacy Policy',
      description: 'Updated privacy policy requiring acknowledgment',
      filePath: '/documents/e2e-privacy-policy.pdf',
      version: '2.0',
      status: 'active',
      documentType: 'policy',
      hipaaCategory: 'privacy',
      reviewDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    };

    const response = await request(app)
      .post('/api/documents')
      .set('x-access-token', complianceToken)
      .send(documentData)
      .expect(201);

    expect(response.body.success).toBe(true);
    documentId = response.body.data.id;
  });

  it('Step 2: User views documents requiring acknowledgment', async () => {
    const response = await request(app)
      .get('/api/documents/requiring/acknowledgment')
      .set('x-access-token', userToken)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeInstanceOf(Array);
  });

  it('Step 3: User reads and acknowledges the document', async () => {
    // First, get the document
    const docResponse = await request(app)
      .get(`/api/documents/${documentId}`)
      .set('x-access-token', userToken)
      .expect(200);

    expect(docResponse.body.success).toBe(true);

    // Then acknowledge it
    const ackResponse = await request(app)
      .post(`/api/documents/${documentId}/acknowledge`)
      .set('x-access-token', userToken)
      .send({
        ipAddress: '127.0.0.1',
        notes: 'I have read and understood this policy'
      })
      .expect(201);

    expect(ackResponse.body.success).toBe(true);
    expect(ackResponse.body.data.userId).toBe(testUser.id);
    expect(ackResponse.body.data.documentId).toBe(documentId);
  });

  it('Step 4: User views their acknowledgment history', async () => {
    const response = await request(app)
      .get('/api/documents/user/acknowledgments')
      .set('x-access-token', userToken)
      .expect(200);

    expect(response.body.success).toBe(true);
    const ack = response.body.data.find(a => a.documentId === documentId);
    expect(ack).toBeDefined();
  });

  it('Step 5: Compliance officer reviews acknowledgments', async () => {
    const response = await request(app)
      .get(`/api/documents/${documentId}/acknowledgments`)
      .set('x-access-token', complianceToken)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.length).toBeGreaterThan(0);
  });
});

describe('E2E: Complete Risk Assessment Workflow', () => {
  let assessmentId, riskItemId;

  it('Step 1: Compliance officer creates a risk assessment', async () => {
    const assessmentData = {
      title: 'E2E Q1 2024 Risk Assessment',
      description: 'Quarterly risk assessment',
      assessmentDate: new Date(),
      status: 'in_progress',
      methodology: 'NIST 800-30',
      scope: 'All PHI systems'
    };

    const response = await request(app)
      .post('/api/risk/assessments')
      .set('x-access-token', complianceToken)
      .send(assessmentData)
      .expect(201);

    expect(response.body.success).toBe(true);
    assessmentId = response.body.data.id;
  });

  it('Step 2: Compliance officer adds risk items', async () => {
    const riskItemData = {
      assessmentId: assessmentId,
      category: 'Technical',
      assetName: 'E2E Database Server',
      description: 'Critical database containing PHI',
      threatSource: 'External attackers',
      threatAction: 'Unauthorized access',
      vulnerabilityDescription: 'Outdated security patches',
      existingControls: 'Firewall, IDS',
      likelihood: 'medium',
      impact: 'high',
      riskLevel: 'high',
      recommendedControls: 'Update patches, implement MFA',
      mitigationStatus: 'not_started'
    };

    const response = await request(app)
      .post('/api/risk/items')
      .set('x-access-token', complianceToken)
      .send(riskItemData)
      .expect(201);

    expect(response.body.success).toBe(true);
    riskItemId = response.body.data.id;
  });

  it('Step 3: Compliance officer updates mitigation status', async () => {
    const updates = {
      mitigationStatus: 'in_progress',
      mitigationPlan: 'Patches scheduled for deployment',
      mitigationDate: new Date()
    };

    const response = await request(app)
      .put(`/api/risk/items/${riskItemId}`)
      .set('x-access-token', complianceToken)
      .send(updates)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.mitigationStatus).toBe('in_progress');
  });

  it('Step 4: Compliance officer completes the assessment', async () => {
    const updates = {
      status: 'completed',
      summary: 'Assessment completed with 1 high-risk item identified'
    };

    const response = await request(app)
      .put(`/api/risk/assessments/${assessmentId}`)
      .set('x-access-token', complianceToken)
      .send(updates)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe('completed');
  });

  it('Step 5: Compliance officer approves the assessment', async () => {
    const response = await request(app)
      .post(`/api/risk/assessments/${assessmentId}/approve`)
      .set('x-access-token', complianceToken)
      .send({ approvalNotes: 'Assessment approved' })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.approvedBy).toBe(complianceUser.id);
    expect(response.body.data.approvalDate).toBeDefined();
  });

  it('Step 6: Verify risk statistics are updated', async () => {
    const response = await request(app)
      .get('/api/risk/statistics')
      .set('x-access-token', complianceToken)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.totalAssessments).toBeGreaterThan(0);
    expect(response.body.data.totalRiskItems).toBeGreaterThan(0);
  });
});

describe('E2E: Complete Incident Management Workflow', () => {
  let incidentId;

  it('Step 1: User reports a security incident', async () => {
    const incidentData = {
      title: 'E2E Unauthorized Access Attempt',
      description: 'Multiple failed login attempts detected',
      incidentDate: new Date(),
      severity: 'high',
      category: 'Security Incident',
      location: 'Data Center',
      affectedSystems: 'Authentication Server',
      containmentActions: 'Account temporarily locked'
    };

    const response = await request(app)
      .post('/api/incidents')
      .set('x-access-token', userToken)
      .send(incidentData)
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe('reported');
    expect(response.body.data.reportedBy).toBe(testUser.id);
    incidentId = response.body.data.id;
  });

  it('Step 2: Compliance officer assigns incident for investigation', async () => {
    const updates = {
      status: 'under_investigation',
      assignedTo: complianceUser.id,
      remediationPlan: 'Review access logs and security footage'
    };

    const response = await request(app)
      .put(`/api/incidents/${incidentId}`)
      .set('x-access-token', complianceToken)
      .send(updates)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe('under_investigation');
    expect(response.body.data.assignedTo).toBe(complianceUser.id);
  });

  it('Step 3: Compliance officer adds investigation update', async () => {
    const update = {
      updateType: 'investigation',
      description: 'Access logs reviewed - no unauthorized access confirmed'
    };

    const response = await request(app)
      .post(`/api/incidents/${incidentId}/updates`)
      .set('x-access-token', complianceToken)
      .send(update)
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.updateType).toBe('investigation');
  });

  it('Step 4: Compliance officer makes breach determination', async () => {
    const determination = {
      isBreachable: false,
      breachDeterminationNotes: 'No PHI was accessed or disclosed'
    };

    const response = await request(app)
      .post(`/api/incidents/${incidentId}/breach-determination`)
      .set('x-access-token', complianceToken)
      .send(determination)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.isBreachable).toBe(false);
    expect(response.body.data.breachDeterminationBy).toBe(complianceUser.id);
  });

  it('Step 5: Compliance officer updates status to remediated', async () => {
    const updates = {
      status: 'remediated',
      rootCause: 'Automated brute force attack',
      preventiveMeasures: 'Implemented rate limiting on login endpoint',
      remediationDate: new Date()
    };

    const response = await request(app)
      .put(`/api/incidents/${incidentId}`)
      .set('x-access-token', complianceToken)
      .send(updates)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe('remediated');
  });

  it('Step 6: Compliance officer closes the incident', async () => {
    const updates = {
      status: 'closed'
    };

    const response = await request(app)
      .put(`/api/incidents/${incidentId}`)
      .set('x-access-token', complianceToken)
      .send(updates)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe('closed');
  });

  it('Step 7: View incident timeline', async () => {
    const response = await request(app)
      .get(`/api/incidents/${incidentId}/updates`)
      .set('x-access-token', complianceToken)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.length).toBeGreaterThan(0);
  });

  it('Step 8: Verify incident statistics', async () => {
    const response = await request(app)
      .get('/api/incidents/statistics/summary')
      .set('x-access-token', complianceToken)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.totalIncidents).toBeGreaterThan(0);
  });
});

describe('E2E: User Onboarding and Training Workflow', () => {
  let newUserId, courseId1, courseId2, assignmentId1, assignmentId2;

  it('Step 1: Admin creates a new user account', async () => {
    const userData = {
      username: 'e2enewuser',
      email: 'e2enewuser@example.com',
      password: 'NewUser123!',
      firstName: 'New',
      lastName: 'Employee',
      position: 'Healthcare Worker',
      accountStatus: 'active'
    };

    const response = await request(app)
      .post('/api/auth/register')
      .set('x-access-token', adminToken)
      .send(userData)
      .expect(201);

    expect(response.body.success).toBe(true);
    newUserId = response.body.data.id;
  });

  it('Step 2: Admin creates mandatory training courses', async () => {
    // Course 1: HIPAA Privacy
    const course1 = await request(app)
      .post('/api/training/courses')
      .set('x-access-token', adminToken)
      .send({
        title: 'Onboarding HIPAA Privacy',
        contentType: 'video',
        durationMinutes: 45,
        status: 'active',
        passingScore: 80
      })
      .expect(201);

    courseId1 = course1.body.data.id;

    // Course 2: Security Awareness
    const course2 = await request(app)
      .post('/api/training/courses')
      .set('x-access-token', adminToken)
      .send({
        title: 'Onboarding Security Awareness',
        contentType: 'interactive',
        durationMinutes: 30,
        status: 'active',
        passingScore: 85
      })
      .expect(201);

    courseId2 = course2.body.data.id;
  });

  it('Step 3: Admin assigns both courses to new user', async () => {
    const assignment1 = await request(app)
      .post('/api/training/assignments')
      .set('x-access-token', adminToken)
      .send({
        userId: newUserId,
        courseId: courseId1,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      })
      .expect(201);

    assignmentId1 = assignment1.body.data.id;

    const assignment2 = await request(app)
      .post('/api/training/assignments')
      .set('x-access-token', adminToken)
      .send({
        userId: newUserId,
        courseId: courseId2,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      })
      .expect(201);

    assignmentId2 = assignment2.body.data.id;
  });

  it('Step 4: Verify new user has pending assignments', async () => {
    // Create a token for the new user
    const newUserToken = generateToken({ id: newUserId, username: 'e2enewuser' }).token;

    const response = await request(app)
      .get(`/api/training/assignments/user/${newUserId}`)
      .set('x-access-token', newUserToken)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.length).toBe(2);
    expect(response.body.data.filter(a => a.status === 'assigned').length).toBe(2);
  });
});

describe('E2E: Compliance Dashboard Workflow', () => {
  it('Step 1: Compliance officer views overall statistics', async () => {
    // Get training statistics
    const trainingStats = await request(app)
      .get('/api/training/statistics')
      .set('x-access-token', complianceToken)
      .expect(200);

    expect(trainingStats.body.success).toBe(true);

    // Get document statistics
    const docStats = await request(app)
      .get('/api/documents/statistics')
      .set('x-access-token', complianceToken)
      .expect(200);

    expect(docStats.body.success).toBe(true);

    // Get risk statistics
    const riskStats = await request(app)
      .get('/api/risk/statistics')
      .set('x-access-token', complianceToken)
      .expect(200);

    expect(riskStats.body.success).toBe(true);

    // Get incident statistics
    const incidentStats = await request(app)
      .get('/api/incidents/statistics/summary')
      .set('x-access-token', complianceToken)
      .expect(200);

    expect(incidentStats.body.success).toBe(true);
  });

  it('Step 2: Compliance officer reviews recent audit logs', async () => {
    const response = await request(app)
      .get('/api/audit/logs?limit=50')
      .set('x-access-token', complianceToken)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeInstanceOf(Array);
  });
});
