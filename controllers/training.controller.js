const { User, TrainingCourse, TrainingAssignment } = require('../models');
const { Op } = require('sequelize');

// Get all training courses
exports.getAllCourses = async (req, res) => {
  try {
    const courses = await TrainingCourse.findAll({
      where: {
        status: {
          [Op.ne]: 'archived'
        }
      },
      order: [['title', 'ASC']]
    });
    
    return res.status(200).json({
      success: true,
      data: courses
    });
  } catch (error) {
    console.error('Error getting training courses:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve training courses',
      error: error.message
    });
  }
};

// Get training course by ID
exports.getCourseById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const course = await TrainingCourse.findByPk(id);
    
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Training course not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: course
    });
  } catch (error) {
    console.error('Error getting training course:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve training course',
      error: error.message
    });
  }
};

// Create a new training course
exports.createCourse = async (req, res) => {
  try {
    const { 
      title, 
      description, 
      contentType, 
      durationMinutes, 
      frequencyDays, 
      content, 
      passingScore 
    } = req.body;
    
    // Validate required fields
    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'Title is required'
      });
    }
    
    const newCourse = await TrainingCourse.create({
      title,
      description,
      contentType: contentType || 'document',
      durationMinutes,
      frequencyDays,
      content,
      passingScore,
      status: 'active',
      version: '1.0'
    });
    
    return res.status(201).json({
      success: true,
      message: 'Training course created successfully',
      data: newCourse
    });
  } catch (error) {
    console.error('Error creating training course:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create training course',
      error: error.message
    });
  }
};

// Update a training course
exports.updateCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      title, 
      description, 
      contentType, 
      durationMinutes, 
      frequencyDays, 
      content, 
      passingScore,
      status,
      version
    } = req.body;
    
    const course = await TrainingCourse.findByPk(id);
    
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Training course not found'
      });
    }
    
    // Update course
    await course.update({
      title: title || course.title,
      description: description !== undefined ? description : course.description,
      contentType: contentType || course.contentType,
      durationMinutes: durationMinutes !== undefined ? durationMinutes : course.durationMinutes,
      frequencyDays: frequencyDays !== undefined ? frequencyDays : course.frequencyDays,
      content: content !== undefined ? content : course.content,
      passingScore: passingScore !== undefined ? passingScore : course.passingScore,
      status: status || course.status,
      version: version || course.version
    });
    
    return res.status(200).json({
      success: true,
      message: 'Training course updated successfully',
      data: course
    });
  } catch (error) {
    console.error('Error updating training course:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update training course',
      error: error.message
    });
  }
};

// Delete a training course (soft delete)
exports.deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;
    
    const course = await TrainingCourse.findByPk(id);
    
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Training course not found'
      });
    }
    
    // Archive the course instead of deleting
    await course.update({ status: 'archived' });
    
    return res.status(200).json({
      success: true,
      message: 'Training course archived successfully'
    });
  } catch (error) {
    console.error('Error archiving training course:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to archive training course',
      error: error.message
    });
  }
};

// Get all training assignments
exports.getAllAssignments = async (req, res) => {
  try {
    const assignments = await TrainingAssignment.findAll({
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: TrainingCourse,
          as: 'course',
          attributes: ['id', 'title', 'contentType', 'durationMinutes']
        }
      ],
      order: [['dueDate', 'ASC']]
    });
    
    return res.status(200).json({
      success: true,
      data: assignments
    });
  } catch (error) {
    console.error('Error getting training assignments:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve training assignments',
      error: error.message
    });
  }
};

// Get training assignment by ID
exports.getAssignmentById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const assignment = await TrainingAssignment.findByPk(id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: TrainingCourse,
          as: 'course'
        },
        {
          model: User,
          as: 'assigner',
          attributes: ['id', 'firstName', 'lastName']
        }
      ]
    });
    
    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Training assignment not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: assignment
    });
  } catch (error) {
    console.error('Error getting training assignment:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve training assignment',
      error: error.message
    });
  }
};

// Get training assignments for a user
exports.getUserAssignments = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Check if user exists
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const assignments = await TrainingAssignment.findAll({
      where: { userId },
      include: [
        {
          model: TrainingCourse,
          as: 'course'
        }
      ],
      order: [
        ['status', 'ASC'],
        ['dueDate', 'ASC']
      ]
    });
    
    return res.status(200).json({
      success: true,
      data: assignments
    });
  } catch (error) {
    console.error('Error getting user training assignments:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve user training assignments',
      error: error.message
    });
  }
};

