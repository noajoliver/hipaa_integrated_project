import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  TablePagination,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  IconButton,
  CircularProgress,
  Snackbar,
  Alert,
  Card,
  CardContent,
  CardActions,
  Chip,
  Divider,
  Tabs,
  Tab
} from '@mui/material';
import { styled } from '@mui/material/styles';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';

// Icons
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import WarningIcon from '@mui/icons-material/Warning';
import SecurityIcon from '@mui/icons-material/Security';
import NotificationsIcon from '@mui/icons-material/Notifications';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import HistoryIcon from '@mui/icons-material/History';

// API URL
const API_URL = 'http://localhost:8080/api';

// Styled components
const IncidentContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
}));

const ActionButton = styled(IconButton)(({ theme }) => ({
  marginRight: theme.spacing(1),
}));

const SeverityChip = styled(Chip)(({ theme, severity }) => ({
  backgroundColor: 
    severity === 'critical' ? theme.palette.error.main :
    severity === 'high' ? theme.palette.error.light :
    severity === 'medium' ? theme.palette.warning.light :
    severity === 'low' ? theme.palette.success.light :
    theme.palette.grey[500],
  color: 
    severity === 'critical' ? theme.palette.error.contrastText :
    severity === 'high' ? theme.palette.error.contrastText :
    severity === 'medium' ? theme.palette.warning.contrastText :
    severity === 'low' ? theme.palette.success.contrastText :
    theme.palette.grey[500],
}));

