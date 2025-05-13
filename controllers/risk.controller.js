const { RiskAssessment, RiskItem, User } = require('../models');
const { Op } = require('sequelize');

// Get all risk assessments
exports.getAllRiskAssessments = async (req, res) => {
  try {
    const assessments = await RiskAssessment.findAll({
      include: [
        {
          model: User,
          as: 'conductor',
          attributes: ['id', 'firstName', 'lastName']
        },
        {
          model: User,
          as: 'approver',
          attributes: ['id', 'firstName', 'lastName']
        }
      ],
      order: [['assessmentDate', 'DESC']]
    });
    
    return res.status(200).json({
      success: true,
      data: assessments
    });
  } catch (error) {
    console.error('Error getting risk assessments:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve risk assessments',
      error: error.message
    });
  }
};

// Get risk assessment by ID
exports.getRiskAssessmentById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const assessment = await RiskAssessment.findByPk(id, {
      include: [
        {
          model: User,
          as: 'conductor',
          attributes: ['id', 'firstName', 'lastName']
        },
        {
          model: User,
          as: 'approver',
          attributes: ['id', 'firstName', 'lastName']
        },
        {
          model: RiskItem,
          as: 'riskItems',
          include: [
            {
              model: User,
              as: 'assignee',
              attributes: ['id', 'firstName', 'lastName']
            }
          ]
        }
      ]
    });
    
    if (!assessment) {
      return res.status(404).json({
        success: false,
        message: 'Risk assessment not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: assessment
    });
  } catch (error) {
    console.error('Error getting risk assessment:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve risk assessment',
      error: error.message
    });
  }
};

// Create a new risk assessment
exports.createRiskAssessment = async (req, res) => {
  try {
    const { 
      title, 
      description, 
      methodology, 
      scope, 
      nextAssessmentDate 
    } = req.body;
    
    // Validate required fields
    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'Title is required'
      });
    }
    
    // Get the current user from auth middleware
    const conductedBy = req.user.id;
    
    const newAssessment = await RiskAssessment.create({
      title,
      description,
      assessmentDate: new Date(),
      conductedBy,
      status: 'draft',
      methodology,
      scope,
      nextAssessmentDate: nextAssessmentDate ? new Date(nextAssessmentDate) : null
    });
    
    return res.status(201).json({
      success: true,
      message: 'Risk assessment created successfully',
      data: newAssessment
    });
  } catch (error) {
    console.error('Error creating risk assessment:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create risk assessment',
      error: error.message
    });
  }
};

// Update a risk assessment
exports.updateRiskAssessment = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      title, 
      description, 
      status, 
      methodology, 
      scope, 
      summary, 
      nextAssessmentDate,
      documentPath
    } = req.body;
    
    const assessment = await RiskAssessment.findByPk(id);
    
    if (!assessment) {
      return res.status(404).json({
        success: false,
        message: 'Risk assessment not found'
      });
    }
    
    // Update assessment
    await assessment.update({
      title: title || assessment.title,
      description: description !== undefined ? description : assessment.description,
      status: status || assessment.status,
      methodology: methodology !== undefined ? methodology : assessment.methodology,
      scope: scope !== undefined ? scope : assessment.scope,
      summary: summary !== undefined ? summary : assessment.summary,
      nextAssessmentDate: nextAssessmentDate ? new Date(nextAssessmentDate) : assessment.nextAssessmentDate,
      documentPath: documentPath !== undefined ? documentPath : assessment.documentPath
    });
    
    return res.status(200).json({
      success: true,
      message: 'Risk assessment updated successfully',
      data: assessment
    });
  } catch (error) {
    console.error('Error updating risk assessment:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update risk assessment',
      error: error.message
    });
  }
};

// Approve a risk assessment
exports.approveRiskAssessment = async (req, res) => {
  try {
    const { id } = req.params;
    
    const assessment = await RiskAssessment.findByPk(id);
    
    if (!assessment) {
      return res.status(404).json({
        success: false,
        message: 'Risk assessment not found'
      });
    }
    
    // Check if assessment is in a state that can be approved
    if (assessment.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Only completed risk assessments can be approved'
      });
    }
    
    // Get the current user from auth middleware
    const approvedBy = req.user.id;
    
    // Update assessment
    await assessment.update({
      approvedBy,
      approvalDate: new Date()
    });
    
    return res.status(200).json({
      success: true,
      message: 'Risk assessment approved successfully',
      data: assessment
    });
  } catch (error) {
    console.error('Error approving risk assessment:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to approve risk assessment',
      error: error.message
    });
  }
};

