/**
 * User Model
 * 
 * @module models/user
 * @description Represents system users with role-based access and security features for HIPAA compliance
 */

/**
 * Initialize User model
 * @param {Object} sequelize - Sequelize instance
 * @param {Object} DataTypes - Sequelize data types
 * @returns {Object} User model
 */
module.exports = (sequelize, DataTypes) => {
  /**
   * User model representing system users with role-based access and security features
   * @class User
   * @property {number} id - Unique identifier for the user
   * @property {string} username - Username for authentication (3-50 characters)
   * @property {string} email - User's email address (must be valid email format)
   * @property {string} password - Hashed password (bcrypt)
   * @property {string} firstName - User's first name
   * @property {string} lastName - User's last name
   * @property {string} position - User's job position/title
   * @property {Date} hireDate - Date when user was hired
   * @property {Date} lastLogin - Timestamp of user's last successful login
   * @property {string} accountStatus - Current account status ('active', 'inactive', 'locked', 'pending')
   * @property {number} failedLoginAttempts - Count of consecutive failed login attempts
   * @property {Date} lastPasswordChange - Timestamp of last password change
   * @property {Array} passwordHistory - JSON array of previous password hashes
   * @property {boolean} requirePasswordChange - Flag indicating if user must change password at next login
   * @property {Date} passwordExpiresAt - Date when current password expires
   * @property {boolean} mfaEnabled - Whether multi-factor authentication is enabled
   * @property {string} mfaSecret - Encrypted secret key for TOTP-based MFA
   * @property {Array} recoveryBackupCodes - JSON array of MFA recovery codes
   * @property {Array} securityQuestions - JSON array of security questions and hashed answers
   * @property {Array} ipAccessList - JSON array of allowed IP addresses/ranges
   * @property {Date} accountLockExpiresAt - Timestamp when a temporary account lock expires
   */
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        len: [3, 50]
      }
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    position: {
      type: DataTypes.STRING,
      allowNull: true
    },
    hireDate: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    lastLogin: {
      type: DataTypes.DATE,
      allowNull: true
    },
    accountStatus: {
      type: DataTypes.ENUM('active', 'inactive', 'locked', 'pending'),
      defaultValue: 'active'
    },

    // Security-related fields
    failedLoginAttempts: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    },
    lastPasswordChange: {
      type: DataTypes.DATE,
      allowNull: true
    },
    passwordHistory: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: []
    },
    requirePasswordChange: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    passwordExpiresAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    mfaEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    mfaSecret: {
      type: DataTypes.STRING,
      allowNull: true
    },
    recoveryBackupCodes: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: []
    },
    securityQuestions: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: []
    },
    ipAccessList: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: []
    },
    accountLockExpiresAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    timestamps: true,
    paranoid: true, // Soft delete - enables deletedAt field
    tableName: 'users'
  });

  /**
   * Define associations with other models
   * @param {Object} models - The models object containing all models
   */
  User.associate = (models) => {
    /**
     * User belongs to a Role
     * @see models/role.model.js
     */
    User.belongsTo(models.Role, {
      foreignKey: 'roleId',
      as: 'role'
    });
    
    /**
     * User belongs to a Department
     * @see models/department.model.js
     */
    User.belongsTo(models.Department, {
      foreignKey: 'departmentId',
      as: 'department'
    });
    
    /**
     * User has many TrainingAssignments
     * @see models/training-assignment.model.js
     */
    User.hasMany(models.TrainingAssignment, {
      foreignKey: 'userId',
      as: 'trainingAssignments'
    });
    
    /**
     * User has many DocumentAcknowledgments
     * @see models/document-acknowledgment.model.js
     */
    User.hasMany(models.DocumentAcknowledgment, {
      foreignKey: 'userId',
      as: 'documentAcknowledgments'
    });
  };

  return User;
};