/**
 * Test Data Factories
 *
 * Provides reusable factory methods for creating test data
 * with realistic, randomized values using Faker.
 *
 * @module tests/utils/factories
 */

const { faker } = require('@faker-js/faker');
const bcrypt = require('bcrypt');

// Import models
let models;

/**
 * Initialize factories with models
 * @param {Object} modelsObj - Sequelize models object
 */
const initializeFactories = (modelsObj) => {
  models = modelsObj;
};

/**
 * Get models, loading them if not already loaded
 * @returns {Object} Sequelize models
 */
const getModels = () => {
  if (!models) {
    models = require('../../models');
  }
  return models;
};

/**
 * Factories class containing all factory methods
 */
class Factories {
  // =====================================
  // ROLE FACTORIES
  // =====================================

  /**
   * Create a role
   * @param {Object} overrides - Override default values
   * @returns {Promise<Role>}
   */
  static async createRole(overrides = {}) {
    const { Role } = getModels();

    const roleData = {
      name: faker.helpers.arrayElement(['User', 'Admin', 'Compliance Officer', 'Manager', 'Auditor']),
      description: faker.lorem.sentence(),
      permissions: {
        canView: true,
        canEdit: false,
        canDelete: false,
        canApprove: false
      },
      ...overrides
    };

    return await Role.create(roleData);
  }

  /**
   * Get or create a role by name
   * @param {string} roleName - Name of the role
   * @returns {Promise<Role>}
   */
  static async getOrCreateRole(roleName) {
    const { Role } = getModels();

    let role = await Role.findOne({ where: { name: roleName } });
    if (!role) {
      role = await this.createRole({ name: roleName });
    }
    return role;
  }

  // =====================================
  // DEPARTMENT FACTORIES
  // =====================================

  /**
   * Create a department
   * @param {Object} overrides - Override default values
   * @returns {Promise<Department>}
   */
  static async createDepartment(overrides = {}) {
    const { Department } = getModels();

    const departmentData = {
      name: faker.commerce.department(),
      description: faker.lorem.paragraph(),
      ...overrides
    };

    return await Department.create(departmentData);
  }

  // =====================================
  // USER FACTORIES
  // =====================================

  /**
   * Create a user with optional overrides
   * @param {Object} overrides - Override default values
   * @returns {Promise<User>}
   */
  static async createUser(overrides = {}) {
    const { User } = getModels();

    // Get or create default role
    const defaultRole = await this.getOrCreateRole('User');

    // Pre-hashed password for 'Password123!'
    const hashedPassword = '$2b$10$X.VhWnPjCWHv4.wZp.AXZOGJpVOdnl4JCJHKu/YMlMhh7.SCuW9hO';

    const userData = {
      username: faker.internet.username().toLowerCase().substring(0, 50),
      email: faker.internet.email().toLowerCase(),
      password: hashedPassword,
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      position: faker.person.jobTitle(),
      roleId: defaultRole.id,
      accountStatus: 'active',
      hireDate: faker.date.past({ years: 5 }),
      lastLogin: faker.date.recent({ days: 7 }),
      failedLoginAttempts: 0,
      lastPasswordChange: faker.date.recent({ days: 30 }),
      requirePasswordChange: false,
      mfaEnabled: false,
      ...overrides
    };

    return await User.create(userData);
  }

  /**
   * Create an admin user
   * @param {Object} overrides - Override default values
   * @returns {Promise<User>}
   */
  static async createAdmin(overrides = {}) {
    const { User, Role } = getModels();
    const adminRole = await this.getOrCreateRole('Admin');
    const user = await this.createUser({
      roleId: adminRole.id,
      position: 'System Administrator',
      ...overrides
    });

    // Reload user with role association for token generation
    return await User.findByPk(user.id, {
      include: [{ model: Role, as: 'role' }]
    });
  }

