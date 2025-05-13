import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Grid,
  Card,
  CardContent,
  CardHeader,
  Button,
  CircularProgress,
  Tabs,
  Tab,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert
} from '@mui/material';
import { styled } from '@mui/material/styles';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';

// Icons
import AssessmentIcon from '@mui/icons-material/Assessment';
import PeopleIcon from '@mui/icons-material/People';
import SchoolIcon from '@mui/icons-material/School';
import SecurityIcon from '@mui/icons-material/Security';
import WarningIcon from '@mui/icons-material/Warning';
import DescriptionIcon from '@mui/icons-material/Description';
import DownloadIcon from '@mui/icons-material/Download';
import PrintIcon from '@mui/icons-material/Print';
import EmailIcon from '@mui/icons-material/Email';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';

// API URL
const API_URL = 'http://localhost:8080/api';

// Styled components
const ReportContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
}));

const ReportCard = styled(Card)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  height: '100%',
}));

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`report-tabpanel-${index}`}
      aria-labelledby={`report-tab-${index}`}
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

const AdvancedReports = () => {
  const { hasRole } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState({
    complianceScore: 0,
    trainingCompletion: 0,
    riskAssessments: 0,
    openIncidents: 0,
    documentCompliance: 0,
    userStats: {
      total: 0,
      active: 0,
      inactive: 0,
      byDepartment: []
    },
    trainingStats: {
      totalCourses: 0,
      totalAssignments: 0,
      completedAssignments: 0,
      overdueAssignments: 0,
      byDepartment: []
    },
    riskStats: {
      totalRisks: 0,
      byLevel: {
        high: 0,
        medium: 0,
        low: 0
      },
      byStatus: {
        open: 0,
        mitigated: 0,
        accepted: 0
      }
    },
    incidentStats: {
      totalIncidents: 0,
      bySeverity: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0
      },
      byStatus: {
        open: 0,
        investigating: 0,
        resolved: 0,
        closed: 0
      }
    },
    documentStats: {
      totalDocuments: 0,
      byCategory: [],
      pendingReview: 0,
      pendingApproval: 0
    }
  });
  const [openGenerateDialog, setOpenGenerateDialog] = useState(false);
  const [reportParams, setReportParams] = useState({
    reportType: 'compliance',
    startDate: '',
    endDate: '',
    department: '',
    format: 'pdf',
    includeCharts: true,
    includeDetails: true
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  // Fetch report data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch report data
        // const response = await axios.get(`${API_URL}/reports/dashboard`);
        // setReportData(response.data);
        
        // Mock data for development
        setReportData({
          complianceScore: 87,
          trainingCompletion: 92,
          riskAssessments: 95,
          openIncidents: 3,
          documentCompliance: 90,
          userStats: {
            total: 45,
            active: 42,
            inactive: 3,
            byDepartment: [
              { name: 'IT', count: 12 },
              { name: 'HR', count: 8 },
              { name: 'Finance', count: 6 },
              { name: 'Operations', count: 15 },
              { name: 'Executive', count: 4 }
            ]
          },
          trainingStats: {
            totalCourses: 15,
            totalAssignments: 180,
            completedAssignments: 165,
            overdueAssignments: 8,
            byDepartment: [
              { name: 'IT', completion: 95 },
              { name: 'HR', completion: 100 },
              { name: 'Finance', completion: 83 },
              { name: 'Operations', completion: 90 },
              { name: 'Executive', completion: 75 }
            ]
          },
          riskStats: {
            totalRisks: 28,
            byLevel: {
              high: 5,
              medium: 12,
              low: 11
            },
            byStatus: {
              open: 8,
              mitigated: 15,
              accepted: 5
            }
          },
          incidentStats: {
            totalIncidents: 12,
            bySeverity: {
              critical: 1,
              high: 2,
              medium: 5,
              low: 4
            },
            byStatus: {
              open: 3,
              investigating: 2,
              resolved: 4,
              closed: 3
            }
          },
          documentStats: {
            totalDocuments: 35,
            byCategory: [
              { name: 'Policies', count: 12 },
              { name: 'Procedures', count: 15 },
              { name: 'Forms', count: 5 },
              { name: 'Training Materials', count: 3 }
            ],
            pendingReview: 2,
            pendingApproval: 1
          }
        });
      } catch (error) {
        console.error('Error fetching report data:', error);
        showSnackbar('Error loading report data', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Open generate report dialog
  const handleOpenGenerateDialog = () => {
    setOpenGenerateDialog(true);
  };

  // Close generate report dialog
  const handleCloseGenerateDialog = () => {
    setOpenGenerateDialog(false);
  };

  // Handle report parameter change
  const handleReportParamChange = (e) => {
    const { name, value } = e.target;
    setReportParams({
      ...reportParams,
      [name]: value
    });
  };

  // Generate report
  const handleGenerateReport = async () => {
    try {
      setLoading(true);
      
      // In a real app, we would generate the report
      // const response = await axios.post(`${API_URL}/reports/generate`, reportParams, {
      //   responseType: 'blob'
      // });
      // const url = window.URL.createObjectURL(new Blob([response.data]));
      // const link = document.createElement('a');
      // link.href = url;
      // link.setAttribute('download', `${reportParams.reportType}_report_${new Date().toISOString().split('T')[0]}.${reportParams.format}`);
      // document.body.appendChild(link);
      // link.click();
      
      // Simulate report generation
      setTimeout(() => {
        setLoading(false);
        handleCloseGenerateDialog();
        showSnackbar('Report generated successfully', 'success');
      }, 2000);
    } catch (error) {
      console.error('Error generating report:', error);
      setLoading(false);
      showSnackbar('Error generating report', 'error');
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

  // Format percentage
  const formatPercentage = (value) => {
    return `${value}%`;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <ReportContainer>
      <Typography variant="h4" gutterBottom>
        Advanced Reports
      </Typography>
      
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AssessmentIcon />}
          onClick={handleOpenGenerateDialog}
        >
          Generate Report
        </Button>
      </Box>
      
      <Paper elevation={3} sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          centered
        >
          <Tab label="Compliance Overview" />
          <Tab label="User & Training" />
          <Tab label="Risk & Incidents" />
          <Tab label="Document Compliance" />
        </Tabs>
        
        <TabPanel value={tabValue} index={0}>
          <ComplianceOverviewTab data={reportData} />
        </TabPanel>
        
        <TabPanel value={tabValue} index={1}>
          <UserTrainingTab data={reportData} />
        </TabPanel>
        
        <TabPanel value={tabValue} index={2}>
          <RiskIncidentTab data={reportData} />
        </TabPanel>
        
        <TabPanel value={tabValue} index={3}>
          <DocumentComplianceTab data={reportData} />
        </TabPanel>
      </Paper>
      
      {/* Generate Report Dialog */}
      <Dialog open={openGenerateDialog} onClose={handleCloseGenerateDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          Generate Report
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Report Type</InputLabel>
                <Select
                  name="reportType"
                  value={reportParams.reportType}
                  onChange={handleReportParamChange}
                  label="Report Type"
                >
                  <MenuItem value="compliance">Compliance Overview</MenuItem>
                  <MenuItem value="training">Training Status</MenuItem>
                  <MenuItem value="risk">Risk Assessment</MenuItem>
                  <MenuItem value="incident">Incident Management</MenuItem>
                  <MenuItem value="document">Document Compliance</MenuItem>
                  <MenuItem value="audit">Audit Log Summary</MenuItem>
                  <MenuItem value="executive">Executive Summary</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Department</InputLabel>
                <Select
                  name="department"
                  value={reportParams.department}
                  onChange={handleReportParamChange}
                  label="Department"
                >
                  <MenuItem value="">All Departments</MenuItem>
                  <MenuItem value="IT">IT</MenuItem>
                  <MenuItem value="HR">HR</MenuItem>
                  <MenuItem value="Finance">Finance</MenuItem>
                  <MenuItem value="Operations">Operations</MenuItem>
                  <MenuItem value="Executive">Executive</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="startDate"
                label="Start Date"
                type="date"
                fullWidth
                value={reportParams.startDate}
                onChange={handleReportParamChange}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="endDate"
                label="End Date"
                type="date"
                fullWidth
                value={reportParams.endDate}
                onChange={handleReportParamChange}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Format</InputLabel>
                <Select
                  name="format"
                  value={reportParams.format}
                  onChange={handleReportParamChange}
                  label="Format"
                >
                  <MenuItem value="pdf">PDF</MenuItem>
                  <MenuItem value="excel">Excel</MenuItem>
                  <MenuItem value="csv">CSV</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Include Charts</InputLabel>
                <Select
                  name="includeCharts"
                  value={reportParams.includeCharts}
                  onChange={handleReportParamChange}
                  label="Include Charts"
                >
                  <MenuItem value={true}>Yes</MenuItem>
                  <MenuItem value={false}>No</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Include Details</InputLabel>
                <Select
                  name="includeDetails"
                  value={reportParams.includeDetails}
                  onChange={handleReportParamChange}
                  label="Include Details"
                >
                  <MenuItem value={true}>Yes</MenuItem>
                  <MenuItem value={false}>No</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseGenerateDialog}>Cancel</Button>
          <Button 
            onClick={handleGenerateReport} 
            variant="contained" 
            color="primary"
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Generate Report'}
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
    </ReportContainer>
  );
};

// Compliance Overview Tab
const ComplianceOverviewTab = ({ data }) => {
  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <ReportCard>
          <CardHeader title="Overall Compliance Score" />
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
              <Typography variant="h2" color={data.complianceScore >= 90 ? 'success.main' : data.complianceScore >= 70 ? 'warning.main' : 'error.main'}>
                {data.complianceScore}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Based on all compliance metrics
              </Typography>
            </Box>
          </CardContent>
        </ReportCard>
      </Grid>
      
      <Grid item xs={12} sm={6} md={3}>
        <ReportCard>
          <CardHeader title="Training Completion" />
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
              <Typography variant="h4" color={data.trainingCompletion >= 90 ? 'success.main' : data.trainingCompletion >= 70 ? 'warning.main' : 'error.main'}>
                {data.trainingCompletion}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {data.trainingStats.completedAssignments} of {data.trainingStats.totalAssignments} assignments
              </Typography>
            </Box>
          </CardContent>
        </ReportCard>
      </Grid>
      
      <Grid item xs={12} sm={6} md={3}>
        <ReportCard>
          <CardHeader title="Document Compliance" />
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
              <Typography variant="h4" color={data.documentCompliance >= 90 ? 'success.main' : data.documentCompliance >= 70 ? 'warning.main' : 'error.main'}>
                {data.documentCompliance}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {data.documentStats.totalDocuments - data.documentStats.pendingReview - data.documentStats.pendingApproval} of {data.documentStats.totalDocuments} documents
              </Typography>
            </Box>
          </CardContent>
        </ReportCard>
      </Grid>
      
      <Grid item xs={12} sm={6} md={4}>
        <ReportCard>
          <CardHeader title="Risk Assessment Status" />
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
              <Typography variant="h4" color={data.riskAssessments >= 90 ? 'success.main' : data.riskAssessments >= 70 ? 'warning.main' : 'error.main'}>
                {data.riskAssessments}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {data.riskStats.byStatus.mitigated + data.riskStats.byStatus.accepted} of {data.riskStats.totalRisks} risks addressed
              </Typography>
            </Box>
          </CardContent>
        </ReportCard>
      </Grid>
      
      <Grid item xs={12} sm={6} md={4}>
        <ReportCard>
          <CardHeader title="Open Incidents" />
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
              <Typography variant="h4" color={data.openIncidents <= 2 ? 'success.main' : data.openIncidents <= 5 ? 'warning.main' : 'error.main'}>
                {data.openIncidents}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {data.incidentStats.byStatus.open + data.incidentStats.byStatus.investigating} of {data.incidentStats.totalIncidents} incidents
              </Typography>
            </Box>
          </CardContent>
        </ReportCard>
      </Grid>
      
      <Grid item xs={12} sm={6} md={4}>
        <ReportCard>
          <CardHeader title="Overdue Training" />
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
              <Typography variant="h4" color={data.trainingStats.overdueAssignments <= 2 ? 'success.main' : data.trainingStats.overdueAssignments <= 10 ? 'warning.main' : 'error.main'}>
                {data.trainingStats.overdueAssignments}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Overdue training assignments
              </Typography>
            </Box>
          </CardContent>
        </ReportCard>
      </Grid>
      
      <Grid item xs={12}>
        <ReportCard>
          <CardHeader title="Compliance Actions Needed" />
          <CardContent>
            <List>
              {data.trainingStats.overdueAssignments > 0 && (
                <ListItem>
                  <ListItemIcon>
                    <SchoolIcon color="warning" />
                  </ListItemIcon>
                  <ListItemText 
                    primary={`Complete ${data.trainingStats.overdueAssignments} overdue training assignments`}
                    secondary="Required for HIPAA compliance"
                  />
                </ListItem>
              )}
              {data.riskStats.byStatus.open > 0 && (
                <ListItem>
                  <ListItemIcon>
                    <SecurityIcon color="warning" />
                  </ListItemIcon>
                  <ListItemText 
                    primary={`Address ${data.riskStats.byStatus.open} open risk items`}
                    secondary="Required for HIPAA Security Rule compliance"
                  />
                </ListItem>
              )}
              {data.incidentStats.byStatus.open > 0 && (
                <ListItem>
                  <ListItemIcon>
                    <WarningIcon color="error" />
                  </ListItemIcon>
                  <ListItemText 
                    primary={`Investigate ${data.incidentStats.byStatus.open} open security incidents`}
                    secondary="Required for HIPAA Breach Notification Rule"
                  />
                </ListItem>
              )}
              {data.documentStats.pendingReview > 0 && (
                <ListItem>
                  <ListItemIcon>
                    <DescriptionIcon color="info" />
                  </ListItemIcon>
                  <ListItemText 
                    primary={`Review ${data.documentStats.pendingReview} pending documents`}
                    secondary="Required for HIPAA documentation requirements"
                  />
                </ListItem>
              )}
              {data.documentStats.pendingApproval > 0 && (
                <ListItem>
                  <ListItemIcon>
                    <DescriptionIcon color="info" />
                  </ListItemIcon>
                  <ListItemText 
                    primary={`Approve ${data.documentStats.pendingApproval} documents awaiting approval`}
                    secondary="Required for HIPAA documentation requirements"
                  />
                </ListItem>
              )}
              {data.trainingStats.overdueAssignments === 0 && 
               data.riskStats.byStatus.open === 0 && 
               data.incidentStats.byStatus.open === 0 && 
               data.documentStats.pendingReview === 0 && 
               data.documentStats.pendingApproval === 0 && (
                <ListItem>
                  <ListItemIcon>
                    <CheckCircleIcon color="success" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="No immediate compliance actions needed"
                    secondary="All critical compliance requirements are currently met"
                  />
                </ListItem>
              )}
            </List>
          </CardContent>
        </ReportCard>
      </Grid>
    </Grid>
  );
};

// User & Training Tab
const UserTrainingTab = ({ data }) => {
  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <ReportCard>
          <CardHeader title="User Statistics" />
          <CardContent>
            <Grid container spacing={2}>
              <Grid item xs={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4">{data.userStats.total}</Typography>
                  <Typography variant="body2" color="text.secondary">Total Users</Typography>
                </Box>
              </Grid>
              <Grid item xs={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4">{data.userStats.active}</Typography>
                  <Typography variant="body2" color="text.secondary">Active</Typography>
                </Box>
              </Grid>
              <Grid item xs={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4">{data.userStats.inactive}</Typography>
                  <Typography variant="body2" color="text.secondary">Inactive</Typography>
                </Box>
              </Grid>
            </Grid>
            
            <Divider sx={{ my: 2 }} />
            
            <Typography variant="subtitle1" gutterBottom>Users by Department</Typography>
            <List dense>
              {data.userStats.byDepartment.map((dept, index) => (
                <ListItem key={index}>
                  <ListItemIcon>
                    <PeopleIcon />
                  </ListItemIcon>
                  <ListItemText 
                    primary={dept.name}
                    secondary={`${dept.count} users`}
                  />
                </ListItem>
              ))}
            </List>
          </CardContent>
        </ReportCard>
      </Grid>
      
      <Grid item xs={12} md={6}>
        <ReportCard>
          <CardHeader title="Training Statistics" />
          <CardContent>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4">{data.trainingStats.totalCourses}</Typography>
                  <Typography variant="body2" color="text.secondary">Total Courses</Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4">{data.trainingStats.totalAssignments}</Typography>
                  <Typography variant="body2" color="text.secondary">Total Assignments</Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="success.main">{data.trainingStats.completedAssignments}</Typography>
                  <Typography variant="body2" color="text.secondary">Completed</Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="error.main">{data.trainingStats.overdueAssignments}</Typography>
                  <Typography variant="body2" color="text.secondary">Overdue</Typography>
                </Box>
              </Grid>
            </Grid>
            
            <Divider sx={{ my: 2 }} />
            
            <Typography variant="subtitle1" gutterBottom>Training Completion by Department</Typography>
            <List dense>
              {data.trainingStats.byDepartment.map((dept, index) => (
                <ListItem key={index}>
                  <ListItemIcon>
                    <SchoolIcon />
                  </ListItemIcon>
                  <ListItemText 
                    primary={dept.name}
                    secondary={`${dept.completion}% completion rate`}
                  />
                </ListItem>
              ))}
            </List>
          </CardContent>
        </ReportCard>
      </Grid>
      
      <Grid item xs={12}>
        <ReportCard>
          <CardHeader title="Training Compliance Actions" />
          <CardContent>
            <List>
              {data.trainingStats.overdueAssignments > 0 && (
                <ListItem>
                  <ListItemIcon>
                    <WarningIcon color="warning" />
                  </ListItemIcon>
                  <ListItemText 
                    primary={`${data.trainingStats.overdueAssignments} overdue training assignments need attention`}
                    secondary="Send reminders to employees with overdue training"
                  />
                  <Button variant="outlined" startIcon={<EmailIcon />}>
                    Send Reminders
                  </Button>
                </ListItem>
              )}
              
              {data.trainingStats.byDepartment.some(dept => dept.completion < 90) && (
                <ListItem>
                  <ListItemIcon>
                    <InfoIcon color="info" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Some departments have training completion rates below 90%"
                    secondary="Consider targeted training initiatives for these departments"
                  />
                </ListItem>
              )}
              
              <ListItem>
                <ListItemIcon>
                  <CalendarTodayIcon />
                </ListItemIcon>
                <ListItemText 
                  primary="Schedule next quarterly training review"
                  secondary="Ensure all employees are on track with required training"
                />
                <Button variant="outlined">
                  Schedule
                </Button>
              </ListItem>
            </List>
          </CardContent>
        </ReportCard>
      </Grid>
    </Grid>
  );
};

// Risk & Incident Tab
const RiskIncidentTab = ({ data }) => {
  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <ReportCard>
          <CardHeader title="Risk Assessment Overview" />
          <CardContent>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Box sx={{ textAlign: 'center', mb: 2 }}>
                  <Typography variant="h4">{data.riskStats.totalRisks}</Typography>
                  <Typography variant="body2" color="text.secondary">Total Risk Items</Typography>
                </Box>
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom>Risks by Level</Typography>
                <Grid container spacing={1}>
                  <Grid item xs={4}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h5" color="error.main">{data.riskStats.byLevel.high}</Typography>
                      <Typography variant="body2" color="text.secondary">High</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={4}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h5" color="warning.main">{data.riskStats.byLevel.medium}</Typography>
                      <Typography variant="body2" color="text.secondary">Medium</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={4}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h5" color="success.main">{data.riskStats.byLevel.low}</Typography>
                      <Typography variant="body2" color="text.secondary">Low</Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom>Risks by Status</Typography>
                <Grid container spacing={1}>
                  <Grid item xs={4}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h5" color="error.main">{data.riskStats.byStatus.open}</Typography>
                      <Typography variant="body2" color="text.secondary">Open</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={4}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h5" color="success.main">{data.riskStats.byStatus.mitigated}</Typography>
                      <Typography variant="body2" color="text.secondary">Mitigated</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={4}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h5" color="info.main">{data.riskStats.byStatus.accepted}</Typography>
                      <Typography variant="body2" color="text.secondary">Accepted</Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </CardContent>
        </ReportCard>
      </Grid>
      
      <Grid item xs={12} md={6}>
        <ReportCard>
          <CardHeader title="Incident Management Overview" />
          <CardContent>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Box sx={{ textAlign: 'center', mb: 2 }}>
                  <Typography variant="h4">{data.incidentStats.totalIncidents}</Typography>
                  <Typography variant="body2" color="text.secondary">Total Incidents</Typography>
                </Box>
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom>Incidents by Severity</Typography>
                <Grid container spacing={1}>
                  <Grid item xs={3}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h5" color="error.main">{data.incidentStats.bySeverity.critical}</Typography>
                      <Typography variant="body2" color="text.secondary">Critical</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={3}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h5" color="error.light">{data.incidentStats.bySeverity.high}</Typography>
                      <Typography variant="body2" color="text.secondary">High</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={3}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h5" color="warning.main">{data.incidentStats.bySeverity.medium}</Typography>
                      <Typography variant="body2" color="text.secondary">Medium</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={3}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h5" color="success.main">{data.incidentStats.bySeverity.low}</Typography>
                      <Typography variant="body2" color="text.secondary">Low</Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom>Incidents by Status</Typography>
                <Grid container spacing={1}>
                  <Grid item xs={3}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h5" color="error.main">{data.incidentStats.byStatus.open}</Typography>
                      <Typography variant="body2" color="text.secondary">Open</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={3}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h5" color="warning.main">{data.incidentStats.byStatus.investigating}</Typography>
                      <Typography variant="body2" color="text.secondary">Investigating</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={3}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h5" color="info.main">{data.incidentStats.byStatus.resolved}</Typography>
                      <Typography variant="body2" color="text.secondary">Resolved</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={3}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h5" color="success.main">{data.incidentStats.byStatus.closed}</Typography>
                      <Typography variant="body2" color="text.secondary">Closed</Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </CardContent>
        </ReportCard>
      </Grid>
      
      <Grid item xs={12}>
        <ReportCard>
          <CardHeader title="Risk & Incident Actions" />
          <CardContent>
            <List>
              {data.riskStats.byLevel.high > 0 && data.riskStats.byStatus.open > 0 && (
                <ListItem>
                  <ListItemIcon>
                    <WarningIcon color="error" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="High-level risks require immediate attention"
                    secondary="Review and address high-priority open risks"
                  />
                  <Button variant="contained" color="error">
                    Review High Risks
                  </Button>
                </ListItem>
              )}
              
              {data.incidentStats.bySeverity.critical > 0 && data.incidentStats.byStatus.open > 0 && (
                <ListItem>
                  <ListItemIcon>
                    <WarningIcon color="error" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Critical incidents require immediate response"
                    secondary="Investigate and address critical open incidents"
                  />
                  <Button variant="contained" color="error">
                    Review Critical Incidents
                  </Button>
                </ListItem>
              )}
              
              {(data.incidentStats.byStatus.resolved > 0 || data.incidentStats.byStatus.closed > 0) && (
                <ListItem>
                  <ListItemIcon>
                    <AssessmentIcon color="info" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Conduct post-incident analysis"
                    secondary="Review resolved incidents for lessons learned"
                  />
                  <Button variant="outlined" color="info">
                    Generate Analysis
                  </Button>
                </ListItem>
              )}
              
              <ListItem>
                <ListItemIcon>
                  <CalendarTodayIcon />
                </ListItemIcon>
                <ListItemText 
                  primary="Schedule next risk assessment"
                  secondary="Regular risk assessments are required for HIPAA compliance"
                />
                <Button variant="outlined">
                  Schedule
                </Button>
              </ListItem>
            </List>
          </CardContent>
        </ReportCard>
      </Grid>
    </Grid>
  );
};

// Document Compliance Tab
const DocumentComplianceTab = ({ data }) => {
  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <ReportCard>
          <CardHeader title="Document Overview" />
          <CardContent>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Box sx={{ textAlign: 'center', mb: 2 }}>
                  <Typography variant="h4">{data.documentStats.totalDocuments}</Typography>
                  <Typography variant="body2" color="text.secondary">Total Documents</Typography>
                </Box>
              </Grid>
              
              <Grid item xs={6}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h5" color="warning.main">{data.documentStats.pendingReview}</Typography>
                  <Typography variant="body2" color="text.secondary">Pending Review</Typography>
                </Box>
              </Grid>
              
              <Grid item xs={6}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h5" color="info.main">{data.documentStats.pendingApproval}</Typography>
                  <Typography variant="body2" color="text.secondary">Pending Approval</Typography>
                </Box>
              </Grid>
            </Grid>
            
            <Divider sx={{ my: 2 }} />
            
            <Typography variant="subtitle1" gutterBottom>Documents by Category</Typography>
            <List dense>
              {data.documentStats.byCategory.map((category, index) => (
                <ListItem key={index}>
                  <ListItemIcon>
                    <DescriptionIcon />
                  </ListItemIcon>
                  <ListItemText 
                    primary={category.name}
                    secondary={`${category.count} documents`}
                  />
                </ListItem>
              ))}
            </List>
          </CardContent>
        </ReportCard>
      </Grid>
      
      <Grid item xs={12} md={6}>
        <ReportCard>
          <CardHeader title="Document Compliance Status" />
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', mb: 3 }}>
              <Typography variant="h2" color={data.documentCompliance >= 90 ? 'success.main' : data.documentCompliance >= 70 ? 'warning.main' : 'error.main'}>
                {data.documentCompliance}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Overall document compliance score
              </Typography>
            </Box>
            
            <Divider sx={{ my: 2 }} />
            
            <Typography variant="subtitle1" gutterBottom>Document Compliance Breakdown</Typography>
            <List dense>
              <ListItem>
                <ListItemIcon>
                  <CheckCircleIcon color="success" />
                </ListItemIcon>
                <ListItemText 
                  primary="Up-to-date documents"
                  secondary={`${data.documentStats.totalDocuments - data.documentStats.pendingReview - data.documentStats.pendingApproval} documents`}
                />
              </ListItem>
              
              <ListItem>
                <ListItemIcon>
                  <WarningIcon color="warning" />
                </ListItemIcon>
                <ListItemText 
                  primary="Documents needing review"
                  secondary={`${data.documentStats.pendingReview} documents`}
                />
              </ListItem>
              
              <ListItem>
                <ListItemIcon>
                  <InfoIcon color="info" />
                </ListItemIcon>
                <ListItemText 
                  primary="Documents awaiting approval"
                  secondary={`${data.documentStats.pendingApproval} documents`}
                />
              </ListItem>
            </List>
          </CardContent>
        </ReportCard>
      </Grid>
      
      <Grid item xs={12}>
        <ReportCard>
          <CardHeader title="Document Actions" />
          <CardContent>
            <List>
              {data.documentStats.pendingReview > 0 && (
                <ListItem>
                  <ListItemIcon>
                    <WarningIcon color="warning" />
                  </ListItemIcon>
                  <ListItemText 
                    primary={`${data.documentStats.pendingReview} documents need review`}
                    secondary="Documents must be reviewed annually for HIPAA compliance"
                  />
                  <Button variant="outlined" color="warning">
                    Review Documents
                  </Button>
                </ListItem>
              )}
              
              {data.documentStats.pendingApproval > 0 && (
                <ListItem>
                  <ListItemIcon>
                    <InfoIcon color="info" />
                  </ListItemIcon>
                  <ListItemText 
                    primary={`${data.documentStats.pendingApproval} documents need approval`}
                    secondary="Reviewed documents require approval to be compliant"
                  />
                  <Button variant="outlined" color="info">
                    Approve Documents
                  </Button>
                </ListItem>
              )}
              
              <ListItem>
                <ListItemIcon>
                  <PrintIcon />
                </ListItemIcon>
                <ListItemText 
                  primary="Generate document inventory report"
                  secondary="Complete list of all compliance documents with status"
                />
                <Button variant="outlined" startIcon={<DownloadIcon />}>
                  Generate Report
                </Button>
              </ListItem>
              
              <ListItem>
                <ListItemIcon>
                  <CalendarTodayIcon />
                </ListItemIcon>
                <ListItemText 
                  primary="Schedule next document review cycle"
                  secondary="Regular document reviews are required for HIPAA compliance"
                />
                <Button variant="outlined">
                  Schedule
                </Button>
              </ListItem>
            </List>
          </CardContent>
        </ReportCard>
      </Grid>
    </Grid>
  );
};

export default AdvancedReports;
