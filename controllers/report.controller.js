const { User, Role, Department, TrainingCourse, TrainingAssignment, Document, DocumentAcknowledgment, ComplianceRequirement, ComplianceAssessment } = require('../models');
const { Op, Sequelize } = require('sequelize');

// Get dashboard metrics
exports.getDashboardMetrics = async (req, res) => {
  try {
    // User metrics
    const totalUsers = await User.count();
    const activeUsers = await User.count({ where: { accountStatus: 'active' } });
    
    // Training metrics
    const totalCourses = await TrainingCourse.count({ where: { status: 'active' } });
    const totalAssignments = await TrainingAssignment.count();
    const completedAssignments = await TrainingAssignment.count({ where: { status: 'completed' } });
    const overdueAssignments = await TrainingAssignment.count({
      where: {
        status: {
          [Op.notIn]: ['completed', 'expired']
        },
        dueDate: {
          [Op.lt]: new Date()
        }
      }
    });
    
    // Document metrics
    const totalDocuments = await Document.count({ where: { status: 'active' } });
    const documentsRequiringReview = await Document.count({
      where: {
        status: 'active',
        reviewDate: {
          [Op.lt]: new Date()
        }
      }
    });
    
    // Compliance metrics
    const totalRequirements = await ComplianceRequirement.count();
    
    // Get latest assessment for each requirement
    const latestAssessments = await ComplianceAssessment.findAll({
      attributes: [
        'requirementId',
        [Sequelize.fn('MAX', Sequelize.col('assessmentDate')), 'latestDate']
      ],
      group: ['requirementId']
    });
    
    const latestAssessmentIds = [];
    for (const assessment of latestAssessments) {
      const latest = await ComplianceAssessment.findOne({
        where: {
          requirementId: assessment.requirementId,
          assessmentDate: assessment.get('latestDate')
        },
        order: [['id', 'DESC']]
      });
      if (latest) {
        latestAssessmentIds.push(latest.id);
      }
    }
    
    // Get full assessment details
    const assessmentDetails = await ComplianceAssessment.findAll({
      where: {
        id: {
          [Op.in]: latestAssessmentIds
        }
      }
    });
    
    // Calculate compliance status
    const compliantCount = assessmentDetails.filter(a => a.status === 'compliant').length;
    const partiallyCompliantCount = assessmentDetails.filter(a => a.status === 'partially_compliant').length;
    const nonCompliantCount = assessmentDetails.filter(a => a.status === 'non_compliant').length;
    
    // Calculate overall compliance rate
    const assessedRequirements = assessmentDetails.length;
    const complianceRate = assessedRequirements > 0 
      ? Math.round((compliantCount / assessedRequirements) * 100) 
      : 0;
    
    // Training completion rate
    const trainingCompletionRate = totalAssignments > 0 
      ? Math.round((completedAssignments / totalAssignments) * 100) 
      : 0;
    
    return res.status(200).json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          active: activeUsers
        },
        training: {
          totalCourses,
          totalAssignments,
          completedAssignments,
          overdueAssignments,
          completionRate: trainingCompletionRate
        },
        documents: {
          total: totalDocuments,
          requireReview: documentsRequiringReview
        },
        compliance: {
          totalRequirements,
          compliant: compliantCount,
          partiallyCompliant: partiallyCompliantCount,
          nonCompliant: nonCompliantCount,
          notAssessed: totalRequirements - assessedRequirements,
          complianceRate
        }
      }
    });
  } catch (error) {
    console.error('Error getting dashboard metrics:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve dashboard metrics',
      error: error.message
    });
  }
};

// Get training status by department
exports.getTrainingStatusByDepartment = async (req, res) => {
  try {
    const departments = await Department.findAll();
    
    const departmentStats = [];
    
    for (const department of departments) {
      // Get users in department
      const users = await User.findAll({
        where: { departmentId: department.id }
      });
      
      const userIds = users.map(user => user.id);
      
      // Skip if no users
      if (userIds.length === 0) {
        departmentStats.push({
          department: department.name,
          totalAssignments: 0,
          completedAssignments: 0,
          overdueAssignments: 0,
          completionRate: 0
        });
        continue;
      }
      
      // Get training assignments for users in department
      const totalAssignments = await TrainingAssignment.count({
        where: {
          userId: {
            [Op.in]: userIds
          }
        }
      });
      
      const completedAssignments = await TrainingAssignment.count({
        where: {
          userId: {
            [Op.in]: userIds
          },
          status: 'completed'
        }
      });
      
      const overdueAssignments = await TrainingAssignment.count({
        where: {
          userId: {
            [Op.in]: userIds
          },
          status: {
            [Op.notIn]: ['completed', 'expired']
          },
          dueDate: {
            [Op.lt]: new Date()
          }
        }
      });
      
      // Calculate completion rate
      const completionRate = totalAssignments > 0 
        ? Math.round((completedAssignments / totalAssignments) * 100) 
        : 0;
      
      departmentStats.push({
        department: department.name,
        totalAssignments,
        completedAssignments,
        overdueAssignments,
        completionRate
      });
    }
    
    return res.status(200).json({
      success: true,
      data: departmentStats
    });
  } catch (error) {
    console.error('Error getting training status by department:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve training status by department',
      error: error.message
    });
  }
};

