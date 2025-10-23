/**
 * Training API Integration Tests
 * @module tests/integration/api/training-api
 */
const request = require('supertest');
const app = require('../../../server');
const { connect, resetAndSeed, disconnect } = require('../../utils/test-db');
const { createAuthToken } = require('../../utils/auth-helpers');
const { User, Role, TrainingCourse, TrainingAssignment } = require('../../../models');

let adminToken, userToken, adminUser, testUser, testCourse;

beforeAll(async () => {
  await connect();
  await resetAndSeed();

  // Get users with roles loaded and generate tokens
  adminUser = await User.findOne({
    where: { username: 'admin' },
    include: [{ model: Role, as: 'role' }]
  });
  testUser = await User.findOne({
    where: { username: 'testuser' },
    include: [{ model: Role, as: 'role' }]
  });

  adminToken = createAuthToken(adminUser);
  userToken = createAuthToken(testUser);

  // Create a test course
  testCourse = await TrainingCourse.create({
    title: 'HIPAA Privacy Training',
    description: 'Annual HIPAA privacy compliance training',
    contentType: 'video',
    durationMinutes: 60,
    frequencyDays: 365,
    version: '1.0',
    status: 'active',
    content: 'https://example.com/training-video',
    passingScore: 80
  });
});

afterAll(async () => {
  await disconnect();
});

describe('Training Course API Endpoints', () => {
  describe('GET /api/training/courses', () => {
    it('should return all courses for authenticated user', async () => {
      const response = await request(app)
        .get('/api/training/courses')
        .set('x-access-token', userToken)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should reject unauthenticated requests', async () => {
      await request(app)
        .get('/api/training/courses')
        .expect(401);
    });
  });

  describe('GET /api/training/courses/:id', () => {
    it('should return a specific course', async () => {
      const response = await request(app)
        .get(`/api/training/courses/${testCourse.id}`)
        .set('x-access-token', userToken)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('id', testCourse.id);
      expect(response.body.data).toHaveProperty('title', 'HIPAA Privacy Training');
    });

    it('should return 404 for non-existent course', async () => {
      await request(app)
        .get('/api/training/courses/99999')
        .set('x-access-token', userToken)
        .expect(404);
    });

    it('should return 400 for invalid course ID', async () => {
      await request(app)
        .get('/api/training/courses/invalid-id')
        .set('x-access-token', userToken)
        .expect(400);
    });
  });

  describe('POST /api/training/courses', () => {
    it('should create a new course with admin privileges', async () => {
      const newCourse = {
        title: 'Security Awareness Training',
        description: 'Annual security awareness training',
        contentType: 'interactive',
        durationMinutes: 45,
        frequencyDays: 365,
        version: '1.0',
        status: 'active',
        content: 'https://example.com/security-training',
        passingScore: 85
      };

      const response = await request(app)
        .post('/api/training/courses')
        .set('x-access-token', adminToken)
        .send(newCourse)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('title', 'Security Awareness Training');
      expect(response.body.data).toHaveProperty('id');
    });

    it('should reject course creation without admin privileges', async () => {
      const newCourse = {
        title: 'Unauthorized Course',
        description: 'This should fail',
        contentType: 'video',
        durationMinutes: 30,
        frequencyDays: 365,
        version: '1.0',
        status: 'active'
      };

      await request(app)
        .post('/api/training/courses')
        .set('x-access-token', userToken)
        .send(newCourse)
        .expect(403);
    });

    it('should reject course with missing required fields', async () => {
      const invalidCourse = {
        title: 'Incomplete Course'
        // Missing required fields
      };

      await request(app)
        .post('/api/training/courses')
        .set('x-access-token', adminToken)
        .send(invalidCourse)
        .expect(400);
    });

    it('should reject course with invalid contentType', async () => {
      const invalidCourse = {
        title: 'Invalid Content Type',
        description: 'Testing invalid content type',
        contentType: 'invalid-type',
        durationMinutes: 30,
        frequencyDays: 365,
        version: '1.0',
        status: 'active'
      };

      await request(app)
        .post('/api/training/courses')
        .set('x-access-token', adminToken)
        .send(invalidCourse)
        .expect(400);
    });

    it('should reject course with negative duration', async () => {
      const invalidCourse = {
        title: 'Negative Duration',
        description: 'Testing negative duration',
        contentType: 'video',
        durationMinutes: -10,
        frequencyDays: 365,
        version: '1.0',
        status: 'active'
      };

      await request(app)
        .post('/api/training/courses')
        .set('x-access-token', adminToken)
        .send(invalidCourse)
        .expect(400);
    });
  });

  describe('PUT /api/training/courses/:id', () => {
    it('should update an existing course with admin privileges', async () => {
      const updates = {
        description: 'Updated description for HIPAA training',
        durationMinutes: 90
      };

      const response = await request(app)
        .put(`/api/training/courses/${testCourse.id}`)
        .set('x-access-token', adminToken)
        .send(updates)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('description', 'Updated description for HIPAA training');
      expect(response.body.data).toHaveProperty('durationMinutes', 90);
    });

    it('should reject update without admin privileges', async () => {
      const updates = {
        description: 'Unauthorized update'
      };

      await request(app)
        .put(`/api/training/courses/${testCourse.id}`)
        .set('x-access-token', userToken)
        .send(updates)
        .expect(403);
    });

    it('should return 404 when updating non-existent course', async () => {
      const updates = {
        description: 'Update for non-existent course'
      };

      await request(app)
        .put('/api/training/courses/99999')
        .set('x-access-token', adminToken)
        .send(updates)
        .expect(404);
    });
  });

  describe('DELETE /api/training/courses/:id', () => {
    it('should soft delete a course with admin privileges', async () => {
      // Create a course to delete
      const courseToDelete = await TrainingCourse.create({
        title: 'Course to Delete',
        description: 'This will be deleted',
        contentType: 'document',
        durationMinutes: 30,
        frequencyDays: 365,
        version: '1.0',
        status: 'active'
      });

      const response = await request(app)
        .delete(`/api/training/courses/${courseToDelete.id}`)
        .set('x-access-token', adminToken)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);

      // Verify it's soft deleted
      const deletedCourse = await TrainingCourse.findByPk(courseToDelete.id, { paranoid: false });
      expect(deletedCourse.deletedAt).not.toBeNull();
    });

    it('should reject delete without admin privileges', async () => {
      await request(app)
        .delete(`/api/training/courses/${testCourse.id}`)
        .set('x-access-token', userToken)
        .expect(403);
    });

    it('should return 404 when deleting non-existent course', async () => {
      await request(app)
        .delete('/api/training/courses/99999')
        .set('x-access-token', adminToken)
        .expect(404);
    });
  });
});