// Create a new training assignment
exports.createAssignment = async (req, res) => {
  try {
    const { 
      userId, 
      courseId, 
      dueDate, 
      notes 
    } = req.body;
    
    // Validate required fields
    if (!userId || !courseId) {
      return res.status(400).json({
        success: false,
        message: 'User ID and Course ID are required'
      });
    }
    
    // Check if user exists
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Check if course exists
    const course = await TrainingCourse.findByPk(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Training course not found'
      });
    }
    
    // Get the current user from auth middleware
    const assignedBy = req.user.id;
    
    const newAssignment = await TrainingAssignment.create({
      userId,
      courseId,
      assignedBy,
      assignedDate: new Date(),
      dueDate: dueDate || null,
      status: 'assigned',
      notes
    });
    
    return res.status(201).json({
      success: true,
      message: 'Training assignment created successfully',
      data: newAssignment
    });
  } catch (error) {
    console.error('Error creating training assignment:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create training assignment',
      error: error.message
    });
  }
};

// Update training assignment status
exports.updateAssignmentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, completionDate, score, notes } = req.body;
    
    const assignment = await TrainingAssignment.findByPk(id);
    
    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Training assignment not found'
      });
    }
    
    // Validate status
    const validStatuses = ['assigned', 'in_progress', 'completed', 'expired', 'failed'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value'
      });
    }
    
    // Update assignment
    await assignment.update({
      status: status || assignment.status,
      completionDate: status === 'completed' ? (completionDate || new Date()) : assignment.completionDate,
      score: score !== undefined ? score : assignment.score,
      notes: notes !== undefined ? notes : assignment.notes
    });
    
    return res.status(200).json({
      success: true,
      message: 'Training assignment updated successfully',
      data: assignment
    });
  } catch (error) {
    console.error('Error updating training assignment:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update training assignment',
      error: error.message
    });
  }
};

// Complete a training assignment
exports.completeAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const { score } = req.body;
    
    const assignment = await TrainingAssignment.findByPk(id, {
      include: [
        {
          model: TrainingCourse,
          as: 'course'
        }
      ]
    });
    
    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Training assignment not found'
      });
    }
    
    // Check if the assignment is already completed
    if (assignment.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Training assignment is already completed'
      });
    }
    
    // Check if the user has passed the course
    const passingScore = assignment.course.passingScore || 70; // Default passing score is 70%
    const status = score >= passingScore ? 'completed' : 'failed';
    
    // Update assignment
    await assignment.update({
      status,
      completionDate: new Date(),
      score
    });
    
    // Generate certificate if passed
    let certificatePath = null;
    if (status === 'completed') {
      // In a real implementation, this would generate a certificate
      certificatePath = `/certificates/training_${assignment.id}_${Date.now()}.pdf`;
      await assignment.update({ certificatePath });
    }
    
    return res.status(200).json({
      success: true,
      message: status === 'completed' ? 'Training completed successfully' : 'Training failed',
      data: {
        assignment,
        certificatePath
      }
    });
  } catch (error) {
    console.error('Error completing training assignment:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to complete training assignment',
      error: error.message
    });
  }
};

// Get training statistics
exports.getTrainingStatistics = async (req, res) => {
  try {
    // Total courses
    const totalCourses = await TrainingCourse.count({
      where: { status: 'active' }
    });
    
    // Total assignments
    const totalAssignments = await TrainingAssignment.count();
    
    // Completed assignments
    const completedAssignments = await TrainingAssignment.count({
      where: { status: 'completed' }
    });
    
    // Overdue assignments
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
    
    // Completion rate
    const completionRate = totalAssignments > 0 
      ? Math.round((completedAssignments / totalAssignments) * 100) 
      : 0;
    
    return res.status(200).json({
      success: true,
      data: {
        totalCourses,
        totalAssignments,
        completedAssignments,
        overdueAssignments,
        completionRate
      }
    });
  } catch (error) {
    console.error('Error getting training statistics:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve training statistics',
      error: error.message
    });
  }
};
