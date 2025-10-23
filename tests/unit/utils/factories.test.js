/**
 * Test Data Factories Tests
 *
 * Tests for the test data factory methods
 *
 * @module tests/unit/utils/factories
 */

const Factories = require('../../utils/factories');
const { sequelize } = require('../../../models');

describe('Test Data Factories', () => {
  beforeAll(async () => {
    // Connect to test database
    await sequelize.authenticate();
  });

  afterAll(async () => {
    // Clean up and close connection
    await Factories.cleanup();
    await sequelize.close();
  });

  beforeEach(async () => {
    // Clean up before each test
    await Factories.cleanup();
  });

  describe('Role Factories', () => {
    it('should create a role with default values', async () => {
      const role = await Factories.createRole();

      expect(role).toBeDefined();
      expect(role.id).toBeDefined();
      expect(role.name).toBeDefined();
      expect(['User', 'Admin', 'Compliance Officer', 'Manager', 'Auditor']).toContain(role.name);
    });

    it('should create a role with custom values', async () => {
      const role = await Factories.createRole({
        name: 'Custom Role',
        description: 'A custom test role'
      });

      expect(role.name).toBe('Custom Role');
      expect(role.description).toBe('A custom test role');
    });

    it('should get or create a role by name', async () => {
      const role1 = await Factories.getOrCreateRole('Admin');
      const role2 = await Factories.getOrCreateRole('Admin');

      expect(role1.id).toBe(role2.id);
      expect(role1.name).toBe('Admin');
    });
  });

  describe('Department Factories', () => {
    it('should create a department with default values', async () => {
      const department = await Factories.createDepartment();

      expect(department).toBeDefined();
      expect(department.id).toBeDefined();
      expect(department.name).toBeDefined();
      expect(department.description).toBeDefined();
    });

    it('should create a department with custom values', async () => {
      const department = await Factories.createDepartment({
        name: 'IT Department',
        description: 'Information Technology'
      });

      expect(department.name).toBe('IT Department');
      expect(department.description).toBe('Information Technology');
    });
  });

  describe('User Factories', () => {
    it('should create a user with default values', async () => {
      const user = await Factories.createUser();

      expect(user).toBeDefined();
      expect(user.id).toBeDefined();
      expect(user.username).toBeDefined();
      expect(user.email).toBeDefined();
      expect(user.firstName).toBeDefined();
      expect(user.lastName).toBeDefined();
      expect(user.roleId).toBeDefined();
      expect(user.accountStatus).toBe('active');
    });

    it('should create a user with custom values', async () => {
      const user = await Factories.createUser({
        username: 'testuser',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User'
      });

      expect(user.username).toBe('testuser');
      expect(user.email).toBe('test@example.com');
      expect(user.firstName).toBe('Test');
      expect(user.lastName).toBe('User');
    });

    it('should create an admin user', async () => {
      const admin = await Factories.createAdmin();

      expect(admin).toBeDefined();
      expect(admin.position).toBe('System Administrator');
      // Role should be Admin
      expect(admin.roleId).toBeDefined();
    });

    it('should create a compliance officer', async () => {
      const officer = await Factories.createComplianceOfficer();

      expect(officer).toBeDefined();
      expect(officer.position).toBe('Compliance Officer');
      expect(officer.roleId).toBeDefined();
    });

    it('should create a manager', async () => {
      const manager = await Factories.createManager();

      expect(manager).toBeDefined();
      expect(manager.position).toBe('Department Manager');
      expect(manager.roleId).toBeDefined();
    });

    it('should create an inactive user', async () => {
      const user = await Factories.createInactiveUser();

      expect(user.accountStatus).toBe('inactive');
    });

    it('should create a locked user', async () => {
      const user = await Factories.createLockedUser();

      expect(user.accountStatus).toBe('locked');
      expect(user.failedLoginAttempts).toBe(5);
      expect(user.accountLockExpiresAt).toBeDefined();
    });
  });

  describe('Training Course Factories', () => {
    it('should create a training course with default values', async () => {
      const course = await Factories.createCourse();

      expect(course).toBeDefined();
      expect(course.id).toBeDefined();
      expect(course.title).toBeDefined();
      expect(course.description).toBeDefined();
      expect(['video', 'document', 'quiz', 'interactive', 'webinar', 'classroom']).toContain(course.contentType);
      expect(course.status).toBe('active');
      expect(course.version).toBe('1.0');
    });

    it('should create a course with custom values', async () => {
      const course = await Factories.createCourse({
        title: 'HIPAA Security Training',
        durationMinutes: 60,
        passingScore: 85
      });

      expect(course.title).toBe('HIPAA Security Training');
      expect(course.durationMinutes).toBe(60);
      expect(course.passingScore).toBe(85);
    });

    it('should create a draft course', async () => {
      const course = await Factories.createDraftCourse();

      expect(course.status).toBe('draft');
    });

    it('should create an archived course', async () => {
      const course = await Factories.createArchivedCourse();

      expect(course.status).toBe('archived');
    });
  });

  describe('Training Assignment Factories', () => {
    let user, course;

    beforeEach(async () => {
      user = await Factories.createUser();
      course = await Factories.createCourse();
    });

    it('should create a training assignment', async () => {
      const assignment = await Factories.createAssignment(user.id, course.id);

      expect(assignment).toBeDefined();
      expect(assignment.userId).toBe(user.id);
      expect(assignment.courseId).toBe(course.id);
      expect(assignment.status).toBe('assigned');
      expect(assignment.assignedDate).toBeDefined();
      expect(assignment.dueDate).toBeDefined();
    });

    it('should create a completed assignment', async () => {
      const assignment = await Factories.createCompletedAssignment(user.id, course.id);

      expect(assignment.status).toBe('completed');
      expect(assignment.completionDate).toBeDefined();
      expect(assignment.score).toBeGreaterThanOrEqual(80);
    });

    it('should create an assignment with custom values', async () => {
      const assignment = await Factories.createAssignment(user.id, course.id, {
        status: 'in_progress',
        notes: 'Custom notes'
      });

      expect(assignment.status).toBe('in_progress');
      expect(assignment.notes).toBe('Custom notes');
    });
  });

  describe('Document Factories', () => {
    let user;

    beforeEach(async () => {
      user = await Factories.createUser();
    });

    it('should create a document with default values', async () => {
      const document = await Factories.createDocument(user.id);

      expect(document).toBeDefined();
      expect(document.id).toBeDefined();
      expect(document.title).toBeDefined();
      expect(document.description).toBeDefined();
      expect(document.filePath).toBeDefined();
      expect(document.createdBy).toBe(user.id);
      expect(document.status).toBe('active');
      expect(['policy', 'procedure', 'form', 'template', 'reference', 'other']).toContain(document.documentType);
      expect(['privacy', 'security', 'breach_notification', 'general', 'other']).toContain(document.hipaaCategory);
    });

    it('should create a document with custom values', async () => {
      const document = await Factories.createDocument(user.id, {
        title: 'Privacy Policy',
        documentType: 'policy',
        hipaaCategory: 'privacy'
      });

      expect(document.title).toBe('Privacy Policy');
      expect(document.documentType).toBe('policy');
      expect(document.hipaaCategory).toBe('privacy');
    });

    it('should create a draft document', async () => {
      const document = await Factories.createDraftDocument(user.id);

      expect(document.status).toBe('draft');
    });

    it('should create a policy document', async () => {
      const document = await Factories.createPolicyDocument(user.id);

      expect(document.documentType).toBe('policy');
      expect(document.hipaaCategory).toBe('privacy');
    });
  });

  describe('Document Acknowledgment Factories', () => {
    let user, document;

    beforeEach(async () => {
      user = await Factories.createUser();
      document = await Factories.createDocument(user.id);
    });

    it('should create a document acknowledgment', async () => {
      const acknowledgment = await Factories.createAcknowledgment(user.id, document.id);

      expect(acknowledgment).toBeDefined();
      expect(acknowledgment.userId).toBe(user.id);
      expect(acknowledgment.documentId).toBe(document.id);
      expect(acknowledgment.acknowledgmentDate).toBeDefined();
      expect(acknowledgment.ipAddress).toBeDefined();
    });

    it('should create an acknowledgment with custom IP', async () => {
      const acknowledgment = await Factories.createAcknowledgment(user.id, document.id, {
        ipAddress: '192.168.1.100'
      });

      expect(acknowledgment.ipAddress).toBe('192.168.1.100');
    });
  });

  describe('Incident Factories', () => {
    let user;

    beforeEach(async () => {
      user = await Factories.createUser();
    });

    it('should create an incident with default values', async () => {
      const incident = await Factories.createIncident(user.id);

      expect(incident).toBeDefined();
      expect(incident.id).toBeDefined();
      expect(incident.title).toBeDefined();
      expect(incident.description).toBeDefined();
      expect(incident.reportedBy).toBe(user.id);
      expect(incident.status).toBe('reported');
      expect(['low', 'medium', 'high', 'critical']).toContain(incident.severity);
      expect(incident.category).toBeDefined();
    });

    it('should create a critical incident', async () => {
      const incident = await Factories.createCriticalIncident(user.id);

      expect(incident.severity).toBe('critical');
      expect(incident.isBreachable).toBe(true);
    });

    it('should create a closed incident', async () => {
      const admin = await Factories.createAdmin();
      const incident = await Factories.createClosedIncident(user.id, admin.id);

      expect(incident.status).toBe('closed');
      expect(incident.closedBy).toBe(admin.id);
      expect(incident.closedDate).toBeDefined();
      expect(incident.remediationPlan).toBeDefined();
      expect(incident.rootCause).toBeDefined();
    });

    it('should create an incident with custom values', async () => {
      const incident = await Factories.createIncident(user.id, {
        title: 'Test Incident',
        severity: 'high',
        category: 'security'
      });

      expect(incident.title).toBe('Test Incident');
      expect(incident.severity).toBe('high');
      expect(incident.category).toBe('security');
    });
  });

  describe('Incident Update Factories', () => {
    let user, incident;

    beforeEach(async () => {
      user = await Factories.createUser();
      incident = await Factories.createIncident(user.id);
    });

    it('should create an incident update', async () => {
      const update = await Factories.createIncidentUpdate(incident.id, user.id);

      expect(update).toBeDefined();
      expect(update.incidentId).toBe(incident.id);
      expect(update.updatedBy).toBe(user.id);
      expect(update.description).toBeDefined();
      expect(['status_change', 'comment', 'investigation', 'remediation']).toContain(update.updateType);
    });

    it('should create an update with custom type', async () => {
      const update = await Factories.createIncidentUpdate(incident.id, user.id, {
        updateType: 'status_change',
        previousStatus: 'reported',
        newStatus: 'under_investigation'
      });

      expect(update.updateType).toBe('status_change');
      expect(update.previousStatus).toBe('reported');
      expect(update.newStatus).toBe('under_investigation');
    });
  });

  describe('Risk Assessment Factories', () => {
    let user;

    beforeEach(async () => {
      user = await Factories.createComplianceOfficer();
    });

    it('should create a risk assessment with default values', async () => {
      const assessment = await Factories.createRiskAssessment(user.id);

      expect(assessment).toBeDefined();
      expect(assessment.id).toBeDefined();
      expect(assessment.title).toBeDefined();
      expect(assessment.conductedBy).toBe(user.id);
      expect(assessment.status).toBe('draft');
      expect(assessment.methodology).toBe('NIST SP 800-30');
    });

    it('should create a completed risk assessment', async () => {
      const approver = await Factories.createAdmin();
      const assessment = await Factories.createCompletedRiskAssessment(user.id, approver.id);

      expect(assessment.status).toBe('completed');
      expect(assessment.approvedBy).toBe(approver.id);
      expect(assessment.approvalDate).toBeDefined();
    });

    it('should create an assessment with custom values', async () => {
      const assessment = await Factories.createRiskAssessment(user.id, {
        title: 'Q4 2024 Risk Assessment',
        methodology: 'Custom Framework'
      });

      expect(assessment.title).toBe('Q4 2024 Risk Assessment');
      expect(assessment.methodology).toBe('Custom Framework');
    });
  });

  describe('Risk Item Factories', () => {
    let user, assessment;

    beforeEach(async () => {
      user = await Factories.createComplianceOfficer();
      assessment = await Factories.createRiskAssessment(user.id);
    });

    it('should create a risk item with default values', async () => {
      const riskItem = await Factories.createRiskItem(assessment.id);

      expect(riskItem).toBeDefined();
      expect(riskItem.assessmentId).toBe(assessment.id);
      expect(riskItem.category).toBeDefined();
      expect(riskItem.assetName).toBeDefined();
      expect(riskItem.description).toBeDefined();
      expect(['low', 'medium', 'high']).toContain(riskItem.likelihood);
      expect(['low', 'medium', 'high']).toContain(riskItem.impact);
      expect(['low', 'medium', 'high', 'critical']).toContain(riskItem.riskLevel);
      expect(riskItem.mitigationStatus).toBe('not_started');
    });

    it('should create a high-risk item', async () => {
      const riskItem = await Factories.createHighRiskItem(assessment.id);

      expect(riskItem.likelihood).toBe('high');
      expect(riskItem.impact).toBe('high');
      expect(riskItem.riskLevel).toBe('critical');
    });

    it('should create a risk item with custom values', async () => {
      const riskItem = await Factories.createRiskItem(assessment.id, {
        category: 'technical',
        assetName: 'Patient Database',
        likelihood: 'high',
        impact: 'high'
      });

      expect(riskItem.category).toBe('technical');
      expect(riskItem.assetName).toBe('Patient Database');
      expect(riskItem.likelihood).toBe('high');
      expect(riskItem.impact).toBe('high');
    });
  });

  describe('Audit Log Factories', () => {
    let user;

    beforeEach(async () => {
      user = await Factories.createUser();
    });

    it('should create an audit log with default values', async () => {
      const auditLog = await Factories.createAuditLog(user.id);

      expect(auditLog).toBeDefined();
      expect(auditLog.userId).toBe(user.id);
      expect(['CREATE', 'READ', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT']).toContain(auditLog.action);
      expect(['User', 'Document', 'Incident', 'RiskAssessment', 'TrainingCourse']).toContain(auditLog.entityType);
      expect(auditLog.ipAddress).toBeDefined();
    });

    it('should create an audit log with custom values', async () => {
      const auditLog = await Factories.createAuditLog(user.id, {
        action: 'LOGIN',
        entityType: 'User',
        entityId: String(user.id),
        ipAddress: '192.168.1.1'
      });

      expect(auditLog.action).toBe('LOGIN');
      expect(auditLog.entityType).toBe('User');
      expect(auditLog.entityId).toBe(String(user.id));
      expect(auditLog.ipAddress).toBe('192.168.1.1');
    });
  });

  describe('Utility Methods', () => {
    it('should create multiple records using createMultiple', async () => {
      const users = await Factories.createMultiple(Factories.createUser, 5);

      expect(users).toHaveLength(5);
      expect(users[0]).toBeDefined();
      expect(users[0].username).toBeDefined();
    });

    it('should create multiple records with arguments', async () => {
      const user = await Factories.createUser();
      const courses = await Factories.createMultiple(Factories.createCourse, 3);

      expect(courses).toHaveLength(3);
      expect(courses[0].title).toBeDefined();
    });

    it('should clean up all test data', async () => {
      // Create some test data
      await Factories.createUser();
      await Factories.createCourse();

      // Clean up
      await Factories.cleanup();

      // Verify cleanup (models should be empty)
      const { User, TrainingCourse } = require('../../../models');
      const userCount = await User.count();
      const courseCount = await TrainingCourse.count();

      expect(userCount).toBe(0);
      expect(courseCount).toBe(0);
    });

    it('should clean up specific model', async () => {
      // Create some test data
      await Factories.createUser();
      await Factories.createCourse();

      // Clean up only users
      await Factories.cleanupModel('User');

      // Verify only users are cleaned
      const { User, TrainingCourse } = require('../../../models');
      const userCount = await User.count();
      const courseCount = await TrainingCourse.count();

      expect(userCount).toBe(0);
      expect(courseCount).toBeGreaterThan(0);
    });
  });

  describe('Factory Traits and States', () => {
    it('should create users with different account statuses', async () => {
      const activeUser = await Factories.createUser({ accountStatus: 'active' });
      const inactiveUser = await Factories.createInactiveUser();
      const lockedUser = await Factories.createLockedUser();

      expect(activeUser.accountStatus).toBe('active');
      expect(inactiveUser.accountStatus).toBe('inactive');
      expect(lockedUser.accountStatus).toBe('locked');
    });

    it('should create courses with different statuses', async () => {
      const activeCourse = await Factories.createCourse({ status: 'active' });
      const draftCourse = await Factories.createDraftCourse();
      const archivedCourse = await Factories.createArchivedCourse();

      expect(activeCourse.status).toBe('active');
      expect(draftCourse.status).toBe('draft');
      expect(archivedCourse.status).toBe('archived');
    });

    it('should create documents with different types', async () => {
      const user = await Factories.createUser();
      const policyDoc = await Factories.createPolicyDocument(user.id);
      const draftDoc = await Factories.createDraftDocument(user.id);

      expect(policyDoc.documentType).toBe('policy');
      expect(draftDoc.status).toBe('draft');
    });
  });

  describe('Related Data Creation', () => {
    it('should create user with training assignments', async () => {
      const user = await Factories.createUser();
      const course1 = await Factories.createCourse();
      const course2 = await Factories.createCourse();

      const assignment1 = await Factories.createAssignment(user.id, course1.id);
      const assignment2 = await Factories.createCompletedAssignment(user.id, course2.id);

      expect(assignment1.userId).toBe(user.id);
      expect(assignment2.userId).toBe(user.id);
      expect(assignment2.status).toBe('completed');
    });

    it('should create incident with updates', async () => {
      const user = await Factories.createUser();
      const incident = await Factories.createIncident(user.id);

      const update1 = await Factories.createIncidentUpdate(incident.id, user.id, {
        updateType: 'comment',
        description: 'Initial investigation started'
      });

      const update2 = await Factories.createIncidentUpdate(incident.id, user.id, {
        updateType: 'status_change',
        previousStatus: 'reported',
        newStatus: 'under_investigation'
      });

      expect(update1.incidentId).toBe(incident.id);
      expect(update2.incidentId).toBe(incident.id);
      expect(update1.updateType).toBe('comment');
      expect(update2.updateType).toBe('status_change');
    });

    it('should create risk assessment with risk items', async () => {
      const user = await Factories.createComplianceOfficer();
      const assessment = await Factories.createRiskAssessment(user.id);

      const riskItem1 = await Factories.createRiskItem(assessment.id);
      const riskItem2 = await Factories.createHighRiskItem(assessment.id);

      expect(riskItem1.assessmentId).toBe(assessment.id);
      expect(riskItem2.assessmentId).toBe(assessment.id);
      expect(riskItem2.riskLevel).toBe('critical');
    });
  });
});
