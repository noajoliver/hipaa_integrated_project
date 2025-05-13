/**
 * Database index migration script
 * Adds optimized indexes to improve query performance
 */
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Users table indexes
    await queryInterface.addIndex('users', ['email'], {
      name: 'idx_users_email',
      unique: true
    });
    
    await queryInterface.addIndex('users', ['username'], {
      name: 'idx_users_username',
      unique: true
    });
    
    await queryInterface.addIndex('users', ['roleId'], {
      name: 'idx_users_role_id'
    });
    
    await queryInterface.addIndex('users', ['departmentId'], {
      name: 'idx_users_department_id'
    });
    
    await queryInterface.addIndex('users', ['accountStatus'], {
      name: 'idx_users_account_status'
    });
    
    // Documents table indexes
    await queryInterface.addIndex('documents', ['categoryId'], {
      name: 'idx_documents_category_id'
    });
    
    await queryInterface.addIndex('documents', ['status'], {
      name: 'idx_documents_status'
    });
    
    await queryInterface.addIndex('documents', ['documentType'], {
      name: 'idx_documents_type'
    });
    
    await queryInterface.addIndex('documents', ['hipaaCategory'], {
      name: 'idx_documents_hipaa_category'
    });
    
    await queryInterface.addIndex('documents', ['createdBy'], {
      name: 'idx_documents_created_by'
    });
    
    // Document acknowledgments table indexes
    await queryInterface.addIndex('document_acknowledgments', ['documentId'], {
      name: 'idx_document_acknowledgments_document_id'
    });
    
    await queryInterface.addIndex('document_acknowledgments', ['userId'], {
      name: 'idx_document_acknowledgments_user_id'
    });
    
    await queryInterface.addIndex('document_acknowledgments', ['status'], {
      name: 'idx_document_acknowledgments_status'
    });
    
    // Composite index for looking up specific acknowledgments
    await queryInterface.addIndex('document_acknowledgments', ['documentId', 'userId'], {
      name: 'idx_document_acknowledgments_document_user'
    });
    
    // Incidents table indexes
    // Note: Many indexes already exist in the model definition
    
    // Additional incident indexes for reporting
    await queryInterface.addIndex('incidents', ['incidentDate', 'status'], {
      name: 'idx_incidents_date_status'
    });
    
    await queryInterface.addIndex('incidents', ['category', 'severity'], {
      name: 'idx_incidents_category_severity'
    });
    
    // Training courses indexes
    await queryInterface.addIndex('training_courses', ['status'], {
      name: 'idx_training_courses_status'
    });
    
    await queryInterface.addIndex('training_courses', ['contentType'], {
      name: 'idx_training_courses_content_type'
    });
    
    // Training assignments indexes
    await queryInterface.addIndex('training_assignments', ['userId'], {
      name: 'idx_training_assignments_user_id'
    });
    
    await queryInterface.addIndex('training_assignments', ['courseId'], {
      name: 'idx_training_assignments_course_id'
    });
    
    await queryInterface.addIndex('training_assignments', ['status'], {
      name: 'idx_training_assignments_status'
    });
    
    await queryInterface.addIndex('training_assignments', ['dueDate'], {
      name: 'idx_training_assignments_due_date'
    });
    
    // Composite index for looking up specific assignments
    await queryInterface.addIndex('training_assignments', ['userId', 'courseId'], {
      name: 'idx_training_assignments_user_course'
    });
    
    // Composite index for due date reporting
    await queryInterface.addIndex('training_assignments', ['status', 'dueDate'], {
      name: 'idx_training_assignments_status_due_date'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove User indexes
    await queryInterface.removeIndex('users', 'idx_users_email');
    await queryInterface.removeIndex('users', 'idx_users_username');
    await queryInterface.removeIndex('users', 'idx_users_role_id');
    await queryInterface.removeIndex('users', 'idx_users_department_id');
    await queryInterface.removeIndex('users', 'idx_users_account_status');
    
    // Remove Document indexes
    await queryInterface.removeIndex('documents', 'idx_documents_category_id');
    await queryInterface.removeIndex('documents', 'idx_documents_status');
    await queryInterface.removeIndex('documents', 'idx_documents_type');
    await queryInterface.removeIndex('documents', 'idx_documents_hipaa_category');
    await queryInterface.removeIndex('documents', 'idx_documents_created_by');
    
    // Remove Document acknowledgment indexes
    await queryInterface.removeIndex('document_acknowledgments', 'idx_document_acknowledgments_document_id');
    await queryInterface.removeIndex('document_acknowledgments', 'idx_document_acknowledgments_user_id');
    await queryInterface.removeIndex('document_acknowledgments', 'idx_document_acknowledgments_status');
    await queryInterface.removeIndex('document_acknowledgments', 'idx_document_acknowledgments_document_user');
    
    // Remove Incident indexes
    await queryInterface.removeIndex('incidents', 'idx_incidents_date_status');
    await queryInterface.removeIndex('incidents', 'idx_incidents_category_severity');
    
    // Remove Training course indexes
    await queryInterface.removeIndex('training_courses', 'idx_training_courses_status');
    await queryInterface.removeIndex('training_courses', 'idx_training_courses_content_type');
    
    // Remove Training assignment indexes
    await queryInterface.removeIndex('training_assignments', 'idx_training_assignments_user_id');
    await queryInterface.removeIndex('training_assignments', 'idx_training_assignments_course_id');
    await queryInterface.removeIndex('training_assignments', 'idx_training_assignments_status');
    await queryInterface.removeIndex('training_assignments', 'idx_training_assignments_due_date');
    await queryInterface.removeIndex('training_assignments', 'idx_training_assignments_user_course');
    await queryInterface.removeIndex('training_assignments', 'idx_training_assignments_status_due_date');
  }
};