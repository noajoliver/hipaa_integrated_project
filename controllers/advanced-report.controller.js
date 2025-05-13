const { User, Role, Department, TrainingCourse, TrainingAssignment, Document, DocumentAcknowledgment, 
  ComplianceRequirement, ComplianceAssessment, RiskAssessment, RiskItem, Incident, AuditLog } = require('../models');
const { Op, Sequelize } = require('sequelize');

// Advanced reporting controller with comprehensive reporting capabilities

// Generate comprehensive compliance report
exports.generateComprehensiveReport = async (req, res) => {
  try {
    const { startDate, endDate, includeTraining, includeDocuments, includeCompliance, 
      includeRisks, includeIncidents, includeAudit } = req.body;
    
    // Parse dates
    const parsedStartDate = startDate ? new Date(startDate) : new Date(new Date().setMonth(new Date().getMonth() - 1));
    const parsedEndDate = endDate ? new Date(endDate) : new Date();
    
    const report = {
      generatedAt: new Date(),
      generatedBy: req.user ? `${req.user.firstName} ${req.user.lastName}` : 'System',
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
      
      // Training by department
      const departments = await Department.findAll();
      const trainingByDepartment = [];
      
      for (const department of departments) {
        const users = await User.findAll({
          where: { departmentId: department.id }
        });
        
        const userIds = users.map(user => user.id);
        
        if (userIds.length === 0) {
          trainingByDepartment.push({
            department: department.name,
            totalAssignments: 0,
            completedAssignments: 0,
            completionRate: 0
          });
          continue;
        }
        
        const deptTotalAssignments = await TrainingAssignment.count({
          where: {
            userId: {
              [Op.in]: userIds
            }
          }
        });
        
        const deptCompletedAssignments = await TrainingAssignment.count({
          where: {
            userId: {
              [Op.in]: userIds
            },
            status: 'completed'
          }
        });
        
        trainingByDepartment.push({
          department: department.name,
          totalAssignments: deptTotalAssignments,
          completedAssignments: deptCompletedAssignments,
          completionRate: deptTotalAssignments > 0 ? Math.round((deptCompletedAssignments / deptTotalAssignments) * 100) : 0
        });
      }
      
      report.summary.training = {
        totalAssignments,
        completedAssignments,
        overdueAssignments,
        completionRate: totalAssignments > 0 ? Math.round((completedAssignments / totalAssignments) * 100) : 0,
        completionsInPeriod: trainingCompletions.length,
        byDepartment: trainingByDepartment
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
      
      // Document acknowledgment status
      const documents = await Document.findAll({
        where: { status: 'active' }
      });
      
      const documentAcknowledgmentStatus = [];
      const totalUsers = await User.count({ where: { accountStatus: 'active' } });
      
      for (const document of documents) {
        const acknowledgedCount = await DocumentAcknowledgment.count({
          where: { documentId: document.id }
        });
        
        documentAcknowledgmentStatus.push({
          documentId: document.id,
          title: document.title,
          totalUsers,
          acknowledged: acknowledgedCount,
          notAcknowledged: totalUsers - acknowledgedCount,
          acknowledgmentRate: totalUsers > 0 ? Math.round((acknowledgedCount / totalUsers) * 100) : 0
        });
      }
      
      report.summary.documents = {
        totalDocuments,
        documentsRequiringReview,
        acknowledgementsInPeriod: documentAcknowledgments.length,
        acknowledgmentStatus: documentAcknowledgmentStatus
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
      
      // Compliance by category
      const requirementsByCategory = await ComplianceRequirement.findAll({
        attributes: [
          'category',
          [Sequelize.fn('COUNT', Sequelize.col('id')), 'total']
        ],
        group: ['category']
      });
      
      const complianceByCategory = [];
      
      for (const categoryGroup of requirementsByCategory) {
        const category = categoryGroup.category;
        const totalRequirements = parseInt(categoryGroup.get('total'));
        
        const requirements = await ComplianceRequirement.findAll({
          where: { category }
        });
        
        const requirementIds = requirements.map(req => req.id);
        
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
        
        const compliantCount = latestAssessments.filter(a => a.status === 'compliant').length;
        
        complianceByCategory.push({
          category,
          totalRequirements,
          assessed: latestAssessments.length,
          compliant: compliantCount,
          complianceRate: latestAssessments.length > 0 ? Math.round((compliantCount / latestAssessments.length) * 100) : 0
        });
      }
      
      report.summary.compliance = {
        totalRequirements,
        compliant: compliantCount,
        partiallyCompliant: partiallyCompliantCount,
        nonCompliant: nonCompliantCount,
        notAssessed: totalRequirements - assessmentDetails.length,
        complianceRate: assessmentDetails.length > 0 ? Math.round((compliantCount / assessmentDetails.length) * 100) : 0,
        assessmentsInPeriod: complianceAssessments.length,
        byCategory: complianceByCategory
      };
      
      report.details.complianceAssessments = complianceAssessments;
    }
    
    // Include risk assessment data if requested
    if (includeRisks !== false) {
      // Risk assessments in date range
      const riskAssessments = await RiskAssessment.findAll({
        where: {
          assessmentDate: {
            [Op.between]: [parsedStartDate, parsedEndDate]
          }
        },
        include: [
          {
            model: User,
            as: 'conductor',
            attributes: ['id', 'firstName', 'lastName']
          }
        ],
        order: [['assessmentDate', 'DESC']]
      });
      
      // Risk statistics
      const totalAssessments = await RiskAssessment.count({
        where: {
          status: {
            [Op.ne]: 'archived'
          }
        }
      });
      
      // Risk items by level
      const riskItemsByLevel = await RiskItem.findAll({
        attributes: [
          'riskLevel',
          [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
        ],
        group: ['riskLevel']
      });
      
      // Format risk items by level
      const riskLevels = {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0
      };
      
      riskItemsByLevel.forEach(item => {
        riskLevels[item.riskLevel] = parseInt(item.get('count'));
      });
      
      // Risk items by mitigation status
      const riskItemsByMitigationStatus = await RiskItem.findAll({
        attributes: [
          'mitigationStatus',
          [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
        ],
        group: ['mitigationStatus']
      });
      
      // Format risk items by mitigation status
      const mitigationStatus = {
        not_started: 0,
        in_progress: 0,
        completed: 0,
        accepted: 0
      };
      
      riskItemsByMitigationStatus.forEach(item => {
        mitigationStatus[item.mitigationStatus] = parseInt(item.get('count'));
      });
      
      report.summary.risks = {
        totalAssessments,
        assessmentsInPeriod: riskAssessments.length,
        riskLevels,
        mitigationStatus
      };
      
      report.details.riskAssessments = riskAssessments;
    }
    
    // Include incident data if requested
    if (includeIncidents !== false) {
      // Incidents in date range
      const incidents = await Incident.findAll({
        where: {
          incidentDate: {
            [Op.between]: [parsedStartDate, parsedEndDate]
          }
        },
        include: [
          {
            model: User,
            as: 'reporter',
            attributes: ['id', 'firstName', 'lastName']
          }
        ],
        order: [['incidentDate', 'DESC']]
      });
      
      // Incident statistics
      const totalIncidents = await Incident.count({
        where: {
          status: {
            [Op.ne]: 'archived'
          }
        }
      });
      
      // Incidents by status
      const incidentsByStatus = await Incident.findAll({
        attributes: [
          'status',
          [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
        ],
        where: {
          status: {
            [Op.ne]: 'archived'
          }
        },
        group: ['status']
      });
      
      // Format incidents by status
      const statusCounts = {
        reported: 0,
        under_investigation: 0,
        remediated: 0,
        closed: 0
      };
      
      incidentsByStatus.forEach(item => {
        statusCounts[item.status] = parseInt(item.get('count'));
      });
      
      // Incidents by severity
      const incidentsBySeverity = await Incident.findAll({
        attributes: [
          'severity',
          [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
        ],
        where: {
          status: {
            [Op.ne]: 'archived'
          }
        },
        group: ['severity']
      });
      
      // Format incidents by severity
      const severityCounts = {
        low: 0,
        medium: 0,
        high: 0,
        critical: 0
      };
      
      incidentsBySeverity.forEach(item => {
        severityCounts[item.severity] = parseInt(item.get('count'));
      });
      
      // Potential breaches
      const potentialBreaches = await Incident.count({
        where: {
          isBreachable: true,
          status: {
            [Op.ne]: 'archived'
          }
        }
      });
      
      report.summary.incidents = {
        totalIncidents,
        incidentsInPeriod: incidents.length,
        statusCounts,
        severityCounts,
        potentialBreaches
      };
      
      report.details.incidents = incidents;
    }
    
    // Include audit data if requested
    if (includeAudit !== false) {
      // Audit logs in date range
      const auditLogs = await AuditLog.findAll({
        where: {
          timestamp: {
            [Op.between]: [parsedStartDate, parsedEndDate]
          }
        },
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'firstName', 'lastName', 'username']
          }
        ],
        order: [['timestamp', 'DESC']],
        limit: 1000 // Limit to prevent excessive data
      });
      
      // Audit statistics
      const totalLogs = await AuditLog.count({
        where: {
          timestamp: {
            [Op.between]: [parsedStartDate, parsedEndDate]
          }
        }
      });
      
      // Logs by action
      const logsByAction = await AuditLog.findAll({
        attributes: [
          'action',
          [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
        ],
        where: {
          timestamp: {
            [Op.between]: [parsedStartDate, parsedEndDate]
          }
        },
        group: ['action'],
        order: [[Sequelize.literal('count'), 'DESC']]
      });
      
      // Logs by entity type
      const logsByEntityType = await AuditLog.findAll({
        attributes: [
          'entityType',
          [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
        ],
        where: {
          timestamp: {
            [Op.between]: [parsedStartDate, parsedEndDate]
          }
        },
        group: ['entityType'],
        order: [[Sequelize.literal('count'), 'DESC']]
      });
      
      report.summary.audit = {
        totalLogs,
        logsByAction,
        logsByEntityType
      };
      
      report.details.auditLogs = auditLogs;
    }
    
    return res.status(200).json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Error generating comprehensive report:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate comprehensive report',
      error: error.message
    });
  }
};

// Generate executive summary report
exports.generateExecutiveSummaryReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.body;
    
    // Parse dates
    const parsedStartDate = startDate ? new Date(startDate) : new Date(new Date().setMonth(new Date().getMonth() - 1));
    const parsedEndDate = endDate ? new Date(endDate) : new Date();
    
    const report = {
      title: 'HIPAA Compliance Executive Summary',
      generatedAt: new Date(),
      generatedBy: req.user ? `${req.user.firstName} ${req.user.lastName}` : 'System',
      dateRange: {
        startDate: parsedStartDate,
        endDate: parsedEndDate
      },
      summary: {}
    };
    
    // Overall compliance score
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
    
    const overallComplianceScore = assessmentDetails.length > 0 
      ? Math.round((compliantCount / assessmentDetails.length) * 100) 
      : 0;
    
    // Training compliance
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
    
    const trainingComplianceScore = totalAssignments > 0 
      ? Math.round((completedAssignments / totalAssignments) * 100) 
      : 0;
    
    // Risk summary
    const highCriticalRisks = await RiskItem.count({
      where: {
        riskLevel: {
          [Op.in]: ['high', 'critical']
        }
      }
    });
    
    const unmitigatedHighCriticalRisks = await RiskItem.count({
      where: {
        riskLevel: {
          [Op.in]: ['high', 'critical']
        },
        mitigationStatus: {
          [Op.notIn]: ['completed', 'accepted']
        }
      }
    });
    
    // Incident summary
    const openIncidents = await Incident.count({
      where: {
        status: {
          [Op.notIn]: ['closed', 'archived']
        }
      }
    });
    
    const potentialBreaches = await Incident.count({
      where: {
        isBreachable: true,
        status: {
          [Op.ne]: 'archived'
        }
      }
    });
    
    // Activity in period
    const newAssessments = await ComplianceAssessment.count({
      where: {
        assessmentDate: {
          [Op.between]: [parsedStartDate, parsedEndDate]
        }
      }
    });
    
    const newTrainingCompletions = await TrainingAssignment.count({
      where: {
        status: 'completed',
        completionDate: {
          [Op.between]: [parsedStartDate, parsedEndDate]
        }
      }
    });
    
    const newIncidents = await Incident.count({
      where: {
        incidentDate: {
          [Op.between]: [parsedStartDate, parsedEndDate]
        }
      }
    });
    
    // Key findings and recommendations
    const keyFindings = [];
    
    if (overallComplianceScore < 80) {
      keyFindings.push('Overall compliance score is below 80%, indicating significant compliance gaps that need to be addressed.');
    }
    
    if (trainingComplianceScore < 90) {
      keyFindings.push('Training compliance is below 90%, suggesting that staff training needs improvement.');
    }
    
    if (unmitigatedHighCriticalRisks > 0) {
      keyFindings.push(`There are ${unmitigatedHighCriticalRisks} high or critical risks that have not been mitigated.`);
    }
    
    if (potentialBreaches > 0) {
      keyFindings.push(`There are ${potentialBreaches} potential breaches that require attention.`);
    }
    
    if (overdueAssignments > 0) {
      keyFindings.push(`There are ${overdueAssignments} overdue training assignments that need to be completed.`);
    }
    
    // Recommendations
    const recommendations = [];
    
    if (overallComplianceScore < 80) {
      recommendations.push('Conduct a comprehensive review of all non-compliant requirements and develop a remediation plan.');
    }
    
    if (trainingComplianceScore < 90) {
      recommendations.push('Implement a training enforcement policy to ensure all staff complete required training on time.');
    }
    
    if (unmitigatedHighCriticalRisks > 0) {
      recommendations.push('Prioritize the mitigation of high and critical risks to reduce organizational vulnerability.');
    }
    
    if (potentialBreaches > 0) {
      recommendations.push('Review all potential breaches and ensure proper notification procedures are followed if required.');
    }
    
    if (overdueAssignments > 0) {
      recommendations.push('Follow up with staff who have overdue training assignments to ensure prompt completion.');
    }
    
    // Compile report
    report.summary = {
      overallComplianceScore,
      complianceStatus: {
        compliant: compliantCount,
        partiallyCompliant: partiallyCompliantCount,
        nonCompliant: nonCompliantCount,
        notAssessed: totalRequirements - assessmentDetails.length
      },
      trainingCompliance: {
        score: trainingComplianceScore,
        completed: completedAssignments,
        overdue: overdueAssignments,
        total: totalAssignments
      },
      riskSummary: {
        highCriticalRisks,
        unmitigatedHighCriticalRisks
      },
      incidentSummary: {
        openIncidents,
        potentialBreaches
      },
      activityInPeriod: {
        newAssessments,
        newTrainingCompletions,
        newIncidents
      },
      keyFindings,
      recommendations
    };
    
    return res.status(200).json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Error generating executive summary report:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate executive summary report',
      error: error.message
    });
  }
};

