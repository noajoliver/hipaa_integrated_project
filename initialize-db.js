// Custom database initialization script for HIPAA Compliance Tool
// This script creates all necessary tables and seeds initial data

const dotenv = require('dotenv');
const crypto = require('crypto');

// Load environment variables
dotenv.config();

// Import models
const db = require('./models');

// Simple password hashing function using Node.js crypto module
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

async function initializeDatabase() {
  try {
    console.log('Starting database initialization...');
    
    // Test database connection
    await db.sequelize.authenticate();
    console.log('Database connection has been established successfully.');
    
    // Sync all models with database
    console.log('Syncing database models...');
    await db.sequelize.sync({ force: true });
    console.log('Database models synchronized successfully.');
    
    // Create initial roles
    console.log('Creating initial roles...');
    const adminRole = await db.Role.create({ 
      name: 'admin',
      description: 'Administrator role with full access',
      permissions: { isAdmin: true }
    });
    
    await db.Role.create({ 
      name: 'compliance_officer',
      description: 'Compliance officer role',
      permissions: { canManageDocuments: true, canManageTraining: true }
    });
    
    await db.Role.create({ 
      name: 'manager',
      description: 'Department manager role',
      permissions: { canViewReports: true, canManageTeam: true }
    });
    
    await db.Role.create({ 
      name: 'employee',
      description: 'Regular employee role',
      permissions: { canViewDocuments: true, canTakeTraining: true }
    });
    
    console.log('Initial roles created successfully.');
    
    // Create initial departments
    console.log('Creating initial departments...');
    const adminDept = await db.Department.create({ 
      name: 'Administration', 
      description: 'Administrative staff' 
    });
    
    await db.Department.create({ 
      name: 'IT', 
      description: 'Information Technology department' 
    });
    
    const complianceDept = await db.Department.create({ 
      name: 'Compliance', 
      description: 'Compliance department' 
    });
    
    await db.Department.create({ 
      name: 'Operations', 
      description: 'Operations department' 
    });
    
    await db.Department.create({ 
      name: 'Human Resources', 
      description: 'HR department' 
    });
    
    console.log('Initial departments created successfully.');
    
    // Create admin user
    console.log('Creating admin user...');
    const adminUser = await db.User.create({
      username: 'admin',
      email: 'admin@example.com',
      password: hashPassword('admin123'), // Using simple hash for compatibility
      firstName: 'Admin',
      lastName: 'User',
      accountStatus: 'active',
      departmentId: adminDept.id,
      roleId: adminRole.id
    });
    
    console.log('Admin user created successfully.');
    
    // Create compliance officer user
    console.log('Creating compliance officer user...');
    const complianceRole = await db.Role.findOne({ where: { name: 'compliance_officer' } });
    
    const complianceUser = await db.User.create({
      username: 'compliance',
      email: 'compliance@example.com',
      password: hashPassword('compliance123'), // Using simple hash for compatibility
      firstName: 'Compliance',
      lastName: 'Officer',
      accountStatus: 'active',
      departmentId: complianceDept.id,
      roleId: complianceRole.id
    });
    
    console.log('Compliance officer user created successfully.');
    
    // Create document categories
    console.log('Creating document categories...');
    await db.DocumentCategory.bulkCreate([
      { name: 'Policies', description: 'Organizational policies' },
      { name: 'Procedures', description: 'Operational procedures' },
      { name: 'Forms', description: 'Required forms' },
      { name: 'Training Materials', description: 'Training documentation' },
      { name: 'Compliance Documentation', description: 'Compliance-related documentation' }
    ]);
    console.log('Document categories created successfully.');
    
    // Create initial training courses
    console.log('Creating initial training courses...');
    await db.TrainingCourse.bulkCreate([
      {
        title: 'HIPAA Basics',
        description: 'Introduction to HIPAA regulations and compliance requirements',
        content: 'This course covers the basic principles of HIPAA compliance.',
        duration: 60,
        passingScore: 80,
        isRequired: true,
        frequency: 'annual',
        status: 'active',
        createdBy: adminUser.id
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
        createdBy: adminUser.id
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
        createdBy: adminUser.id
      }
    ]);
    console.log('Initial training courses created successfully.');
    
    try {
      // Create risk assessment
      console.log('Creating sample risk assessment...');
      const riskAssessment = await db.RiskAssessment.create({
        title: 'Annual Security Risk Assessment',
        description: 'Comprehensive assessment of security controls',
        status: 'in_progress',
        startDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        assessor: adminUser.id
      });
      
      // Create risk item
      await db.RiskItem.create({
        assessmentId: riskAssessment.id,
        category: 'technical',
        title: 'Weak password policies',
        description: 'Current password policies do not enforce sufficient complexity',
        likelihood: 'high',
        impact: 'high',
        riskScore: 25,
        status: 'open',
        assetName: 'Authentication System',
        currentControls: 'Basic password requirements',
        recommendedControls: 'Implement stronger password complexity requirements',
        mitigationPlan: 'Update password policy and implement technical controls',
        mitigationStatus: 'not_started'
      });
      
      // Create sample incident
      console.log('Creating sample incident...');
      await db.Incident.create({
        title: 'Potential Data Breach',
        description: 'Suspicious login attempts detected from unknown IP',
        category: 'security',
        severity: 'high',
        status: 'open',
        reportedBy: adminUser.id,
        incidentDate: new Date(),
        reportedDate: new Date(),
        affectedSystems: ['Authentication system'],
        potentialImpact: 'Unauthorized access to patient data'
      });
      
      console.log('Sample risk and incident data created successfully.');
    } catch (err) {
      console.warn('Some sample data could not be created. This is likely because some advanced models are not yet available:', err.message);
      console.warn('You can safely ignore this warning if you are running the initialization for the first time.');
    }
    
    console.log('Database initialization completed successfully.');
    console.log('Default login credentials:');
    console.log('  Admin - Username: admin, Password: admin123');
    console.log('  Compliance Officer - Username: compliance, Password: compliance123');
    
    console.log('\nIMPORTANT: This script used a simplified password hashing method for compatibility.');
    console.log('For production use, please change user passwords after first login.');
    
  } catch (error) {
    console.error('Error initializing database:', error);
  } finally {
    // Close database connection
    await db.sequelize.close();
    console.log('Database connection closed.');
  }
}

// Run the initialization function
initializeDatabase();