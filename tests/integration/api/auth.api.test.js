/**
 * Auth API Integration Tests
 * @module tests/integration/api/auth-api
 */
const request = require('supertest');
const app = require('../../../server');
const { connect, resetAndSeed, disconnect } = require('../../utils/test-db');
const { generateToken } = require('../../../utils/token-manager');
const { User } = require('../../../models');

beforeAll(async () => {
  // Connect to test database and reset data
  await connect();
  await resetAndSeed();
});

afterAll(async () => {
  // Disconnect from test database
  await disconnect();
});

describe('Auth API Endpoints', () => {
  describe('POST /api/auth/signin', () => {
    it('should authenticate a user with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/signin')
        .send({
          username: 'admin',
          password: 'Admin123!'
        })
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data.user).toHaveProperty('username', 'admin');
      expect(response.body.data.user).not.toHaveProperty('password');
    });
    
    it('should reject authentication with invalid credentials', async () => {
      await request(app)
        .post('/api/auth/signin')
        .send({
          username: 'admin',
          password: 'WrongPassword'
        })
        .expect('Content-Type', /json/)
        .expect(401);
    });
    
    it('should reject authentication with missing credentials', async () => {
      await request(app)
        .post('/api/auth/signin')
        .send({
          username: 'admin'
          // Missing password
        })
        .expect('Content-Type', /json/)
        .expect(400);
    });
  });
  
  describe('POST /api/auth/signup', () => {
    it('should register a new user with valid data', async () => {
      const newUser = {
        username: 'registeruser',
        email: 'register@example.com',
        password: 'Register123!',
        firstName: 'Register',
        lastName: 'User',
        position: 'New Employee'
      };
      
      const response = await request(app)
        .post('/api/auth/signup')
        .send(newUser)
        .expect('Content-Type', /json/)
        .expect(201);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'User registered successfully');
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('username', 'registeruser');
      expect(response.body.data).not.toHaveProperty('password');
    });
    
    it('should reject registration with existing username', async () => {
      const duplicateUser = {
        username: 'admin', // Existing username
        email: 'another@example.com',
        password: 'Register123!',
        firstName: 'Another',
        lastName: 'User'
      };
      
      await request(app)
        .post('/api/auth/signup')
        .send(duplicateUser)
        .expect('Content-Type', /json/)
        .expect(400);
    });
    
    it('should reject registration with missing required fields', async () => {
      const invalidUser = {
        username: 'incomplete',
        email: 'incomplete@example.com'
        // Missing required fields
      };
      
      await request(app)
        .post('/api/auth/signup')
        .send(invalidUser)
        .expect('Content-Type', /json/)
        .expect(400);
    });
  });
  
  describe('POST /api/auth/signout', () => {
    it('should log out a user successfully', async () => {
      // Generate a token to blacklist
      const user = await User.findOne({ where: { username: 'admin' } });
      const tokenInfo = generateToken({ id: user.id, username: user.username });
      
      const response = await request(app)
        .post('/api/auth/signout')
        .set('x-access-token', tokenInfo.token)
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Logged out successfully');
    });
    
    it('should reject logout without token', async () => {
      await request(app)
        .post('/api/auth/signout')
        .expect('Content-Type', /json/)
        .expect(401);
    });
  });
  
  describe('GET /api/auth/user', () => {
    it('should return current user data', async () => {
      // Generate a token
      const user = await User.findOne({ where: { username: 'admin' } });
      const tokenInfo = generateToken({ id: user.id, username: user.username });
      
      const response = await request(app)
        .get('/api/auth/user')
        .set('x-access-token', tokenInfo.token)
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id', user.id);
      expect(response.body.data).toHaveProperty('username', 'admin');
      expect(response.body.data).not.toHaveProperty('password');
    });
    
    it('should reject request without token', async () => {
      await request(app)
        .get('/api/auth/user')
        .expect('Content-Type', /json/)
        .expect(401);
    });
  });
});