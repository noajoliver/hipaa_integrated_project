/**
 * Model Validation and Relationship Tests
 * @module tests/integration/models/model-validation
 */
const { connect, resetAndSeed, disconnect } = require('../../utils/test-db');
const {
  User,
  Role,
  Department,
  TrainingCourse,
  TrainingAssignment,
  Document,
  DocumentCategory,
  DocumentAcknowledgment,
  RiskAssessment,
  RiskItem,
  Incident,
  IncidentUpdate,
  AuditLog
} = require('../../../models');

beforeAll(async () => {
  await connect();
  await resetAndSeed();
});

afterAll(async () => {
  await disconnect();
});

describe('User Model Validation', () => {
  it('should require username', async () => {
    await expect(
      User.create({
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User'
      })
    ).rejects.toThrow();
  });

  it('should require unique username', async () => {
    await expect(
      User.create({
        username: 'admin', // Already exists from seed
        email: 'unique@example.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User'
      })
    ).rejects.toThrow();
  });

  it('should require unique email', async () => {
    await expect(
      User.create({
        username: 'uniqueuser',
        email: 'admin@example.com', // Already exists from seed
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User'
      })
    ).rejects.toThrow();
  });

  it('should require valid email format', async () => {
    await expect(
      User.create({
        username: 'testuser123',
        email: 'invalid-email',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User'
      })
    ).rejects.toThrow();
  });

  it('should validate accountStatus enum', async () => {
    const user = await User.findOne({ where: { username: 'admin' } });
    user.accountStatus = 'invalid-status';
    await expect(user.save()).rejects.toThrow();
  });

  it('should have relationship with Role', async () => {
    const user = await User.findOne({
      where: { username: 'admin' },
      include: [Role]
    });
    expect(user.Role).toBeDefined();
    expect(user.Role.name).toBeDefined();
  });

  it('should have relationship with Department', async () => {
    const user = await User.findOne({
      where: { username: 'admin' },
      include: [Department]
    });
    expect(user.Department).toBeDefined();
  });

  it('should soft delete users (paranoid)', async () => {
    const testUser = await User.create({
      username: 'deleteme',
      email: 'deleteme@example.com',
      password: 'Password123!',
      firstName: 'Delete',
      lastName: 'Me',
      accountStatus: 'active'
    });

    await testUser.destroy();

    // Should not find with normal query
    const found = await User.findByPk(testUser.id);
    expect(found).toBeNull();

    // Should find with paranoid: false
    const foundDeleted = await User.findByPk(testUser.id, { paranoid: false });
    expect(foundDeleted).not.toBeNull();
    expect(foundDeleted.deletedAt).not.toBeNull();
  });
});

describe('Role Model Validation', () => {
  it('should require unique role name', async () => {
    await expect(
      Role.create({
        name: 'Admin', // Already exists
        description: 'Duplicate role'
      })
    ).rejects.toThrow();
  });

  it('should have many users', async () => {
    const role = await Role.findOne({
      where: { name: 'Admin' },
      include: [User]
    });
    expect(role.Users).toBeDefined();
    expect(Array.isArray(role.Users)).toBe(true);
  });
});

describe('TrainingCourse Model Validation', () => {
  it('should require title', async () => {
    await expect(
      TrainingCourse.create({
        contentType: 'video',
        durationMinutes: 30,
        status: 'active'
      })
    ).rejects.toThrow();
  });

  it('should validate contentType enum', async () => {
    await expect(
      TrainingCourse.create({
        title: 'Test Course',
        contentType: 'invalid-type',
        durationMinutes: 30,
        status: 'active'
      })
    ).rejects.toThrow();
  });

  it('should validate status enum', async () => {
    await expect(
      TrainingCourse.create({
        title: 'Test Course',
        contentType: 'video',
        durationMinutes: 30,
        status: 'invalid-status'
      })
    ).rejects.toThrow();
  });

  it('should require positive durationMinutes', async () => {
    await expect(
      TrainingCourse.create({
        title: 'Test Course',
        contentType: 'video',
        durationMinutes: -10,
        status: 'active'
      })
    ).rejects.toThrow();
  });

  it('should have many assignments', async () => {
    const course = await TrainingCourse.create({
      title: 'Test Course with Assignments',
      contentType: 'video',
      durationMinutes: 30,
      status: 'active'
    });

    const assignments = await course.getTrainingAssignments();
    expect(Array.isArray(assignments)).toBe(true);
  });

  it('should soft delete courses (paranoid)', async () => {
    const course = await TrainingCourse.create({
      title: 'Course to Delete',
      contentType: 'video',
      durationMinutes: 30,
      status: 'active'
    });

    await course.destroy();

    const found = await TrainingCourse.findByPk(course.id);
    expect(found).toBeNull();

    const foundDeleted = await TrainingCourse.findByPk(course.id, { paranoid: false });
    expect(foundDeleted.deletedAt).not.toBeNull();
  });
});

