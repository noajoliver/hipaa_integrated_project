/**
 * Simplified server for development
 * This server provides just the basic functionality needed for frontend development
 */
const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Create Express app
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Base route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to HIPAA Compliance Tool API - Simple Server Mode' });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date(),
      version: '1.0.0',
      mode: 'simple-server'
    }
  });
});

// Authentication endpoint
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  
  // Simple authentication logic
  if (username === 'admin' && password === 'admin123') {
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: 1,
          username: 'admin',
          firstName: 'Admin',
          lastName: 'User',
          email: 'admin@example.com',
          role: 'admin'
        },
        token: 'mock-token-12345',
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000) // 8 hours
      }
    });
  } else {
    res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }
});

// Documents endpoints
app.get('/api/documents', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: 1,
        title: 'HIPAA Security Policy',
        description: 'Comprehensive security policy for HIPAA compliance',
        version: '1.0',
        status: 'active',
        documentType: 'policy',
        hipaaCategory: 'security',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 2,
        title: 'Privacy Procedures',
        description: 'Detailed procedures for ensuring patient privacy',
        version: '1.1',
        status: 'active',
        documentType: 'procedure',
        hipaaCategory: 'privacy',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]
  });
});

// Training courses endpoints
app.get('/api/training', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: 1,
        title: 'HIPAA Basics',
        description: 'Introduction to HIPAA regulations and compliance requirements',
        duration: 60,
        passingScore: 80,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 2,
        title: 'Security Awareness',
        description: 'Security best practices for protecting PHI',
        duration: 45,
        passingScore: 80,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]
  });
});

// Risk assessment endpoints
app.get('/api/risk/assessments', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: 1,
        title: 'Annual Security Risk Assessment',
        description: 'Comprehensive assessment of security controls',
        status: 'in_progress',
        startDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]
  });
});

// Incidents endpoints
app.get('/api/incidents', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: 1,
        title: 'Potential Data Breach',
        description: 'Suspicious login attempts detected from unknown IP',
        category: 'security',
        severity: 'high',
        status: 'open',
        reportedDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]
  });
});

// Users endpoints
app.get('/api/users', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: 1,
        username: 'admin',
        email: 'admin@example.com',
        firstName: 'Admin',
        lastName: 'User',
        roleId: 1,
        accountStatus: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 2,
        username: 'compliance',
        email: 'compliance@example.com',
        firstName: 'Compliance',
        lastName: 'Officer',
        roleId: 2,
        accountStatus: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]
  });
});

// Determine port
const PORT = process.env.PORT || 8081;

// Start server
app.listen(PORT, () => {
  console.log(`Simple server is running on port ${PORT}`);
  console.log(`Access the API at http://localhost:${PORT}/api`);
  console.log('This is a simplified server for frontend development only');
});