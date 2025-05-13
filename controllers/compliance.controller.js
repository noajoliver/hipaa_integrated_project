const { ComplianceRequirement, ComplianceAssessment, User } = require('../models');
const { Op } = require('sequelize');

// Get all compliance requirements
exports.getAllRequirements = async (req, res) => {
  try {
    const requirements = await ComplianceRequirement.findAll({
      include: [
        {
          model: User,
          as: 'responsibleRole',
          attributes: ['id', 'name']
        }
      ],
      order: [['category', 'ASC'], ['title', 'ASC']]
    });
    
    return res.status(200).json({
      success: true,
      data: requirements
    });
  } catch (error) {
    console.error('Error getting compliance requirements:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve compliance requirements',
      error: error.message
    });
  }
};

// Get compliance requirement by ID
exports.getRequirementById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const requirement = await ComplianceRequirement.findByPk(id, {
      include: [
        {
          model: User,
          as: 'responsibleRole',
          attributes: ['id', 'name']
        }
      ]
    });
    
    if (!requirement) {
      return res.status(404).json({
        success: false,
        message: 'Compliance requirement not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: requirement
    });
  } catch (error) {
    console.error('Error getting compliance requirement:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve compliance requirement',
      error: error.message
    });
  }
};

// Create a new compliance requirement
exports.createRequirement = async (req, res) => {
  try {
    const { 
      title, 
      description, 
      category, 
      citation, 
      frequency, 
      responsibleRoleId 
    } = req.body;
    
    // Validate required fields
    if (!title || !category) {
      return res.status(400).json({
        success: false,
        message: 'Title and category are required'
      });
    }
    
    const newRequirement = await ComplianceRequirement.create({
      title,
      description,
      category,
      citation,
      frequency: frequency || 'annually',
      responsibleRoleId
    });
    
    return res.status(201).json({
      success: true,
      message: 'Compliance requirement created successfully',
      data: newRequirement
    });
  } catch (error) {
    console.error('Error creating compliance requirement:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create compliance requirement',
      error: error.message
    });
  }
};

// Update a compliance requirement
exports.updateRequirement = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      title, 
      description, 
      category, 
      citation, 
      frequency, 
      responsibleRoleId 
    } = req.body;
    
    const requirement = await ComplianceRequirement.findByPk(id);
    
    if (!requirement) {
      return res.status(404).json({
        success: false,
        message: 'Compliance requirement not found'
      });
    }
    
    // Update requirement
    await requirement.update({
      title: title || requirement.title,
      description: description !== undefined ? description : requirement.description,
      category: category || requirement.category,
      citation: citation !== undefined ? citation : requirement.citation,
      frequency: frequency || requirement.frequency,
      responsibleRoleId: responsibleRoleId || requirement.responsibleRoleId
    });
    
    return res.status(200).json({
      success: true,
      message: 'Compliance requirement updated successfully',
      data: requirement
    });
  } catch (error) {
    console.error('Error updating compliance requirement:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update compliance requirement',
      error: error.message
    });
  }
};

// Delete a compliance requirement
exports.deleteRequirement = async (req, res) => {
  try {
    const { id } = req.params;
    
    const requirement = await ComplianceRequirement.findByPk(id);
    
    if (!requirement) {
      return res.status(404).json({
        success: false,
        message: 'Compliance requirement not found'
      });
    }
    
    // Delete requirement
    await requirement.destroy();
    
    return res.status(200).json({
      success: true,
      message: 'Compliance requirement deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting compliance requirement:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete compliance requirement',
      error: error.message
    });
  }
};

// Get all compliance assessments
exports.getAllAssessments = async (req, res) => {
  try {
    const assessments = await ComplianceAssessment.findAll({
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
    
    return res.status(200).json({
      success: true,
      data: assessments
    });
  } catch (error) {
    console.error('Error getting compliance assessments:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve compliance assessments',
      error: error.message
    });
  }
};

// Get compliance assessment by ID
exports.getAssessmentById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const assessment = await ComplianceAssessment.findByPk(id, {
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
      ]
    });
    
    if (!assessment) {
      return res.status(404).json({
        success: false,
        message: 'Compliance assessment not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: assessment
    });
  } catch (error) {
    console.error('Error getting compliance assessment:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve compliance assessment',
      error: error.message
    });
  }
};

