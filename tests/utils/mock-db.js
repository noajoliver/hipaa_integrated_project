/**
 * Mock database provider for tests
 * This allows tests to run without an actual database connection
 * @module tests/utils/mock-db
 */
const SequelizeMock = require('sequelize-mock');
const models = require('../../models');

// Create a mock sequelize instance
const sequelize = new SequelizeMock();

// Mock models
const mockModels = {};

// Initialize all mock models
const initMockModels = () => {
  // Mock User model
  mockModels.User = sequelize.define('User', {
    id: 1,
    username: 'admin',
    email: 'admin@example.com',
    password: '$2b$10$X.VhWnPjCWHv4.wZp.AXZOGJpVOdnl4JCJHKu/YMlMhh7.SCuW9hO', // Hashed 'Admin123!'
    firstName: 'Admin',
    lastName: 'User',
    position: 'Administrator',
    departmentId: 1,
    roleId: 1,
    accountStatus: 'active',
    mfaEnabled: false,
    mfaSecret: null,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  // Mock Role model
  mockModels.Role = sequelize.define('Role', {
    id: 1,
    name: 'Admin',
    description: 'Administrator role',
    permissions: { isAdmin: true },
    createdAt: new Date(),
    updatedAt: new Date()
  });

  // Mock Department model
  mockModels.Department = sequelize.define('Department', {
    id: 1,
    name: 'IT',
    description: 'Information Technology',
    createdAt: new Date(),
    updatedAt: new Date()
  });

  // Mock Document model
  mockModels.Document = sequelize.define('Document', {
    id: 1,
    title: 'HIPAA Security Policy',
    description: 'Comprehensive security policy for HIPAA compliance',
    filePath: null,
    version: '1.0',
    status: 'active',
    reviewDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    documentType: 'policy',
    hipaaCategory: 'security',
    createdBy: 1,
    categoryId: 1,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  // Mock DocumentCategory model
  mockModels.DocumentCategory = sequelize.define('DocumentCategory', {
    id: 1,
    name: 'Security',
    description: 'Security-related documents',
    parentId: null,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  // Mock DocumentAcknowledgment model
  mockModels.DocumentAcknowledgment = sequelize.define('DocumentAcknowledgment', {
    id: 1,
    documentId: 1,
    userId: 2,
    acknowledgmentDate: new Date(),
    ipAddress: '127.0.0.1',
    notes: 'Acknowledged during test',
    createdAt: new Date(),
    updatedAt: new Date()
  });

  // Mock TrainingCourse model
  mockModels.TrainingCourse = sequelize.define('TrainingCourse', {
    id: 1,
    title: 'HIPAA Awareness Training',
    description: 'Basic training for all employees on HIPAA compliance',
    content: 'Course content goes here...',
    duration: 60, // minutes
    passingScore: 80,
    status: 'active',
    createdBy: 1,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  // Mock TrainingAssignment model
  mockModels.TrainingAssignment = sequelize.define('TrainingAssignment', {
    id: 1,
    userId: 2,
    courseId: 1,
    assignedBy: 1,
    assignedDate: new Date(),
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    completedDate: null,
    status: 'assigned',
    score: null,
    required: true,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  // Mock Incident model
  mockModels.Incident = sequelize.define('Incident', {
    id: 1,
    title: 'Potential Data Breach',
    description: 'Suspicious login attempts detected from unknown IP',
    type: 'security',
    severity: 'high',
    status: 'open',
    reportedBy: 1,
    reportedDate: new Date(),
    assignedTo: null,
    affectedSystems: ['Authentication system'],
    potentialImpact: 'Unauthorized access to patient data',
    createdAt: new Date(),
    updatedAt: new Date()
  });

  // Mock IncidentUpdate model
  mockModels.IncidentUpdate = sequelize.define('IncidentUpdate', {
    id: 1,
    incidentId: 1,
    comment: 'Initial investigation started',
    status: 'investigating',
    updatedBy: 1,
    updatedDate: new Date(),
    createdAt: new Date(),
    updatedAt: new Date()
  });

  // Mock RiskAssessment model
  mockModels.RiskAssessment = sequelize.define('RiskAssessment', {
    id: 1,
    title: 'Annual Security Risk Assessment',
    description: 'Comprehensive assessment of security controls',
    status: 'in_progress',
    startDate: new Date(),
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    assessor: 1,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  // Mock RiskItem model
  mockModels.RiskItem = sequelize.define('RiskItem', {
    id: 1,
    assessmentId: 1,
    category: 'technical',
    title: 'Weak password policies',
    description: 'Current password policies do not enforce sufficient complexity',
    likelihood: 'high',
    impact: 'high',
    riskScore: 25,
    currentControls: 'Basic password requirements',
    recommendedControls: 'Implement stronger password complexity requirements',
    mitigationPlan: 'Update password policy and implement technical controls',
    status: 'open',
    createdAt: new Date(),
    updatedAt: new Date()
  });

  // Mock AuditLog model
  mockModels.AuditLog = sequelize.define('AuditLog', {
    id: 1,
    userId: 1,
    action: 'LOGIN',
    entityType: 'User',
    entityId: 1,
    timestamp: new Date(),
    ipAddress: '127.0.0.1',
    userAgent: 'Test User Agent',
    details: JSON.stringify({
      method: 'POST',
      path: '/api/auth/login',
      query: {},
      params: {},
      body: { username: 'admin', password: '[REDACTED]' }
    }),
    hash: 'abc123', // For tamper evidence
    createdAt: new Date(),
    updatedAt: new Date()
  });

  // Add associations and methods as needed
  mockModels.sequelize = sequelize;

  // Add createWithHash method to AuditLog
  mockModels.AuditLog.createWithHash = jest.fn().mockImplementation(async (data) => {
    return mockModels.AuditLog.create({
      ...data,
      hash: 'mockHash123'
    });
  });

  return mockModels;
};

// Initialize mock database
const connect = async () => {
  console.log('Connecting to mock database...');
  return sequelize;
};

// Reset and seed the mock database
const resetAndSeed = async () => {
  console.log('Resetting and seeding mock database...');
  // Clear any existing mocks
  Object.keys(mockModels).forEach(key => {
    delete mockModels[key];
  });
  
  // Initialize models with fresh data
  initMockModels();
  
  // Add test users
  await mockModels.User.create({
    id: 2,
    username: 'testuser',
    email: 'test@example.com',
    password: '$2b$10$X.VhWnPjCWHv4.wZp.AXZOGJpVOdnl4JCJHKu/YMlMhh7.SCuW9hO', // Hashed 'Admin123!'
    firstName: 'Test',
    lastName: 'User',
    position: 'Employee',
    departmentId: 1,
    roleId: 2,
    accountStatus: 'active',
    mfaEnabled: false,
    mfaSecret: null
  });
  
  // Add user role
  await mockModels.Role.create({
    id: 2,
    name: 'User',
    description: 'Regular user role',
    permissions: {}
  });
  
  console.log('Mock database seeded successfully');
  return mockModels;
};

// Disconnect from mock database
const disconnect = async () => {
  console.log('Disconnecting from mock database...');
  return;
};

module.exports = {
  sequelize,
  connect,
  resetAndSeed,
  disconnect,
  mockModels
};