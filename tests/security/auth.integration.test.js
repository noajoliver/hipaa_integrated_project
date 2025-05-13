/**
 * Integration tests for authentication system
 */
const request = require('supertest');
const app = require('../../server');
const db = require('../../models');
const bcrypt = require('bcrypt');
const { generateToken } = require('../../utils/token-manager');

describe('Authentication Integration Tests', () => {
  let testUser;
  
  // Set up test user
  beforeAll(async () => {
    try {
      // Create a test user
      const hashedPassword = await bcrypt.hash('Test123!@#', 12);
      
      // Find or create a role
      let testRole = await db.Role.findOne({ where: { name: 'Admin' } });
      if (!testRole) {
        testRole = await db.Role.create({
          name: 'Admin',
          description: 'Administrator Role for Tests',
          permissions: { isAdmin: true }
        });
      }
      
      // Create test user
      testUser = await db.User.create({
        username: 'testuser',
        email: 'test@example.com',
        password: hashedPassword,
        firstName: 'Test',
        lastName: 'User',
        roleId: testRole.id,
        accountStatus: 'active',
        hireDate: new Date(),
        passwordLastChanged: new Date()
      });
    } catch (error) {
      console.error('Error setting up test data:', error);
    }
  });
  
  // Clean up test data
  afterAll(async () => {
    try {
      // Delete the test user
      if (testUser) {
        await testUser.destroy();
      }
      
      // Close database connection
      await db.sequelize.close();
    } catch (error) {
      console.error('Error cleaning up test data:', error);
    }
  });
  
  describe('Login API', () => {
    it('should return 400 if username is missing', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ password: 'Test123!@#' });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation error');
    });
    
    it('should return 400 if password is missing', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'testuser' });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation error');
    });
    
    it('should return 401 for non-existent user', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'nonexistentuser',
          password: 'Test123!@#'
        });
      
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid credentials');
    });
    
    it('should return 401 for incorrect password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'WrongPassword123!'
        });
      
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid credentials');
    });
    
    it('should login successfully with correct credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'Test123!@#'
        });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Login successful');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data.user.username).toBe('testuser');
      expect(response.body.data).toHaveProperty('expiresAt');
      
      // Check for httpOnly cookies
      expect(response.headers['set-cookie']).toBeDefined();
      expect(response.headers['set-cookie'][0]).toContain('token=');
      expect(response.headers['set-cookie'][0]).toContain('HttpOnly');
    });
  });
  
  describe('Profile API', () => {
    let authToken;
    
    beforeEach(() => {
      // Generate a test token
      const tokenData = generateToken({ id: testUser.id });
      authToken = tokenData.token;
    });
    
    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/auth/profile');
      
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
    
    it('should return user profile with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id', testUser.id);
      expect(response.body.data).toHaveProperty('username', 'testuser');
      expect(response.body.data).not.toHaveProperty('password');
    });
  });
  
  describe('Logout API', () => {
    let authToken;
    
    beforeEach(() => {
      // Generate a test token
      const tokenData = generateToken({ id: testUser.id });
      authToken = tokenData.token;
    });
    
    it('should logout successfully', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Logged out successfully');
      
      // Check for cookie clearing
      expect(response.headers['set-cookie']).toBeDefined();
      expect(response.headers['set-cookie'][0]).toContain('token=;');
      expect(response.headers['set-cookie'][0]).toContain('Expires=Thu, 01 Jan 1970');
    });
  });
  
  describe('Password Validation', () => {
    let authToken;
    
    beforeEach(() => {
      // Generate a test token
      const tokenData = generateToken({ id: testUser.id });
      authToken = tokenData.token;
    });
    
    it('should reject weak passwords on change', async () => {
      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'Test123!@#',
          newPassword: 'weak'
        });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Password does not meet security requirements');
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors.length).toBeGreaterThan(0);
    });
    
    it('should reject similar passwords on change', async () => {
      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'Test123!@#',
          newPassword: 'Test123!@$' // Only slightly different
        });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Password does not meet security requirements');
      expect(response.body.errors).toContain('New password is too similar to your old password');
    });
  });
});