// Create a new compliance assessment
exports.createAssessment = async (req, res) => {
  try {
    const { 
      requirementId, 
      status, 
      evidencePath, 
      notes, 
      nextAssessmentDate 
    } = req.body;
    
    // Validate required fields
    if (!requirementId || !status) {
      return res.status(400).json({
        success: false,
        message: 'Requirement ID and status are required'
      });
    }
    
    // Check if requirement exists
    const requirement = await ComplianceRequirement.findByPk(requirementId);
    if (!requirement) {
      return res.status(404).json({
        success: false,
        message: 'Compliance requirement not found'
      });
    }
    
    // Get the current user from auth middleware
    const conductedBy = req.user.id;
    
    const newAssessment = await ComplianceAssessment.create({
      requirementId,
      assessmentDate: new Date(),
      conductedBy,
      status,
      evidencePath,
      notes,
      nextAssessmentDate: nextAssessmentDate ? new Date(nextAssessmentDate) : null
    });
    
    return res.status(201).json({
      success: true,
      message: 'Compliance assessment created successfully',
      data: newAssessment
    });
  } catch (error) {
    console.error('Error creating compliance assessment:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create compliance assessment',
      error: error.message
    });
  }
};

// Update a compliance assessment
exports.updateAssessment = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      status, 
      evidencePath, 
      notes, 
      nextAssessmentDate 
    } = req.body;
    
    const assessment = await ComplianceAssessment.findByPk(id);
    
    if (!assessment) {
      return res.status(404).json({
        success: false,
        message: 'Compliance assessment not found'
      });
    }
    
    // Update assessment
    await assessment.update({
      status: status || assessment.status,
      evidencePath: evidencePath !== undefined ? evidencePath : assessment.evidencePath,
      notes: notes !== undefined ? notes : assessment.notes,
      nextAssessmentDate: nextAssessmentDate ? new Date(nextAssessmentDate) : assessment.nextAssessmentDate
    });
    
    return res.status(200).json({
      success: true,
      message: 'Compliance assessment updated successfully',
      data: assessment
    });
  } catch (error) {
    console.error('Error updating compliance assessment:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update compliance assessment',
      error: error.message
    });
  }
};

// Get compliance statistics
exports.getComplianceStatistics = async (req, res) => {
  try {
    // Total requirements
    const totalRequirements = await ComplianceRequirement.count();
    
    // Requirements by category
    const requirementsByCategory = await ComplianceRequirement.findAll({
      attributes: [
        'category',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['category']
    });
    
    // Latest assessments for each requirement
    const latestAssessments = await ComplianceAssessment.findAll({
      attributes: [
        'requirementId',
        [sequelize.fn('MAX', sequelize.col('assessmentDate')), 'latestDate']
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
      },
      include: [
        {
          model: ComplianceRequirement,
          as: 'requirement'
        }
      ]
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
    
    // Upcoming assessments
    const upcomingAssessments = await ComplianceAssessment.findAll({
      where: {
        nextAssessmentDate: {
          [Op.gt]: new Date(),
          [Op.lt]: new Date(new Date().setDate(new Date().getDate() + 30)) // Next 30 days
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
        totalRequirements,
        requirementsByCategory,
        complianceStatus: {
          compliant: compliantCount,
          partiallyCompliant: partiallyCompliantCount,
          nonCompliant: nonCompliantCount,
          notAssessed: totalRequirements - assessedRequirements
        },
        complianceRate,
        upcomingAssessments
      }
    });
  } catch (error) {
    console.error('Error getting compliance statistics:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve compliance statistics',
      error: error.message
    });
  }
};
