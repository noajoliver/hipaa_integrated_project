const { sequelize } = require('../models');
const bcrypt = require('bcrypt');

// Database initialization script
const initializeDatabase = async () => {
  try {
    // Create database tables
    await sequelize.sync({ force: true });
    console.log('Database tables created successfully');
    
    // Import models
    const { Role, Department, User, TrainingCourse, ComplianceRequirement } = require('../models');
    
    // Create default roles
    const roles = [
      { 
        name: 'Admin', 
        description: 'System administrator with full access',
        permissions: JSON.stringify({
          isAdmin: true,
          isComplianceOfficer: true,
          isDepartmentManager: true,
          canManageUsers: true,
          canManageTraining: true,
          canManageDocuments: true,
          canManageCompliance: true,
          canViewReports: true
        })
      },
      { 
        name: 'Compliance Officer', 
        description: 'Responsible for compliance management',
        permissions: JSON.stringify({
          isAdmin: false,
          isComplianceOfficer: true,
          isDepartmentManager: false,
          canManageUsers: false,
          canManageTraining: true,
          canManageDocuments: true,
          canManageCompliance: true,
          canViewReports: true
        })
      },
      { 
        name: 'Department Manager', 
        description: 'Manages a department and its users',
        permissions: JSON.stringify({
          isAdmin: false,
          isComplianceOfficer: false,
          isDepartmentManager: true,
          canManageUsers: false,
          canManageTraining: false,
          canManageDocuments: false,
          canManageCompliance: false,
          canViewReports: true
        })
      },
      { 
        name: 'Employee', 
        description: 'Regular employee with basic access',
        permissions: JSON.stringify({
          isAdmin: false,
          isComplianceOfficer: false,
          isDepartmentManager: false,
          canManageUsers: false,
          canManageTraining: false,
          canManageDocuments: false,
          canManageCompliance: false,
          canViewReports: false
        })
      }
    ];
    
    for (const role of roles) {
      await Role.create(role);
    }
    console.log('Default roles created successfully');
    
    // Create default departments
    const departments = [
      { name: 'Administration', description: 'Administrative department' },
      { name: 'IT', description: 'Information Technology department' },
      { name: 'Compliance', description: 'Compliance and Risk Management' },
      { name: 'Operations', description: 'Operations department' },
      { name: 'Human Resources', description: 'HR department' }
    ];
    
    for (const department of departments) {
      await Department.create(department);
    }
    console.log('Default departments created successfully');
    
    // Create admin user
    const adminPassword = await bcrypt.hash('admin123', 10);
    await User.create({
      username: 'admin',
      email: 'admin@example.com',
      password: adminPassword,
      firstName: 'System',
      lastName: 'Administrator',
      position: 'Administrator',
      departmentId: 1, // Administration
      roleId: 1, // Admin
      accountStatus: 'active',
      hireDate: new Date()
    });
    console.log('Admin user created successfully');
    
    // Create sample training courses
    const trainingCourses = [
      {
        title: 'HIPAA Basics',
        description: 'Introduction to HIPAA regulations and compliance requirements',
        contentType: 'document',
        durationMinutes: 60,
        frequencyDays: 365, // Annual training
        version: '1.0',
        status: 'active',
        content: 'This training covers the basics of HIPAA compliance including Privacy Rule, Security Rule, and Breach Notification Rule.',
        passingScore: 80
      },
      {
        title: 'Security Awareness',
        description: 'Security best practices for protecting PHI',
        contentType: 'video',
        durationMinutes: 45,
        frequencyDays: 180, // Bi-annual training
        version: '1.0',
        status: 'active',
        content: 'https://example.com/security-awareness-training',
        passingScore: 80
      },
      {
        title: 'Privacy Rule Deep Dive',
        description: 'Detailed training on HIPAA Privacy Rule requirements',
        contentType: 'document',
        durationMinutes: 90,
        frequencyDays: 365, // Annual training
        version: '1.0',
        status: 'active',
        content: 'This training provides a comprehensive overview of the HIPAA Privacy Rule and its implementation requirements.',
        passingScore: 85
      }
    ];
    
    for (const course of trainingCourses) {
      await TrainingCourse.create(course);
    }
    console.log('Sample training courses created successfully');
    
    // Create sample compliance requirements
    const complianceRequirements = [
      {
        title: 'Risk Analysis',
        description: 'Conduct and document a risk analysis to identify potential risks and vulnerabilities to PHI',
        category: 'security',
        citation: '45 CFR § 164.308(a)(1)(ii)(A)',
        frequency: 'annually',
        responsibleRoleId: 2 // Compliance Officer
      },
      {
        title: 'Risk Management',
        description: 'Implement security measures to reduce risks and vulnerabilities to PHI',
        category: 'security',
        citation: '45 CFR § 164.308(a)(1)(ii)(B)',
        frequency: 'quarterly',
        responsibleRoleId: 2 // Compliance Officer
      },
      {
        title: 'Sanction Policy',
        description: 'Apply appropriate sanctions against workforce members who fail to comply with security policies',
        category: 'security',
        citation: '45 CFR § 164.308(a)(1)(ii)(C)',
        frequency: 'annually',
        responsibleRoleId: 2 // Compliance Officer
      },
      {
        title: 'Information System Activity Review',
        description: 'Regularly review records of information system activity, such as audit logs, access reports, and security incident tracking',
        category: 'security',
        citation: '45 CFR § 164.308(a)(1)(ii)(D)',
        frequency: 'monthly',
        responsibleRoleId: 2 // Compliance Officer
      },
      {
        title: 'Notice of Privacy Practices',
        description: 'Maintain and distribute a notice of privacy practices',
        category: 'privacy',
        citation: '45 CFR § 164.520',
        frequency: 'annually',
        responsibleRoleId: 2 // Compliance Officer
      },
      {
        title: 'Business Associate Agreements',
        description: 'Maintain business associate agreements with all business associates',
        category: 'privacy',
        citation: '45 CFR § 164.504(e)',
        frequency: 'annually',
        responsibleRoleId: 2 // Compliance Officer
      },
      {
        title: 'Breach Notification Procedures',
        description: 'Maintain and test breach notification procedures',
        category: 'breach_notification',
        citation: '45 CFR § 164.404',
        frequency: 'annually',
        responsibleRoleId: 2 // Compliance Officer
      }
    ];
    
    for (const requirement of complianceRequirements) {
      await ComplianceRequirement.create(requirement);
    }
    console.log('Sample compliance requirements created successfully');
    
    console.log('Database initialization completed successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
};

module.exports = { initializeDatabase };
