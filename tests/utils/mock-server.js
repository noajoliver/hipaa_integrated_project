/**
 * Mock server for tests
 * This provides a simplified version of the application server for testing
 * @module tests/utils/mock-server
 */
const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

// Create mock server
const app = express();

// Middleware
app.use(bodyParser.json());
app.use(cookieParser());

// Mock user data
const users = [
  {
    id: 1,
    username: 'admin',
    password: '$2b$10$X.VhWnPjCWHv4.wZp.AXZOGJpVOdnl4JCJHKu/YMlMhh7.SCuW9hO', // Hashed 'Admin123!'
    email: 'admin@example.com',
    firstName: 'Admin',
    lastName: 'User',
    role: {
      id: 1,
      name: 'Admin',
      permissions: { isAdmin: true }
    },
    accountStatus: 'active',
    mfaEnabled: false,
    mfaSecret: null
  },
  {
    id: 2,
    username: 'testuser',
    password: '$2b$10$X.VhWnPjCWHv4.wZp.AXZOGJpVOdnl4JCJHKu/YMlMhh7.SCuW9hO', // Hashed 'Admin123!'
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    role: {
      id: 2,
      name: 'User',
      permissions: {}
    },
    accountStatus: 'active',
    mfaEnabled: false,
    mfaSecret: null
  }
];

// Mock data
const mockData = {
  documents: [
    {
      id: 1,
      title: 'HIPAA Security Policy',
      description: 'Comprehensive security policy for HIPAA compliance',
      version: '1.0',
      status: 'active',
      documentType: 'policy',
      hipaaCategory: 'security',
      createdBy: 1,
      categoryId: 1,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ],
  
  auditLogs: [
    {
      id: 1,
      userId: 1,
      action: 'LOGIN',
      entityType: 'User',
      entityId: 1,
      timestamp: new Date(),
      ipAddress: '127.0.0.1',
      userAgent: 'Test User Agent',
      details: '{"method":"POST","path":"/api/auth/login"}',
      hash: 'abc123'
    }
  ]
};

// Authentication middleware
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    
    try {
      const decoded = jwt.verify(token, 'test_secret_key');
      req.user = users.find(user => user.id === decoded.id);
      next();
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }
  } else {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }
};

// Role-based authorization middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    if (roles.length === 0 || roles.includes(req.user.role.name) || req.user.role.permissions.isAdmin) {
      next();
    } else {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }
  };
};

// Authentication routes
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: ['Username and password are required']
    });
  }
  
  const user = users.find(u => u.username === username);
  
  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }
  
  const passwordMatch = await bcrypt.compare(password, user.password);
  
  if (!passwordMatch) {
    return res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }
  
  // Check if MFA is required
  if (user.mfaEnabled) {
    // Generate temporary token for MFA flow
    const tempToken = jwt.sign({ id: user.id, mfaPending: true }, 'test_secret_key', { expiresIn: '5m' });
    
    return res.status(200).json({
      success: true,
      message: 'Login successful, MFA required',
      data: {
        user: {
          id: user.id,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName
        },
        mfaRequired: true,
        tempToken
      }
    });
  }
  
  // Generate token
  const token = jwt.sign({ id: user.id }, 'test_secret_key', { expiresIn: '8h' });
  
  // Set cookie if using secure cookies
  res.cookie('token', token, { 
    httpOnly: true, 
    secure: process.env.NODE_ENV === 'production',
    maxAge: 8 * 60 * 60 * 1000 // 8 hours
  });
  
  return res.status(200).json({
    success: true,
    message: 'Login successful',
    data: {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role.name
      },
      token,
      expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000)
    }
  });
});

app.post('/api/auth/logout', authenticateJWT, (req, res) => {
  // Clear token cookie
  res.cookie('token', '', { 
    httpOnly: true, 
    secure: process.env.NODE_ENV === 'production',
    expires: new Date(0)
  });
  
  return res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
});

app.get('/api/auth/profile', authenticateJWT, (req, res) => {
  // Return user profile without sensitive data
  const { password, ...userProfile } = req.user;
  
  return res.status(200).json({
    success: true,
    data: userProfile
  });
});

// Document routes
app.get('/api/documents', authenticateJWT, (req, res) => {
  return res.status(200).json({
    success: true,
    data: mockData.documents
  });
});