// Delete a risk assessment
exports.deleteRiskAssessment = async (req, res) => {
  try {
    const { id } = req.params;
    
    const assessment = await RiskAssessment.findByPk(id);
    
    if (!assessment) {
      return res.status(404).json({
        success: false,
        message: 'Risk assessment not found'
      });
    }
    
    // Instead of deleting, archive the assessment
    await assessment.update({ status: 'archived' });
    
    return res.status(200).json({
      success: true,
      message: 'Risk assessment archived successfully'
    });
  } catch (error) {
    console.error('Error archiving risk assessment:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to archive risk assessment',
      error: error.message
    });
  }
};

// Get all risk items for a specific assessment
exports.getRiskItemsByAssessment = async (req, res) => {
  try {
    const { assessmentId } = req.params;
    
    const riskItems = await RiskItem.findAll({
      where: { assessmentId },
      include: [
        {
          model: User,
          as: 'assignee',
          attributes: ['id', 'firstName', 'lastName']
        }
      ],
      order: [['riskLevel', 'DESC'], ['category', 'ASC']]
    });
    
    return res.status(200).json({
      success: true,
      data: riskItems
    });
  } catch (error) {
    console.error('Error getting risk items:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve risk items',
      error: error.message
    });
  }
};

// Get risk item by ID
exports.getRiskItemById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const riskItem = await RiskItem.findByPk(id, {
      include: [
        {
          model: User,
          as: 'assignee',
          attributes: ['id', 'firstName', 'lastName']
        },
        {
          model: RiskAssessment,
          as: 'assessment'
        }
      ]
    });
    
    if (!riskItem) {
      return res.status(404).json({
        success: false,
        message: 'Risk item not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: riskItem
    });
  } catch (error) {
    console.error('Error getting risk item:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve risk item',
      error: error.message
    });
  }
};

// Create a new risk item
exports.createRiskItem = async (req, res) => {
  try {
    const { 
      assessmentId, 
      category, 
      assetName, 
      description, 
      threatSource, 
      threatAction, 
      vulnerabilityDescription, 
      existingControls, 
      likelihood, 
      impact, 
      recommendedControls, 
      mitigationPlan, 
      assignedTo, 
      reviewDate 
    } = req.body;
    
    // Validate required fields
    if (!assessmentId || !category || !assetName || !description || !likelihood || !impact) {
      return res.status(400).json({
        success: false,
        message: 'Assessment ID, category, asset name, description, likelihood, and impact are required'
      });
    }
    
    // Check if assessment exists
    const assessment = await RiskAssessment.findByPk(assessmentId);
    if (!assessment) {
      return res.status(404).json({
        success: false,
        message: 'Risk assessment not found'
      });
    }
    
    // Calculate risk level based on likelihood and impact
    let riskLevel;
    if (likelihood === 'high' && impact === 'high') {
      riskLevel = 'critical';
    } else if (likelihood === 'high' || impact === 'high') {
      riskLevel = 'high';
    } else if (likelihood === 'medium' || impact === 'medium') {
      riskLevel = 'medium';
    } else {
      riskLevel = 'low';
    }
    
    const newRiskItem = await RiskItem.create({
      assessmentId,
      category,
      assetName,
      description,
      threatSource,
      threatAction,
      vulnerabilityDescription,
      existingControls,
      likelihood,
      impact,
      riskLevel,
      recommendedControls,
      mitigationPlan,
      mitigationStatus: 'not_started',
      assignedTo,
      reviewDate: reviewDate ? new Date(reviewDate) : null
    });
    
    return res.status(201).json({
      success: true,
      message: 'Risk item created successfully',
      data: newRiskItem
    });
  } catch (error) {
    console.error('Error creating risk item:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create risk item',
      error: error.message
    });
  }
};

