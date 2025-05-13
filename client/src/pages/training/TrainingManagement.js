import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Tabs,
  Tab,
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
  Chip
} from '@mui/material';
import { styled } from '@mui/material/styles';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';

// Icons
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AssignmentIcon from '@mui/icons-material/Assignment';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingIcon from '@mui/icons-material/Pending';
import WarningIcon from '@mui/icons-material/Warning';

// API URL
const API_URL = 'http://localhost:8080/api';

// Styled components
const TrainingContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
}));

const ActionButton = styled(IconButton)(({ theme }) => ({
  marginRight: theme.spacing(1),
}));

const StatusChip = styled(Chip)(({ theme, status }) => ({
  backgroundColor: 
    status === 'completed' ? theme.palette.success.light :
    status === 'in_progress' ? theme.palette.warning.light :
    status === 'overdue' ? theme.palette.error.light :
    status === 'pending' ? theme.palette.info.light :
    theme.palette.grey[500],
  color: 
    status === 'completed' ? theme.palette.success.contrastText :
    status === 'in_progress' ? theme.palette.warning.contrastText :
    status === 'overdue' ? theme.palette.error.contrastText :
    status === 'pending' ? theme.palette.info.contrastText :
    theme.palette.grey[500],
}));

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`training-tabpanel-${index}`}
      aria-labelledby={`training-tab-${index}`}
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