  /**
   * Create a compliance officer
   * @param {Object} overrides - Override default values
   * @returns {Promise<User>}
   */
  static async createComplianceOfficer(overrides = {}) {
    const { User, Role } = getModels();
    const coRole = await this.getOrCreateRole('Compliance Officer');
    const user = await this.createUser({
      roleId: coRole.id,
      position: 'Compliance Officer',
      ...overrides
    });

    // Reload user with role association for token generation
    return await User.findByPk(user.id, {
      include: [{ model: Role, as: 'role' }]
    });
  }

  /**
   * Create a manager user
   * @param {Object} overrides - Override default values
   * @returns {Promise<User>}
   */
  static async createManager(overrides = {}) {
    const { User, Role } = getModels();
    const managerRole = await this.getOrCreateRole('Manager');
    const user = await this.createUser({
      roleId: managerRole.id,
      position: 'Department Manager',
      ...overrides
    });

    // Reload user with role association for token generation
    return await User.findByPk(user.id, {
      include: [{ model: Role, as: 'role' }]
    });
  }

  /**
   * Create an inactive user
   * @param {Object} overrides - Override default values
   * @returns {Promise<User>}
   */
  static async createInactiveUser(overrides = {}) {
    return await this.createUser({
      accountStatus: 'inactive',
      lastLogin: faker.date.past({ years: 1 }),
      ...overrides
    });
  }

  /**
   * Create a locked user
   * @param {Object} overrides - Override default values
   * @returns {Promise<User>}
   */
  static async createLockedUser(overrides = {}) {
    return await this.createUser({
      accountStatus: 'locked',
      failedLoginAttempts: 5,
      accountLockExpiresAt: faker.date.future({ days: 1 }),
      ...overrides
    });
  }

  // =====================================
  // TRAINING COURSE FACTORIES
  // =====================================

  /**
   * Create a training course
   * @param {Object} overrides - Override default values
   * @returns {Promise<TrainingCourse>}
   */
  static async createCourse(overrides = {}) {
    const { TrainingCourse } = getModels();

    const courseData = {
      title: faker.lorem.words(3),
      description: faker.lorem.paragraph(),
      contentType: faker.helpers.arrayElement(['video', 'document', 'quiz', 'interactive', 'webinar', 'classroom']),
      durationMinutes: faker.number.int({ min: 30, max: 120 }),
      frequencyDays: faker.helpers.arrayElement([30, 90, 180, 365]),
      version: '1.0',
      status: 'active',
      content: `https://example.com/training/${faker.string.alphanumeric(10)}`,
      passingScore: faker.number.int({ min: 70, max: 90 }),
      ...overrides
    };

    return await TrainingCourse.create(courseData);
  }

  /**
   * Create a draft course
   * @param {Object} overrides - Override default values
   * @returns {Promise<TrainingCourse>}
   */
  static async createDraftCourse(overrides = {}) {
    return await this.createCourse({
      status: 'draft',
      ...overrides
    });
  }

  /**
   * Create an archived course
   * @param {Object} overrides - Override default values
   * @returns {Promise<TrainingCourse>}
   */
  static async createArchivedCourse(overrides = {}) {
    return await this.createCourse({
      status: 'archived',
      ...overrides
    });
  }

  // =====================================
  // TRAINING ASSIGNMENT FACTORIES
  // =====================================

  /**
   * Create a training assignment
   * @param {number} userId - User ID
   * @param {number} courseId - Course ID
   * @param {Object} overrides - Override default values
   * @returns {Promise<TrainingAssignment>}
   */
  static async createAssignment(userId, courseId, overrides = {}) {
    const { TrainingAssignment } = getModels();

    const assignmentData = {
      userId,
      courseId,
      assignedDate: faker.date.past({ days: 30 }),
      dueDate: faker.date.future({ days: 30 }),
      status: 'assigned',
      ...overrides
    };

    return await TrainingAssignment.create(assignmentData);
  }

