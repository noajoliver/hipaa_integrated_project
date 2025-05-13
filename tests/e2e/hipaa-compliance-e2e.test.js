/**
 * End-to-end tests for the HIPAA Compliance Tool
 * These tests validate the full application flow including all phases of implementation
 * @module tests/e2e/hipaa-compliance-e2e
 */
const request = require('supertest');
const app = require('../utils/mock-server');
const { connect, resetAndSeed, disconnect } = require('../utils/mock-db');
const { User, Document, Role, TrainingCourse, TrainingAssignment, Incident, RiskAssessment } = require('../../models');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');

// Global variables to store test data and authentication tokens
let adminToken, userToken, securityOfficerToken, complianceOfficerToken;
let testAdminUser, testRegularUser, testSecurityOfficer, testComplianceOfficer;
let testDocument, testCourse, testIncident, testRiskAssessment;

// Setup test environment
beforeAll(async () => {
  try {
    // Connect to test database
    await connect();
    
    // Reset database and seed with initial data
    await resetAndSeed();
    
    // Create test roles with specific permissions
    const adminRole = await Role.findOne({ where: { name: 'Admin' } });
    const userRole = await Role.findOne({ where: { name: 'User' } });
    
    // Create security and compliance roles
    const securityOfficerRole = await Role.create({
      name: 'Security Officer',
      description: 'Responsible for security operations',
      permissions: { canManageIncidents: true, canManageRisks: true }
    });
    
    const complianceOfficerRole = await Role.create({
      name: 'Compliance Officer',
      description: 'Responsible for compliance operations',
      permissions: { canManageDocuments: true, canManageTraining: true }
    });
    
    // Hash passwords for test users
    const hashedPassword = await bcrypt.hash('SecurePassword123!', 12);
    
    // Create test users with different roles
    testAdminUser = await User.findOne({ where: { username: 'admin' } });
    
    testRegularUser = await User.findOne({ where: { username: 'testuser' } });
    if (!testRegularUser) {
      testRegularUser = await User.create({
        username: 'testuser',
        email: 'testuser@example.com',
        password: hashedPassword,
        firstName: 'Test',
        lastName: 'User',
        position: 'Employee',
        roleId: userRole.id,
        accountStatus: 'active',
        mfaEnabled: false
      });
    }
    
    testSecurityOfficer = await User.create({
      username: 'securityofficer',
      email: 'security@example.com',
      password: hashedPassword,
      firstName: 'Security',
      lastName: 'Officer',
      position: 'Security Officer',
      roleId: securityOfficerRole.id,
      accountStatus: 'active',
      mfaEnabled: false
    });
    
    testComplianceOfficer = await User.create({
      username: 'complianceofficer',
      email: 'compliance@example.com',
      password: hashedPassword,
      firstName: 'Compliance',
      lastName: 'Officer',
      position: 'Compliance Officer',
      roleId: complianceOfficerRole.id,
      accountStatus: 'active',
      mfaEnabled: false
    });
    
    console.log('Test environment prepared successfully');
  } catch (error) {
    console.error('Failed to prepare test environment:', error);
    throw error;
  }
});

// Clean up after tests
afterAll(async () => {
  try {
    await disconnect();
    console.log('Test environment cleaned up successfully');
  } catch (error) {
    console.error('Failed to clean up test environment:', error);
  }
});

