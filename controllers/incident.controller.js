const { Incident, IncidentUpdate, User } = require('../models');
const { Op } = require('sequelize');

// Get all incidents
exports.getAllIncidents = async (req, res) => {
  try {
    const incidents = await Incident.findAll({
      include: [
        {
          model: User,
          as: 'reporter',
          attributes: ['id', 'firstName', 'lastName']
        },
        {
          model: User,
          as: 'assignee',
          attributes: ['id', 'firstName', 'lastName']
        }
      ],
      order: [['incidentDate', 'DESC']]
    });
    
    return res.status(200).json({
      success: true,
      data: incidents
    });
  } catch (error) {
    console.error('Error getting incidents:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve incidents',
      error: error.message
    });
  }
};

// Get incident by ID
exports.getIncidentById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const incident = await Incident.findByPk(id, {
      include: [
        {
          model: User,
          as: 'reporter',
          attributes: ['id', 'firstName', 'lastName']
        },
        {
          model: User,
          as: 'assignee',
          attributes: ['id', 'firstName', 'lastName']
        },
        {
          model: User,
          as: 'breachDeterminer',
          attributes: ['id', 'firstName', 'lastName']
        },
        {
          model: User,
          as: 'closer',
          attributes: ['id', 'firstName', 'lastName']
        },
        {
          model: IncidentUpdate,
          as: 'updates',
          include: [
            {
              model: User,
              as: 'updater',
              attributes: ['id', 'firstName', 'lastName']
            }
          ],
          order: [['updateDate', 'DESC']]
        }
      ]
    });
    
    if (!incident) {
      return res.status(404).json({
        success: false,
        message: 'Incident not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: incident
    });
  } catch (error) {
    console.error('Error getting incident:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve incident',
      error: error.message
    });
  }
};

// Create a new incident
exports.createIncident = async (req, res) => {
  try {
    const { 
      title, 
      description, 
      incidentDate, 
      severity, 
      category, 
      location, 
      affectedSystems, 
      affectedData, 
      isBreachable 
    } = req.body;
    
    // Validate required fields
    if (!title || !description || !category) {
      return res.status(400).json({
        success: false,
        message: 'Title, description, and category are required'
      });
    }
    
    // Get the current user from auth middleware
    const reportedBy = req.user.id;
    
    const newIncident = await Incident.create({
      title,
      description,
      incidentDate: incidentDate ? new Date(incidentDate) : new Date(),
      reportedBy,
      reportedDate: new Date(),
      status: 'reported',
      severity: severity || 'medium',
      category,
      location,
      affectedSystems,
      affectedData,
      isBreachable: isBreachable || false
    });
    
    // Create initial update
    await IncidentUpdate.create({
      incidentId: newIncident.id,
      updateDate: new Date(),
      updatedBy: reportedBy,
      updateType: 'status_change',
      newStatus: 'reported',
      description: 'Incident reported'
    });
    
    return res.status(201).json({
      success: true,
      message: 'Incident created successfully',
      data: newIncident
    });
  } catch (error) {
    console.error('Error creating incident:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create incident',
      error: error.message
    });
  }
};

