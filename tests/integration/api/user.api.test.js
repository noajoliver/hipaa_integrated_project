/**
 * User API Integration Tests
 * @module tests/integration/api/user-api
 */
const request = require('supertest');
const app = require('../../../server');
const { connect, resetAndSeed, disconnect } = require('../../utils/test-db');
const { createAuthToken } = require('../../utils/auth-helpers');
const { User, Role } = require('../../../models');

let adminToken;
let userToken;
let adminUserId;
let regularUserId;

beforeAll(async () => {
  // Connect to test database and reset data
  await connect();
  await resetAndSeed();

  // Get users with roles loaded
  const adminUser = await User.findOne({
    where: { username: 'admin' },
    include: [{ model: Role, as: 'role' }]
  });

  const regularUser = await User.findOne({
    where: { username: 'testuser' },
    include: [{ model: Role, as: 'role' }]
  });

  adminUserId = adminUser.id;
  regularUserId = regularUser.id;

  // Generate tokens for testing
  adminToken = createAuthToken(adminUser);
  userToken = createAuthToken(regularUser);
});

afterAll(async () => {
  // Disconnect from test database
  await disconnect();
});

describe('User API Endpoints', () => {
  describe('GET /api/users', () => {
    it('should return all users for admin', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('x-access-token', adminToken)
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0]).toHaveProperty('username');
      expect(response.body.data[0]).toHaveProperty('role');
    });
    
    it('should reject unauthorized users', async () => {
      await request(app)
        .get('/api/users')
        .expect('Content-Type', /json/)
        .expect(401);
    });
  });
  
  describe('GET /api/users/:id', () => {
    it('should return a specific user', async () => {
      const response = await request(app)
        .get(`/api/users/${regularUserId}`)
        .set('x-access-token', adminToken)
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id', regularUserId);
      expect(response.body.data).toHaveProperty('username', 'testuser');
    });
    
    it('should return 404 for non-existent user', async () => {
      await request(app)
        .get('/api/users/9999')
        .set('x-access-token', adminToken)
        .expect('Content-Type', /json/)
        .expect(404);
    });
  });
  
  describe('POST /api/users', () => {
    it('should create a new user', async () => {
      const newUser = {
        username: 'newuser',
        email: 'new@example.com',
        password: 'Password123!',
        firstName: 'New',
        lastName: 'User',
        position: 'Developer',
        departmentId: 1,
        roleId: 2
      };
      
      const response = await request(app)
        .post('/api/users')
        .set('x-access-token', adminToken)
        .send(newUser)
        .expect('Content-Type', /json/)
        .expect(201);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'User created successfully');
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('username', 'newuser');
      expect(response.body.data).toHaveProperty('email', 'new@example.com');
      expect(response.body.data).not.toHaveProperty('password');
    });
    
    it('should reject creating user with existing username', async () => {
      const duplicateUser = {
        username: 'admin', // Existing username
        email: 'another@example.com',
        password: 'Password123!',
        firstName: 'Another',
        lastName: 'User',
        position: 'Developer',
        departmentId: 1,
        roleId: 2
      };
      
      await request(app)
        .post('/api/users')
        .set('x-access-token', adminToken)
        .send(duplicateUser)
        .expect('Content-Type', /json/)
        .expect(400);
    });
    
    it('should reject creating user with missing required fields', async () => {
      const invalidUser = {
        username: 'incomplete',
        email: 'incomplete@example.com'
        // Missing required fields
      };
      
      await request(app)
        .post('/api/users')
        .set('x-access-token', adminToken)
        .send(invalidUser)
        .expect('Content-Type', /json/)
        .expect(400);
    });
  });
  
  describe('PUT /api/users/:id', () => {
    it('should update an existing user', async () => {
      const updatedData = {
        position: 'Senior Developer',
        firstName: 'Updated'
      };
      
      const response = await request(app)
        .put(`/api/users/${regularUserId}`)
        .set('x-access-token', adminToken)
        .send(updatedData)
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'User updated successfully');
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('position', 'Senior Developer');
      expect(response.body.data).toHaveProperty('firstName', 'Updated');
    });
    
    it('should reject update with existing email', async () => {
      const duplicateData = {
        email: 'admin@example.com' // Existing email
      };
      
      await request(app)
        .put(`/api/users/${regularUserId}`)
        .set('x-access-token', adminToken)
        .send(duplicateData)
        .expect('Content-Type', /json/)
        .expect(400);
    });
    
    it('should return 404 for non-existent user', async () => {
      await request(app)
        .put('/api/users/9999')
        .set('x-access-token', adminToken)
        .send({ position: 'New Position' })
        .expect('Content-Type', /json/)
        .expect(404);
    });
  });
  
  describe('DELETE /api/users/:id', () => {
    it('should deactivate a user', async () => {
      // Create a temporary user to deactivate
      const tempUser = await User.create({
        username: 'tempuser',
        email: 'temp@example.com',
        password: '$2b$10$X.VhWnPjCWHv4.wZp.AXZOGJpVOdnl4JCJHKu/YMlMhh7.SCuW9hO',
        firstName: 'Temp',
        lastName: 'User',
        position: 'Temporary',
        departmentId: 1,
        roleId: 2,
        accountStatus: 'active'
      });
      
      const response = await request(app)
        .delete(`/api/users/${tempUser.id}`)
        .set('x-access-token', adminToken)
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'User deactivated successfully');
      
      // Verify the user was deactivated
      const deactivatedUser = await User.findByPk(tempUser.id);
      expect(deactivatedUser.accountStatus).toBe('inactive');
    });
    
    it('should return 404 for non-existent user', async () => {
      await request(app)
        .delete('/api/users/9999')
        .set('x-access-token', adminToken)
        .expect('Content-Type', /json/)
        .expect(404);
    });
  });
  
  describe('GET /api/users/roles', () => {
    it('should return all roles', async () => {
      const response = await request(app)
        .get('/api/users/roles')
        .set('x-access-token', adminToken)
        .expect('Content-Type', /json/);

      if (response.status !== 200) {
        console.log('Roles error response:', response.body);
      }

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0]).toHaveProperty('name');
    });
  });
  
  describe('GET /api/users/departments', () => {
    it('should return all departments', async () => {
      const response = await request(app)
        .get('/api/users/departments')
        .set('x-access-token', adminToken)
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0]).toHaveProperty('name');
    });
  });
});