// Update a risk item
exports.updateRiskItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      category, 
      assetName, 
      description, 
      threatSource, 
      threatAction, 
      vulnerabilityDescription, 
      existingControls, 
      likelihood, 
      impact, 
      recommendedControls, 
      mitigationPlan, 
      mitigationStatus, 
      mitigationDate, 
      assignedTo, 
      reviewDate 
    } = req.body;
    
    const riskItem = await RiskItem.findByPk(id);
    
    if (!riskItem) {
      return res.status(404).json({
        success: false,
        message: 'Risk item not found'
      });
    }
    
    // Calculate new risk level if likelihood or impact changed
    let riskLevel = riskItem.riskLevel;
    if (likelihood || impact) {
      const newLikelihood = likelihood || riskItem.likelihood;
      const newImpact = impact || riskItem.impact;
      
      if (newLikelihood === 'high' && newImpact === 'high') {
        riskLevel = 'critical';
      } else if (newLikelihood === 'high' || newImpact === 'high') {
        riskLevel = 'high';
      } else if (newLikelihood === 'medium' || newImpact === 'medium') {
        riskLevel = 'medium';
      } else {
        riskLevel = 'low';
      }
    }
    
    // Update risk item
    await riskItem.update({
      category: category || riskItem.category,
      assetName: assetName || riskItem.assetName,
      description: description !== undefined ? description : riskItem.description,
      threatSource: threatSource !== undefined ? threatSource : riskItem.threatSource,
      threatAction: threatAction !== undefined ? threatAction : riskItem.threatAction,
      vulnerabilityDescription: vulnerabilityDescription !== undefined ? vulnerabilityDescription : riskItem.vulnerabilityDescription,
      existingControls: existingControls !== undefined ? existingControls : riskItem.existingControls,
      likelihood: likelihood || riskItem.likelihood,
      impact: impact || riskItem.impact,
      riskLevel,
      recommendedControls: recommendedControls !== undefined ? recommendedControls : riskItem.recommendedControls,
      mitigationPlan: mitigationPlan !== undefined ? mitigationPlan : riskItem.mitigationPlan,
      mitigationStatus: mitigationStatus || riskItem.mitigationStatus,
      mitigationDate: mitigationStatus === 'completed' ? new Date() : (mitigationDate ? new Date(mitigationDate) : riskItem.mitigationDate),
      assignedTo: assignedTo !== undefined ? assignedTo : riskItem.assignedTo,
      reviewDate: reviewDate ? new Date(reviewDate) : riskItem.reviewDate
    });
    
    return res.status(200).json({
      success: true,
      message: 'Risk item updated successfully',
      data: riskItem
    });
  } catch (error) {
    console.error('Error updating risk item:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update risk item',
      error: error.message
    });
  }
};

// Delete a risk item
exports.deleteRiskItem = async (req, res) => {
  try {
    const { id } = req.params;
    
    const riskItem = await RiskItem.findByPk(id);
    
    if (!riskItem) {
      return res.status(404).json({
        success: false,
        message: 'Risk item not found'
      });
    }
    
    // Delete risk item
    await riskItem.destroy();
    
    return res.status(200).json({
      success: true,
      message: 'Risk item deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting risk item:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete risk item',
      error: error.message
    });
  }
};

// Get risk statistics
exports.getRiskStatistics = async (req, res) => {
  try {
    // Total assessments
    const totalAssessments = await RiskAssessment.count({
      where: {
        status: {
          [Op.ne]: 'archived'
        }
      }
    });
    
    // Assessments by status
    const assessmentsByStatus = await RiskAssessment.findAll({
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where: {
        status: {
          [Op.ne]: 'archived'
        }
      },
      group: ['status']
    });
    
    // Total risk items
    const totalRiskItems = await RiskItem.count();
    
    // Risk items by level
    const riskItemsByLevel = await RiskItem.findAll({
      attributes: [
        'riskLevel',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['riskLevel']
    });
    
    // Risk items by mitigation status
    const riskItemsByMitigationStatus = await RiskItem.findAll({
      attributes: [
        'mitigationStatus',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['mitigationStatus']
    });
    
    // Risk items by category
    const riskItemsByCategory = await RiskItem.findAll({
      attributes: [
        'category',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['category']
    });
    
    // High and critical risks
    const highRisks = await RiskItem.count({
      where: {
        riskLevel: {
          [Op.in]: ['high', 'critical']
        }
      }
    });
    
    // Unmitigated high and critical risks
    const unmitigatedHighRisks = await RiskItem.count({
      where: {
        riskLevel: {
          [Op.in]: ['high', 'critical']
        },
        mitigationStatus: {
          [Op.notIn]: ['completed', 'accepted']
        }
      }
    });
    
    // Upcoming risk reviews
    const upcomingReviews = await RiskItem.findAll({
      where: {
        reviewDate: {
          [Op.gt]: new Date(),
          [Op.lt]: new Date(new Date().setDate(new Date().getDate() + 30)) // Next 30 days
        }
      },
      include: [
        {
          model: RiskAssessment,
          as: 'assessment'
        },
        {
          model: User,
          as: 'assignee',
          attributes: ['id', 'firstName', 'lastName']
        }
      ],
      order: [['reviewDate', 'ASC']],
      limit: 10
    });
    
    return res.status(200).json({
      success: true,
      data: {
        assessments: {
          total: totalAssessments,
          byStatus: assessmentsByStatus
        },
        riskItems: {
          total: totalRiskItems,
          byLevel: riskItemsByLevel,
          byMitigationStatus: riskItemsByMitigationStatus,
          byCategory: riskItemsByCategory,
          highRisks,
          unmitigatedHighRisks
        },
        upcomingReviews
      }
    });
  } catch (error) {
    console.error('Error getting risk statistics:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve risk statistics',
      error: error.message
    });
  }
};
