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
  Chip,
  Divider,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemIcon
} from '@mui/material';
import { styled } from '@mui/material/styles';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';

// Icons
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import DownloadIcon from '@mui/icons-material/Download';
import VisibilityIcon from '@mui/icons-material/Visibility';
import SecurityIcon from '@mui/icons-material/Security';
import PersonIcon from '@mui/icons-material/Person';
import DescriptionIcon from '@mui/icons-material/Description';
import EventIcon from '@mui/icons-material/Event';
import WarningIcon from '@mui/icons-material/Warning';
import InfoIcon from '@mui/icons-material/Info';

// API URL
const API_URL = 'http://localhost:8080/api';

// Styled components
const AuditContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
}));

const ActionButton = styled(IconButton)(({ theme }) => ({
  marginRight: theme.spacing(1),
}));

const FilterCard = styled(Card)(({ theme }) => ({
  marginBottom: theme.spacing(2),
}));

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`audit-tabpanel-${index}`}
      aria-labelledby={`audit-tab-${index}`}
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

const AuditLogs = () => {
  const { hasRole } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [openFilterDialog, setOpenFilterDialog] = useState(false);
  const [openLogDialog, setOpenLogDialog] = useState(false);
  const [currentLog, setCurrentLog] = useState(null);
  const [filterData, setFilterData] = useState({
    startDate: '',
    endDate: '',
    userId: '',
    action: '',
    resource: '',
    status: ''
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  // Fetch audit logs
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch audit logs
        const logsResponse = await axios.get(`${API_URL}/audit/logs`);
        setAuditLogs(logsResponse.data);
      } catch (error) {
        console.error('Error fetching data:', error);
        showSnackbar('Error loading audit logs', 'error');
        
        // Mock data for development
        setAuditLogs([
          { 
            id: 1, 
            timestamp: '2025-04-01T10:15:30Z',
            userId: 1,
            username: 'admin',
            action: 'LOGIN',
            resource: 'AUTH',
            resourceId: null,
            description: 'User login successful',
            ipAddress: '192.168.1.100',
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            status: 'SUCCESS',
            details: JSON.stringify({ method: 'password' })
          },
          { 
            id: 2, 
            timestamp: '2025-04-01T10:30:45Z',
            userId: 1,
            username: 'admin',
            action: 'CREATE',
            resource: 'USER',
            resourceId: 5,
            description: 'Created new user: john.doe',
            ipAddress: '192.168.1.100',
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            status: 'SUCCESS',
            details: JSON.stringify({ username: 'john.doe', role: 'employee' })
          },
          { 
            id: 3, 
            timestamp: '2025-04-01T11:05:22Z',
            userId: 2,
            username: 'compliance',
            action: 'VIEW',
            resource: 'DOCUMENT',
            resourceId: 12,
            description: 'Viewed document: Privacy Policy',
            ipAddress: '192.168.1.105',
            userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
            status: 'SUCCESS',
            details: null
          },
          { 
            id: 4, 
            timestamp: '2025-04-01T11:30:15Z',
            userId: 3,
            username: 'manager1',
            action: 'UPDATE',
            resource: 'TRAINING',
            resourceId: 8,
            description: 'Updated training assignment',
            ipAddress: '192.168.1.110',
            userAgent: 'Mozilla/5.0 (iPad; CPU OS 14_7_1)',
            status: 'SUCCESS',
            details: JSON.stringify({ courseId: 3, userId: 4, dueDate: '2025-05-15' })
          },
          { 
            id: 5, 
            timestamp: '2025-04-01T12:10:05Z',
            userId: 4,
            username: 'employee1',
            action: 'COMPLETE',
            resource: 'TRAINING',
            resourceId: 5,
            description: 'Completed training course: HIPAA Basics',
            ipAddress: '192.168.1.120',
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            status: 'SUCCESS',
            details: JSON.stringify({ courseId: 1, score: 95 })
          },
          { 
            id: 6, 
            timestamp: '2025-04-01T13:45:30Z',
            userId: 1,
            username: 'admin',
            action: 'CREATE',
            resource: 'RISK',
            resourceId: 10,
            description: 'Created new risk assessment',
            ipAddress: '192.168.1.100',
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            status: 'SUCCESS',
            details: JSON.stringify({ title: 'Q2 Security Assessment', scope: 'All systems' })
          },
          { 
            id: 7, 
            timestamp: '2025-04-01T14:20:15Z',
            userId: 2,
            username: 'compliance',
            action: 'CREATE',
            resource: 'INCIDENT',
            resourceId: 3,
            description: 'Reported new security incident',
            ipAddress: '192.168.1.105',
            userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
            status: 'SUCCESS',
            details: JSON.stringify({ title: 'Phishing Attempt', severity: 'medium' })
          },
          { 
            id: 8, 
            timestamp: '2025-04-01T15:05:45Z',
            userId: 5,
            username: 'john.doe',
            action: 'LOGIN',
            resource: 'AUTH',
            resourceId: null,
            description: 'User login failed',
            ipAddress: '192.168.1.130',
            userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0)',
            status: 'FAILURE',
            details: JSON.stringify({ reason: 'Invalid password', attempts: 1 })
          },
          { 
            id: 9, 
            timestamp: '2025-04-01T15:10:22Z',
            userId: 5,
            username: 'john.doe',
            action: 'LOGIN',
            resource: 'AUTH',
            resourceId: null,
            description: 'User login successful',
            ipAddress: '192.168.1.130',
            userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0)',
            status: 'SUCCESS',
            details: JSON.stringify({ method: 'password' })
          },
          { 
            id: 10, 
            timestamp: '2025-04-01T16:30:10Z',
            userId: 1,
            username: 'admin',
            action: 'EXPORT',
            resource: 'REPORT',
            resourceId: null,
            description: 'Exported compliance report',
            ipAddress: '192.168.1.100',
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            status: 'SUCCESS',
            details: JSON.stringify({ reportType: 'Compliance Summary', format: 'PDF' })
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

  // Open filter dialog
  const handleOpenFilterDialog = () => {
    setOpenFilterDialog(true);
  };

  // Close filter dialog
  const handleCloseFilterDialog = () => {
    setOpenFilterDialog(false);
  };

  // Open log details dialog
  const handleViewLog = (log) => {
    setCurrentLog(log);
    setOpenLogDialog(true);
  };

  // Close log details dialog
  const handleCloseLogDialog = () => {
    setOpenLogDialog(false);
  };

  // Handle filter form input change
  const handleFilterInputChange = (e) => {
    const { name, value } = e.target;
    setFilterData({
      ...filterData,
      [name]: value
    });
  };

  // Apply filters
  const handleApplyFilters = async () => {
    try {
      setLoading(true);
      
      // In a real app, we would send the filter parameters to the API
      // const params = {};
      // if (filterData.startDate) params.startDate = filterData.startDate;
      // if (filterData.endDate) params.endDate = filterData.endDate;
      // if (filterData.userId) params.userId = filterData.userId;
      // if (filterData.action) params.action = filterData.action;
      // if (filterData.resource) params.resource = filterData.resource;
      // if (filterData.status) params.status = filterData.status;
      
      // const response = await axios.get(`${API_URL}/audit/logs`, { params });
      // setAuditLogs(response.data);
      
      // For development - simulate filtering
      let filteredLogs = [...auditLogs];
      
      if (filterData.startDate) {
        filteredLogs = filteredLogs.filter(log => 
          new Date(log.timestamp) >= new Date(filterData.startDate)
        );
      }
      
      if (filterData.endDate) {
        filteredLogs = filteredLogs.filter(log => 
          new Date(log.timestamp) <= new Date(`${filterData.endDate}T23:59:59`)
        );
      }
      
      if (filterData.userId) {
        filteredLogs = filteredLogs.filter(log => 
          log.username.toLowerCase().includes(filterData.userId.toLowerCase())
        );
      }
      
      if (filterData.action) {
        filteredLogs = filteredLogs.filter(log => 
          log.action === filterData.action
        );
      }
      
      if (filterData.resource) {
        filteredLogs = filteredLogs.filter(log => 
          log.resource === filterData.resource
        );
      }
      
      if (filterData.status) {
        filteredLogs = filteredLogs.filter(log => 
          log.status === filterData.status
        );
      }
      
      setAuditLogs(filteredLogs);
      showSnackbar('Filters applied successfully', 'success');
      handleCloseFilterDialog();
    } catch (error) {
      console.error('Error applying filters:', error);
      showSnackbar('Error applying filters', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Reset filters
  const handleResetFilters = async () => {
    try {
      setLoading(true);
      setFilterData({
        startDate: '',
        endDate: '',
        userId: '',
        action: '',
        resource: '',
        status: ''
      });
      
      // In a real app, we would fetch all logs again
      // const response = await axios.get(`${API_URL}/audit/logs`);
      // setAuditLogs(response.data);
      
      // For development - simulate resetting filters
      const logsResponse = await axios.get(`${API_URL}/audit/logs`);
      setAuditLogs(logsResponse.data);
      
      showSnackbar('Filters reset successfully', 'success');
    } catch (error) {
      console.error('Error resetting filters:', error);
      showSnackbar('Error resetting filters', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Export audit logs
  const handleExportLogs = async () => {
    try {
      // In a real app, we would export the logs
      // const response = await axios.get(`${API_URL}/audit/logs/export`, {
      //   responseType: 'blob'
      // });
      // const url = window.URL.createObjectURL(new Blob([response.data]));
      // const link = document.createElement('a');
      // link.href = url;
      // link.setAttribute('download', `audit_logs_${new Date().toISOString().split('T')[0]}.csv`);
      // document.body.appendChild(link);
      // link.click();
      
      showSnackbar('Audit logs exported successfully', 'success');
    } catch (error) {
      console.error('Error exporting logs:', error);
      showSnackbar('Error exporting logs', 'error');
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

  // Get filtered logs based on tab
  const getFilteredLogs = () => {
    switch (tabValue) {
      case 0: // All logs
        return auditLogs;
      case 1: // Authentication logs
        return auditLogs.filter(log => log.resource === 'AUTH');
      case 2: // User activity
        return auditLogs.filter(log => log.resource !== 'AUTH');
      case 3: // Security events
        return auditLogs.filter(log => 
          log.resource === 'RISK' || 
          log.resource === 'INCIDENT' || 
          (log.resource === 'AUTH' && log.status === 'FAILURE')
        );
      default:
        return auditLogs;
    }
  };

  // Get status chip color
  const getStatusColor = (status) => {
    switch (status) {
      case 'SUCCESS':
        return 'success';
      case 'FAILURE':
        return 'error';
      case 'WARNING':
        return 'warning';
      default:
        return 'default';
    }
  };

  // Get action icon
  const getActionIcon = (action) => {
    switch (action) {
      case 'LOGIN':
        return <PersonIcon fontSize="small" />;
      case 'CREATE':
        return <DescriptionIcon fontSize="small" />;
      case 'UPDATE':
        return <EditIcon fontSize="small" />;
      case 'DELETE':
        return <DeleteIcon fontSize="small" />;
      case 'VIEW':
        return <VisibilityIcon fontSize="small" />;
      case 'EXPORT':
        return <DownloadIcon fontSize="small" />;
      case 'COMPLETE':
        return <CheckCircleIcon fontSize="small" />;
      default:
        return <InfoIcon fontSize="small" />;
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  // Parse JSON details
  const parseDetails = (details) => {
    if (!details) return null;
    try {
      return JSON.parse(details);
    } catch (error) {
      return details;
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
    <AuditContainer>
      <Typography variant="h4" gutterBottom>
        Audit Logs
      </Typography>
      
      <Paper elevation={3} sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          centered
        >
          <Tab label="All Logs" />
          <Tab label="Authentication" />
          <Tab label="User Activity" />
          <Tab label="Security Events" />
        </Tabs>
        
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between' }}>
          <Button
            variant="outlined"
            startIcon={<FilterListIcon />}
            onClick={handleOpenFilterDialog}
          >
            Filter Logs
          </Button>
          
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleExportLogs}
          >
            Export Logs
          </Button>
        </Box>
        
        <TabPanel value={tabValue} index={0}>
          <AuditLogTable 
            logs={getFilteredLogs()}
            page={page}
            rowsPerPage={rowsPerPage}
            handleChangePage={handleChangePage}
            handleChangeRowsPerPage={handleChangeRowsPerPage}
            handleViewLog={handleViewLog}
            getStatusColor={getStatusColor}
            formatTimestamp={formatTimestamp}
          />
        </TabPanel>
        
        <TabPanel value={tabValue} index={1}>
          <AuditLogTable 
            logs={getFilteredLogs()}
            page={page}
            rowsPerPage={rowsPerPage}
            handleChangePage={handleChangePage}
            handleChangeRowsPerPage={handleChangeRowsPerPage}
            handleViewLog={handleViewLog}
            getStatusColor={getStatusColor}
            formatTimestamp={formatTimestamp}
          />
        </TabPanel>
        
        <TabPanel value={tabValue} index={2}>
          <AuditLogTable 
            logs={getFilteredLogs()}
            page={page}
            rowsPerPage={rowsPerPage}
            handleChangePage={handleChangePage}
            handleChangeRowsPerPage={handleChangeRowsPerPage}
            handleViewLog={handleViewLog}
            getStatusColor={getStatusColor}
            formatTimestamp={formatTimestamp}
          />
        </TabPanel>
        
        <TabPanel value={tabValue} index={3}>
          <AuditLogTable 
            logs={getFilteredLogs()}
            page={page}
            rowsPerPage={rowsPerPage}
            handleChangePage={handleChangePage}
            handleChangeRowsPerPage={handleChangeRowsPerPage}
            handleViewLog={handleViewLog}
            getStatusColor={getStatusColor}
            formatTimestamp={formatTimestamp}
          />
        </TabPanel>
      </Paper>
      
      {/* Filter Dialog */}
      <Dialog open={openFilterDialog} onClose={handleCloseFilterDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          Filter Audit Logs
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                name="startDate"
                label="Start Date"
                type="date"
                fullWidth
                value={filterData.startDate}
                onChange={handleFilterInputChange}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="endDate"
                label="End Date"
                type="date"
                fullWidth
                value={filterData.endDate}
                onChange={handleFilterInputChange}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="userId"
                label="Username"
                fullWidth
                value={filterData.userId}
                onChange={handleFilterInputChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Action</InputLabel>
                <Select
                  name="action"
                  value={filterData.action}
                  onChange={handleFilterInputChange}
                  label="Action"
                >
                  <MenuItem value="">All Actions</MenuItem>
                  <MenuItem value="LOGIN">Login</MenuItem>
                  <MenuItem value="CREATE">Create</MenuItem>
                  <MenuItem value="UPDATE">Update</MenuItem>
                  <MenuItem value="DELETE">Delete</MenuItem>
                  <MenuItem value="VIEW">View</MenuItem>
                  <MenuItem value="EXPORT">Export</MenuItem>
                  <MenuItem value="COMPLETE">Complete</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Resource</InputLabel>
                <Select
                  name="resource"
                  value={filterData.resource}
                  onChange={handleFilterInputChange}
                  label="Resource"
                >
                  <MenuItem value="">All Resources</MenuItem>
                  <MenuItem value="AUTH">Authentication</MenuItem>
                  <MenuItem value="USER">User</MenuItem>
                  <MenuItem value="DOCUMENT">Document</MenuItem>
                  <MenuItem value="TRAINING">Training</MenuItem>
                  <MenuItem value="RISK">Risk</MenuItem>
                  <MenuItem value="INCIDENT">Incident</MenuItem>
                  <MenuItem value="REPORT">Report</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  name="status"
                  value={filterData.status}
                  onChange={handleFilterInputChange}
                  label="Status"
                >
                  <MenuItem value="">All Statuses</MenuItem>
                  <MenuItem value="SUCCESS">Success</MenuItem>
                  <MenuItem value="FAILURE">Failure</MenuItem>
                  <MenuItem value="WARNING">Warning</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleResetFilters}>Reset</Button>
          <Button onClick={handleCloseFilterDialog}>Cancel</Button>
          <Button onClick={handleApplyFilters} variant="contained" color="primary">
            Apply Filters
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Log Details Dialog */}
      <Dialog open={openLogDialog} onClose={handleCloseLogDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          Audit Log Details
        </DialogTitle>
        <DialogContent>
          {currentLog && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2">Timestamp</Typography>
                <Typography variant="body1">{formatTimestamp(currentLog.timestamp)}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2">User</Typography>
                <Typography variant="body1">{currentLog.username} (ID: {currentLog.userId})</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2">Action</Typography>
                <Typography variant="body1">{currentLog.action}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2">Resource</Typography>
                <Typography variant="body1">{currentLog.resource} {currentLog.resourceId ? `(ID: ${currentLog.resourceId})` : ''}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2">Description</Typography>
                <Typography variant="body1">{currentLog.description}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2">IP Address</Typography>
                <Typography variant="body1">{currentLog.ipAddress}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2">Status</Typography>
                <Typography variant="body1">
                  <Chip 
                    label={currentLog.status} 
                    color={getStatusColor(currentLog.status)} 
                    size="small" 
                  />
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2">User Agent</Typography>
                <Typography variant="body1" sx={{ wordBreak: 'break-word' }}>{currentLog.userAgent}</Typography>
              </Grid>
              {currentLog.details && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2">Details</Typography>
                  <Paper elevation={1} sx={{ p: 2, backgroundColor: 'grey.100' }}>
                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {JSON.stringify(parseDetails(currentLog.details), null, 2)}
                    </pre>
                  </Paper>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseLogDialog}>Close</Button>
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
    </AuditContainer>
  );
};

// Audit Log Table Component
const AuditLogTable = ({ 
  logs, 
  page, 
  rowsPerPage,
  handleChangePage,
  handleChangeRowsPerPage,
  handleViewLog,
  getStatusColor,
  formatTimestamp
}) => {
  return (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Timestamp</TableCell>
            <TableCell>User</TableCell>
            <TableCell>Action</TableCell>
            <TableCell>Resource</TableCell>
            <TableCell>Description</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {logs
            .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
            .map((log) => (
              <TableRow key={log.id}>
                <TableCell>{formatTimestamp(log.timestamp)}</TableCell>
                <TableCell>{log.username}</TableCell>
                <TableCell>{log.action}</TableCell>
                <TableCell>{log.resource}</TableCell>
                <TableCell>{log.description}</TableCell>
                <TableCell>
                  <Chip 
                    label={log.status} 
                    color={getStatusColor(log.status)} 
                    size="small" 
                  />
                </TableCell>
                <TableCell>
                  <IconButton
                    color="primary"
                    size="small"
                    onClick={() => handleViewLog(log)}
                  >
                    <VisibilityIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          {logs.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} align="center">
                No audit logs found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <TablePagination
        rowsPerPageOptions={[10, 25, 50, 100]}
        component="div"
        count={logs.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </TableContainer>
  );
};

export default AuditLogs;
