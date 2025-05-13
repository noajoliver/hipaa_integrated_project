// Integration tests for the enhanced HIPAA compliance tool features

// This file contains test cases for the newly added features:
// 1. Risk Assessment
// 2. Incident Management
// 3. Enhanced Audit Logging
// 4. Advanced Reporting

const request = require('supertest');
const app = require('../server');
const { sequelize } = require('../models');
const jwt = require('jsonwebtoken');
const config = require('../config/auth.config');

// Mock user for testing
const testUser = {
  id: 1,
  username: 'admin',
  email: 'admin@example.com',
  firstName: 'Admin',
  lastName: 'User',
  roles: ['admin', 'compliance_officer']
};

// Generate test token
const generateToken = (user) => {
  return jwt.sign({ id: user.id }, config.secret, {
    expiresIn: 86400 // 24 hours
  });
};

const token = generateToken(testUser);

describe('Risk Assessment Feature Tests', () => {
  let riskAssessmentId;
  let riskItemId;

  // Test creating a risk assessment
  test('Should create a new risk assessment', async () => {
    const res = await request(app)
      .post('/api/risk/assessments')
      .set('x-access-token', token)
      .send({
        title: 'Test Risk Assessment',
        description: 'This is a test risk assessment',
        methodology: 'NIST Cybersecurity Framework',
        scope: 'All systems containing PHI'
      });

    expect(res.statusCode).toEqual(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('id');
    expect(res.body.data.title).toEqual('Test Risk Assessment');
    
    riskAssessmentId = res.body.data.id;
  });

  // Test retrieving risk assessments
  test('Should retrieve all risk assessments', async () => {
    const res = await request(app)
      .get('/api/risk/assessments')
      .set('x-access-token', token);

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  // Test creating a risk item
  test('Should create a new risk item', async () => {
    const res = await request(app)
      .post('/api/risk/items')
      .set('x-access-token', token)
      .send({
        assessmentId: riskAssessmentId,
        category: 'technical',
        assetName: 'EHR System',
        description: 'Potential unauthorized access to PHI',
        threatSource: 'External hacker',
        threatAction: 'Brute force attack',
        vulnerabilityDescription: 'Weak password policy',
        existingControls: 'Basic password requirements',
        likelihood: 'medium',
        impact: 'high',
        recommendedControls: 'Implement multi-factor authentication',
        mitigationPlan: 'Deploy MFA solution by end of quarter'
      });

    expect(res.statusCode).toEqual(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('id');
    expect(res.body.data.riskLevel).toEqual('high');
    
    riskItemId = res.body.data.id;
  });

  // Test retrieving risk items for an assessment
  test('Should retrieve risk items for an assessment', async () => {
    const res = await request(app)
      .get(`/api/risk/assessments/${riskAssessmentId}/items`)
      .set('x-access-token', token);

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  // Test updating a risk item
  test('Should update a risk item', async () => {
    const res = await request(app)
      .put(`/api/risk/items/${riskItemId}`)
      .set('x-access-token', token)
      .send({
        mitigationStatus: 'in_progress',
        mitigationPlan: 'MFA implementation in progress, expected completion in 2 weeks'
      });

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.mitigationStatus).toEqual('in_progress');
  });

  // Test risk statistics
  test('Should retrieve risk statistics', async () => {
    const res = await request(app)
      .get('/api/risk/statistics')
      .set('x-access-token', token);

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('riskItems');
    expect(res.body.data.riskItems).toHaveProperty('byLevel');
  });
});

describe('Incident Management Feature Tests', () => {
  let incidentId;

  // Test creating an incident
  test('Should create a new incident', async () => {
    const res = await request(app)
      .post('/api/incidents')
      .set('x-access-token', token)
      .send({
        title: 'Test Security Incident',
        description: 'This is a test security incident',
        incidentDate: new Date().toISOString(),
        severity: 'medium',
        category: 'privacy',
        location: 'Remote office',
        affectedSystems: 'Email system',
        affectedData: 'Patient contact information',
        isBreachable: false
      });

    expect(res.statusCode).toEqual(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('id');
    expect(res.body.data.title).toEqual('Test Security Incident');
    
    incidentId = res.body.data.id;
  });

  // Test retrieving incidents
  test('Should retrieve all incidents', async () => {
    const res = await request(app)
      .get('/api/incidents')
      .set('x-access-token', token);

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  // Test updating an incident
  test('Should update an incident', async () => {
    const res = await request(app)
      .put(`/api/incidents/${incidentId}`)
      .set('x-access-token', token)
      .send({
        status: 'under_investigation',
        containmentActions: 'Email account locked, password reset initiated'
      });

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toEqual('under_investigation');
  });

  // Test adding an update to an incident
  test('Should add an update to an incident', async () => {
    const res = await request(app)
      .post(`/api/incidents/${incidentId}/updates`)
      .set('x-access-token', token)
      .send({
        description: 'Initial investigation complete. No evidence of data exfiltration found.',
        updateType: 'investigation'
      });

    expect(res.statusCode).toEqual(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.description).toContain('Initial investigation complete');
  });

  // Test making a breach determination
  test('Should make a breach determination', async () => {
    const res = await request(app)
      .post(`/api/incidents/${incidentId}/breach-determination`)
      .set('x-access-token', token)
      .send({
        isBreachable: false,
        breachDeterminationNotes: 'After thorough investigation, determined this is not a reportable breach.'
      });

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.isBreachable).toBe(false);
  });

  // Test incident statistics
  test('Should retrieve incident statistics', async () => {
    const res = await request(app)
      .get('/api/incidents/statistics/summary')
      .set('x-access-token', token);

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('totalIncidents');
    expect(res.body.data).toHaveProperty('byStatus');
  });
});

describe('Enhanced Audit Logging Feature Tests', () => {
  // Test retrieving audit logs with filtering
  test('Should retrieve filtered audit logs', async () => {
    const res = await request(app)
      .get('/api/audit?action=login&limit=10')
      .set('x-access-token', token);

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('pagination');
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  // Test retrieving audit log statistics
  test('Should retrieve audit log statistics', async () => {
    const res = await request(app)
      .get('/api/audit/statistics')
      .set('x-access-token', token);

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('totalLogs');
    expect(res.body.data).toHaveProperty('logsByAction');
  });

  // Test retrieving available audit log filters
  test('Should retrieve available audit log filters', async () => {
    const res = await request(app)
      .get('/api/audit/filters')
      .set('x-access-token', token);

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('actions');
    expect(res.body.data).toHaveProperty('entityTypes');
  });

  // Test exporting audit logs
  test('Should export audit logs', async () => {
    const res = await request(app)
      .get('/api/audit/export')
      .set('x-access-token', token);

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

describe('Advanced Reporting Feature Tests', () => {
  // Test retrieving available report types
  test('Should retrieve available report types', async () => {
    const res = await request(app)
      .get('/api/reports/types')
      .set('x-access-token', token);

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('reportTypes');
    expect(res.body.data).toHaveProperty('reportSections');
  });

  // Test generating a comprehensive report
  test('Should generate a comprehensive report', async () => {
    const res = await request(app)
      .post('/api/reports/comprehensive')
      .set('x-access-token', token)
      .send({
        startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString(),
        endDate: new Date().toISOString(),
        includeTraining: true,
        includeDocuments: true,
        includeCompliance: true,
        includeRisks: true,
        includeIncidents: true,
        includeAudit: true
      });

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('summary');
    expect(res.body.data).toHaveProperty('details');
  });

  // Test generating an executive summary report
  test('Should generate an executive summary report', async () => {
    const res = await request(app)
      .post('/api/reports/executive-summary')
      .set('x-access-token', token)
      .send({
        startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString(),
        endDate: new Date().toISOString()
      });

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('summary');
    expect(res.body.data.summary).toHaveProperty('overallComplianceScore');
  });

  // Test generating a custom report
  test('Should generate a custom report', async () => {
    const res = await request(app)
      .post('/api/reports/custom')
      .set('x-access-token', token)
      .send({
        title: 'Custom Test Report',
        startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString(),
        endDate: new Date().toISOString(),
        sections: ['risk_summary', 'incident_summary', 'training_summary']
      });

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('sections');
    expect(res.body.data.sections).toHaveProperty('riskSummary');
    expect(res.body.data.sections).toHaveProperty('incidentSummary');
    expect(res.body.data.sections).toHaveProperty('trainingSummary');
  });
});

// Integration tests to ensure new features work with existing functionality
describe('Integration Tests', () => {
  // Test that risk assessments appear in reports
  test('Risk assessments should appear in compliance reports', async () => {
    const res = await request(app)
      .post('/api/reports/comprehensive')
      .set('x-access-token', token)
      .send({
        includeRisks: true
      });

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.summary).toHaveProperty('risks');
  });

  // Test that incidents appear in reports
  test('Incidents should appear in compliance reports', async () => {
    const res = await request(app)
      .post('/api/reports/comprehensive')
      .set('x-access-token', token)
      .send({
        includeIncidents: true
      });

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.summary).toHaveProperty('incidents');
  });

  // Test that audit logs are generated for risk assessment actions
  test('Audit logs should be generated for risk assessment actions', async () => {
    // First create a risk assessment to generate audit logs
    await request(app)
      .post('/api/risk/assessments')
      .set('x-access-token', token)
      .send({
        title: 'Integration Test Risk Assessment',
        description: 'This is a test risk assessment for integration testing'
      });

    // Then check audit logs for the action
    const res = await request(app)
      .get('/api/audit?entityType=risk_assessment')
      .set('x-access-token', token);

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    // At least one audit log should exist for risk assessment
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  // Test that audit logs are generated for incident management actions
  test('Audit logs should be generated for incident management actions', async () => {
    // First create an incident to generate audit logs
    await request(app)
      .post('/api/incidents')
      .set('x-access-token', token)
      .send({
        title: 'Integration Test Incident',
        description: 'This is a test incident for integration testing',
        category: 'security'
      });

    // Then check audit logs for the action
    const res = await request(app)
      .get('/api/audit?entityType=incident')
      .set('x-access-token', token);

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    // At least one audit log should exist for incidents
    expect(res.body.data.length).toBeGreaterThan(0);
  });
});

// Clean up after tests
afterAll(async () => {
  await sequelize.close();
});