  /**
   * Create a completed training assignment
   * @param {number} userId - User ID
   * @param {number} courseId - Course ID
   * @param {Object} overrides - Override default values
   * @returns {Promise<TrainingAssignment>}
   */
  static async createCompletedAssignment(userId, courseId, overrides = {}) {
    const completionDate = faker.date.recent({ days: 7 });
    return await this.createAssignment(userId, courseId, {
      status: 'completed',
      completionDate,
      score: faker.number.int({ min: 80, max: 100 }),
      ...overrides
    });
  }

  // =====================================
  // DOCUMENT FACTORIES
  // =====================================

  /**
   * Create a document
   * @param {number} createdBy - User ID of creator
   * @param {Object} overrides - Override default values
   * @returns {Promise<Document>}
   */
  static async createDocument(createdBy, overrides = {}) {
    const { Document } = getModels();

    const documentData = {
      title: faker.lorem.words(4),
      description: faker.lorem.paragraph(),
      filePath: `/documents/${faker.string.alphanumeric(20)}.pdf`,
      version: '1.0',
      status: 'active',
      documentType: faker.helpers.arrayElement(['policy', 'procedure', 'form', 'template', 'reference', 'other']),
      hipaaCategory: faker.helpers.arrayElement(['privacy', 'security', 'breach_notification', 'general', 'other']),
      createdBy,
      reviewDate: faker.date.future({ years: 1 }),
      ...overrides
    };

    return await Document.create(documentData);
  }

  /**
   * Create a draft document
   * @param {number} createdBy - User ID of creator
   * @param {Object} overrides - Override default values
   * @returns {Promise<Document>}
   */
  static async createDraftDocument(createdBy, overrides = {}) {
    return await this.createDocument(createdBy, {
      status: 'draft',
      ...overrides
    });
  }

  /**
   * Create a policy document
   * @param {number} createdBy - User ID of creator
   * @param {Object} overrides - Override default values
   * @returns {Promise<Document>}
   */
  static async createPolicyDocument(createdBy, overrides = {}) {
    return await this.createDocument(createdBy, {
      documentType: 'policy',
      hipaaCategory: 'privacy',
      ...overrides
    });
  }

  // =====================================
  // DOCUMENT ACKNOWLEDGMENT FACTORIES
  // =====================================

  /**
   * Create a document acknowledgment
   * @param {number} userId - User ID
   * @param {number} documentId - Document ID
   * @param {Object} overrides - Override default values
   * @returns {Promise<DocumentAcknowledgment>}
   */
  static async createAcknowledgment(userId, documentId, overrides = {}) {
    const { DocumentAcknowledgment } = getModels();

    const acknowledgmentData = {
      userId,
      documentId,
      acknowledgmentDate: faker.date.recent({ days: 7 }),
      ipAddress: faker.internet.ipv4(),
      ...overrides
    };

    return await DocumentAcknowledgment.create(acknowledgmentData);
  }

  // =====================================
  // INCIDENT FACTORIES
  // =====================================

  /**
   * Create an incident
   * @param {number} reportedBy - User ID of reporter
   * @param {Object} overrides - Override default values
   * @returns {Promise<Incident>}
   */
  static async createIncident(reportedBy, overrides = {}) {
    const { Incident } = getModels();

    const incidentData = {
      title: faker.lorem.words(5),
      description: faker.lorem.paragraphs(2),
      incidentDate: faker.date.recent({ days: 7 }),
      reportedBy,
      reportedDate: faker.date.recent({ days: 5 }),
      status: 'reported',
      severity: faker.helpers.arrayElement(['low', 'medium', 'high', 'critical']),
      category: faker.helpers.arrayElement(['security', 'privacy', 'technical', 'physical', 'administrative']),
      location: faker.location.streetAddress(),
      affectedSystems: faker.lorem.sentence(),
      affectedData: faker.lorem.sentence(),
      isBreachable: faker.datatype.boolean(),
      ...overrides
    };

    return await Incident.create(incidentData);
  }