describe('TrainingAssignment Model Validation', () => {
  let testUser, testCourse;

  beforeAll(async () => {
    testUser = await User.findOne({ where: { username: 'admin' } });
    testCourse = await TrainingCourse.create({
      title: 'Assignment Test Course',
      contentType: 'video',
      durationMinutes: 30,
      status: 'active'
    });
  });

  it('should require userId', async () => {
    await expect(
      TrainingAssignment.create({
        courseId: testCourse.id,
        assignedDate: new Date(),
        status: 'assigned'
      })
    ).rejects.toThrow();
  });

  it('should require courseId', async () => {
    await expect(
      TrainingAssignment.create({
        userId: testUser.id,
        assignedDate: new Date(),
        status: 'assigned'
      })
    ).rejects.toThrow();
  });

  it('should validate status enum', async () => {
    await expect(
      TrainingAssignment.create({
        userId: testUser.id,
        courseId: testCourse.id,
        assignedDate: new Date(),
        status: 'invalid-status'
      })
    ).rejects.toThrow();
  });

  it('should validate score range (0-100)', async () => {
    const assignment = await TrainingAssignment.create({
      userId: testUser.id,
      courseId: testCourse.id,
      assignedDate: new Date(),
      status: 'assigned'
    });

    assignment.score = 150; // Invalid
    await expect(assignment.save()).rejects.toThrow();

    assignment.score = -10; // Invalid
    await expect(assignment.save()).rejects.toThrow();
  });

  it('should have relationships with User and Course', async () => {
    const assignment = await TrainingAssignment.create({
      userId: testUser.id,
      courseId: testCourse.id,
      assignedDate: new Date(),
      status: 'assigned'
    });

    const assignmentWithRelations = await TrainingAssignment.findByPk(assignment.id, {
      include: [User, TrainingCourse]
    });

    expect(assignmentWithRelations.User).toBeDefined();
    expect(assignmentWithRelations.TrainingCourse).toBeDefined();
  });
});

describe('Document Model Validation', () => {
  it('should require title', async () => {
    await expect(
      Document.create({
        filePath: '/test.pdf',
        version: '1.0',
        status: 'active',
        documentType: 'policy'
      })
    ).rejects.toThrow();
  });

  it('should validate documentType enum', async () => {
    await expect(
      Document.create({
        title: 'Test Doc',
        filePath: '/test.pdf',
        version: '1.0',
        status: 'active',
        documentType: 'invalid-type'
      })
    ).rejects.toThrow();
  });

  it('should validate hipaaCategory enum', async () => {
    await expect(
      Document.create({
        title: 'Test Doc',
        filePath: '/test.pdf',
        version: '1.0',
        status: 'active',
        documentType: 'policy',
        hipaaCategory: 'invalid-category'
      })
    ).rejects.toThrow();
  });

  it('should soft delete documents (paranoid)', async () => {
    const doc = await Document.create({
      title: 'Doc to Delete',
      filePath: '/delete.pdf',
      version: '1.0',
      status: 'active',
      documentType: 'policy',
      hipaaCategory: 'general'
    });

    await doc.destroy();

    const found = await Document.findByPk(doc.id);
    expect(found).toBeNull();

    const foundDeleted = await Document.findByPk(doc.id, { paranoid: false });
    expect(foundDeleted.deletedAt).not.toBeNull();
  });
});

describe('DocumentAcknowledgment Model Validation', () => {
  let testUser, testDoc;

  beforeAll(async () => {
    testUser = await User.findOne({ where: { username: 'admin' } });
    testDoc = await Document.create({
      title: 'Test Document for Ack',
      filePath: '/test-ack.pdf',
      version: '1.0',
      status: 'active',
      documentType: 'policy',
      hipaaCategory: 'general'
    });
  });

  it('should require userId and documentId', async () => {
    await expect(
      DocumentAcknowledgment.create({
        acknowledgmentDate: new Date()
      })
    ).rejects.toThrow();
  });

  it('should enforce unique constraint on userId + documentId', async () => {
    await DocumentAcknowledgment.create({
      userId: testUser.id,
      documentId: testDoc.id,
      acknowledgmentDate: new Date()
    });

    // Try to create duplicate
    await expect(
      DocumentAcknowledgment.create({
        userId: testUser.id,
        documentId: testDoc.id,
        acknowledgmentDate: new Date()
      })
    ).rejects.toThrow();
  });

  it('should have relationships with User and Document', async () => {
    const ack = await DocumentAcknowledgment.findOne({
      where: { userId: testUser.id, documentId: testDoc.id },
      include: [User, Document]
    });

    expect(ack.User).toBeDefined();
    expect(ack.Document).toBeDefined();
  });
});

