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
  Divider
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
import AssessmentIcon from '@mui/icons-material/Assessment';

// API URL
const API_URL = 'http://localhost:8080/api';

// Styled components
const RiskContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
}));

const ActionButton = styled(IconButton)(({ theme }) => ({
  marginRight: theme.spacing(1),
}));

const SeverityChip = styled(Chip)(({ theme, severity }) => ({
  backgroundColor: 
    severity === 'high' ? theme.palette.error.light :
    severity === 'medium' ? theme.palette.warning.light :
    severity === 'low' ? theme.palette.success.light :
    theme.palette.grey[500],
  color: 
    severity === 'high' ? theme.palette.error.contrastText :
    severity === 'medium' ? theme.palette.warning.contrastText :
    severity === 'low' ? theme.palette.success.contrastText :
    theme.palette.grey[500],
}));

const RiskCard = styled(Card)(({ theme, severity }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  borderLeft: `4px solid ${
    severity === 'high' ? theme.palette.error.main :
    severity === 'medium' ? theme.palette.warning.main :
    severity === 'low' ? theme.palette.success.main :
    theme.palette.grey[500]
  }`,
}));

const RiskAssessment = () => {
  const { hasRole } = useAuth();
  const [assessments, setAssessments] = useState([]);
  const [riskItems, setRiskItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [viewMode, setViewMode] = useState('cards'); // 'cards' or 'table'
  const [openAssessmentDialog, setOpenAssessmentDialog] = useState(false);
  const [openRiskDialog, setOpenRiskDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState('add'); // 'add' or 'edit'
  const [currentAssessment, setCurrentAssessment] = useState(null);
  const [currentRisk, setCurrentRisk] = useState(null);
  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const [assessmentFormData, setAssessmentFormData] = useState({
    title: '',
    description: '',
    scope: '',
    assessor: '',
    status: 'in_progress',
    startDate: new Date().toISOString().split('T')[0],
    endDate: ''
  });
  const [riskFormData, setRiskFormData] = useState({
    assessmentId: '',
    title: '',
    description: '',
    category: '',
    likelihood: 'medium',
    impact: 'medium',
    severity: 'medium',
    mitigationPlan: '',
    status: 'open'
  });
  const [formErrors, setFormErrors] = useState({});
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  // Fetch assessments and risk items
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch assessments
        const assessmentsResponse = await axios.get(`${API_URL}/risk/assessments`);
        setAssessments(assessmentsResponse.data);
        
        // Fetch risk items
        const riskItemsResponse = await axios.get(`${API_URL}/risk/items`);
        setRiskItems(riskItemsResponse.data);
      } catch (error) {
        console.error('Error fetching data:', error);
        showSnackbar('Error loading risk assessment data', 'error');
        
        // Mock data for development
        setAssessments([
          { 
            id: 1, 
            title: 'Annual Security Risk Assessment', 
            description: 'Comprehensive assessment of security risks',
            scope: 'All systems and processes',
            assessor: 'John Smith',
            status: 'completed',
            startDate: '2025-01-15',
            endDate: '2025-02-15',
            createdAt: '2025-01-10T10:00:00Z',
            updatedAt: '2025-02-20T14:30:00Z'
          },
          { 
            id: 2, 
            title: 'New EHR System Assessment', 
            description: 'Risk assessment for new EHR implementation',
            scope: 'EHR system and related processes',
            assessor: 'Jane Doe',
            status: 'in_progress',
            startDate: '2025-03-01',
            endDate: null,
            createdAt: '2025-02-25T11:15:00Z',
            updatedAt: '2025-03-10T09:45:00Z'
          },
          { 
            id: 3, 
            title: 'Quarterly Compliance Check', 
            description: 'Regular quarterly risk assessment',
            scope: 'Administrative safeguards',
            assessor: 'Robert Johnson',
            status: 'planned',
            startDate: '2025-04-01',
            endDate: null,
            createdAt: '2025-03-15T13:20:00Z',
            updatedAt: '2025-03-15T13:20:00Z'
          }
        ]);
        
        setRiskItems([
          {
            id: 1,
            assessmentId: 1,
            title: 'Insufficient Access Controls',
            description: 'Access controls for PHI are not sufficiently restrictive',
            category: 'Administrative',
            likelihood: 'high',
            impact: 'high',
            severity: 'high',
            mitigationPlan: 'Implement role-based access control and review access logs regularly',
            status: 'mitigated',
            createdAt: '2025-01-20T10:30:00Z',
            updatedAt: '2025-02-10T15:45:00Z'
          },
          {
            id: 2,
            assessmentId: 1,
            title: 'Unencrypted Data Transmission',
            description: 'Some data is transmitted without encryption',
            category: 'Technical',
            likelihood: 'medium',
            impact: 'high',
            severity: 'high',
            mitigationPlan: 'Implement end-to-end encryption for all data transmissions',
            status: 'in_progress',
            createdAt: '2025-01-25T11:20:00Z',
            updatedAt: '2025-02-05T09:30:00Z'
          },
          {
            id: 3,
            assessmentId: 1,
            title: 'Inadequate Backup Procedures',
            description: 'Backup procedures do not meet requirements',
            category: 'Technical',
            likelihood: 'medium',
            impact: 'medium',
            severity: 'medium',
            mitigationPlan: 'Implement automated daily backups with encryption',
            status: 'mitigated',
            createdAt: '2025-01-30T14:15:00Z',
            updatedAt: '2025-02-12T10:20:00Z'
          },
          {
            id: 4,
            assessmentId: 2,
            title: 'Insufficient Staff Training',
            description: 'Staff not adequately trained on new EHR security features',
            category: 'Administrative',
            likelihood: 'high',
            impact: 'medium',
            severity: 'high',
            mitigationPlan: 'Develop and implement comprehensive training program',
            status: 'open',
            createdAt: '2025-03-05T09:45:00Z',
            updatedAt: '2025-03-05T09:45:00Z'
          },
          {
            id: 5,
            assessmentId: 2,
            title: 'Vendor Security Concerns',
            description: 'EHR vendor has not provided sufficient security documentation',
            category: 'Administrative',
            likelihood: 'medium',
            impact: 'medium',
            severity: 'medium',
            mitigationPlan: 'Request and review vendor security documentation and certifications',
            status: 'in_progress',
            createdAt: '2025-03-07T13:30:00Z',
            updatedAt: '2025-03-10T11:15:00Z'
          }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

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

  // Open assessment dialog for adding a new assessment
  const handleAddAssessment = () => {
    setDialogMode('add');
    setAssessmentFormData({
      title: '',
      description: '',
      scope: '',
      assessor: '',
      status: 'planned',
      startDate: new Date().toISOString().split('T')[0],
      endDate: ''
    });
    setFormErrors({});
    setOpenAssessmentDialog(true);
  };

  // Open assessment dialog for editing an assessment
  const handleEditAssessment = (assessment) => {
    setDialogMode('edit');
    setCurrentAssessment(assessment);
    setAssessmentFormData({
      title: assessment.title,
      description: assessment.description,
      scope: assessment.scope,
      assessor: assessment.assessor,
      status: assessment.status,
      startDate: assessment.startDate,
      endDate: assessment.endDate || ''
    });
    setFormErrors({});
    setOpenAssessmentDialog(true);
  };

  // Open risk dialog for adding a new risk item
  const handleAddRisk = (assessmentId) => {
    setDialogMode('add');
    setRiskFormData({
      assessmentId: assessmentId,
      title: '',
      description: '',
      category: '',
      likelihood: 'medium',
      impact: 'medium',
      severity: 'medium',
      mitigationPlan: '',
      status: 'open'
    });
    setFormErrors({});
    setOpenRiskDialog(true);
  };

  // Open risk dialog for editing a risk item
  const handleEditRisk = (risk) => {
    setDialogMode('edit');
    setCurrentRisk(risk);
    setRiskFormData({
      assessmentId: risk.assessmentId,
      title: risk.title,
      description: risk.description,
      category: risk.category,
      likelihood: risk.likelihood,
      impact: risk.impact,
      severity: risk.severity,
      mitigationPlan: risk.mitigationPlan,
      status: risk.status
    });
    setFormErrors({});
    setOpenRiskDialog(true);
  };

  // Handle assessment selection
  const handleSelectAssessment = (assessment) => {
    setSelectedAssessment(assessment.id);
  };

  // Handle dialog close
  const handleCloseAssessmentDialog = () => {
    setOpenAssessmentDialog(false);
  };

  // Handle risk dialog close
  const handleCloseRiskDialog = () => {
    setOpenRiskDialog(false);
  };

  // Handle assessment form input change
  const handleAssessmentInputChange = (e) => {
    const { name, value } = e.target;
    setAssessmentFormData({
      ...assessmentFormData,
      [name]: value
    });
    
    // Clear error for this field
    if (formErrors[name]) {
      setFormErrors({
        ...formErrors,
        [name]: null
      });
    }
  };

  // Handle risk form input change
  const handleRiskInputChange = (e) => {
    const { name, value } = e.target;
    setRiskFormData({
      ...riskFormData,
      [name]: value
    });
    
    // Clear error for this field
    if (formErrors[name]) {
      setFormErrors({
        ...formErrors,
        [name]: null
      });
    }

    // Auto-calculate severity based on likelihood and impact
    if (name === 'likelihood' || name === 'impact') {
      const likelihood = name === 'likelihood' ? value : riskFormData.likelihood;
      const impact = name === 'impact' ? value : riskFormData.impact;
      
      let severity = 'medium';
      if (likelihood === 'high' && impact === 'high') {
        severity = 'high';
      } else if (likelihood === 'low' && impact === 'low') {
        severity = 'low';
      } else if (likelihood === 'high' || impact === 'high') {
        severity = 'high';
      } else if (likelihood === 'low' && impact === 'medium') {
        severity = 'low';
      }
      
      setRiskFormData({
        ...riskFormData,
        [name]: value,
        severity: severity
      });
    }
  };

  // Validate assessment form
  const validateAssessmentForm = () => {
    const errors = {};
    
    if (!assessmentFormData.title) errors.title = 'Title is required';
    if (!assessmentFormData.scope) errors.scope = 'Scope is required';
    if (!assessmentFormData.assessor) errors.assessor = 'Assessor is required';
    if (!assessmentFormData.startDate) errors.startDate = 'Start date is required';
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Validate risk form
  const validateRiskForm = () => {
    const errors = {};
    
    if (!riskFormData.title) errors.title = 'Title is required';
    if (!riskFormData.category) errors.category = 'Category is required';
    if (!riskFormData.likelihood) errors.likelihood = 'Likelihood is required';
    if (!riskFormData.impact) errors.impact = 'Impact is required';
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle assessment form submission
  const handleAssessmentSubmit = async () => {
    if (!validateAssessmentForm()) return;
    
    try {
      if (dialogMode === 'add') {
        // Add new assessment
        await axios.post(`${API_URL}/risk/assessments`, assessmentFormData);
        showSnackbar('Assessment added successfully', 'success');
      } else {
        // Update existing assessment
        await axios.put(`${API_URL}/risk/assessments/${currentAssessment.id}`, assessmentFormData);
        showSnackbar('Assessment updated successfully', 'success');
      }
      
      // Refresh assessment list
      const response = await axios.get(`${API_URL}/risk/assessments`);
      setAssessments(response.data);
      
      // Close dialog
      handleCloseAssessmentDialog();
    } catch (error) {
      console.error('Error saving assessment:', error);
      showSnackbar(error.response?.data?.message || 'Error saving assessment', 'error');
      
      // For development - simulate success
      if (dialogMode === 'add') {
        const newAssessment = {
          id: assessments.length + 1,
          ...assessmentFormData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        setAssessments([...assessments, newAssessment]);
      } else {
        const updatedAssessments = assessments.map(assessment => 
          assessment.id === currentAssessment.id ? { 
            ...assessment, 
            ...assessmentFormData,
            updatedAt: new Date().toISOString() 
          } : assessment
        );
        setAssessments(updatedAssessments);
      }
      handleCloseAssessmentDialog();
    }
  };

  // Handle risk form submission
  const handleRiskSubmit = async () => {
    if (!validateRiskForm()) return;
    
    try {
      if (dialogMode === 'add') {
        // Add new risk item
        await axios.post(`${API_URL}/risk/items`, riskFormData);
        showSnackbar('Risk item added successfully', 'success');
      } else {
        // Update existing risk item
        await axios.put(`${API_URL}/risk/items/${currentRisk.id}`, riskFormData);
        showSnackbar('Risk item updated successfully', 'success');
      }
      
      // Refresh risk item list
      const response = await axios.get(`${API_URL}/risk/items`);
      setRiskItems(response.data);
      
      // Close dialog
      handleCloseRiskDialog();
    } catch (error) {
      console.error('Error saving risk item:', error);
      showSnackbar(error.response?.data?.message || 'Error saving risk item', 'error');
      
      // For development - simulate success
      if (dialogMode === 'add') {
        const newRisk = {
          id: riskItems.length + 1,
          ...riskFormData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        setRiskItems([...riskItems, newRisk]);
      } else {
        const updatedRiskItems = riskItems.map(risk => 
          risk.id === currentRisk.id ? { 
            ...risk, 
            ...riskFormData,
            updatedAt: new Date().toISOString() 
          } : risk
        );
        setRiskItems(updatedRiskItems);
      }
      handleCloseRiskDialog();
    }
  };

  // Handle assessment deletion
  const handleDeleteAssessment = async (assessmentId) => {
    if (!window.confirm('Are you sure you want to delete this assessment? This will also delete all associated risk items.')) return;
    
    try {
      await axios.delete(`${API_URL}/risk/assessments/${assessmentId}`);
      showSnackbar('Assessment deleted successfully', 'success');
      
      // Update assessment list
      setAssessments(assessments.filter(assessment => assessment.id !== assessmentId));
      
      // Update risk items list
      setRiskItems(riskItems.filter(risk => risk.assessmentId !== assessmentId));
      
      // Clear selection if the deleted assessment was selected
      if (selectedAssessment === assessmentId) {
        setSelectedAssessment(null);
      }
    } catch (error) {
      console.error('Error deleting assessment:', error);
      showSnackbar('Error deleting assessment', 'error');
      
      // For development - simulate success
      setAssessments(assessments.filter(assessment => assessment.id !== assessmentId));
      setRiskItems(riskItems.filter(risk => risk.assessmentId !== assessmentId));
      if (selectedAssessment === assessmentId) {
        setSelectedAssessment(null);
      }
    }
  };

  // Handle risk item deletion
  const handleDeleteRisk = async (riskId) => {
    if (!window.confirm('Are you sure you want to delete this risk item?')) return;
    
    try {
      await axios.delete(`${API_URL}/risk/items/${riskId}`);
      showSnackbar('Risk item deleted successfully', 'success');
      
      // Update risk items list
      setRiskItems(riskItems.filter(risk => risk.id !== riskId));
    } catch (error) {
      console.error('Error deleting risk item:', error);
      showSnackbar('Error deleting risk item', 'error');
      
      // For development - simulate success
      setRiskItems(riskItems.filter(risk => risk.id !== riskId));
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

  // Get filtered risk items based on selected assessment
  const getFilteredRiskItems = () => {
    if (!selectedAssessment) return [];
    return riskItems.filter(risk => risk.assessmentId === selectedAssessment);
  };

  // Get severity icon
  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'high':
        return <WarningIcon fontSize="small" />;
      case 'medium':
        return <SecurityIcon fontSize="small" />;
      case 'low':
        return <AssessmentIcon fontSize="small" />;
      default:
        return null;
    }
  };

  // Get status text
  const getStatusText = (status) => {
    switch (status) {
      case 'planned':
        return 'Planned';
      case 'in_progress':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      case 'open':
        return 'Open';
      case 'in_progress':
        return 'In Progress';
      case 'mitigated':
        return 'Mitigated';
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
    <RiskContainer>
      <Typography variant="h4" gutterBottom>
        Risk Assessment
      </Typography>
      
      <Grid container spacing={3}>
        {/* Assessments Section */}
        <Grid item xs={12} md={selectedAssessment ? 4 : 12}>
          <Paper elevation={3} sx={{ p: 2, mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Risk Assessments</Typography>
              {(hasRole('admin') || hasRole('compliance_officer')) && (
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<AddIcon />}
                  onClick={handleAddAssessment}
                >
                  New Assessment
                </Button>
              )}
            </Box>
            
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Title</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Start Date</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {assessments
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((assessment) => (
                      <TableRow 
                        key={assessment.id}
                        selected={selectedAssessment === assessment.id}
                        onClick={() => handleSelectAssessment(assessment)}
                        sx={{ cursor: 'pointer' }}
                      >
                        <TableCell>{assessment.title}</TableCell>
                        <TableCell>{getStatusText(assessment.status)}</TableCell>
                        <TableCell>{new Date(assessment.startDate).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <ActionButton
                            color="primary"
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddRisk(assessment.id);
                            }}
                          >
                            <AddIcon fontSize="small" />
                          </ActionButton>
                          {(hasRole('admin') || hasRole('compliance_officer')) && (
                            <>
                              <ActionButton
                                color="primary"
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditAssessment(assessment);
                                }}
                              >
                                <EditIcon fontSize="small" />
                              </ActionButton>
                              <ActionButton
                                color="error"
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteAssessment(assessment.id);
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
            </TableContainer>
            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={assessments.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </Paper>
        </Grid>
        
        {/* Risk Items Section */}
        {selectedAssessment && (
          <Grid item xs={12} md={8}>
            <Paper elevation={3} sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  Risk Items for {assessments.find(a => a.id === selectedAssessment)?.title}
                </Typography>
                <Box>
                  <Button
                    variant="outlined"
                    onClick={handleToggleViewMode}
                    sx={{ mr: 1 }}
                  >
                    {viewMode === 'cards' ? 'Table View' : 'Card View'}
                  </Button>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<AddIcon />}
                    onClick={() => handleAddRisk(selectedAssessment)}
                  >
                    Add Risk
                  </Button>
                </Box>
              </Box>
              
              {viewMode === 'cards' ? (
                // Card view
                <Grid container spacing={2}>
                  {getFilteredRiskItems().map((risk) => (
                    <Grid item xs={12} sm={6} key={risk.id}>
                      <RiskCard severity={risk.severity} elevation={3}>
                        <CardContent sx={{ flexGrow: 1 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                            <Typography variant="h6" component="div">
                              {risk.title}
                            </Typography>
                            <SeverityChip
                              size="small"
                              label={risk.severity.toUpperCase()}
                              severity={risk.severity}
                              icon={getSeverityIcon(risk.severity)}
                            />
                          </Box>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            {risk.description}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Category: {risk.category}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Status: {getStatusText(risk.status)}
                          </Typography>
                          <Divider sx={{ my: 1 }} />
                          <Typography variant="body2" color="text.secondary">
                            <strong>Mitigation Plan:</strong>
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {risk.mitigationPlan || 'No mitigation plan defined'}
                          </Typography>
                        </CardContent>
                        <CardActions sx={{ justifyContent: 'flex-end', p: 2 }}>
                          {(hasRole('admin') || hasRole('compliance_officer')) && (
                            <>
                              <Button
                                size="small"
                                onClick={() => handleEditRisk(risk)}
                              >
                                Edit
                              </Button>
                              <Button
                                size="small"
                                color="error"
                                onClick={() => handleDeleteRisk(risk.id)}
                              >
                                Delete
                              </Button>
                            </>
                          )}
                        </CardActions>
                      </RiskCard>
                    </Grid>
                  ))}
                </Grid>
              ) : (
                // Table view
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Title</TableCell>
                        <TableCell>Category</TableCell>
                        <TableCell>Severity</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {getFilteredRiskItems().map((risk) => (
                        <TableRow key={risk.id}>
                          <TableCell>{risk.title}</TableCell>
                          <TableCell>{risk.category}</TableCell>
                          <TableCell>
                            <SeverityChip
                              size="small"
                              label={risk.severity.toUpperCase()}
                              severity={risk.severity}
                              icon={getSeverityIcon(risk.severity)}
                            />
                          </TableCell>
                          <TableCell>{getStatusText(risk.status)}</TableCell>
                          <TableCell>
                            {(hasRole('admin') || hasRole('compliance_officer')) && (
                              <>
                                <ActionButton
                                  color="primary"
                                  size="small"
                                  onClick={() => handleEditRisk(risk)}
                                >
                                  <EditIcon fontSize="small" />
                                </ActionButton>
                                <ActionButton
                                  color="error"
                                  size="small"
                                  onClick={() => handleDeleteRisk(risk.id)}
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
                </TableContainer>
              )}
            </Paper>
          </Grid>
        )}
      </Grid>
      
      {/* Assessment Dialog */}
      <Dialog open={openAssessmentDialog} onClose={handleCloseAssessmentDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {dialogMode === 'add' ? 'Add New Assessment' : 'Edit Assessment'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                name="title"
                label="Title"
                fullWidth
                value={assessmentFormData.title}
                onChange={handleAssessmentInputChange}
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
                rows={2}
                value={assessmentFormData.description}
                onChange={handleAssessmentInputChange}
                error={!!formErrors.description}
                helperText={formErrors.description}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="scope"
                label="Scope"
                fullWidth
                value={assessmentFormData.scope}
                onChange={handleAssessmentInputChange}
                error={!!formErrors.scope}
                helperText={formErrors.scope}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="assessor"
                label="Assessor"
                fullWidth
                value={assessmentFormData.assessor}
                onChange={handleAssessmentInputChange}
                error={!!formErrors.assessor}
                helperText={formErrors.assessor}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  name="status"
                  value={assessmentFormData.status}
                  onChange={handleAssessmentInputChange}
                  label="Status"
                >
                  <MenuItem value="planned">Planned</MenuItem>
                  <MenuItem value="in_progress">In Progress</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="startDate"
                label="Start Date"
                type="date"
                fullWidth
                value={assessmentFormData.startDate}
                onChange={handleAssessmentInputChange}
                error={!!formErrors.startDate}
                helperText={formErrors.startDate}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="endDate"
                label="End Date"
                type="date"
                fullWidth
                value={assessmentFormData.endDate}
                onChange={handleAssessmentInputChange}
                error={!!formErrors.endDate}
                helperText={formErrors.endDate}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAssessmentDialog}>Cancel</Button>
          <Button onClick={handleAssessmentSubmit} variant="contained" color="primary">
            {dialogMode === 'add' ? 'Add Assessment' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Risk Dialog */}
      <Dialog open={openRiskDialog} onClose={handleCloseRiskDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {dialogMode === 'add' ? 'Add New Risk Item' : 'Edit Risk Item'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                name="title"
                label="Title"
                fullWidth
                value={riskFormData.title}
                onChange={handleRiskInputChange}
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
                rows={2}
                value={riskFormData.description}
                onChange={handleRiskInputChange}
                error={!!formErrors.description}
                helperText={formErrors.description}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth error={!!formErrors.category}>
                <InputLabel>Category</InputLabel>
                <Select
                  name="category"
                  value={riskFormData.category}
                  onChange={handleRiskInputChange}
                  label="Category"
                >
                  <MenuItem value="Administrative">Administrative</MenuItem>
                  <MenuItem value="Physical">Physical</MenuItem>
                  <MenuItem value="Technical">Technical</MenuItem>
                  <MenuItem value="Organizational">Organizational</MenuItem>
                </Select>
                {formErrors.category && (
                  <Typography variant="caption" color="error">
                    {formErrors.category}
                  </Typography>
                )}
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  name="status"
                  value={riskFormData.status}
                  onChange={handleRiskInputChange}
                  label="Status"
                >
                  <MenuItem value="open">Open</MenuItem>
                  <MenuItem value="in_progress">In Progress</MenuItem>
                  <MenuItem value="mitigated">Mitigated</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth error={!!formErrors.likelihood}>
                <InputLabel>Likelihood</InputLabel>
                <Select
                  name="likelihood"
                  value={riskFormData.likelihood}
                  onChange={handleRiskInputChange}
                  label="Likelihood"
                >
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                </Select>
                {formErrors.likelihood && (
                  <Typography variant="caption" color="error">
                    {formErrors.likelihood}
                  </Typography>
                )}
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth error={!!formErrors.impact}>
                <InputLabel>Impact</InputLabel>
                <Select
                  name="impact"
                  value={riskFormData.impact}
                  onChange={handleRiskInputChange}
                  label="Impact"
                >
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                </Select>
                {formErrors.impact && (
                  <Typography variant="caption" color="error">
                    {formErrors.impact}
                  </Typography>
                )}
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>Severity (Auto-calculated)</InputLabel>
                <Select
                  name="severity"
                  value={riskFormData.severity}
                  label="Severity"
                  disabled
                >
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="mitigationPlan"
                label="Mitigation Plan"
                fullWidth
                multiline
                rows={3}
                value={riskFormData.mitigationPlan}
                onChange={handleRiskInputChange}
                error={!!formErrors.mitigationPlan}
                helperText={formErrors.mitigationPlan}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseRiskDialog}>Cancel</Button>
          <Button onClick={handleRiskSubmit} variant="contained" color="primary">
            {dialogMode === 'add' ? 'Add Risk Item' : 'Save Changes'}
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
    </RiskContainer>
  );
};

export default RiskAssessment;