// Authentication Tests
describe('Authentication and User Management (Phase 1 & 3)', () => {
  
  it('should allow login for admin user', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'admin',
        password: 'Admin123!'
      });
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('user');
    expect(response.body.data.user.username).toBe('admin');
    
    // Store admin token for future requests
    adminToken = response.body.data.token;
    if (!adminToken) {
      // Try to extract from cookie if using httpOnly cookies
      const cookies = response.headers['set-cookie'];
      if (cookies) {
        const tokenCookie = cookies.find(cookie => cookie.startsWith('token='));
        if (tokenCookie) {
          adminToken = tokenCookie.split(';')[0].replace('token=', '');
        }
      }
    }
    
    expect(adminToken).toBeDefined();
  });
  
  it('should allow login for regular user', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'testuser',
        password: 'Admin123!'
      });
    
    expect(response.status).toBe(200);
    userToken = response.body.data.token;
    if (!userToken && response.headers['set-cookie']) {
      const cookies = response.headers['set-cookie'];
      const tokenCookie = cookies.find(cookie => cookie.startsWith('token='));
      if (tokenCookie) {
        userToken = tokenCookie.split(';')[0].replace('token=', '');
      }
    }
  });
  
  it('should allow login for security officer', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'securityofficer',
        password: 'SecurePassword123!'
      });
    
    expect(response.status).toBe(200);
    securityOfficerToken = response.body.data.token;
    if (!securityOfficerToken && response.headers['set-cookie']) {
      const cookies = response.headers['set-cookie'];
      const tokenCookie = cookies.find(cookie => cookie.startsWith('token='));
      if (tokenCookie) {
        securityOfficerToken = tokenCookie.split(';')[0].replace('token=', '');
      }
    }
  });
  
  it('should allow login for compliance officer', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'complianceofficer',
        password: 'SecurePassword123!'
      });
    
    expect(response.status).toBe(200);
    complianceOfficerToken = response.body.data.token;
    if (!complianceOfficerToken && response.headers['set-cookie']) {
      const cookies = response.headers['set-cookie'];
      const tokenCookie = cookies.find(cookie => cookie.startsWith('token='));
      if (tokenCookie) {
        complianceOfficerToken = tokenCookie.split(';')[0].replace('token=', '');
      }
    }
  });
  
  it('should reject login with invalid credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'admin',
        password: 'WrongPassword'
      });
    
    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });
  
  it('should get user profile with valid token', async () => {
    const response = await request(app)
      .get('/api/auth/profile')
      .set('Authorization', `Bearer ${adminToken}`);
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('username', 'admin');
    expect(response.body.data).not.toHaveProperty('password');
  });
  
  it('should deny access to protected routes without token', async () => {
    const response = await request(app)
      .get('/api/users');
    
    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });
});

// Document Management Tests
describe('Document Management (Phase 2 & 4)', () => {
  
  it('should allow compliance officer to create a document', async () => {
    const documentData = {
      title: 'HIPAA Security Policy',
      description: 'Comprehensive security policy for HIPAA compliance',
      documentType: 'policy',
      hipaaCategory: 'security',
      version: '1.0',
      status: 'active',
      reviewDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year from now
    };
    
    const response = await request(app)
      .post('/api/documents')
      .set('Authorization', `Bearer ${complianceOfficerToken}`)
      .send(documentData);
    
    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('id');
    expect(response.body.data).toHaveProperty('title', 'HIPAA Security Policy');
    
    // Store document for future tests
    testDocument = response.body.data;
  });
  
  it('should allow users to view documents', async () => {
    const response = await request(app)
      .get('/api/documents')
      .set('Authorization', `Bearer ${userToken}`);
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
  });
  
  it('should allow users to acknowledge a document', async () => {
    if (!testDocument) {
      console.warn('Test document not created, skipping acknowledgment test');
      return;
    }
    
    const response = await request(app)
      .post(`/api/documents/${testDocument.id}/acknowledge`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        notes: 'I have read and understood this policy'
      });
    
    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toContain('acknowledged');
  });
  
  it('should prevent users from creating documents', async () => {
    const documentData = {
      title: 'Unauthorized Document',
      description: 'This should not be allowed',
      documentType: 'policy',
      hipaaCategory: 'privacy',
      version: '1.0'
    };
    
    const response = await request(app)
      .post('/api/documents')
      .set('Authorization', `Bearer ${userToken}`)
      .send(documentData);
    
    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
  });
});

