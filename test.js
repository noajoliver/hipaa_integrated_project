const request = require('supertest');
const app = require('./server');
const db = require('./models');

// Test suite for the integrated application
describe('HIPAA Compliance Tool API', () => {
  // Test authentication endpoints
  describe('Authentication', () => {
    it('should return 401 for protected routes without token', async () => {
      const response = await request(app).get('/api/users');
      expect(response.statusCode).toBe(401);
    });

    it('should allow login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'admin',
          password: 'admin123'
        });
      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('token');
    });
  });

  // Test user management endpoints
  describe('User Management', () => {
    let token;

    beforeAll(async () => {
      // Login to get token
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'admin',
          password: 'admin123'
        });
      token = response.body.token;
    });

    it('should get users list with valid token', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${token}`);
      expect(response.statusCode).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  // Test training endpoints
  describe('Training Management', () => {
    let token;

    beforeAll(async () => {
      // Login to get token
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'admin',
          password: 'admin123'
        });
      token = response.body.token;
    });

    it('should get training courses with valid token', async () => {
      const response = await request(app)
        .get('/api/training')
        .set('Authorization', `Bearer ${token}`);
      expect(response.statusCode).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  // Test document management endpoints
  describe('Document Management', () => {
    let token;

    beforeAll(async () => {
      // Login to get token
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'admin',
          password: 'admin123'
        });
      token = response.body.token;
    });

    it('should get documents with valid token', async () => {
      const response = await request(app)
        .get('/api/documents')
        .set('Authorization', `Bearer ${token}`);
      expect(response.statusCode).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  // Close database connection after tests
  afterAll(async () => {
    await db.sequelize.close();
  });
});
