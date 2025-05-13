// Database initialization script for HIPAA Compliance Tool
// This script creates all necessary tables and seeds initial data
// Hardcoded version that bypasses environment variables

const { Sequelize } = require('sequelize');
const crypto = require('crypto');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load environment variables (for reference only)
dotenv.config();

// Function to get database configuration with hardcoded values
function getDatabaseConfig() {
  // Hardcoded configuration - edit these values directly
  const config = {
    database: 'hipaa_compliance',
    username: 'hipaa_user',  // Your correct database username
    password: 'your_actual_password',  // Your actual password with special chars
    host: 'localhost',
    port: 5432,
    dialect: 'postgres'
  };
  
  console.log('Using hardcoded database configuration:');
  console.log(`Host: ${config.host}`);
  console.log(`Port: ${config.port}`);
  console.log(`Database: ${config.database}`);
  console.log(`Username: ${config.username}`);
  console.log(`Password: ${config.password ? '[MASKED]' : '[EMPTY]'}`);
  
  return config;
}

// Get database configuration
const dbConfig = getDatabaseConfig();

// Database connection configuration
const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: dbConfig.dialect,
    logging: console.log
  }
);

// Import models
const db = require('./models');
const User = db.user;
const Role = db.role;
const Department = db.department;
const TrainingCourse = db.trainingCourse;
const DocumentCategory = db.documentCategory;

// Simple password hashing function using Node.js crypto module
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