// Training Management Tests
describe('Training Management (Phase 3)', () => {
  
  it('should allow compliance officer to create a training course', async () => {
    const courseData = {
      title: 'HIPAA Awareness Training',
      description: 'Basic training for all employees on HIPAA compliance',
      content: 'Course content goes here...',
      duration: 60, // minutes
      passingScore: 80,
      status: 'active'
    };
    
    const response = await request(app)
      .post('/api/training')
      .set('Authorization', `Bearer ${complianceOfficerToken}`)
      .send(courseData);
    
    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('id');
    expect(response.body.data).toHaveProperty('title', 'HIPAA Awareness Training');
    
    // Store course for future tests
    testCourse = response.body.data;
  });
  
  it('should allow compliance officer to assign training to users', async () => {
    if (!testCourse) {
      console.warn('Test course not created, skipping assignment test');
      return;
    }
    
    const assignmentData = {
      userId: testRegularUser.id,
      courseId: testCourse.id,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
      required: true
    };
    
    const response = await request(app)
      .post('/api/training/assignments')
      .set('Authorization', `Bearer ${complianceOfficerToken}`)
      .send(assignmentData);
    
    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('id');
    expect(response.body.data).toHaveProperty('userId', testRegularUser.id);
    expect(response.body.data).toHaveProperty('courseId', testCourse.id);
    expect(response.body.data).toHaveProperty('status', 'assigned');
  });
  
  it('should allow users to view their training assignments', async () => {
    const response = await request(app)
      .get('/api/training/my-assignments')
      .set('Authorization', `Bearer ${userToken}`);
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
    
    // At least one assignment should be present (the one we just created)
    expect(response.body.data.length).toBeGreaterThan(0);
  });
  
  it('should allow users to complete a training assignment', async () => {
    // First get the user's assignments
    const assignmentsResponse = await request(app)
      .get('/api/training/my-assignments')
      .set('Authorization', `Bearer ${userToken}`);
    
    if (assignmentsResponse.body.data.length === 0) {
      console.warn('No training assignments found, skipping completion test');
      return;
    }
    
    const assignment = assignmentsResponse.body.data[0];
    
    const completionData = {
      score: 90, // Passing score
      completionDate: new Date().toISOString()
    };
    
    const response = await request(app)
      .put(`/api/training/assignments/${assignment.id}/complete`)
      .set('Authorization', `Bearer ${userToken}`)
      .send(completionData);
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('status', 'completed');
    expect(response.body.data).toHaveProperty('score', 90);
  });
});

// Incident Management Tests
describe('Incident Management (Phase 4)', () => {
  
  it('should allow security officer to create an incident', async () => {
    const incidentData = {
      title: 'Potential Data Breach',
      description: 'Suspicious login attempts detected from unknown IP',
      type: 'security',
      severity: 'high',
      status: 'open',
      reportedBy: testSecurityOfficer.id,
      reportedDate: new Date().toISOString(),
      affectedSystems: ['Authentication system'],
      potentialImpact: 'Unauthorized access to patient data'
    };
    
    const response = await request(app)
      .post('/api/incidents')
      .set('Authorization', `Bearer ${securityOfficerToken}`)
      .send(incidentData);
    
    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('id');
    expect(response.body.data).toHaveProperty('title', 'Potential Data Breach');
    
    // Store incident for future tests
    testIncident = response.body.data;
  });
  
  it('should allow security officer to update an incident', async () => {
    if (!testIncident) {
      console.warn('Test incident not created, skipping update test');
      return;
    }
    
    const updateData = {
      status: 'investigating',
      assignedTo: testSecurityOfficer.id
    };
    
    const response = await request(app)
      .put(`/api/incidents/${testIncident.id}`)
      .set('Authorization', `Bearer ${securityOfficerToken}`)
      .send(updateData);
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('status', 'investigating');
  });
  
  it('should allow security officer to add an incident update', async () => {
    if (!testIncident) {
      console.warn('Test incident not created, skipping incident update test');
      return;
    }
    
    const updateData = {
      comment: 'Initial investigation shows no data exfiltration',
      status: 'investigating',
      updatedBy: testSecurityOfficer.id
    };
    
    const response = await request(app)
      .post(`/api/incidents/${testIncident.id}/updates`)
      .set('Authorization', `Bearer ${securityOfficerToken}`)
      .send(updateData);
    
    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('incidentId', testIncident.id);
    expect(response.body.data).toHaveProperty('comment', updateData.comment);
  });
  
  it('should deny regular users from creating incidents', async () => {
    const incidentData = {
      title: 'Unauthorized Incident',
      description: 'This should not be allowed',
      type: 'security',
      severity: 'low',
      status: 'open'
    };
    
    const response = await request(app)
      .post('/api/incidents')
      .set('Authorization', `Bearer ${userToken}`)
      .send(incidentData);
    
    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
  });
});