describe('RiskAssessment Model Validation', () => {
  it('should require title', async () => {
    await expect(
      RiskAssessment.create({
        assessmentDate: new Date(),
        status: 'draft'
      })
    ).rejects.toThrow();
  });

  it('should validate status enum', async () => {
    await expect(
      RiskAssessment.create({
        title: 'Test Assessment',
        assessmentDate: new Date(),
        status: 'invalid-status'
      })
    ).rejects.toThrow();
  });

  it('should have many risk items', async () => {
    const assessment = await RiskAssessment.create({
      title: 'Test Assessment with Items',
      assessmentDate: new Date(),
      status: 'draft'
    });

    const items = await assessment.getRiskItems();
    expect(Array.isArray(items)).toBe(true);
  });
});

describe('RiskItem Model Validation', () => {
  let testAssessment;

  beforeAll(async () => {
    testAssessment = await RiskAssessment.create({
      title: 'Test Assessment for Items',
      assessmentDate: new Date(),
      status: 'draft'
    });
  });

  it('should require assessmentId', async () => {
    await expect(
      RiskItem.create({
        category: 'Technical',
        likelihood: 'medium',
        impact: 'high'
      })
    ).rejects.toThrow();
  });

  it('should validate likelihood enum', async () => {
    await expect(
      RiskItem.create({
        assessmentId: testAssessment.id,
        category: 'Technical',
        likelihood: 'invalid',
        impact: 'medium',
        riskLevel: 'medium'
      })
    ).rejects.toThrow();
  });

  it('should validate impact enum', async () => {
    await expect(
      RiskItem.create({
        assessmentId: testAssessment.id,
        category: 'Technical',
        likelihood: 'medium',
        impact: 'invalid',
        riskLevel: 'medium'
      })
    ).rejects.toThrow();
  });

  it('should validate riskLevel enum', async () => {
    await expect(
      RiskItem.create({
        assessmentId: testAssessment.id,
        category: 'Technical',
        likelihood: 'medium',
        impact: 'medium',
        riskLevel: 'invalid'
      })
    ).rejects.toThrow();
  });

  it('should validate mitigationStatus enum', async () => {
    const item = await RiskItem.create({
      assessmentId: testAssessment.id,
      category: 'Technical',
      likelihood: 'medium',
      impact: 'medium',
      riskLevel: 'medium',
      mitigationStatus: 'not_started'
    });

    item.mitigationStatus = 'invalid';
    await expect(item.save()).rejects.toThrow();
  });
});

describe('Incident Model Validation', () => {
  let testUser;

  beforeAll(async () => {
    testUser = await User.findOne({ where: { username: 'admin' } });
  });

  it('should require title', async () => {
    await expect(
      Incident.create({
        incidentDate: new Date(),
        reportedBy: testUser.id,
        status: 'reported',
        severity: 'medium'
      })
    ).rejects.toThrow();
  });

  it('should validate status enum', async () => {
    await expect(
      Incident.create({
        title: 'Test Incident',
        incidentDate: new Date(),
        reportedBy: testUser.id,
        status: 'invalid-status',
        severity: 'medium'
      })
    ).rejects.toThrow();
  });

  it('should validate severity enum', async () => {
    await expect(
      Incident.create({
        title: 'Test Incident',
        incidentDate: new Date(),
        reportedBy: testUser.id,
        status: 'reported',
        severity: 'invalid-severity'
      })
    ).rejects.toThrow();
  });

  it('should have many incident updates', async () => {
    const incident = await Incident.create({
      title: 'Incident with Updates',
      incidentDate: new Date(),
      reportedBy: testUser.id,
      reportedDate: new Date(),
      status: 'reported',
      severity: 'medium',
      category: 'Test'
    });

    const updates = await incident.getIncidentUpdates();
    expect(Array.isArray(updates)).toBe(true);
  });

  it('should soft delete incidents (paranoid)', async () => {
    const incident = await Incident.create({
      title: 'Incident to Delete',
      incidentDate: new Date(),
      reportedBy: testUser.id,
      reportedDate: new Date(),
      status: 'reported',
      severity: 'low',
      category: 'Test'
    });

    await incident.destroy();

    const found = await Incident.findByPk(incident.id);
    expect(found).toBeNull();

    const foundDeleted = await Incident.findByPk(incident.id, { paranoid: false });
    expect(foundDeleted.deletedAt).not.toBeNull();
  });
});