// Generate custom report
exports.generateCustomReport = async (req, res) => {
  try {
    const { 
      title, 
      startDate, 
      endDate, 
      sections,
      filters
    } = req.body;
    
    if (!sections || !Array.isArray(sections) || sections.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one report section must be specified'
      });
    }
    
    // Parse dates
    const parsedStartDate = startDate ? new Date(startDate) : new Date(new Date().setMonth(new Date().getMonth() - 1));
    const parsedEndDate = endDate ? new Date(endDate) : new Date();
    
    const report = {
      title: title || 'Custom HIPAA Compliance Report',
      generatedAt: new Date(),
      generatedBy: req.user ? `${req.user.firstName} ${req.user.lastName}` : 'System',
      dateRange: {
        startDate: parsedStartDate,
        endDate: parsedEndDate
      },
      sections: {}
    };
    
    // Process each requested section
    for (const section of sections) {
      switch (section) {
        case 'compliance_summary':
          report.sections.complianceSummary = await getComplianceSummary(parsedStartDate, parsedEndDate, filters);
          break;
        case 'training_summary':
          report.sections.trainingSummary = await getTrainingSummary(parsedStartDate, parsedEndDate, filters);
          break;
        case 'risk_summary':
          report.sections.riskSummary = await getRiskSummary(parsedStartDate, parsedEndDate, filters);
          break;
        case 'incident_summary':
          report.sections.incidentSummary = await getIncidentSummary(parsedStartDate, parsedEndDate, filters);
          break;
        case 'document_summary':
          report.sections.documentSummary = await getDocumentSummary(parsedStartDate, parsedEndDate, filters);
          break;
        case 'audit_summary':
          report.sections.auditSummary = await getAuditSummary(parsedStartDate, parsedEndDate, filters);
          break;
        case 'compliance_details':
          report.sections.complianceDetails = await getComplianceDetails(parsedStartDate, parsedEndDate, filters);
          break;
        case 'training_details':
          report.sections.trainingDetails = await getTrainingDetails(parsedStartDate, parsedEndDate, filters);
          break;
        case 'risk_details':
          report.sections.riskDetails = await getRiskDetails(parsedStartDate, parsedEndDate, filters);
          break;
        case 'incident_details':
          report.sections.incidentDetails = await getIncidentDetails(parsedStartDate, parsedEndDate, filters);
          break;
        case 'document_details':
          report.sections.documentDetails = await getDocumentDetails(parsedStartDate, parsedEndDate, filters);
          break;
        case 'audit_details':
          report.sections.auditDetails = await getAuditDetails(parsedStartDate, parsedEndDate, filters);
          break;
        default:
          console.warn(`Unknown report section: ${section}`);
      }
    }
    
    return res.status(200).json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Error generating custom report:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate custom report',
      error: error.message
    });
  }
};