const IncidentCard = styled(Card)(({ theme, severity }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  borderLeft: `4px solid ${
    severity === 'critical' ? theme.palette.error.dark :
    severity === 'high' ? theme.palette.error.main :
    severity === 'medium' ? theme.palette.warning.main :
    severity === 'low' ? theme.palette.success.main :
    theme.palette.grey[500]
  }`,
}));

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`incident-tabpanel-${index}`}
      aria-labelledby={`incident-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const IncidentManagement = () => {
  const { hasRole } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [incidents, setIncidents] = useState([]);
  const [incidentUpdates, setIncidentUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [viewMode, setViewMode] = useState('cards'); // 'cards' or 'table'
  const [openIncidentDialog, setOpenIncidentDialog] = useState(false);
  const [openUpdateDialog, setOpenUpdateDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState('add'); // 'add' or 'edit'
  const [currentIncident, setCurrentIncident] = useState(null);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [incidentFormData, setIncidentFormData] = useState({
    title: '',
    description: '',
    type: '',
    severity: 'medium',
    status: 'open',
    reportedBy: '',
    reportedDate: new Date().toISOString().split('T')[0],
    affectedSystems: '',
    potentialPhi: false,
    breachDetermined: false
  });
  const [updateFormData, setUpdateFormData] = useState({
    incidentId: '',
    description: '',
    status: '',
    updatedBy: '',
    actionTaken: '',
    breachDetermined: false,
    notificationRequired: false,
    notificationDate: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  // Fetch incidents and updates
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch incidents
        const incidentsResponse = await axios.get(`${API_URL}/incidents`);
        setIncidents(incidentsResponse.data);
        
        // Fetch incident updates
        const updatesResponse = await axios.get(`${API_URL}/incidents/updates`);
        setIncidentUpdates(updatesResponse.data);
      } catch (error) {
        console.error('Error fetching data:', error);
        showSnackbar('Error loading incident data', 'error');
        
        // Mock data for development
        setIncidents([
          { 
            id: 1, 
            title: 'Unauthorized Access Attempt', 
            description: 'Multiple failed login attempts detected from unknown IP address',
            type: 'Security',
            severity: 'high',
            status: 'closed',
            reportedBy: 'System Monitor',
            reportedDate: '2025-01-15',
            affectedSystems: 'Authentication System',
            potentialPhi: false,
            breachDetermined: false,
            createdAt: '2025-01-15T10:00:00Z',
            updatedAt: '2025-01-20T14:30:00Z'
          },
          { 
            id: 2, 
            title: 'Lost Laptop', 
            description: 'Employee reported lost laptop containing PHI',
            type: 'Physical',
            severity: 'critical',
            status: 'in_progress',
            reportedBy: 'Jane Smith',
            reportedDate: '2025-02-10',
            affectedSystems: 'Endpoint Device',
            potentialPhi: true,
            breachDetermined: true,
            createdAt: '2025-02-10T11:15:00Z',
            updatedAt: '2025-02-15T09:45:00Z'
          },
          { 
            id: 3, 
            title: 'Email Phishing Attempt', 
            description: 'Several employees received suspicious emails requesting login credentials',
            type: 'Security',
            severity: 'medium',
            status: 'closed',
            reportedBy: 'IT Security',
            reportedDate: '2025-03-05',
            affectedSystems: 'Email System',
            potentialPhi: false,
            breachDetermined: false,
            createdAt: '2025-03-05T13:20:00Z',
            updatedAt: '2025-03-10T15:45:00Z'
          },
          { 
            id: 4, 
            title: 'System Outage', 
            description: 'EHR system unavailable for 30 minutes',
            type: 'Availability',
            severity: 'medium',
            status: 'closed',
            reportedBy: 'System Monitor',
            reportedDate: '2025-03-20',
            affectedSystems: 'EHR System',
            potentialPhi: false,
            breachDetermined: false,
            createdAt: '2025-03-20T09:30:00Z',
            updatedAt: '2025-03-20T11:20:00Z'
          },
          { 
            id: 5, 
            title: 'Improper PHI Disclosure', 
            description: 'Patient information sent to wrong email address',
            type: 'Privacy',
            severity: 'high',
            status: 'in_progress',
            reportedBy: 'Robert Johnson',
            reportedDate: '2025-04-05',
            affectedSystems: 'Email System',
            potentialPhi: true,
            breachDetermined: true,
            createdAt: '2025-04-05T14:15:00Z',
            updatedAt: '2025-04-07T10:30:00Z'
          }
        ]);
        
        setIncidentUpdates([
          {
            id: 1,
            incidentId: 1,
            description: 'Initial investigation started',
            status: 'in_progress',
            updatedBy: 'Security Team',
            actionTaken: 'IP address blocked and login attempts analyzed',
            breachDetermined: false,
            notificationRequired: false,
            notificationDate: null,
            createdAt: '2025-01-15T11:30:00Z'
          },
          {
            id: 2,
            incidentId: 1,
            description: 'Investigation completed',
            status: 'closed',
            updatedBy: 'Security Team',
            actionTaken: 'Determined to be automated bot attack, no successful access',
            breachDetermined: false,
            notificationRequired: false,
            notificationDate: null,
            createdAt: '2025-01-20T14:30:00Z'
          },
          {
            id: 3,
            incidentId: 2,
            description: 'Initial assessment',
            status: 'in_progress',
            updatedBy: 'Privacy Officer',
            actionTaken: 'Laptop reported to police, remote wipe attempted',
            breachDetermined: true,
            notificationRequired: true,
            notificationDate: '2025-02-15',
            createdAt: '2025-02-10T14:00:00Z'
          },
          {
            id: 4,
            incidentId: 2,
            description: 'Breach notification process started',
            status: 'in_progress',
            updatedBy: 'Privacy Officer',
            actionTaken: 'Preparing notification letters and HHS report',
            breachDetermined: true,
            notificationRequired: true,
            notificationDate: '2025-02-15',
            createdAt: '2025-02-15T09:45:00Z'
          },
          {
            id: 5,
            incidentId: 3,
            description: 'Initial investigation',
            status: 'in_progress',
            updatedBy: 'IT Security',
            actionTaken: 'Emails analyzed, no evidence of successful phishing',
            breachDetermined: false,
            notificationRequired: false,
            notificationDate: null,
            createdAt: '2025-03-05T15:00:00Z'
          },
          {
            id: 6,
            incidentId: 3,
            description: 'Investigation completed',
            status: 'closed',
            updatedBy: 'IT Security',
            actionTaken: 'Security awareness training refreshed for all staff',
            breachDetermined: false,
            notificationRequired: false,
            notificationDate: null,
            createdAt: '2025-03-10T15:45:00Z'
          },
          {
            id: 7,
            incidentId: 4,
            description: 'System restored',
            status: 'closed',
            updatedBy: 'IT Operations',
            actionTaken: 'Server restarted, no data loss',
            breachDetermined: false,
            notificationRequired: false,
            notificationDate: null,
            createdAt: '2025-03-20T11:20:00Z'
          },
          {
            id: 8,
            incidentId: 5,
            description: 'Initial assessment',
            status: 'in_progress',
            updatedBy: 'Privacy Officer',
            actionTaken: 'Recipient contacted and asked to delete email',
            breachDetermined: true,
            notificationRequired: true,
            notificationDate: '2025-04-10',
            createdAt: '2025-04-05T16:30:00Z'
          },
          {
            id: 9,
            incidentId: 5,
            description: 'Breach notification process started',
            status: 'in_progress',
            updatedBy: 'Privacy Officer',
            actionTaken: 'Preparing notification letter for affected patient',
            breachDetermined: true,
            notificationRequired: true,
            notificationDate: '2025-04-10',
            createdAt: '2025-04-07T10:30:00Z'
          }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    setPage(0);
    setSelectedIncident(null);
  };

  // Handle page change
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  // Handle rows per page change
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Toggle view mode
  const handleToggleViewMode = () => {
    setViewMode(viewMode === 'cards' ? 'table' : 'cards');
  };

  // Open incident dialog for adding a new incident
  const handleAddIncident = () => {
    setDialogMode('add');
    setIncidentFormData({
      title: '',
      description: '',
      type: '',
      severity: 'medium',
      status: 'open',
      reportedBy: '',
      reportedDate: new Date().toISOString().split('T')[0],
      affectedSystems: '',
      potentialPhi: false,
      breachDetermined: false
    });
    setFormErrors({});
    setOpenIncidentDialog(true);
  };

  // Open incident dialog for editing an incident
  const handleEditIncident = (incident) => {
    setDialogMode('edit');
    setCurrentIncident(incident);
    setIncidentFormData({
      title: incident.title,
      description: incident.description,
      type: incident.type,
      severity: incident.severity,
      status: incident.status,
      reportedBy: incident.reportedBy,
      reportedDate: incident.reportedDate,
      affectedSystems: incident.affectedSystems,
      potentialPhi: incident.potentialPhi,
      breachDetermined: incident.breachDetermined
    });
    setFormErrors({});
    setOpenIncidentDialog(true);
  };

  // Open update dialog for adding a new update
  const handleAddUpdate = (incidentId) => {
    const incident = incidents.find(inc => inc.id === incidentId);
    setUpdateFormData({
      incidentId: incidentId,
      description: '',
      status: incident ? incident.status : 'open',
      updatedBy: '',
      actionTaken: '',
      breachDetermined: incident ? incident.breachDetermined : false,
      notificationRequired: false,
      notificationDate: ''
    });
    setFormErrors({});
    setOpenUpdateDialog(true);
  };

  // Handle incident selection
  const handleSelectIncident = (incident) => {
    setSelectedIncident(incident.id === selectedIncident ? null : incident.id);
  };

  // Handle dialog close
  const handleCloseIncidentDialog = () => {
    setOpenIncidentDialog(false);
  };

  // Handle update dialog close
  const handleCloseUpdateDialog = () => {
    setOpenUpdateDialog(false);
  };

  // Handle incident form input change
  const handleIncidentInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setIncidentFormData({
      ...incidentFormData,
      [name]: type === 'checkbox' ? checked : value
    });
    
    // Clear error for this field
    if (formErrors[name]) {
      setFormErrors({
        ...formErrors,
        [name]: null
      });
    }
  };

  // Handle update form input change
  const handleUpdateInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setUpdateFormData({
      ...updateFormData,
      [name]: type === 'checkbox' ? checked : value
    });
    
    // Clear error for this field
    if (formErrors[name]) {
      setFormErrors({
        ...formErrors,
        [name]: null
      });
    }
  };

  // Validate incident form
  const validateIncidentForm = () => {
    const errors = {};
    
    if (!incidentFormData.title) errors.title = 'Title is required';
    if (!incidentFormData.type) errors.type = 'Type is required';
    if (!incidentFormData.severity) errors.severity = 'Severity is required';
    if (!incidentFormData.reportedBy) errors.reportedBy = 'Reporter is required';
    if (!incidentFormData.reportedDate) errors.reportedDate = 'Report date is required';
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Validate update form
  const validateUpdateForm = () => {
    const errors = {};
    
    if (!updateFormData.description) errors.description = 'Description is required';
    if (!updateFormData.status) errors.status = 'Status is required';
    if (!updateFormData.updatedBy) errors.updatedBy = 'Updater is required';
    if (!updateFormData.actionTaken) errors.actionTaken = 'Action taken is required';
    if (updateFormData.notificationRequired && !updateFormData.notificationDate) {
      errors.notificationDate = 'Notification date is required when notification is required';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle incident form submission
  const handleIncidentSubmit = async () => {
    if (!validateIncidentForm()) return;
    
    try {
      if (dialogMode === 'add') {
        // Add new incident
        await axios.post(`${API_URL}/incidents`, incidentFormData);
        showSnackbar('Incident added successfully', 'success');
      } else {
        // Update existing incident
        await axios.put(`${API_URL}/incidents/${currentIncident.id}`, incidentFormData);
        showSnackbar('Incident updated successfully', 'success');
      }
      
      // Refresh incident list
      const response = await axios.get(`${API_URL}/incidents`);
      setIncidents(response.data);
      
      // Close dialog
      handleCloseIncidentDialog();
    } catch (error) {
      console.error('Error saving incident:', error);
      showSnackbar(error.response?.data?.message || 'Error saving incident', 'error');
      
      // For development - simulate success
      if (dialogMode === 'add') {
        const newIncident = {
          id: incidents.length + 1,
          ...incidentFormData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        setIncidents([...incidents, newIncident]);
      } else {
        const updatedIncidents = incidents.map(incident => 
          incident.id === currentIncident.id ? { 
            ...incident, 
            ...incidentFormData,
            updatedAt: new Date().toISOString() 
          } : incident
        );
        setIncidents(updatedIncidents);
      }
      handleCloseIncidentDialog();
    }
  };

  // Handle update form submission
  const handleUpdateSubmit = async () => {
    if (!validateUpdateForm()) return;
    
    try {
      // Add new update
      await axios.post(`${API_URL}/incidents/updates`, updateFormData);
      showSnackbar('Update added successfully', 'success');
      
      // Refresh update list
      const updatesResponse = await axios.get(`${API_URL}/incidents/updates`);
      setIncidentUpdates(updatesResponse.data);
      
      // Update incident status if changed
      const incident = incidents.find(inc => inc.id === updateFormData.incidentId);
      if (incident && incident.status !== updateFormData.status) {
        await axios.put(`${API_URL}/incidents/${updateFormData.incidentId}`, {
          ...incident,
          status: updateFormData.status,
          breachDetermined: updateFormData.breachDetermined
        });
        
        // Refresh incident list
        const incidentsResponse = await axios.get(`${API_URL}/incidents`);
        setIncidents(incidentsResponse.data);
      }
      
      // Close dialog
      handleCloseUpdateDialog();
    } catch (error) {
      console.error('Error saving update:', error);
      showSnackbar(error.response?.data?.message || 'Error saving update', 'error');
      
      // For development - simulate success
      const newUpdate = {
        id: incidentUpdates.length + 1,
        ...updateFormData,
        createdAt: new Date().toISOString()
      };
      setIncidentUpdates([...incidentUpdates, newUpdate]);
      
      // Update incident status if changed
      const incident = incidents.find(inc => inc.id === updateFormData.incidentId);
      if (incident && incident.status !== updateFormData.status) {
        const updatedIncidents = incidents.map(inc => 
          inc.id === updateFormData.incidentId ? { 
            ...inc, 
            status: updateFormData.status,
            breachDetermined: updateFormData.breachDetermined,
            updatedAt: new Date().toISOString() 
          } : inc
        );
        setIncidents(updatedIncidents);
      }
      
      handleCloseUpdateDialog();
    }
  };

  // Handle incident deletion
  const handleDeleteIncident = async (incidentId) => {
    if (!window.confirm('Are you sure you want to delete this incident? This will also delete all associated updates.')) return;
    
    try {
      await axios.delete(`${API_URL}/incidents/${incidentId}`);
      showSnackbar('Incident deleted successfully', 'success');
      
      // Update incident list
      setIncidents(incidents.filter(incident => incident.id !== incidentId));
      
      // Update updates list
      setIncidentUpdates(incidentUpdates.filter(update => update.incidentId !== incidentId));
      
      // Clear selection if the deleted incident was selected
      if (selectedIncident === incidentId) {
        setSelectedIncident(null);
      }
    } catch (error) {
      console.error('Error deleting incident:', error);
      showSnackbar('Error deleting incident', 'error');
      
      // For development - simulate success
      setIncidents(incidents.filter(incident => incident.id !== incidentId));
      setIncidentUpdates(incidentUpdates.filter(update => update.incidentId !== incidentId));
      if (selectedIncident === incidentId) {
        setSelectedIncident(null);
      }
    }
  };

  // Show snackbar message
  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({
      open: true,
      message,
      severity
    });
  };

  // Handle snackbar close
  const handleCloseSnackbar = () => {
    setSnackbar({
      ...snackbar,
      open: false
    });
  };

  // Get filtered incidents based on tab
  const getFilteredIncidents = () => {
    switch (tabValue) {
      case 0: // All incidents
        return incidents;
      case 1: // Open incidents
        return incidents.filter(incident => incident.status === 'open' || incident.status === 'in_progress');
      case 2: // Closed incidents
        return incidents.filter(incident => incident.status === 'closed');
      case 3: // Breach incidents
        return incidents.filter(incident => incident.breachDetermined);
      default:
        return incidents;
    }
  };

  // Get incident updates
  const getIncidentUpdates = (incidentId) => {
    return incidentUpdates
      .filter(update => update.incidentId === incidentId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  };

  // Get severity icon
  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical':
        return <ErrorIcon fontSize="small" />;
      case 'high':
        return <WarningIcon fontSize="small" />;
      case 'medium':
        return <SecurityIcon fontSize="small" />;
      case 'low':
        return <CheckCircleIcon fontSize="small" />;
      default:
        return null;
    }
  };

  // Get status text
  const getStatusText = (status) => {
    switch (status) {
      case 'open':
        return 'Open';
      case 'in_progress':
        return 'In Progress';
      case 'closed':
        return 'Closed';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <IncidentContainer>
      <Typography variant="h4" gutterBottom>
        Incident Management
      </Typography>
      
      <Paper elevation={3} sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          centered
        >
          <Tab label="All Incidents" />
          <Tab label="Open Incidents" />
          <Tab label="Closed Incidents" />
          <Tab label="Breach Incidents" />
        </Tabs>
        
        <TabPanel value={tabValue} index={0}>
          <IncidentList 
            incidents={getFilteredIncidents()}
            incidentUpdates={incidentUpdates}
            selectedIncident={selectedIncident}
            viewMode={viewMode}
            page={page}
            rowsPerPage={rowsPerPage}
            hasRole={hasRole}
            handleToggleViewMode={handleToggleViewMode}
            handleAddIncident={handleAddIncident}
            handleEditIncident={handleEditIncident}
            handleDeleteIncident={handleDeleteIncident}
            handleSelectIncident={handleSelectIncident}
            handleAddUpdate={handleAddUpdate}
            handleChangePage={handleChangePage}
            handleChangeRowsPerPage={handleChangeRowsPerPage}
            getIncidentUpdates={getIncidentUpdates}
            getSeverityIcon={getSeverityIcon}
            getStatusText={getStatusText}
          />
        </TabPanel>
        
        <TabPanel value={tabValue} index={1}>
          <IncidentList 
            incidents={getFilteredIncidents()}
            incidentUpdates={incidentUpdates}
            selectedIncident={selectedIncident}
            viewMode={viewMode}
            page={page}
            rowsPerPage={rowsPerPage}
            hasRole={hasRole}
            handleToggleViewMode={handleToggleViewMode}
            handleAddIncident={handleAddIncident}
            handleEditIncident={handleEditIncident}
            handleDeleteIncident={handleDeleteIncident}
            handleSelectIncident={handleSelectIncident}
            handleAddUpdate={handleAddUpdate}
            handleChangePage={handleChangePage}
            handleChangeRowsPerPage={handleChangeRowsPerPage}
            getIncidentUpdates={getIncidentUpdates}
            getSeverityIcon={getSeverityIcon}
            getStatusText={getStatusText}
          />
        </TabPanel>
        
        <TabPanel value={tabValue} index={2}>
          <IncidentList 
            incidents={getFilteredIncidents()}
            incidentUpdates={incidentUpdates}
            selectedIncident={selectedIncident}
            viewMode={viewMode}
            page={page}
            rowsPerPage={rowsPerPage}
            hasRole={hasRole}
            handleToggleViewMode={handleToggleViewMode}
            handleAddIncident={handleAddIncident}
            handleEditIncident={handleEditIncident}
            handleDeleteIncident={handleDeleteIncident}
            handleSelectIncident={handleSelectIncident}
            handleAddUpdate={handleAddUpdate}
            handleChangePage={handleChangePage}
            handleChangeRowsPerPage={handleChangeRowsPerPage}
            getIncidentUpdates={getIncidentUpdates}
            getSeverityIcon={getSeverityIcon}
            getStatusText={getStatusText}
          />
        </TabPanel>
        
        <TabPanel value={tabValue} index={3}>
          <IncidentList 
            incidents={getFilteredIncidents()}
            incidentUpdates={incidentUpdates}
            selectedIncident={selectedIncident}
            viewMode={viewMode}
            page={page}
            rowsPerPage={rowsPerPage}
            hasRole={hasRole}
            handleToggleViewMode={handleToggleViewMode}
            handleAddIncident={handleAddIncident}
            handleEditIncident={handleEditIncident}
            handleDeleteIncident={handleDeleteIncident}
            handleSelectIncident={handleSelectIncident}
            handleAddUpdate={handleAddUpdate}
            handleChangePage={handleChangePage}
            handleChangeRowsPerPage={handleChangeRowsPerPage}
            getIncidentUpdates={getIncidentUpdates}
            getSeverityIcon={getSeverityIcon}
            getStatusText={getStatusText}
          />
        </TabPanel>
      </Paper>
      
      {/* Incident Dialog */}
      <Dialog open={openIncidentDialog} onClose={handleCloseIncidentDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {dialogMode === 'add' ? 'Report New Incident' : 'Edit Incident'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                name="title"
                label="Title"
                fullWidth
                value={incidentFormData.title}
                onChange={handleIncidentInputChange}
                error={!!formErrors.title}
                helperText={formErrors.title}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="description"
                label="Description"
                fullWidth
                multiline
                rows={3}
                value={incidentFormData.description}
                onChange={handleIncidentInputChange}
                error={!!formErrors.description}
                helperText={formErrors.description}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth error={!!formErrors.type}>
                <InputLabel>Type</InputLabel>
                <Select
                  name="type"
                  value={incidentFormData.type}
                  onChange={handleIncidentInputChange}
                  label="Type"
                >
                  <MenuItem value="Security">Security</MenuItem>
                  <MenuItem value="Privacy">Privacy</MenuItem>
                  <MenuItem value="Physical">Physical</MenuItem>
                  <MenuItem value="Availability">Availability</MenuItem>
                  <MenuItem value="Other">Other</MenuItem>
                </Select>
                {formErrors.type && (
                  <Typography variant="caption" color="error">
                    {formErrors.type}
                  </Typography>
                )}
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth error={!!formErrors.severity}>
                <InputLabel>Severity</InputLabel>
                <Select
                  name="severity"
                  value={incidentFormData.severity}
                  onChange={handleIncidentInputChange}
                  label="Severity"
                >
                  <MenuItem value="critical">Critical</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="low">Low</MenuItem>
                </Select>
                {formErrors.severity && (
                  <Typography variant="caption" color="error">
                    {formErrors.severity}
                  </Typography>
                )}
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="reportedBy"
                label="Reported By"
                fullWidth
                value={incidentFormData.reportedBy}
                onChange={handleIncidentInputChange}
                error={!!formErrors.reportedBy}
                helperText={formErrors.reportedBy}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="reportedDate"
                label="Report Date"
                type="date"
                fullWidth
                value={incidentFormData.reportedDate}
                onChange={handleIncidentInputChange}
                error={!!formErrors.reportedDate}
                helperText={formErrors.reportedDate}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="affectedSystems"
                label="Affected Systems"
                fullWidth
                value={incidentFormData.affectedSystems}
                onChange={handleIncidentInputChange}
                error={!!formErrors.affectedSystems}
                helperText={formErrors.affectedSystems}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  name="status"
                  value={incidentFormData.status}
                  onChange={handleIncidentInputChange}
                  label="Status"
                >
                  <MenuItem value="open">Open</MenuItem>
                  <MenuItem value="in_progress">In Progress</MenuItem>
                  <MenuItem value="closed">Closed</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl component="fieldset" sx={{ mt: 1 }}>
                <Grid container>
                  <Grid item xs={6}>
                    <FormControl>
                      <Typography variant="body2">Potential PHI Involved</Typography>
                      <Select
                        name="potentialPhi"
                        value={incidentFormData.potentialPhi}
                        onChange={handleIncidentInputChange}
                        size="small"
                      >
                        <MenuItem value={true}>Yes</MenuItem>
                        <MenuItem value={false}>No</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={6}>
                    <FormControl>
                      <Typography variant="body2">Breach Determined</Typography>
                      <Select
                        name="breachDetermined"
                        value={incidentFormData.breachDetermined}
                        onChange={handleIncidentInputChange}
                        size="small"
                      >
                        <MenuItem value={true}>Yes</MenuItem>
                        <MenuItem value={false}>No</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseIncidentDialog}>Cancel</Button>
          <Button onClick={handleIncidentSubmit} variant="contained" color="primary">
            {dialogMode === 'add' ? 'Report Incident' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Update Dialog */}
      <Dialog open={openUpdateDialog} onClose={handleCloseUpdateDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          Add Incident Update
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                name="description"
                label="Update Description"
                fullWidth
                multiline
                rows={3}
                value={updateFormData.description}
                onChange={handleUpdateInputChange}
                error={!!formErrors.description}
                helperText={formErrors.description}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="actionTaken"
                label="Action Taken"
                fullWidth
                multiline
                rows={2}
                value={updateFormData.actionTaken}
                onChange={handleUpdateInputChange}
                error={!!formErrors.actionTaken}
                helperText={formErrors.actionTaken}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="updatedBy"
                label="Updated By"
                fullWidth
                value={updateFormData.updatedBy}
                onChange={handleUpdateInputChange}
                error={!!formErrors.updatedBy}
                helperText={formErrors.updatedBy}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  name="status"
                  value={updateFormData.status}
                  onChange={handleUpdateInputChange}
                  label="Status"
                >
                  <MenuItem value="open">Open</MenuItem>
                  <MenuItem value="in_progress">In Progress</MenuItem>
                  <MenuItem value="closed">Closed</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl>
                <Typography variant="body2">Breach Determined</Typography>
                <Select
                  name="breachDetermined"
                  value={updateFormData.breachDetermined}
                  onChange={handleUpdateInputChange}
                  size="small"
                >
                  <MenuItem value={true}>Yes</MenuItem>
                  <MenuItem value={false}>No</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl>
                <Typography variant="body2">Notification Required</Typography>
                <Select
                  name="notificationRequired"
                  value={updateFormData.notificationRequired}
                  onChange={handleUpdateInputChange}
                  size="small"
                >
                  <MenuItem value={true}>Yes</MenuItem>
                  <MenuItem value={false}>No</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            {updateFormData.notificationRequired && (
              <Grid item xs={12} sm={6}>
                <TextField
                  name="notificationDate"
                  label="Notification Date"
                  type="date"
                  fullWidth
                  value={updateFormData.notificationDate}
                  onChange={handleUpdateInputChange}
                  error={!!formErrors.notificationDate}
                  helperText={formErrors.notificationDate}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseUpdateDialog}>Cancel</Button>
          <Button onClick={handleUpdateSubmit} variant="contained" color="primary">
            Add Update
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </IncidentContainer>
  );
};

// Incident List Component
const IncidentList = ({ 
  incidents, 
  incidentUpdates,
  selectedIncident, 
  viewMode, 
  page, 
  rowsPerPage,
  hasRole,
  handleToggleViewMode,
  handleAddIncident,
  handleEditIncident,
  handleDeleteIncident,
  handleSelectIncident,
  handleAddUpdate,
  handleChangePage,
  handleChangeRowsPerPage,
  getIncidentUpdates,
  getSeverityIcon,
  getStatusText
}) => {
  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Button
            variant="outlined"
            onClick={handleToggleViewMode}
            sx={{ mr: 1 }}
          >
            {viewMode === 'cards' ? 'Table View' : 'Card View'}
          </Button>
        </Box>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleAddIncident}
        >
          Report Incident
        </Button>
      </Box>
      
      <Grid container spacing={3}>
        {/* Incidents List */}
        <Grid item xs={12} md={selectedIncident ? 6 : 12}>
          {viewMode === 'cards' ? (
            // Card view
            <Grid container spacing={2}>
              {incidents
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((incident) => (
                  <Grid item xs={12} sm={selectedIncident ? 12 : 6} md={selectedIncident ? 12 : 4} key={incident.id}>
                    <IncidentCard 
                      severity={incident.severity} 
                      elevation={3}
                      onClick={() => handleSelectIncident(incident)}
                      sx={{ 
                        cursor: 'pointer',
                        border: selectedIncident === incident.id ? '2px solid' : 'none',
                        borderColor: 'primary.main'
                      }}
                    >
                      <CardContent sx={{ flexGrow: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                          <Typography variant="h6" component="div">
                            {incident.title}
                          </Typography>
                          <SeverityChip
                            size="small"
                            label={incident.severity.toUpperCase()}
                            severity={incident.severity}
                            icon={getSeverityIcon(incident.severity)}
                          />
                        </Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          {incident.description}
                        </Typography>
                        <Grid container spacing={1}>
                          <Grid item xs={6}>
                            <Typography variant="body2" color="text.secondary">
                              Type: {incident.type}
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="body2" color="text.secondary">
                              Status: {getStatusText(incident.status)}
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="body2" color="text.secondary">
                              Reported: {new Date(incident.reportedDate).toLocaleDateString()}
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="body2" color="text.secondary">
                              PHI: {incident.potentialPhi ? 'Yes' : 'No'}
                            </Typography>
                          </Grid>
                        </Grid>
                        {incident.breachDetermined && (
                          <Chip 
                            label="Breach Determined" 
                            color="error" 
                            size="small" 
                            icon={<NotificationsIcon />} 
                            sx={{ mt: 1 }}
                          />
                        )}
                      </CardContent>
                      <CardActions sx={{ justifyContent: 'flex-end', p: 2 }}>
                        <Button
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddUpdate(incident.id);
                          }}
                        >
                          Add Update
                        </Button>
                        {(hasRole('admin') || hasRole('compliance_officer')) && (
                          <>
                            <Button
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditIncident(incident);
                              }}
                            >
                              Edit
                            </Button>
                            <Button
                              size="small"
                              color="error"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteIncident(incident.id);
                              }}
                            >
                              Delete
                            </Button>
                          </>
                        )}
                      </CardActions>
                    </IncidentCard>
                  </Grid>
                ))}
            </Grid>
          ) : (
            // Table view
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Title</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Severity</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Reported Date</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {incidents
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((incident) => (
                      <TableRow 
                        key={incident.id}
                        selected={selectedIncident === incident.id}
                        onClick={() => handleSelectIncident(incident)}
                        sx={{ cursor: 'pointer' }}
                      >
                        <TableCell>
                          {incident.title}
                          {incident.breachDetermined && (
                            <Chip 
                              label="Breach" 
                              color="error" 
                              size="small" 
                              sx={{ ml: 1 }}
                            />
                          )}
                        </TableCell>
                        <TableCell>{incident.type}</TableCell>
                        <TableCell>
                          <SeverityChip
                            size="small"
                            label={incident.severity.toUpperCase()}
                            severity={incident.severity}
                            icon={getSeverityIcon(incident.severity)}
                          />
                        </TableCell>
                        <TableCell>{getStatusText(incident.status)}</TableCell>
                        <TableCell>{new Date(incident.reportedDate).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <ActionButton
                            color="primary"
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddUpdate(incident.id);
                            }}
                          >
                            <HistoryIcon fontSize="small" />
                          </ActionButton>
                          {(hasRole('admin') || hasRole('compliance_officer')) && (
                            <>
                              <ActionButton
                                color="primary"
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditIncident(incident);
                                }}
                              >
                                <EditIcon fontSize="small" />
                              </ActionButton>
                              <ActionButton
                                color="error"
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteIncident(incident.id);
                                }}
                              >
                                <DeleteIcon fontSize="small" />
                              </ActionButton>
                            </>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
              <TablePagination
                rowsPerPageOptions={[5, 10, 25]}
                component="div"
                count={incidents.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
              />
            </TableContainer>
          )}
        </Grid>
        
        {/* Incident Updates */}
        {selectedIncident && (
          <Grid item xs={12} md={6}>
            <Paper elevation={3} sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  Incident Updates
                </Typography>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<AddIcon />}
                  onClick={() => handleAddUpdate(selectedIncident)}
                >
                  Add Update
                </Button>
              </Box>
              
              <List>
                {getIncidentUpdates(selectedIncident).map((update, index) => (
                  <React.Fragment key={update.id}>
                    <ListItem alignItems="flex-start">
                      <Box sx={{ width: '100%' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="subtitle1" component="div">
                            {new Date(update.createdAt).toLocaleString()}
                          </Typography>
                          <Typography variant="subtitle2" component="div">
                            Status: {getStatusText(update.status)}
                          </Typography>
                        </Box>
                        <Typography variant="body1" gutterBottom>
                          {update.description}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          <strong>Action Taken:</strong> {update.actionTaken}
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                          <Typography variant="body2" color="text.secondary">
                            Updated by: {update.updatedBy}
                          </Typography>
                          {update.breachDetermined && (
                            <Chip 
                              label="Breach Determined" 
                              color="error" 
                              size="small" 
                              icon={<NotificationsIcon />} 
                            />
                          )}
                          {update.notificationRequired && (
                            <Chip 
                              label={`Notification: ${new Date(update.notificationDate).toLocaleDateString()}`} 
                              color="warning" 
                              size="small" 
                            />
                          )}
                        </Box>
                      </Box>
                    </ListItem>
                    {index < getIncidentUpdates(selectedIncident).length - 1 && <Divider component="li" />}
                  </React.Fragment>
                ))}
                {getIncidentUpdates(selectedIncident).length === 0 && (
                  <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
                    No updates for this incident yet.
                  </Typography>
                )}
              </List>
            </Paper>
          </Grid>
        )}
      </Grid>
    </>
  );
};

export default IncidentManagement;