async function initializeDatabase() {
  try {
    console.log('Starting database initialization...');
    
    // Test database connection
    console.log('Testing database connection...');
    try {
      await sequelize.authenticate();
      console.log('Database connection has been established successfully.');
    } catch (error) {
      console.error('Unable to connect to the database:', error);
      console.log('\nPossible solutions:');
      console.log('1. Check if PostgreSQL is running');
      console.log('2. Verify your database credentials in the hardcoded config');
      console.log('3. Ensure the database and user exist in PostgreSQL');
      console.log('4. Check if the user has proper permissions');
      return;
    }
    
    // Sync all models with database
    console.log('Syncing database models...');
    await db.sequelize.sync({ force: true });
    console.log('Database models synchronized successfully.');
    
    // Create initial roles
    console.log('Creating initial roles...');
    await Role.bulkCreate([
      { name: 'admin' },
      { name: 'compliance_officer' },
      { name: 'manager' },
      { name: 'employee' }
    ]);
    console.log('Initial roles created successfully.');
    
    // Create initial departments
    console.log('Creating initial departments...');
    await Department.bulkCreate([
      { name: 'Administration', description: 'Administrative staff' },
      { name: 'IT', description: 'Information Technology department' },
      { name: 'Compliance', description: 'Compliance department' },
      { name: 'Operations', description: 'Operations department' },
      { name: 'Human Resources', description: 'HR department' }
    ]);
    console.log('Initial departments created successfully.');
    
    // Create admin user
    console.log('Creating admin user...');
    const adminUser = await User.create({
      username: 'admin',
      email: 'admin@example.com',
      password: hashPassword('admin123'), // Using simple hash instead of bcrypt
      firstName: 'Admin',
      lastName: 'User',
      accountStatus: 'active',
      departmentId: 1
    });
    
    // Assign admin role to admin user
    const adminRole = await Role.findOne({ where: { name: 'admin' } });
    await adminUser.setRoles([adminRole]);
    console.log('Admin user created successfully.');
    
    // Create compliance officer user
    console.log('Creating compliance officer user...');
    const complianceUser = await User.create({
      username: 'compliance',
      email: 'compliance@example.com',
      password: hashPassword('compliance123'), // Using simple hash instead of bcrypt
      firstName: 'Compliance',
      lastName: 'Officer',
      accountStatus: 'active',
      departmentId: 3
    });
    
    // Assign compliance officer role to compliance user
    const complianceRole = await Role.findOne({ where: { name: 'compliance_officer' } });
    await complianceUser.setRoles([complianceRole]);
    console.log('Compliance officer user created successfully.');
    
    // Create initial training courses
    console.log('Creating initial training courses...');
    await TrainingCourse.bulkCreate([
      {
        title: 'HIPAA Basics',
        description: 'Introduction to HIPAA regulations and compliance requirements',
        content: 'This course covers the basic principles of HIPAA compliance.',
        duration: 60,
        passingScore: 80,
        isRequired: true,
        frequency: 'annual',
        status: 'active',
        createdBy: 1
      },
      {
        title: 'Security Awareness',
        description: 'Security best practices for protecting PHI',
        content: 'This course covers security awareness training for healthcare IT professionals.',
        duration: 45,
        passingScore: 80,
        isRequired: true,
        frequency: 'annual',
        status: 'active',
        createdBy: 1
      },
      {
        title: 'Privacy Rule Overview',
        description: 'Detailed overview of the HIPAA Privacy Rule',
        content: 'This course provides a comprehensive overview of the HIPAA Privacy Rule.',
        duration: 90,
        passingScore: 85,
        isRequired: true,
        frequency: 'annual',
        status: 'active',
        createdBy: 1
      }
    ]);
    console.log('Initial training courses created successfully.');
    
    // Create document categories
    console.log('Creating document categories...');
    await DocumentCategory.bulkCreate([
      { name: 'Policies', description: 'Organizational policies' },
      { name: 'Procedures', description: 'Operational procedures' },
      { name: 'Forms', description: 'Required forms' },
      { name: 'Training Materials', description: 'Training documentation' },
      { name: 'Compliance Documentation', description: 'Compliance-related documentation' }
    ]);
    console.log('Document categories created successfully.');
    
    // Initialize tables for enhanced features
    
    // Create initial risk assessment categories
    console.log('Creating risk assessment categories...');
    try {
      await db.sequelize.query(`
        INSERT INTO "RiskAssessments" (title, description, methodology, scope, status, "createdBy", "createdAt", "updatedAt")
        VALUES 
          ('Initial Risk Assessment', 'Baseline risk assessment for the organization', 'NIST Cybersecurity Framework', 'All systems containing PHI', 'in_progress', 1, NOW(), NOW());
      `);
      
      await db.sequelize.query(`
        INSERT INTO "RiskItems" (category, "assessmentId", "assetName", description, likelihood, impact, "riskLevel", "mitigationStatus", "createdAt", "updatedAt")
        VALUES 
          ('technical', 1, 'Sample Asset', 'This is a sample risk item for demonstration', 'medium', 'medium', 'medium', 'not_started', NOW(), NOW());
      `);
    } catch (error) {
      console.log('Note: Could not create sample risk assessment data. This is not critical and can be created later.');
    }
    
    // Create sample incident categories
    console.log('Creating sample incident data...');
    try {
      await db.sequelize.query(`
        INSERT INTO "Incidents" (title, description, category, severity, status, "reportedBy", "incidentDate", "reportedDate", "createdAt", "updatedAt")
        VALUES 
          ('Sample Incident', 'This is a sample incident for demonstration', 'security', 'medium', 'reported', 1, NOW(), NOW(), NOW(), NOW());
      `);
    } catch (error) {
      console.log('Note: Could not create sample incident data. This is not critical and can be created later.');
    }
    
    console.log('Database initialization completed successfully.');
    
    console.log('\nIMPORTANT: This script used a simplified password hashing method for compatibility.');
    console.log('For production use, please update user passwords with proper bcrypt hashing after setup.');
    console.log('\nYou can now start the application with:');
    console.log('node server.js');
    
  } catch (error) {
    console.error('Error initializing database:', error);
  } finally {
    // Close database connection
    await sequelize.close();
    console.log('Database connection closed.');
  }
}

// Run the initialization function
initializeDatabase();