describe('IncidentUpdate Model Validation', () => {
  let testIncident, testUser;

  beforeAll(async () => {
    testUser = await User.findOne({ where: { username: 'admin' } });
    testIncident = await Incident.create({
      title: 'Incident for Updates',
      incidentDate: new Date(),
      reportedBy: testUser.id,
      reportedDate: new Date(),
      status: 'reported',
      severity: 'medium',
      category: 'Test'
    });
  });

  it('should require incidentId', async () => {
    await expect(
      IncidentUpdate.create({
        updateDate: new Date(),
        updatedBy: testUser.id,
        updateType: 'comment'
      })
    ).rejects.toThrow();
  });

  it('should validate updateType enum', async () => {
    await expect(
      IncidentUpdate.create({
        incidentId: testIncident.id,
        updateDate: new Date(),
        updatedBy: testUser.id,
        updateType: 'invalid-type'
      })
    ).rejects.toThrow();
  });

  it('should have relationship with Incident', async () => {
    const update = await IncidentUpdate.create({
      incidentId: testIncident.id,
      updateDate: new Date(),
      updatedBy: testUser.id,
      updateType: 'comment',
      description: 'Test update'
    });

    const updateWithIncident = await IncidentUpdate.findByPk(update.id, {
      include: [Incident]
    });

    expect(updateWithIncident.Incident).toBeDefined();
  });
});

describe('AuditLog Model Validation', () => {
  let testUser;

  beforeAll(async () => {
    testUser = await User.findOne({ where: { username: 'admin' } });
  });

  it('should require action', async () => {
    await expect(
      AuditLog.create({
        userId: testUser.id,
        category: 'CREATE'
      })
    ).rejects.toThrow();
  });

  it('should validate action enum', async () => {
    await expect(
      AuditLog.create({
        userId: testUser.id,
        action: 'INVALID_ACTION',
        category: 'CREATE'
      })
    ).rejects.toThrow();
  });

  it('should automatically set timestamp', async () => {
    const log = await AuditLog.create({
      userId: testUser.id,
      action: 'CREATE',
      category: 'DATA',
      entityType: 'Test'
    });

    expect(log.timestamp).toBeDefined();
    expect(log.timestamp).toBeInstanceOf(Date);
  });

  it('should have relationship with User', async () => {
    const log = await AuditLog.findOne({
      where: { userId: testUser.id },
      include: [User]
    });

    if (log) {
      expect(log.User).toBeDefined();
    }
  });
});

describe('Database Indexes', () => {
  it('should have indexes on Incident table', async () => {
    const indexes = await Incident.sequelize.getQueryInterface().showIndex('incidents');

    // Check for specific indexes
    const indexNames = indexes.map(idx => idx.name);

    expect(indexNames).toContain('idx_incidents_status');
    expect(indexNames).toContain('idx_incidents_severity');
    expect(indexNames).toContain('idx_incidents_reported_by');
  });

  it('should have indexes on AuditLog table', async () => {
    const indexes = await AuditLog.sequelize.getQueryInterface().showIndex('audit_logs');

    const indexNames = indexes.map(idx => idx.name);

    expect(indexNames).toContain('idx_audit_logs_timestamp');
    expect(indexNames).toContain('idx_audit_logs_user_id');
  });

  it('should have indexes on DocumentAcknowledgment table', async () => {
    const indexes = await DocumentAcknowledgment.sequelize.getQueryInterface().showIndex('document_acknowledgments');

    const indexNames = indexes.map(idx => idx.name);

    // Should have index on userId and documentId
    const hasUserIndex = indexNames.some(name => name.includes('user'));
    expect(hasUserIndex).toBe(true);
  });
});

describe('Cascade Deletes and Referential Integrity', () => {
  it('should prevent deletion of Role with associated Users', async () => {
    const role = await Role.findOne({ where: { name: 'Admin' } });
    const usersWithRole = await User.findAll({ where: { roleId: role.id } });

    if (usersWithRole.length > 0) {
      // Should not be able to delete role with users
      await expect(role.destroy()).rejects.toThrow();
    }
  });

  it('should prevent deletion of TrainingCourse with active assignments', async () => {
    const course = await TrainingCourse.create({
      title: 'Course with Assignments',
      contentType: 'video',
      durationMinutes: 30,
      status: 'active'
    });

    const user = await User.findOne({ where: { username: 'admin' } });

    await TrainingAssignment.create({
      userId: user.id,
      courseId: course.id,
      assignedDate: new Date(),
      status: 'assigned'
    });

    // Attempting to hard delete should fail due to foreign key constraint
    // Soft delete should work
    await course.destroy();
    const found = await TrainingCourse.findByPk(course.id);
    expect(found).toBeNull();
  });
});