// Helper functions for custom report sections
async function getComplianceSummary(startDate, endDate, filters) {
  // Total requirements
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
  
  // Assessments in period
  const assessmentsInPeriod = await ComplianceAssessment.count({
    where: {
      assessmentDate: {
        [Op.between]: [startDate, endDate]
      }
    }
  });
  
  return {
    totalRequirements,
    assessed: assessmentDetails.length,
    compliant: compliantCount,
    partiallyCompliant: partiallyCompliantCount,
    nonCompliant: nonCompliantCount,
    notAssessed: totalRequirements - assessmentDetails.length,
    complianceRate: assessmentDetails.length > 0 ? Math.round((compliantCount / assessmentDetails.length) * 100) : 0,
    assessmentsInPeriod
  };
}

async function getTrainingSummary(startDate, endDate, filters) {
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
  
  // Completions in period
  const completionsInPeriod = await TrainingAssignment.count({
    where: {
      status: 'completed',
      completionDate: {
        [Op.between]: [startDate, endDate]
      }
    }
  });
  
  return {
    totalAssignments,
    completedAssignments,
    overdueAssignments,
    completionRate: totalAssignments > 0 ? Math.round((completedAssignments / totalAssignments) * 100) : 0,
    completionsInPeriod
  };
}

async function getRiskSummary(startDate, endDate, filters) {
  // Risk assessment statistics
  const totalAssessments = await RiskAssessment.count({
    where: {
      status: {
        [Op.ne]: 'archived'
      }
    }
  });
  
  // Assessments in period
  const assessmentsInPeriod = await RiskAssessment.count({
    where: {
      assessmentDate: {
        [Op.between]: [startDate, endDate]
      }
    }
  });
  
  // Risk items by level
  const riskItemsByLevel = await RiskItem.findAll({
    attributes: [
      'riskLevel',
      [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
    ],
    group: ['riskLevel']
  });
  
  // Format risk items by level
  const riskLevels = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0
  };
  
  riskItemsByLevel.forEach(item => {
    riskLevels[item.riskLevel] = parseInt(item.get('count'));
  });
  
  // Risk items by mitigation status
  const riskItemsByMitigationStatus = await RiskItem.findAll({
    attributes: [
      'mitigationStatus',
      [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
    ],
    group: ['mitigationStatus']
  });
  
  // Format risk items by mitigation status
  const mitigationStatus = {
    not_started: 0,
    in_progress: 0,
    completed: 0,
    accepted: 0
  };
  
  riskItemsByMitigationStatus.forEach(item => {
    mitigationStatus[item.mitigationStatus] = parseInt(item.get('count'));
  });
  
  return {
    totalAssessments,
    assessmentsInPeriod,
    riskLevels,
    mitigationStatus
  };
}

async function getIncidentSummary(startDate, endDate, filters) {
  // Incident statistics
  const totalIncidents = await Incident.count({
    where: {
      status: {
        [Op.ne]: 'archived'
      }
    }
  });
  
  // Incidents in period
  const incidentsInPeriod = await Incident.count({
    where: {
      incidentDate: {
        [Op.between]: [startDate, endDate]
      }
    }
  });
  
  // Incidents by status
  const incidentsByStatus = await Incident.findAll({
    attributes: [
      'status',
      [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
    ],
    where: {
      status: {
        [Op.ne]: 'archived'
      }
    },
    group: ['status']
  });
  
  // Format incidents by status
  const statusCounts = {
    reported: 0,
    under_investigation: 0,
    remediated: 0,
    closed: 0
  };
  
  incidentsByStatus.forEach(item => {
    statusCounts[item.status] = parseInt(item.get('count'));
  });
  
  // Incidents by severity
  const incidentsBySeverity = await Incident.findAll({
    attributes: [
      'severity',
      [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
    ],
    where: {
      status: {
        [Op.ne]: 'archived'
      }
    },
    group: ['severity']
  });
  
  // Format incidents by severity
  const severityCounts = {
    low: 0,
    medium: 0,
    high: 0,
    critical: 0
  };
  
  incidentsBySeverity.forEach(item => {
    severityCounts[item.severity] = parseInt(item.get('count'));
  });
  
  // Potential breaches
  const potentialBreaches = await Incident.count({
    where: {
      isBreachable: true,
      status: {
        [Op.ne]: 'archived'
      }
    }
  });
  
  return {
    totalIncidents,
    incidentsInPeriod,
    statusCounts,
    severityCounts,
    potentialBreaches
  };
}

async function getDocumentSummary(startDate, endDate, filters) {
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
  
  // Acknowledgments in period
  const acknowledgementsInPeriod = await DocumentAcknowledgment.count({
    where: {
      acknowledgmentDate: {
        [Op.between]: [startDate, endDate]
      }
    }
  });
  
  return {
    totalDocuments,
    documentsRequiringReview,
    acknowledgementsInPeriod
  };
}

async function getAuditSummary(startDate, endDate, filters) {
  // Audit statistics
  const totalLogs = await AuditLog.count({
    where: {
      timestamp: {
        [Op.between]: [startDate, endDate]
      }
    }
  });
  
  // Logs by action
  const logsByAction = await AuditLog.findAll({
    attributes: [
      'action',
      [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
    ],
    where: {
      timestamp: {
        [Op.between]: [startDate, endDate]
      }
    },
    group: ['action'],
    order: [[Sequelize.literal('count'), 'DESC']]
  });
  
  // Logs by entity type
  const logsByEntityType = await AuditLog.findAll({
    attributes: [
      'entityType',
      [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
    ],
    where: {
      timestamp: {
        [Op.between]: [startDate, endDate]
      }
    },
    group: ['entityType'],
    order: [[Sequelize.literal('count'), 'DESC']]
  });
  
  return {
    totalLogs,
    logsByAction,
    logsByEntityType
  };
}

async function getComplianceDetails(startDate, endDate, filters) {
  // Compliance assessments in period
  const assessments = await ComplianceAssessment.findAll({
    where: {
      assessmentDate: {
        [Op.between]: [startDate, endDate]
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
  
  return assessments;
}

async function getTrainingDetails(startDate, endDate, filters) {
  // Training completions in period
  const completions = await TrainingAssignment.findAll({
    where: {
      status: 'completed',
      completionDate: {
        [Op.between]: [startDate, endDate]
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
  
  return completions;
}

async function getRiskDetails(startDate, endDate, filters) {
  // Risk assessments in period
  const assessments = await RiskAssessment.findAll({
    where: {
      assessmentDate: {
        [Op.between]: [startDate, endDate]
      }
    },
    include: [
      {
        model: User,
        as: 'conductor',
        attributes: ['id', 'firstName', 'lastName']
      }
    ],
    order: [['assessmentDate', 'DESC']]
  });
  
  return assessments;
}

async function getIncidentDetails(startDate, endDate, filters) {
  // Incidents in period
  const incidents = await Incident.findAll({
    where: {
      incidentDate: {
        [Op.between]: [startDate, endDate]
      }
    },
    include: [
      {
        model: User,
        as: 'reporter',
        attributes: ['id', 'firstName', 'lastName']
      }
    ],
    order: [['incidentDate', 'DESC']]
  });
  
  return incidents;
}

async function getDocumentDetails(startDate, endDate, filters) {
  // Document acknowledgments in period
  const acknowledgments = await DocumentAcknowledgment.findAll({
    where: {
      acknowledgmentDate: {
        [Op.between]: [startDate, endDate]
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
  
  return acknowledgments;
}

async function getAuditDetails(startDate, endDate, filters) {
  // Audit logs in period
  const logs = await AuditLog.findAll({
    where: {
      timestamp: {
        [Op.between]: [startDate, endDate]
      }
    },
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'firstName', 'lastName', 'username']
      }
    ],
    order: [['timestamp', 'DESC']],
    limit: 1000 // Limit to prevent excessive data
  });
  
  return logs;
}

// Get available report types
exports.getReportTypes = async (req, res) => {
  try {
    const reportTypes = [
      {
        id: 'comprehensive',
        name: 'Comprehensive Compliance Report',
        description: 'A detailed report covering all aspects of HIPAA compliance including training, documentation, risk assessment, incidents, and audit logs.'
      },
      {
        id: 'executive_summary',
        name: 'Executive Summary Report',
        description: 'A high-level overview of compliance status, key metrics, findings, and recommendations for executive review.'
      },
      {
        id: 'custom',
        name: 'Custom Report',
        description: 'Build a custom report by selecting specific sections and filters to include.'
      }
    ];
    
    const reportSections = [
      {
        id: 'compliance_summary',
        name: 'Compliance Summary',
        description: 'Summary of compliance requirements and assessment status.'
      },
      {
        id: 'training_summary',
        name: 'Training Summary',
        description: 'Summary of training assignments and completion status.'
      },
      {
        id: 'risk_summary',
        name: 'Risk Summary',
        description: 'Summary of risk assessments and risk items.'
      },
      {
        id: 'incident_summary',
        name: 'Incident Summary',
        description: 'Summary of security incidents and breach notifications.'
      },
      {
        id: 'document_summary',
        name: 'Document Summary',
        description: 'Summary of policy documents and acknowledgment status.'
      },
      {
        id: 'audit_summary',
        name: 'Audit Summary',
        description: 'Summary of audit log activity.'
      },
      {
        id: 'compliance_details',
        name: 'Compliance Details',
        description: 'Detailed list of compliance assessments.'
      },
      {
        id: 'training_details',
        name: 'Training Details',
        description: 'Detailed list of training completions.'
      },
      {
        id: 'risk_details',
        name: 'Risk Details',
        description: 'Detailed list of risk assessments.'
      },
      {
        id: 'incident_details',
        name: 'Incident Details',
        description: 'Detailed list of security incidents.'
      },
      {
        id: 'document_details',
        name: 'Document Details',
        description: 'Detailed list of document acknowledgments.'
      },
      {
        id: 'audit_details',
        name: 'Audit Details',
        description: 'Detailed list of audit log entries.'
      }
    ];
    
    return res.status(200).json({
      success: true,
      data: {
        reportTypes,
        reportSections
      }
    });
  } catch (error) {
    console.error('Error getting report types:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve report types',
      error: error.message
    });
  }
};