// Update an incident
exports.updateIncident = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      title, 
      description, 
      status, 
      severity, 
      category, 
      location, 
      affectedSystems, 
      affectedData, 
      containmentActions, 
      remediationPlan, 
      remediationDate, 
      assignedTo, 
      rootCause, 
      preventiveMeasures, 
      isBreachable, 
      documentPath 
    } = req.body;
    
    const incident = await Incident.findByPk(id);
    
    if (!incident) {
      return res.status(404).json({
        success: false,
        message: 'Incident not found'
      });
    }
    
    // Get the current user from auth middleware
    const updatedBy = req.user.id;
    
    // Track status change for update log
    const previousStatus = incident.status;
    const newStatus = status || incident.status;
    const statusChanged = previousStatus !== newStatus;
    
    // Track assignment change for update log
    const previousAssignee = incident.assignedTo;
    const newAssignee = assignedTo !== undefined ? assignedTo : incident.assignedTo;
    const assignmentChanged = previousAssignee !== newAssignee;
    
    // Update incident
    await incident.update({
      title: title || incident.title,
      description: description !== undefined ? description : incident.description,
      status: newStatus,
      severity: severity || incident.severity,
      category: category || incident.category,
      location: location !== undefined ? location : incident.location,
      affectedSystems: affectedSystems !== undefined ? affectedSystems : incident.affectedSystems,
      affectedData: affectedData !== undefined ? affectedData : incident.affectedData,
      containmentActions: containmentActions !== undefined ? containmentActions : incident.containmentActions,
      remediationPlan: remediationPlan !== undefined ? remediationPlan : incident.remediationPlan,
      remediationDate: remediationDate ? new Date(remediationDate) : incident.remediationDate,
      assignedTo: newAssignee,
      rootCause: rootCause !== undefined ? rootCause : incident.rootCause,
      preventiveMeasures: preventiveMeasures !== undefined ? preventiveMeasures : incident.preventiveMeasures,
      isBreachable: isBreachable !== undefined ? isBreachable : incident.isBreachable,
      documentPath: documentPath !== undefined ? documentPath : incident.documentPath
    });
    
    // Create update record for status change
    if (statusChanged) {
      await IncidentUpdate.create({
        incidentId: id,
        updateDate: new Date(),
        updatedBy,
        updateType: 'status_change',
        previousStatus,
        newStatus,
        description: `Status changed from ${previousStatus} to ${newStatus}`
      });
      
      // If status changed to 'closed', update closedDate and closedBy
      if (newStatus === 'closed') {
        await incident.update({
          closedDate: new Date(),
          closedBy: updatedBy
        });
      }
    }
    
    // Create update record for assignment change
    if (assignmentChanged) {
      let description;
      if (previousAssignee === null && newAssignee !== null) {
        const assignee = await User.findByPk(newAssignee);
        description = `Incident assigned to ${assignee ? assignee.firstName + ' ' + assignee.lastName : 'Unknown'}`;
      } else if (previousAssignee !== null && newAssignee === null) {
        description = 'Incident unassigned';
      } else {
        const assignee = await User.findByPk(newAssignee);
        description = `Incident reassigned to ${assignee ? assignee.firstName + ' ' + assignee.lastName : 'Unknown'}`;
      }
      
      await IncidentUpdate.create({
        incidentId: id,
        updateDate: new Date(),
        updatedBy,
        updateType: 'assignment',
        description
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Incident updated successfully',
      data: incident
    });
  } catch (error) {
    console.error('Error updating incident:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update incident',
      error: error.message
    });
  }
};

// Make breach determination
exports.makeBreachDetermination = async (req, res) => {
  try {
    const { id } = req.params;
    const { isBreachable, breachDeterminationNotes } = req.body;
    
    if (isBreachable === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Breach determination (isBreachable) is required'
      });
    }
    
    const incident = await Incident.findByPk(id);
    
    if (!incident) {
      return res.status(404).json({
        success: false,
        message: 'Incident not found'
      });
    }
    
    // Get the current user from auth middleware
    const breachDeterminationBy = req.user.id;
    
    // Update incident
    await incident.update({
      isBreachable,
      breachDeterminationDate: new Date(),
      breachDeterminationBy
    });
    
    // Create update record
    await IncidentUpdate.create({
      incidentId: id,
      updateDate: new Date(),
      updatedBy: breachDeterminationBy,
      updateType: 'breach_determination',
      description: `Breach determination: ${isBreachable ? 'This incident is a potential breach' : 'This incident is not a breach'}${breachDeterminationNotes ? '\n\nNotes: ' + breachDeterminationNotes : ''}`
    });
    
    return res.status(200).json({
      success: true,
      message: 'Breach determination made successfully',
      data: incident
    });
  } catch (error) {
    console.error('Error making breach determination:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to make breach determination',
      error: error.message
    });
  }
};