// Risk Assessment Tests
describe('Risk Assessment (Phase 4)', () => {
  
  it('should allow security officer to create a risk assessment', async () => {
    const riskData = {
      title: 'Annual Security Risk Assessment',
      description: 'Comprehensive assessment of security controls',
      status: 'in_progress',
      startDate: new Date().toISOString(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
      assessor: testSecurityOfficer.id
    };
    
    const response = await request(app)
      .post('/api/risk/assessments')
      .set('Authorization', `Bearer ${securityOfficerToken}`)
      .send(riskData);
    
    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('id');
    expect(response.body.data).toHaveProperty('title', 'Annual Security Risk Assessment');
    
    // Store risk assessment for future tests
    testRiskAssessment = response.body.data;
  });
  
  it('should allow security officer to add risk items', async () => {
    if (!testRiskAssessment) {
      console.warn('Test risk assessment not created, skipping risk item test');
      return;
    }
    
    const riskItemData = {
      assessmentId: testRiskAssessment.id,
      category: 'technical',
      title: 'Weak password policies',
      description: 'Current password policies do not enforce sufficient complexity',
      likelihood: 'high',
      impact: 'high',
      currentControls: 'Basic password requirements',
      recommendedControls: 'Implement stronger password complexity requirements',
      mitigationPlan: 'Update password policy and implement technical controls',
      status: 'open'
    };
    
    const response = await request(app)
      .post('/api/risk/items')
      .set('Authorization', `Bearer ${securityOfficerToken}`)
      .send(riskItemData);
    
    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('id');
    expect(response.body.data).toHaveProperty('assessmentId', testRiskAssessment.id);
    expect(response.body.data).toHaveProperty('title', 'Weak password policies');
  });
});

// Audit Logging Tests
describe('Audit Logging (Phase 5)', () => {
  
  it('should record audit logs for user actions', async () => {
    // Perform an action that should be logged (viewing user profile)
    await request(app)
      .get('/api/auth/profile')
      .set('Authorization', `Bearer ${adminToken}`);
    
    // Now check the audit logs
    const response = await request(app)
      .get('/api/audit/logs')
      .set('Authorization', `Bearer ${adminToken}`);
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data.length).toBeGreaterThan(0);
    
    // Verify pagination metadata is present
    expect(response.body).toHaveProperty('meta');
    expect(response.body.meta).toHaveProperty('total');
    expect(response.body.meta).toHaveProperty('page');
    expect(response.body.meta).toHaveProperty('limit');
  });
  
  it('should filter audit logs by date range', async () => {
    const today = new Date();
    const startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7); // One week ago
    
    const response = await request(app)
      .get(`/api/audit/logs?startDate=${startDate.toISOString()}&endDate=${today.toISOString()}`)
      .set('Authorization', `Bearer ${adminToken}`);
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
  });
  
  it('should deny regular users access to audit logs', async () => {
    const response = await request(app)
      .get('/api/audit/logs')
      .set('Authorization', `Bearer ${userToken}`);
    
    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
  });
});

// Security Features Tests
describe('Security Features (Phase 5)', () => {
  
  it('should enforce password complexity', async () => {
    // Try to update user with a weak password
    const response = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        currentPassword: 'Admin123!',
        newPassword: 'weak'
      });
    
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('password');
  });
  
  it('should reject requests with expired tokens', async () => {
    // Create an expired token
    const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
    
    const response = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${expiredToken}`);
    
    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });
  
  it('should return CSRF token for protected forms', async () => {
    const response = await request(app)
      .get('/api/auth/csrf-token')
      .set('Authorization', `Bearer ${userToken}`);
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body).toHaveProperty('csrfToken');
  });
});

// API Documentation and Maintainability Tests
describe('Documentation and Maintainability (Phase 6)', () => {
  
  it('should provide OpenAPI documentation', async () => {
    const response = await request(app)
      .get('/api-docs');
    
    expect(response.status).toBe(200);
    // Response should be HTML or JSON depending on implementation
    expect(response.text).toBeDefined();
  });
  
  it('should follow consistent API response format', async () => {
    const response = await request(app)
      .get('/api/health');
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('data');
    expect(response.body.data).toHaveProperty('status', 'healthy');
  });
});