const TrainingManagement = () => {
  const { user, hasRole } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [courses, setCourses] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [openDialog, setOpenDialog] = useState(false);
  const [openAssignDialog, setOpenAssignDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState('add'); // 'add' or 'edit'
  const [currentCourse, setCurrentCourse] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    content: '',
    duration: 60,
    passingScore: 80,
    isRequired: true,
    frequency: 'annual',
    status: 'active'
  });
  const [assignmentData, setAssignmentData] = useState({
    courseId: '',
    userIds: [],
    dueDate: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  // Fetch courses, assignments, and users
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch courses
        const coursesResponse = await axios.get(`${API_URL}/training/courses`);
        setCourses(coursesResponse.data);
        
        // Fetch assignments
        const assignmentsResponse = await axios.get(`${API_URL}/training/assignments`);
        setAssignments(assignmentsResponse.data);
        
        // Fetch users (for assignments)
        const usersResponse = await axios.get(`${API_URL}/users`);
        setUsers(usersResponse.data);
      } catch (error) {
        console.error('Error fetching data:', error);
        showSnackbar('Error loading training data', 'error');
        
        // Mock data for development
        setCourses([
          { 
            id: 1, 
            title: 'HIPAA Basics', 
            description: 'Introduction to HIPAA regulations and compliance requirements',
            content: 'This course covers the basic principles of HIPAA compliance.',
            duration: 60,
            passingScore: 80,
            isRequired: true,
            frequency: 'annual',
            status: 'active',
            createdBy: 1,
            createdAt: '2025-01-15T10:00:00Z',
            updatedAt: '2025-01-15T10:00:00Z'
          },
          { 
            id: 2, 
            title: 'Security Awareness', 
            description: 'Security best practices for protecting PHI',
            content: 'This course covers security awareness training for healthcare IT professionals.',
            duration: 45,
            passingScore: 80,
            isRequired: true,
            frequency: 'annual',
            status: 'active',
            createdBy: 1,
            createdAt: '2025-01-20T14:30:00Z',
            updatedAt: '2025-01-20T14:30:00Z'
          },
          { 
            id: 3, 
            title: 'Privacy Rule Overview', 
            description: 'Detailed overview of the HIPAA Privacy Rule',
            content: 'This course provides a comprehensive overview of the HIPAA Privacy Rule.',
            duration: 90,
            passingScore: 85,
            isRequired: true,
            frequency: 'annual',
            status: 'active',
            createdBy: 1,
            createdAt: '2025-02-05T09:15:00Z',
            updatedAt: '2025-02-05T09:15:00Z'
          }
        ]);
        
        setAssignments([
          {
            id: 1,
            courseId: 1,
            userId: 1,
            status: 'completed',
            score: 95,
            assignedDate: '2025-03-01T00:00:00Z',
            dueDate: '2025-03-31T00:00:00Z',
            completedDate: '2025-03-15T10:30:00Z',
            courseName: 'HIPAA Basics',
            userName: 'Admin User'
          },
          {
            id: 2,
            courseId: 1,
            userId: 2,
            status: 'completed',
            score: 90,
            assignedDate: '2025-03-01T00:00:00Z',
            dueDate: '2025-03-31T00:00:00Z',
            completedDate: '2025-03-20T14:45:00Z',
            courseName: 'HIPAA Basics',
            userName: 'Compliance Officer'
          },
          {
            id: 3,
            courseId: 2,
            userId: 3,
            status: 'in_progress',
            score: null,
            assignedDate: '2025-03-15T00:00:00Z',
            dueDate: '2025-04-15T00:00:00Z',
            completedDate: null,
            courseName: 'Security Awareness',
            userName: 'John Manager'
          },
          {
            id: 4,
            courseId: 3,
            userId: 4,
            status: 'pending',
            score: null,
            assignedDate: '2025-04-01T00:00:00Z',
            dueDate: '2025-04-30T00:00:00Z',
            completedDate: null,
            courseName: 'Privacy Rule Overview',
            userName: 'Jane Employee'
          },
          {
            id: 5,
            courseId: 2,
            userId: 4,
            status: 'overdue',
            score: null,
            assignedDate: '2025-02-01T00:00:00Z',
            dueDate: '2025-03-01T00:00:00Z',
            completedDate: null,
            courseName: 'Security Awareness',
            userName: 'Jane Employee'
          }
        ]);
        
        setUsers([
          { id: 1, username: 'admin', firstName: 'Admin', lastName: 'User', email: 'admin@example.com' },
          { id: 2, username: 'compliance', firstName: 'Compliance', lastName: 'Officer', email: 'compliance@example.com' },
          { id: 3, username: 'manager1', firstName: 'John', lastName: 'Manager', email: 'manager1@example.com' },
          { id: 4, username: 'employee1', firstName: 'Jane', lastName: 'Employee', email: 'employee1@example.com' }
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

  // Open dialog for adding a new course
  const handleAddCourse = () => {
    setDialogMode('add');
    setFormData({
      title: '',
      description: '',
      content: '',
      duration: 60,
      passingScore: 80,
      isRequired: true,
      frequency: 'annual',
      status: 'active'
    });
    setFormErrors({});
    setOpenDialog(true);
  };

  // Open dialog for editing a course
  const handleEditCourse = (course) => {
    setDialogMode('edit');
    setCurrentCourse(course);
    setFormData({
      title: course.title,
      description: course.description,
      content: course.content,
      duration: course.duration,
      passingScore: course.passingScore,
      isRequired: course.isRequired,
      frequency: course.frequency,
      status: course.status
    });
    setFormErrors({});
    setOpenDialog(true);
  };

  // Open dialog for assigning a course
  const handleAssignCourse = (courseId) => {
    setAssignmentData({
      courseId: courseId,
      userIds: [],
      dueDate: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0] // 30 days from now
    });
    setOpenAssignDialog(true);
  };

  // Handle dialog close
  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  // Handle assignment dialog close
  const handleCloseAssignDialog = () => {
    setOpenAssignDialog(false);
  };

  // Handle form input change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
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

  // Handle checkbox/boolean input change
  const handleBooleanChange = (e) => {
    const { name, checked } = e.target;
    setFormData({
      ...formData,
      [name]: checked
    });
  };

  // Handle assignment data change
  const handleAssignmentDataChange = (e) => {
    const { name, value } = e.target;
    setAssignmentData({
      ...assignmentData,
      [name]: value
    });
  };

  // Validate form
  const validateForm = () => {
    const errors = {};
    
    if (!formData.title) errors.title = 'Title is required';
    if (!formData.description) errors.description = 'Description is required';
    if (!formData.content) errors.content = 'Content is required';
    if (!formData.duration) errors.duration = 'Duration is required';
    if (!formData.passingScore) errors.passingScore = 'Passing score is required';
    if (!formData.frequency) errors.frequency = 'Frequency is required';
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Validate assignment form
  const validateAssignmentForm = () => {
    const errors = {};
    
    if (!assignmentData.userIds.length) errors.userIds = 'At least one user must be selected';
    if (!assignmentData.dueDate) errors.dueDate = 'Due date is required';
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    try {
      if (dialogMode === 'add') {
        // Add new course
        await axios.post(`${API_URL}/training/courses`, formData);
        showSnackbar('Course added successfully', 'success');
      } else {
        // Update existing course
        await axios.put(`${API_URL}/training/courses/${currentCourse.id}`, formData);
        showSnackbar('Course updated successfully', 'success');
      }
      
      // Refresh course list
      const response = await axios.get(`${API_URL}/training/courses`);
      setCourses(response.data);
      
      // Close dialog
      handleCloseDialog();
    } catch (error) {
      console.error('Error saving course:', error);
      showSnackbar(error.response?.data?.message || 'Error saving course', 'error');
      
      // For development - simulate success
      if (dialogMode === 'add') {
        const newCourse = {
          id: courses.length + 1,
          ...formData,
          createdBy: user.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        setCourses([...courses, newCourse]);
      } else {
        const updatedCourses = courses.map(course => 
          course.id === currentCourse.id ? { ...course, ...formData, updatedAt: new Date().toISOString() } : course
        );
        setCourses(updatedCourses);
      }
      handleCloseDialog();
    }
  };

  // Handle assignment submission
  const handleAssignSubmit = async () => {
    if (!validateAssignmentForm()) return;
    
    try {
      // Create assignments for each selected user
      const assignmentPromises = assignmentData.userIds.map(userId => 
        axios.post(`${API_URL}/training/assignments`, {
          courseId: assignmentData.courseId,
          userId: userId,
          dueDate: assignmentData.dueDate
        })
      );
      
      await Promise.all(assignmentPromises);
      showSnackbar('Course assigned successfully', 'success');
      
      // Refresh assignment list
      const response = await axios.get(`${API_URL}/training/assignments`);
      setAssignments(response.data);
      
      // Close dialog
      handleCloseAssignDialog();
    } catch (error) {
      console.error('Error assigning course:', error);
      showSnackbar(error.response?.data?.message || 'Error assigning course', 'error');
      
      // For development - simulate success
      const course = courses.find(c => c.id === assignmentData.courseId);
      const newAssignments = assignmentData.userIds.map((userId, index) => {
        const user = users.find(u => u.id === userId);
        return {
          id: assignments.length + index + 1,
          courseId: assignmentData.courseId,
          userId: userId,
          status: 'pending',
          score: null,
          assignedDate: new Date().toISOString(),
          dueDate: assignmentData.dueDate + 'T00:00:00Z',
          completedDate: null,
          courseName: course.title,
          userName: `${user.firstName} ${user.lastName}`
        };
      });
      
      setAssignments([...assignments, ...newAssignments]);
      handleCloseAssignDialog();
    }
  };

  // Handle course deletion
  const handleDeleteCourse = async (courseId) => {
    if (!window.confirm('Are you sure you want to delete this course?')) return;
    
    try {
      await axios.delete(`${API_URL}/training/courses/${courseId}`);
      showSnackbar('Course deleted successfully', 'success');
      
      // Update course list
      setCourses(courses.filter(course => course.id !== courseId));
    } catch (error) {
      console.error('Error deleting course:', error);
      showSnackbar('Error deleting course', 'error');
      
      // For development - simulate success
      setCourses(courses.filter(course => course.id !== courseId));
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

  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon fontSize="small" />;
      case 'in_progress':
        return <PendingIcon fontSize="small" />;
      case 'overdue':
        return <WarningIcon fontSize="small" />;
      case 'pending':
        return <AssignmentIcon fontSize="small" />;
      default:
        return null;
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
    <TrainingContainer>
      <Typography variant="h4" gutterBottom>
        Training Management
      </Typography>
      
      <Paper elevation={3} sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          centered
        >
          <Tab label="Courses" />
          <Tab label="Assignments" />
        </Tabs>
        
        {/* Courses Tab */}
        <TabPanel value={tabValue} index={0}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            {hasRole('admin') || hasRole('compliance_officer') ? (
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={handleAddCourse}
              >
                Add Course
              </Button>
            ) : null}
          </Box>
          
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Title</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Duration (min)</TableCell>
                  <TableCell>Passing Score</TableCell>
                  <TableCell>Required</TableCell>
                  <TableCell>Frequency</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {courses
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((course) => (
                    <TableRow key={course.id}>
                      <TableCell>{course.title}</TableCell>
                      <TableCell>{course.description}</TableCell>
                      <TableCell>{course.duration}</TableCell>
                      <TableCell>{course.passingScore}%</TableCell>
                      <TableCell>{course.isRequired ? 'Yes' : 'No'}</TableCell>
                      <TableCell>{course.frequency}</TableCell>
                      <TableCell>{course.status}</TableCell>
                      <TableCell>
                        {(hasRole('admin') || hasRole('compliance_officer')) && (
                          <>
                            <ActionButton
                              color="primary"
                              size="small"
                              onClick={() => handleEditCourse(course)}
                            >
                              <EditIcon fontSize="small" />
                            </ActionButton>
                            <ActionButton
                              color="error"
                              size="small"
                              onClick={() => handleDeleteCourse(course.id)}
                            >
                              <DeleteIcon fontSize="small" />
                            </ActionButton>
                          </>
                        )}
                        {(hasRole('admin') || hasRole('compliance_officer') || hasRole('manager')) && (
                          <ActionButton
                            color="secondary"
                            size="small"
                            onClick={() => handleAssignCourse(course.id)}
                          >
                            <AssignmentIcon fontSize="small" />
                          </ActionButton>
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
            count={courses.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </TabPanel>
        
        {/* Assignments Tab */}
        <TabPanel value={tabValue} index={1}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Course</TableCell>
                  <TableCell>User</TableCell>
                  <TableCell>Assigned Date</TableCell>
                  <TableCell>Due Date</TableCell>
                  <TableCell>Completed Date</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Score</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {assignments
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((assignment) => (
                    <TableRow key={assignment.id}>
                      <TableCell>{assignment.courseName}</TableCell>
                      <TableCell>{assignment.userName}</TableCell>
                      <TableCell>{new Date(assignment.assignedDate).toLocaleDateString()}</TableCell>
                      <TableCell>{new Date(assignment.dueDate).toLocaleDateString()}</TableCell>
                      <TableCell>
                        {assignment.completedDate ? new Date(assignment.completedDate).toLocaleDateString() : '-'}
                      </TableCell>
                      <TableCell>
                        <StatusChip
                          size="small"
                          label={assignment.status}
                          status={assignment.status}
                          icon={getStatusIcon(assignment.status)}
                        />
                      </TableCell>
                      <TableCell>{assignment.score !== null ? `${assignment.score}%` : '-'}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={assignments.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </TabPanel>
      </Paper>
      
      {/* Add/Edit Course Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {dialogMode === 'add' ? 'Add New Course' : 'Edit Course'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                name="title"
                label="Title"
                fullWidth
                value={formData.title}
                onChange={handleInputChange}
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
                value={formData.description}
                onChange={handleInputChange}
                error={!!formErrors.description}
                helperText={formErrors.description}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="content"
                label="Content"
                fullWidth
                multiline
                rows={4}
                value={formData.content}
                onChange={handleInputChange}
                error={!!formErrors.content}
                helperText={formErrors.content}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="duration"
                label="Duration (minutes)"
                type="number"
                fullWidth
                value={formData.duration}
                onChange={handleInputChange}
                error={!!formErrors.duration}
                helperText={formErrors.duration}
                InputProps={{ inputProps: { min: 1 } }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="passingScore"
                label="Passing Score (%)"
                type="number"
                fullWidth
                value={formData.passingScore}
                onChange={handleInputChange}
                error={!!formErrors.passingScore}
                helperText={formErrors.passingScore}
                InputProps={{ inputProps: { min: 1, max: 100 } }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>Required</InputLabel>
                <Select
                  name="isRequired"
                  value={formData.isRequired}
                  onChange={(e) => setFormData({...formData, isRequired: e.target.value})}
                  label="Required"
                >
                  <MenuItem value={true}>Yes</MenuItem>
                  <MenuItem value={false}>No</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth error={!!formErrors.frequency}>
                <InputLabel>Frequency</InputLabel>
                <Select
                  name="frequency"
                  value={formData.frequency}
                  onChange={handleInputChange}
                  label="Frequency"
                >
                  <MenuItem value="once">Once</MenuItem>
                  <MenuItem value="monthly">Monthly</MenuItem>
                  <MenuItem value="quarterly">Quarterly</MenuItem>
                  <MenuItem value="annual">Annual</MenuItem>
                  <MenuItem value="biennial">Biennial</MenuItem>
                </Select>
                {formErrors.frequency && (
                  <Typography variant="caption" color="error">
                    {formErrors.frequency}
                  </Typography>
                )}
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  label="Status"
                >
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                  <MenuItem value="draft">Draft</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">
            {dialogMode === 'add' ? 'Add Course' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Assign Course Dialog */}
      <Dialog open={openAssignDialog} onClose={handleCloseAssignDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          Assign Course
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth error={!!formErrors.userIds}>
                <InputLabel>Users</InputLabel>
                <Select
                  multiple
                  name="userIds"
                  value={assignmentData.userIds}
                  onChange={(e) => setAssignmentData({...assignmentData, userIds: e.target.value})}
                  label="Users"
                >
                  {users.map((user) => (
                    <MenuItem key={user.id} value={user.id}>
                      {`${user.firstName} ${user.lastName} (${user.email})`}
                    </MenuItem>
                  ))}
                </Select>
                {formErrors.userIds && (
                  <Typography variant="caption" color="error">
                    {formErrors.userIds}
                  </Typography>
                )}
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="dueDate"
                label="Due Date"
                type="date"
                fullWidth
                value={assignmentData.dueDate}
                onChange={handleAssignmentDataChange}
                error={!!formErrors.dueDate}
                helperText={formErrors.dueDate}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAssignDialog}>Cancel</Button>
          <Button onClick={handleAssignSubmit} variant="contained" color="primary">
            Assign
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
    </TrainingContainer>
  );
};

export default TrainingManagement;