app.post('/api/documents', authenticateJWT, authorize('Admin', 'Compliance Officer'), (req, res) => {
  const { title, description, documentType, hipaaCategory, version, status, reviewDate } = req.body;
  
  if (!title) {
    return res.status(400).json({
      success: false,
      message: 'Title is required'
    });
  }
  
  const newDocument = {
    id: mockData.documents.length + 1,
    title,
    description,
    documentType: documentType || 'policy',
    hipaaCategory: hipaaCategory || 'general',
    version: version || '1.0',
    status: status || 'active',
    reviewDate: reviewDate ? new Date(reviewDate) : null,
    createdBy: req.user.id,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  mockData.documents.push(newDocument);
  
  return res.status(201).json({
    success: true,
    message: 'Document created successfully',
    data: newDocument
  });
});

app.post('/api/documents/:documentId/acknowledge', authenticateJWT, (req, res) => {
  const { documentId } = req.params;
  const { notes } = req.body;
  
  const document = mockData.documents.find(d => d.id === parseInt(documentId));
  
  if (!document) {
    return res.status(404).json({
      success: false,
      message: 'Document not found'
    });
  }
  
  // Mock acknowledgment
  const acknowledgment = {
    id: Math.floor(Math.random() * 1000) + 1,
    documentId: parseInt(documentId),
    userId: req.user.id,
    acknowledgmentDate: new Date(),
    ipAddress: req.ip || '127.0.0.1',
    notes: notes || '',
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  return res.status(201).json({
    success: true,
    message: 'Document acknowledged successfully',
    data: acknowledgment
  });
});

// MFA routes
app.post('/api/auth/mfa/setup', authenticateJWT, (req, res) => {
  const user = users.find(u => u.id === req.user.id);
  
  // Mock MFA setup
  const secret = 'JBSWY3DPEHPK3PXP'; // Mock secret
  const backupCodes = ['12345678', '23456789', '34567890'];
  
  // Update user
  user.mfaSecret = secret;
  
  return res.status(200).json({
    success: true,
    data: {
      secret,
      qrCodeUrl: 'data:image/png;base64,mockQrCodeData',
      backupCodes
    }
  });
});

app.post('/api/auth/mfa/verify', authenticateJWT, (req, res) => {
  const { token } = req.body;
  const user = users.find(u => u.id === req.user.id);
  
  // Mock verification - accept token '123456' for testing
  if (token === '123456') {
    user.mfaEnabled = true;
    
    return res.status(200).json({
      success: true,
      message: 'MFA verified successfully',
      data: {
        mfaEnabled: true
      }
    });
  }
  
  return res.status(401).json({
    success: false,
    message: 'Invalid MFA token'
  });
});

app.post('/api/auth/mfa/validate', (req, res) => {
  const { tempToken, token } = req.body;
  
  // Validate tempToken
  try {
    const decoded = jwt.verify(tempToken, 'test_secret_key');
    
    if (!decoded.mfaPending) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    
    const user = users.find(u => u.id === decoded.id);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    
    // Mock verification - accept token '123456' for testing
    if (token === '123456') {
      // Generate full token
      const fullToken = jwt.sign({ id: user.id }, 'test_secret_key', { expiresIn: '8h' });
      
      return res.status(200).json({
        success: true,
        message: 'MFA validated successfully',
        data: {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role.name
          },
          token: fullToken,
          expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000)
        }
      });
    }
    
    return res.status(401).json({
      success: false,
      message: 'Invalid MFA token'
    });
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
});

// Audit log routes
app.get('/api/audit/logs', authenticateJWT, authorize('Admin', 'Security Officer'), (req, res) => {
  // Support filtering by date range
  const { startDate, endDate } = req.query;
  
  let filteredLogs = [...mockData.auditLogs];
  
  if (startDate) {
    const start = new Date(startDate);
    filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) >= start);
  }
  
  if (endDate) {
    const end = new Date(endDate);
    filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) <= end);
  }
  
  // Mock pagination
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;
  const total = filteredLogs.length;
  
  const paginatedLogs = filteredLogs.slice(offset, offset + limit);
  
  return res.status(200).json({
    success: true,
    data: paginatedLogs,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  });
});

// Health endpoint
app.get('/api/health', (req, res) => {
  return res.status(200).json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date(),
      version: '1.0.0'
    }
  });
});

// API documentation
app.get('/api-docs', (req, res) => {
  // Return mock HTML or JSON documentation
  return res.status(200).send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>API Documentation</title>
      </head>
      <body>
        <h1>HIPAA Compliance Tool API Documentation</h1>
        <p>This is a mock API documentation page.</p>
      </body>
    </html>
  `);
});

// CSRF token endpoint
app.get('/api/auth/csrf-token', authenticateJWT, (req, res) => {
  return res.status(200).json({
    success: true,
    csrfToken: 'mock-csrf-token'
  });
});

// Export mock server
module.exports = app;