describe('Training Assignment API Endpoints', () => {
  let testAssignment;

  beforeEach(async () => {
    // Create a test assignment
    testAssignment = await TrainingAssignment.create({
      userId: testUser.id,
      courseId: testCourse.id,
      assignedBy: adminUser.id,
      assignedDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      status: 'assigned'
    });
  });

  afterEach(async () => {
    // Clean up assignments
    await TrainingAssignment.destroy({ where: {}, force: true });
  });

  describe('GET /api/training/assignments', () => {
    it('should return all assignments for authenticated user', async () => {
      const response = await request(app)
        .get('/api/training/assignments')
        .set('x-access-token', adminToken)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toBeInstanceOf(Array);
    });
  });

  describe('GET /api/training/assignments/:id', () => {
    it('should return a specific assignment', async () => {
      const response = await request(app)
        .get(`/api/training/assignments/${testAssignment.id}`)
        .set('x-access-token', userToken)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('id', testAssignment.id);
    });

    it('should return 404 for non-existent assignment', async () => {
      await request(app)
        .get('/api/training/assignments/99999')
        .set('x-access-token', userToken)
        .expect(404);
    });
  });

  describe('GET /api/training/assignments/user/:userId', () => {
    it('should return assignments for a specific user', async () => {
      const response = await request(app)
        .get(`/api/training/assignments/user/${testUser.id}`)
        .set('x-access-token', userToken)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0]).toHaveProperty('userId', testUser.id);
    });

    it('should return empty array for user with no assignments', async () => {
      const response = await request(app)
        .get(`/api/training/assignments/user/${adminUser.id}`)
        .set('x-access-token', adminToken)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toBeInstanceOf(Array);
    });
  });

  describe('POST /api/training/assignments', () => {
    it('should create a new assignment with admin privileges', async () => {
      const newAssignment = {
        userId: testUser.id,
        courseId: testCourse.id,
        dueDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) // 60 days from now
      };

      const response = await request(app)
        .post('/api/training/assignments')
        .set('x-access-token', adminToken)
        .send(newAssignment)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('userId', testUser.id);
      expect(response.body.data).toHaveProperty('courseId', testCourse.id);
      expect(response.body.data).toHaveProperty('status', 'assigned');
    });

    it('should reject assignment creation without admin privileges', async () => {
      const newAssignment = {
        userId: testUser.id,
        courseId: testCourse.id,
        dueDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
      };

      await request(app)
        .post('/api/training/assignments')
        .set('x-access-token', userToken)
        .send(newAssignment)
        .expect(403);
    });

    it('should reject assignment with invalid userId', async () => {
      const invalidAssignment = {
        userId: 99999,
        courseId: testCourse.id,
        dueDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
      };

      await request(app)
        .post('/api/training/assignments')
        .set('x-access-token', adminToken)
        .send(invalidAssignment)
        .expect(400);
    });

    it('should reject assignment with invalid courseId', async () => {
      const invalidAssignment = {
        userId: testUser.id,
        courseId: 99999,
        dueDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
      };

      await request(app)
        .post('/api/training/assignments')
        .set('x-access-token', adminToken)
        .send(invalidAssignment)
        .expect(400);
    });

    it('should reject assignment with past due date', async () => {
      const invalidAssignment = {
        userId: testUser.id,
        courseId: testCourse.id,
        dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000) // Yesterday
      };

      await request(app)
        .post('/api/training/assignments')
        .set('x-access-token', adminToken)
        .send(invalidAssignment)
        .expect(400);
    });
  });

  describe('PUT /api/training/assignments/:id', () => {
    it('should update assignment status', async () => {
      const updates = {
        status: 'in_progress'
      };

      const response = await request(app)
        .put(`/api/training/assignments/${testAssignment.id}`)
        .set('x-access-token', userToken)
        .send(updates)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('status', 'in_progress');
    });

    it('should reject invalid status values', async () => {
      const updates = {
        status: 'invalid-status'
      };

      await request(app)
        .put(`/api/training/assignments/${testAssignment.id}`)
        .set('x-access-token', userToken)
        .send(updates)
        .expect(400);
    });
  });

  describe('POST /api/training/assignments/:id/complete', () => {
    it('should complete an assignment with passing score', async () => {
      const completionData = {
        score: 90
      };

      const response = await request(app)
        .post(`/api/training/assignments/${testAssignment.id}/complete`)
        .set('x-access-token', userToken)
        .send(completionData)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('status', 'completed');
      expect(response.body.data).toHaveProperty('score', 90);
      expect(response.body.data).toHaveProperty('completionDate');
    });

    it('should mark assignment as failed with score below passing threshold', async () => {
      const completionData = {
        score: 50 // Below passing score of 80
      };

      const response = await request(app)
        .post(`/api/training/assignments/${testAssignment.id}/complete`)
        .set('x-access-token', userToken)
        .send(completionData)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('status', 'failed');
      expect(response.body.data).toHaveProperty('score', 50);
    });

    it('should reject completion with invalid score', async () => {
      const completionData = {
        score: 150 // Invalid score > 100
      };

      await request(app)
        .post(`/api/training/assignments/${testAssignment.id}/complete`)
        .set('x-access-token', userToken)
        .send(completionData)
        .expect(400);
    });

    it('should reject completion with negative score', async () => {
      const completionData = {
        score: -10
      };

      await request(app)
        .post(`/api/training/assignments/${testAssignment.id}/complete`)
        .set('x-access-token', userToken)
        .send(completionData)
        .expect(400);
    });
  });

  describe('GET /api/training/statistics', () => {
    it('should return training statistics', async () => {
      const response = await request(app)
        .get('/api/training/statistics')
        .set('x-access-token', adminToken)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('totalCourses');
      expect(response.body.data).toHaveProperty('totalAssignments');
      expect(response.body.data).toHaveProperty('completedAssignments');
      expect(response.body.data).toHaveProperty('pendingAssignments');
      expect(response.body.data).toHaveProperty('overdueAssignments');
      expect(response.body.data).toHaveProperty('completionRate');
    });

    it('should return statistics for regular user (their own data)', async () => {
      const response = await request(app)
        .get('/api/training/statistics')
        .set('x-access-token', userToken)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('totalAssignments');
    });
  });
});

describe('Training API Error Handling', () => {
  it('should handle database connection errors gracefully', async () => {
    // This would require mocking database to simulate errors
    // Placeholder for future implementation
  });

  it('should handle malformed request bodies', async () => {
    await request(app)
      .post('/api/training/courses')
      .set('x-access-token', adminToken)
      .send('invalid-json')
      .expect(400);
  });

  it('should handle SQL injection attempts', async () => {
    const sqlInjection = {
      title: "'; DROP TABLE training_courses; --",
      description: 'SQL injection attempt',
      contentType: 'video',
      durationMinutes: 30,
      frequencyDays: 365,
      version: '1.0',
      status: 'active'
    };

    const response = await request(app)
      .post('/api/training/courses')
      .set('x-access-token', adminToken)
      .send(sqlInjection)
      .expect(201);

    // Verify the data was escaped and not executed
    expect(response.body.data.title).toBe("'; DROP TABLE training_courses; --");
  });
});