  /**
   * Create a critical incident
   * @param {number} reportedBy - User ID of reporter
   * @param {Object} overrides - Override default values
   * @returns {Promise<Incident>}
   */
  static async createCriticalIncident(reportedBy, overrides = {}) {
    return await this.createIncident(reportedBy, {
      severity: 'critical',
      isBreachable: true,
      ...overrides
    });
  }

  /**
   * Create a closed incident
   * @param {number} reportedBy - User ID of reporter
   * @param {number} closedBy - User ID of closer
   * @param {Object} overrides - Override default values
   * @returns {Promise<Incident>}
   */
  static async createClosedIncident(reportedBy, closedBy, overrides = {}) {
    return await this.createIncident(reportedBy, {
      status: 'closed',
      closedBy,
      closedDate: faker.date.recent({ days: 1 }),
      remediationPlan: faker.lorem.paragraph(),
      remediationDate: faker.date.recent({ days: 2 }),
      rootCause: faker.lorem.paragraph(),
      preventiveMeasures: faker.lorem.paragraph(),
      ...overrides
    });
  }

  // =====================================
  // INCIDENT UPDATE FACTORIES
  // =====================================

  /**
   * Create an incident update
   * @param {number} incidentId - Incident ID
   * @param {number} updatedBy - User ID of updater
   * @param {Object} overrides - Override default values
   * @returns {Promise<IncidentUpdate>}
   */
  static async createIncidentUpdate(incidentId, updatedBy, overrides = {}) {
    const { IncidentUpdate } = getModels();

    const updateData = {
      incidentId,
      updatedBy,
      updateType: faker.helpers.arrayElement(['status_change', 'comment', 'investigation', 'remediation']),
      description: faker.lorem.paragraph(),
      previousStatus: null,
      newStatus: null,
      ...overrides
    };

    return await IncidentUpdate.create(updateData);
  }

  // =====================================
  // RISK ASSESSMENT FACTORIES
  // =====================================

  /**
   * Create a risk assessment
   * @param {number} conductedBy - User ID of conductor
   * @param {Object} overrides - Override default values
   * @returns {Promise<RiskAssessment>}
   */
  static async createRiskAssessment(conductedBy, overrides = {}) {
    const { RiskAssessment } = getModels();

    const now = new Date();
    const month = now.toLocaleString('en-US', { month: 'long' });
    const year = now.getFullYear();

    const assessmentData = {
      title: `Risk Assessment - ${month} ${year}`,
      description: faker.lorem.paragraph(),
      assessmentDate: faker.date.recent({ days: 30 }),
      conductedBy,
      status: 'draft',
      methodology: 'NIST SP 800-30',
      scope: faker.lorem.paragraph(),
      summary: faker.lorem.paragraphs(2),
      nextAssessmentDate: faker.date.future({ years: 1 }),
      ...overrides
    };

    return await RiskAssessment.create(assessmentData);
  }

  /**
   * Create a completed risk assessment
   * @param {number} conductedBy - User ID of conductor
   * @param {number} approvedBy - User ID of approver
   * @param {Object} overrides - Override default values
   * @returns {Promise<RiskAssessment>}
   */
  static async createCompletedRiskAssessment(conductedBy, approvedBy, overrides = {}) {
    return await this.createRiskAssessment(conductedBy, {
      status: 'completed',
      approvedBy,
      approvalDate: faker.date.recent({ days: 7 }),
      ...overrides
    });
  }

  // =====================================
  // RISK ITEM FACTORIES
  // =====================================