// Get compliance status by category
exports.getComplianceStatusByCategory = async (req, res) => {
  try {
    // Get all requirements grouped by category
    const requirementsByCategory = await ComplianceRequirement.findAll({
      attributes: [
        'category',
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'total']
      ],
      group: ['category']
    });
    
    const categoryStats = [];
    
    for (const categoryGroup of requirementsByCategory) {
      const category = categoryGroup.category;
      const totalRequirements = parseInt(categoryGroup.get('total'));
      
      // Get requirements in this category
      const requirements = await ComplianceRequirement.findAll({
        where: { category }
      });
      
      const requirementIds = requirements.map(req => req.id);
      
      // Get latest assessment for each requirement
      const latestAssessments = [];
      for (const reqId of requirementIds) {
        const latest = await ComplianceAssessment.findOne({
          where: { requirementId: reqId },
          order: [['assessmentDate', 'DESC']]
        });
        
        if (latest) {
          latestAssessments.push(latest);
        }
      }
      
      // Calculate compliance status
      const compliantCount = latestAssessments.filter(a => a.status === 'compliant').length;
      const partiallyCompliantCount = latestAssessments.filter(a => a.status === 'partially_compliant').length;
      const nonCompliantCount = latestAssessments.filter(a => a.status === 'non_compliant').length;
      const notAssessedCount = totalRequirements - latestAssessments.length;
      
      // Calculate compliance rate
      const complianceRate = latestAssessments.length > 0 
        ? Math.round((compliantCount / latestAssessments.length) * 100) 
        : 0;
      
      categoryStats.push({
        category,
        totalRequirements,
        compliant: compliantCount,
        partiallyCompliant: partiallyCompliantCount,
        nonCompliant: nonCompliantCount,
        notAssessed: notAssessedCount,
        complianceRate
      });
    }
    
    return res.status(200).json({
      success: true,
      data: categoryStats
    });
  } catch (error) {
    console.error('Error getting compliance status by category:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve compliance status by category',
      error: error.message
    });
  }
};

// Get document acknowledgment status
exports.getDocumentAcknowledgmentStatus = async (req, res) => {
  try {
    const documents = await Document.findAll({
      where: { status: 'active' }
    });
    
    const documentStats = [];
    
    for (const document of documents) {
      // Get total users
      const totalUsers = await User.count({
        where: { accountStatus: 'active' }
      });
      
      // Get acknowledgments for this document
      const acknowledgments = await DocumentAcknowledgment.count({
        where: { documentId: document.id }
      });
      
      // Calculate acknowledgment rate
      const acknowledgmentRate = totalUsers > 0 
        ? Math.round((acknowledgments / totalUsers) * 100) 
        : 0;
      
      documentStats.push({
        documentId: document.id,
        title: document.title,
        totalUsers,
        acknowledged: acknowledgments,
        notAcknowledged: totalUsers - acknowledgments,
        acknowledgmentRate
      });
    }
    
    return res.status(200).json({
      success: true,
      data: documentStats
    });
  } catch (error) {
    console.error('Error getting document acknowledgment status:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve document acknowledgment status',
      error: error.message
    });
  }
};

// Get upcoming due dates
exports.getUpcomingDueDates = async (req, res) => {
  try {
    const nextThirtyDays = new Date(new Date().setDate(new Date().getDate() + 30));
    
    // Upcoming training assignments
    const upcomingTraining = await TrainingAssignment.findAll({
      where: {
        status: {
          [Op.notIn]: ['completed', 'expired']
        },
        dueDate: {
          [Op.gt]: new Date(),
          [Op.lt]: nextThirtyDays
        }
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: TrainingCourse,
          as: 'course',
          attributes: ['id', 'title']
        }
      ],
      order: [['dueDate', 'ASC']],
      limit: 10
    });
    
    // Upcoming document reviews
    const upcomingDocumentReviews = await Document.findAll({
      where: {
        status: 'active',
        reviewDate: {
          [Op.gt]: new Date(),
          [Op.lt]: nextThirtyDays
        }
      },
      order: [['reviewDate', 'ASC']],
      limit: 10
    });
    
    // Upcoming compliance assessments
    const upcomingAssessments = await ComplianceAssessment.findAll({
      where: {
        nextAssessmentDate: {
          [Op.gt]: new Date(),
          [Op.lt]: nextThirtyDays
        }
      },
      include: [
        {
          model: ComplianceRequirement,
          as: 'requirement'
        }
      ],
      order: [['nextAssessmentDate', 'ASC']],
      limit: 10
    });
    
    return res.status(200).json({
      success: true,
      data: {
        upcomingTraining,
        upcomingDocumentReviews,
        upcomingAssessments
      }
    });
  } catch (error) {
    console.error('Error getting upcoming due dates:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve upcoming due dates',
      error: error.message
    });
  }
};