// Record breach notification
exports.recordBreachNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const { breachNotificationDate, notificationDetails } = req.body;
    
    if (!breachNotificationDate) {
      return res.status(400).json({
        success: false,
        message: 'Breach notification date is required'
      });
    }
    
    const incident = await Incident.findByPk(id);
    
    if (!incident) {
      return res.status(404).json({
        success: false,
        message: 'Incident not found'
      });
    }
    
    // Check if incident is a breach
    if (!incident.isBreachable) {
      return res.status(400).json({
        success: false,
        message: 'Cannot record breach notification for an incident that is not a breach'
      });
    }
    
    // Get the current user from auth middleware
    const updatedBy = req.user.id;
    
    // Update incident
    await incident.update({
      breachNotificationDate: new Date(breachNotificationDate)
    });
    
    // Create update record
    await IncidentUpdate.create({
      incidentId: id,
      updateDate: new Date(),
      updatedBy,
      updateType: 'comment',
      description: `Breach notification sent on ${new Date(breachNotificationDate).toLocaleDateString()}${notificationDetails ? '\n\nDetails: ' + notificationDetails : ''}`
    });
    
    return res.status(200).json({
      success: true,
      message: 'Breach notification recorded successfully',
      data: incident
    });
  } catch (error) {
    console.error('Error recording breach notification:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to record breach notification',
      error: error.message
    });
  }
};

// Add update to incident
exports.addIncidentUpdate = async (req, res) => {
  try {
    const { id } = req.params;
    const { description, updateType, attachmentPath } = req.body;
    
    if (!description) {
      return res.status(400).json({
        success: false,
        message: 'Update description is required'
      });
    }
    
    const incident = await Incident.findByPk(id);
    
    if (!incident) {
      return res.status(404).json({
        success: false,
        message: 'Incident not found'
      });
    }
    
    // Get the current user from auth middleware
    const updatedBy = req.user.id;
    
    // Create update record
    const update = await IncidentUpdate.create({
      incidentId: id,
      updateDate: new Date(),
      updatedBy,
      updateType: updateType || 'comment',
      description,
      attachmentPath
    });
    
    // Get user details for response
    const updater = await User.findByPk(updatedBy, {
      attributes: ['id', 'firstName', 'lastName']
    });
    
    update.dataValues.updater = updater;
    
    return res.status(201).json({
      success: true,
      message: 'Update added successfully',
      data: update
    });
  } catch (error) {
    console.error('Error adding incident update:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to add incident update',
      error: error.message
    });
  }
};

// Get incident updates
exports.getIncidentUpdates = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if incident exists
    const incident = await Incident.findByPk(id);
    
    if (!incident) {
      return res.status(404).json({
        success: false,
        message: 'Incident not found'
      });
    }
    
    // Get updates with pagination
    const { page = 1, limit = 10 } = req.pagination;
    
    const updates = await IncidentUpdate.findAndCountAll({
      where: { incidentId: id },
      include: [{
        model: User,
        as: 'updater',
        attributes: ['id', 'firstName', 'lastName']
      }],
      order: [['updateDate', 'DESC']],
      limit: limit,
      offset: (page - 1) * limit
    });
    
    // Calculate pagination metadata
    const totalPages = Math.ceil(updates.count / limit);
    
    return res.status(200).json({
      success: true,
      data: updates.rows,
      meta: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalItems: updates.count,
        totalPages
      }
    });
  } catch (error) {
    console.error('Error getting incident updates:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve incident updates',
      error: error.message
    });
  }
};

// Delete an incident
exports.deleteIncident = async (req, res) => {
  try {
    const { id } = req.params;
    
    const incident = await Incident.findByPk(id);
    
    if (!incident) {
      return res.status(404).json({
        success: false,
        message: 'Incident not found'
      });
    }
    
    // Instead of deleting, archive the incident
    await incident.update({ status: 'archived' });
    
    // Get the current user from auth middleware
    const updatedBy = req.user.id;
    
    // Create update record
    await IncidentUpdate.create({
      incidentId: id,
      updateDate: new Date(),
      updatedBy,
      updateType: 'status_change',
      previousStatus: incident.status,
      newStatus: 'archived',
      description: 'Incident archived'
    });
    
    return res.status(200).json({
      success: true,
      message: 'Incident archived successfully'
    });
  } catch (error) {
    console.error('Error archiving incident:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to archive incident',
      error: error.message
    });
  }
};