  /**
   * Create a risk item
   * @param {number} assessmentId - Risk assessment ID
   * @param {Object} overrides - Override default values
   * @returns {Promise<RiskItem>}
   */
  static async createRiskItem(assessmentId, overrides = {}) {
    const { RiskItem } = getModels();

    const riskItemData = {
      assessmentId,
      category: faker.helpers.arrayElement(['technical', 'administrative', 'physical']),
      assetName: faker.commerce.productName(),
      description: faker.lorem.paragraph(),
      threatSource: faker.helpers.arrayElement(['External attacker', 'Malicious insider', 'Natural disaster', 'System failure']),
      threatAction: faker.lorem.sentence(),
      vulnerabilityDescription: faker.lorem.paragraph(),
      existingControls: faker.lorem.paragraph(),
      likelihood: faker.helpers.arrayElement(['low', 'medium', 'high']),
      impact: faker.helpers.arrayElement(['low', 'medium', 'high']),
      riskLevel: faker.helpers.arrayElement(['low', 'medium', 'high', 'critical']),
      recommendedControls: faker.lorem.paragraph(),
      mitigationPlan: faker.lorem.paragraph(),
      mitigationStatus: 'not_started',
      ...overrides
    };

    return await RiskItem.create(riskItemData);
  }

  /**
   * Create a high-risk item
   * @param {number} assessmentId - Risk assessment ID
   * @param {Object} overrides - Override default values
   * @returns {Promise<RiskItem>}
   */
  static async createHighRiskItem(assessmentId, overrides = {}) {
    return await this.createRiskItem(assessmentId, {
      likelihood: 'high',
      impact: 'high',
      riskLevel: 'critical',
      ...overrides
    });
  }

  // =====================================
  // AUDIT LOG FACTORIES
  // =====================================

  /**
   * Create an audit log entry
   * @param {number} userId - User ID
   * @param {Object} overrides - Override default values
   * @returns {Promise<AuditLog>}
   */
  static async createAuditLog(userId, overrides = {}) {
    const { AuditLog } = getModels();

    const auditLogData = {
      userId,
      action: faker.helpers.arrayElement(['CREATE', 'READ', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT']),
      entityType: faker.helpers.arrayElement(['User', 'Document', 'Incident', 'RiskAssessment', 'TrainingCourse']),
      entityId: String(faker.number.int({ min: 1, max: 1000 })),
      details: faker.lorem.sentence(),
      ipAddress: faker.internet.ipv4(),
      userAgent: faker.internet.userAgent(),
      ...overrides
    };

    return await AuditLog.create(auditLogData);
  }

  // =====================================
  // UTILITY METHODS
  // =====================================

  /**
   * Create multiple records using a factory method
   * @param {Function} factoryMethod - Factory method to use
   * @param {number} count - Number of records to create
   * @param {Array} args - Arguments to pass to factory method
   * @returns {Promise<Array>}
   */
  static async createMultiple(factoryMethod, count, ...args) {
    const records = [];
    for (let i = 0; i < count; i++) {
      records.push(await factoryMethod.call(this, ...args));
    }
    return records;
  }

  /**
   * Clean up all test data
   * @returns {Promise<void>}
   */
  static async cleanup() {
    const models = getModels();

    // Delete in order to respect foreign key constraints
    await models.AuditLog.destroy({ where: {}, force: true });
    await models.DocumentAcknowledgment.destroy({ where: {}, force: true });
    await models.TrainingAssignment.destroy({ where: {}, force: true });
    await models.IncidentUpdate.destroy({ where: {}, force: true });
    await models.Incident.destroy({ where: {}, force: true });
    await models.RiskItem.destroy({ where: {}, force: true });
    await models.RiskAssessment.destroy({ where: {}, force: true });
    await models.Document.destroy({ where: {}, force: true });
    await models.TrainingCourse.destroy({ where: {}, force: true });
    await models.User.destroy({ where: {}, force: true });
    await models.Department.destroy({ where: {}, force: true });
    await models.Role.destroy({ where: {}, force: true });
    await models.DocumentCategory.destroy({ where: {}, force: true });
  }

  /**
   * Clean up specific model
   * @param {string} modelName - Name of the model to clean up
   * @returns {Promise<void>}
   */
  static async cleanupModel(modelName) {
    const models = getModels();
    if (models[modelName]) {
      await models[modelName].destroy({ where: {}, force: true });
    }
  }
}

module.exports = Factories;
module.exports.initializeFactories = initializeFactories;