// Generate compliance report
exports.generateComplianceReport = async (req, res) => {
  try {
    const { startDate, endDate, includeTraining, includeDocuments, includeCompliance } = req.body;
    
    // Parse dates
    const parsedStartDate = startDate ? new Date(startDate) : new Date(new Date().setMonth(new Date().getMonth() - 1));
    const parsedEndDate = endDate ? new Date(endDate) : new Date();
    
    const report = {
      generatedAt: new Date(),
      dateRange: {
        startDate: parsedStartDate,
        endDate: parsedEndDate
      },
      summary: {},
      details: {}
    };
    
    // Include training data if requested
    if (includeTraining !== false) {
      // Training completion in date range
      const trainingCompletions = await TrainingAssignment.findAll({
        where: {
          status: 'completed',
          completionDate: {
            [Op.between]: [parsedStartDate, parsedEndDate]
          }
        },
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'firstName', 'lastName', 'email']
          },
          {
            model: TrainingCourse,
            as: 'course',
            attributes: ['id', 'title']
          }
        ],
        order: [['completionDate', 'DESC']]
      });
      
      // Training statistics
      const totalAssignments = await TrainingAssignment.count();
      const completedAssignments = await TrainingAssignment.count({ where: { status: 'completed' } });
      const overdueAssignments = await TrainingAssignment.count({
        where: {
          status: {
            [Op.notIn]: ['completed', 'expired']
          },
          dueDate: {
            [Op.lt]: new Date()
          }
        }
      });
      
      report.summary.training = {
        totalAssignments,
        completedAssignments,
        overdueAssignments,
        completionRate: totalAssignments > 0 ? Math.round((completedAssignments / totalAssignments) * 100) : 0,
        completionsInPeriod: trainingCompletions.length
      };
      
      report.details.trainingCompletions = trainingCompletions;
    }
    
    // Include document data if requested
    if (includeDocuments !== false) {
      // Document acknowledgments in date range
      const documentAcknowledgments = await DocumentAcknowledgment.findAll({
        where: {
          acknowledgmentDate: {
            [Op.between]: [parsedStartDate, parsedEndDate]
          }
        },
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'firstName', 'lastName', 'email']
          },
          {
            model: Document,
            as: 'document',
            attributes: ['id', 'title', 'documentType', 'hipaaCategory']
          }
        ],
        order: [['acknowledgmentDate', 'DESC']]
      });
      
      // Document statistics
      const totalDocuments = await Document.count({ where: { status: 'active' } });
      const documentsRequiringReview = await Document.count({
        where: {
          status: 'active',
          reviewDate: {
            [Op.lt]: new Date()
          }
        }
      });
      
      report.summary.documents = {
        totalDocuments,
        documentsRequiringReview,
        acknowledgementsInPeriod: documentAcknowledgments.length
      };
      
      report.details.documentAcknowledgments = documentAcknowledgments;
    }
    
    // Include compliance data if requested
    if (includeCompliance !== false) {
      // Compliance assessments in date range
      const complianceAssessments = await ComplianceAssessment.findAll({
        where: {
          assessmentDate: {
            [Op.between]: [parsedStartDate, parsedEndDate]
          }
        },
        include: [
          {
            model: ComplianceRequirement,
            as: 'requirement'
          },
          {
            model: User,
            as: 'conductor',
            attributes: ['id', 'firstName', 'lastName']
          }
        ],
        order: [['assessmentDate', 'DESC']]
      });
      
      // Compliance statistics
      const totalRequirements = await ComplianceRequirement.count();
      
      // Get latest assessment for each requirement
      const latestAssessments = await ComplianceAssessment.findAll({
        attributes: [
          'requirementId',
          [Sequelize.fn('MAX', Sequelize.col('assessmentDate')), 'latestDate']
        ],
        group: ['requirementId']
      });
      
      const latestAssessmentIds = [];
      for (const assessment of latestAssessments) {
        const latest = await ComplianceAssessment.findOne({
          where: {
            requirementId: assessment.requirementId,
            assessmentDate: assessment.get('latestDate')
          },
          order: [['id', 'DESC']]
        });
        if (latest) {
          latestAssessmentIds.push(latest.id);
        }
      }
      
      // Get full assessment details
      const assessmentDetails = await ComplianceAssessment.findAll({
        where: {
          id: {
            [Op.in]: latestAssessmentIds
          }
        }
      });
      
      // Calculate compliance status
      const compliantCount = assessmentDetails.filter(a => a.status === 'compliant').length;
      const partiallyCompliantCount = assessmentDetails.filter(a => a.status === 'partially_compliant').length;
      const nonCompliantCount = assessmentDetails.filter(a => a.status === 'non_compliant').length;
      
      report.summary.compliance = {
        totalRequirements,
        compliant: compliantCount,
        partiallyCompliant: partiallyCompliantCount,
        nonCompliant: nonCompliantCount,
        notAssessed: totalRequirements - assessmentDetails.length,
        complianceRate: assessmentDetails.length > 0 ? Math.round((compliantCount / assessmentDetails.length) * 100) : 0,
        assessmentsInPeriod: complianceAssessments.length
      };
      
      report.details.complianceAssessments = complianceAssessments;
    }
    
    return res.status(200).json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Error generating compliance report:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate compliance report',
      error: error.message
    });
  }
};
