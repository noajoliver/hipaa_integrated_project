/**
 * End-to-end tests for MFA and security features
 * @module tests/e2e/mfa-security
 */
const request = require('supertest');
const app = require('../utils/mock-server');
const { connect, resetAndSeed, disconnect } = require('../utils/mock-db');
const { User } = require('../../models');
const bcrypt = require('bcrypt');
const speakeasy = require('speakeasy');

// Global variables
let testUser;
let userToken;
let mfaSecret;
let backupCodes;

beforeAll(async () => {
  await connect();
  await resetAndSeed();
  
  // Create a test user
  const hashedPassword = await bcrypt.hash('Secure123Password!', 12);
  
  testUser = await User.create({
    username: 'mfatestuser',
    email: 'mfatest@example.com',
    password: hashedPassword,
    firstName: 'MFA',
    lastName: 'Test',
    accountStatus: 'active',
    mfaEnabled: false,
    mfaSecret: null
  });
  
  // Log in to get access token
  const loginResponse = await request(app)
    .post('/api/auth/login')
    .send({
      username: 'mfatestuser',
      password: 'Secure123Password!'
    });
  
  userToken = loginResponse.body.data.token;
  if (!userToken && loginResponse.headers['set-cookie']) {
    const cookies = loginResponse.headers['set-cookie'];
    const tokenCookie = cookies.find(cookie => cookie.startsWith('token='));
    if (tokenCookie) {
      userToken = tokenCookie.split(';')[0].replace('token=', '');
    }
  }
});

afterAll(async () => {
  await disconnect();
});

describe('MFA Setup and Verification', () => {
  it('should set up MFA for user', async () => {
    const response = await request(app)
      .post('/api/auth/mfa/setup')
      .set('Authorization', `Bearer ${userToken}`);
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('secret');
    expect(response.body.data).toHaveProperty('qrCodeUrl');
    expect(response.body.data).toHaveProperty('backupCodes');
    
    // Store MFA secret and backup codes for later tests
    mfaSecret = response.body.data.secret;
    backupCodes = response.body.data.backupCodes;
  });
  
  it('should verify MFA with valid token', async () => {
    if (!mfaSecret) {
      console.warn('MFA secret not set, skipping verification test');
      return;
    }
    
    // Generate valid TOTP token from secret
    const token = speakeasy.totp({
      secret: mfaSecret,
      encoding: 'base32'
    });
    
    const response = await request(app)
      .post('/api/auth/mfa/verify')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        token
      });
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('mfaEnabled', true);
  });
  
  it('should reject login without MFA when required', async () => {
    // Attempt to log in without MFA
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'mfatestuser',
        password: 'Secure123Password!'
      });
    
    expect(response.status).toBe(200); // Login is successful
    expect(response.body.data).toHaveProperty('mfaRequired', true); // But MFA is required
    expect(response.body.data).not.toHaveProperty('token'); // No token issued yet
  });
  
  it('should complete login with valid MFA token', async () => {
    // First, perform standard login
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'mfatestuser',
        password: 'Secure123Password!'
      });
    
    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.data).toHaveProperty('mfaRequired', true);
    
    // Extract temporary token or session ID if provided
    const tempToken = loginResponse.body.data.tempToken;
    
    // Generate valid TOTP token
    const token = speakeasy.totp({
      secret: mfaSecret,
      encoding: 'base32'
    });
    
    // Complete MFA verification
    const mfaResponse = await request(app)
      .post('/api/auth/mfa/validate')
      .send({
        tempToken,
        token
      });
    
    expect(mfaResponse.status).toBe(200);
    expect(mfaResponse.body.success).toBe(true);
    expect(mfaResponse.body.data).toHaveProperty('token'); // Full token issued after MFA
  });
  
  it('should allow login with backup code when MFA is enabled', async () => {
    if (!backupCodes || backupCodes.length === 0) {
      console.warn('Backup codes not available, skipping test');
      return;
    }
    
    // First, perform standard login
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'mfatestuser',
        password: 'Secure123Password!'
      });
    
    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.data).toHaveProperty('mfaRequired', true);
    
    // Extract temporary token or session ID if provided
    const tempToken = loginResponse.body.data.tempToken;
    
    // Use a backup code
    const backupCode = backupCodes[0];
    
    // Complete login with backup code
    const backupResponse = await request(app)
      .post('/api/auth/mfa/backup')
      .send({
        tempToken,
        backupCode
      });
    
    expect(backupResponse.status).toBe(200);
    expect(backupResponse.body.success).toBe(true);
    expect(backupResponse.body.data).toHaveProperty('token');
    // The backup code should be invalidated after use
  });
  
  it('should reject invalid MFA tokens', async () => {
    // First, perform standard login
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'mfatestuser',
        password: 'Secure123Password!'
      });
    
    const tempToken = loginResponse.body.data.tempToken;
    
    // Try an invalid token
    const invalidToken = '123456'; // Not a valid TOTP token
    
    const mfaResponse = await request(app)
      .post('/api/auth/mfa/validate')
      .send({
        tempToken,
        token: invalidToken
      });
    
    expect(mfaResponse.status).toBe(401);
    expect(mfaResponse.body.success).toBe(false);
  });
  
  it('should disable MFA when requested by user', async () => {
    // Get a fresh token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'mfatestuser',
        password: 'Secure123Password!'
      });
    
    // We need to complete MFA to get a full token
    const tempToken = loginResponse.body.data.tempToken;
    
    // Generate valid TOTP token
    const token = speakeasy.totp({
      secret: mfaSecret,
      encoding: 'base32'
    });
    
    // Complete MFA verification to get full token
    const mfaResponse = await request(app)
      .post('/api/auth/mfa/validate')
      .send({
        tempToken,
        token
      });
    
    const fullToken = mfaResponse.body.data.token;
    
    // Now disable MFA
    const disableResponse = await request(app)
      .post('/api/auth/mfa/disable')
      .set('Authorization', `Bearer ${fullToken}`)
      .send({
        password: 'Secure123Password!' // Require password for security
      });
    
    expect(disableResponse.status).toBe(200);
    expect(disableResponse.body.success).toBe(true);
    expect(disableResponse.body.message).toContain('disabled');
    
    // Verify MFA is disabled
    const updatedUser = await User.findByPk(testUser.id);
    expect(updatedUser.mfaEnabled).toBe(false);
    expect(updatedUser.mfaSecret).toBeNull();
  });
});