// Get incident statistics
exports.getIncidentStatistics = async (req, res) => {
  try {
    const { Op, QueryTypes } = require('sequelize');
    const db = require('../models');
    const sequelize = db.sequelize;

    // Use async/await with Promise.all to run multiple queries in parallel
    const baseExcludeFilter = { status: { [Op.ne]: 'archived' } };
    const thirtyDaysAgo = new Date(new Date().setDate(new Date().getDate() - 30));

    const [
      // 1. Get total incidents (non-archived)
      totalIncidentsCount,

      // 2. Get incidents grouped by status, severity, and category in a single query
      incidentsGrouped,

      // 3. Get counts for other specific filters
      countStats,

      // 4. Get closed incidents data for average calculation
      closedIncidents
    ] = await Promise.all([
      // 1. Total incidents count
      Incident.count({
        where: baseExcludeFilter
      }),

      // 2. Perform aggregations for status, severity, and category
      sequelize.query(`
        SELECT
          'status' as group_type, status as group_value, COUNT(*) as count
        FROM incidents
        WHERE status != 'archived'
        GROUP BY status

        UNION ALL

        SELECT
          'severity' as group_type, severity as group_value, COUNT(*) as count
        FROM incidents
        WHERE status != 'archived'
        GROUP BY severity

        UNION ALL

        SELECT
          'category' as group_type, category as group_value, COUNT(*) as count
        FROM incidents
        WHERE status != 'archived'
        GROUP BY category
      `, {
        type: QueryTypes.SELECT
      }),

      // 3. Get all counts in a single query with conditional counting
      sequelize.query(`
        SELECT
          COUNT(CASE WHEN status NOT IN ('closed', 'archived') THEN 1 END) as open_incidents,
          COUNT(CASE WHEN "isBreachable" = true AND status != 'archived' THEN 1 END) as potential_breaches,
          COUNT(CASE WHEN "incidentDate" > :thirtyDaysAgo AND status != 'archived' THEN 1 END) as recent_incidents
        FROM incidents
      `, {
        replacements: { thirtyDaysAgo },
        type: QueryTypes.SELECT
      }),

      // 4. Get data for average time to close calculation
      Incident.findAll({
        where: {
          status: 'closed',
          closedDate: { [Op.ne]: null },
          incidentDate: { [Op.ne]: null }
        },
        attributes: [
          'incidentDate',
          'closedDate'
        ]
      })
    ]);

    // Format the grouped data
    const byStatus = {};
    const bySeverity = {};
    const byCategory = {};

    incidentsGrouped.forEach(item => {
      const { group_type, group_value, count } = item;
      if (group_type === 'status') {
        byStatus[group_value] = parseInt(count);
      } else if (group_type === 'severity') {
        bySeverity[group_value] = parseInt(count);
      } else if (group_type === 'category') {
        byCategory[group_value] = parseInt(count);
      }
    });

    // Extract counts from the single count query
    const { open_incidents: openIncidents, potential_breaches: potentialBreaches, recent_incidents: recentIncidents } = countStats[0];

    // Calculate average time to close
    let avgTimeToClose = 0;

    if (closedIncidents.length > 0) {
      let totalDays = 0;
      for (const incident of closedIncidents) {
        const incidentDate = new Date(incident.incidentDate);
        const closedDate = new Date(incident.closedDate);
        const diffTime = Math.abs(closedDate - incidentDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        totalDays += diffDays;
      }
      avgTimeToClose = Math.round(totalDays / closedIncidents.length);
    }
    
    return res.status(200).json({
      success: true,
      data: {
        totalIncidents: totalIncidentsCount,
        openIncidents: parseInt(openIncidents || 0),
        potentialBreaches: parseInt(potentialBreaches || 0),
        recentIncidents: parseInt(recentIncidents || 0),
        avgTimeToClose,
        byStatus,
        bySeverity,
        byCategory
      }
    });
  } catch (error) {
    console.error('Error getting incident statistics:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve incident statistics',
      error: error.message
    });
  }
};
