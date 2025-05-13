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
  Card,
  CardContent,
  CardActions,
  Grid,
  CircularProgress,
  Snackbar,
  Alert,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle
} from '@mui/material';
import { styled } from '@mui/material/styles';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';

// Icons
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingIcon from '@mui/icons-material/Pending';
import WarningIcon from '@mui/icons-material/Warning';
import AssignmentIcon from '@mui/icons-material/Assignment';
import DownloadIcon from '@mui/icons-material/Download';

// API URL
const API_URL = 'http://localhost:8080/api';

// Styled components
const TrainingContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
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

const TrainingCard = styled(Card)(({ theme, status }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  borderLeft: `4px solid ${
    status === 'completed' ? theme.palette.success.main :
    status === 'in_progress' ? theme.palette.warning.main :
    status === 'overdue' ? theme.palette.error.main :
    status === 'pending' ? theme.palette.info.main :
    theme.palette.grey[500]
  }`,
}));

const TrainingAssignments = () => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [viewMode, setViewMode] = useState('cards'); // 'cards' or 'table'
  const [openCourseDialog, setOpenCourseDialog] = useState(false);
  const [currentCourse, setCurrentCourse] = useState(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  // Fetch assignments
  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        setLoading(true);
        
        // In a real app, we would filter by the current user
        // const response = await axios.get(`${API_URL}/training/assignments/user/${user.id}`);
        const response = await axios.get(`${API_URL}/training/assignments`);
        
        // Filter assignments for the current user (for development)
        // In production, this filtering would happen on the server
        const userAssignments = response.data.filter(assignment => assignment.userId === user?.id);
        setAssignments(userAssignments);
      } catch (error) {
        console.error('Error fetching assignments:', error);
        showSnackbar('Error loading training assignments', 'error');
        
        // Mock data for development
        setAssignments([
          {
            id: 1,
            courseId: 1,
            userId: user?.id || 1,
            status: 'completed',
            score: 95,
            assignedDate: '2025-03-01T00:00:00Z',
            dueDate: '2025-03-31T00:00:00Z',
            completedDate: '2025-03-15T10:30:00Z',
            courseName: 'HIPAA Basics',
            courseDescription: 'Introduction to HIPAA regulations and compliance requirements',
            courseDuration: 60
          },
          {
            id: 3,
            courseId: 2,
            userId: user?.id || 1,
            status: 'in_progress',
            score: null,
            assignedDate: '2025-03-15T00:00:00Z',
            dueDate: '2025-04-15T00:00:00Z',
            completedDate: null,
            courseName: 'Security Awareness',
            courseDescription: 'Security best practices for protecting PHI',
            courseDuration: 45
          },
          {
            id: 4,
            courseId: 3,
            userId: user?.id || 1,
            status: 'pending',
            score: null,
            assignedDate: '2025-04-01T00:00:00Z',
            dueDate: '2025-04-30T00:00:00Z',
            completedDate: null,
            courseName: 'Privacy Rule Overview',
            courseDescription: 'Detailed overview of the HIPAA Privacy Rule',
            courseDuration: 90
          },
          {
            id: 5,
            courseId: 4,
            userId: user?.id || 1,
            status: 'overdue',
            score: null,
            assignedDate: '2025-02-01T00:00:00Z',
            dueDate: '2025-03-01T00:00:00Z',
            completedDate: null,
            courseName: 'Security Rule Compliance',
            courseDescription: 'Understanding and implementing the HIPAA Security Rule',
            courseDuration: 75
          }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchAssignments();
  }, [user]);

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

  // Open course dialog
  const handleOpenCourse = (course) => {
    setCurrentCourse(course);
    setOpenCourseDialog(true);
  };

  // Close course dialog
  const handleCloseCourseDialog = () => {
    setOpenCourseDialog(false);
  };

  // Start or continue a course
  const handleStartCourse = async (assignmentId) => {
    try {
      // In a real app, we would update the assignment status
      // await axios.put(`${API_URL}/training/assignments/${assignmentId}/start`);
      
      // Update local state
      const updatedAssignments = assignments.map(assignment => 
        assignment.id === assignmentId 
          ? { ...assignment, status: 'in_progress' } 
          : assignment
      );
      
      setAssignments(updatedAssignments);
      showSnackbar('Course started successfully', 'success');
    } catch (error) {
      console.error('Error starting course:', error);
      showSnackbar('Error starting course', 'error');
    }
  };

  // Complete a course
  const handleCompleteCourse = async (assignmentId) => {
    try {
      // In a real app, we would update the assignment status
      // await axios.put(`${API_URL}/training/assignments/${assignmentId}/complete`);
      
      // Update local state
      const updatedAssignments = assignments.map(assignment => 
        assignment.id === assignmentId 
          ? { 
              ...assignment, 
              status: 'completed', 
              completedDate: new Date().toISOString(),
              score: Math.floor(Math.random() * 21) + 80 // Random score between 80-100
            } 
          : assignment
      );
      
      setAssignments(updatedAssignments);
      showSnackbar('Course completed successfully', 'success');
    } catch (error) {
      console.error('Error completing course:', error);
      showSnackbar('Error completing course', 'error');
    }
  };

  // Download certificate
  const handleDownloadCertificate = async (assignmentId) => {
    try {
      // In a real app, we would generate and download a certificate
      // const response = await axios.get(`${API_URL}/training/assignments/${assignmentId}/certificate`, { responseType: 'blob' });
      // const url = window.URL.createObjectURL(new Blob([response.data]));
      // const link = document.createElement('a');
      // link.href = url;
      // link.setAttribute('download', 'certificate.pdf');
      // document.body.appendChild(link);
      // link.click();
      
      showSnackbar('Certificate downloaded successfully', 'success');
    } catch (error) {
      console.error('Error downloading certificate:', error);
      showSnackbar('Error downloading certificate', 'error');
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

  // Get status text
  const getStatusText = (status) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'in_progress':
        return 'In Progress';
      case 'overdue':
        return 'Overdue';
      case 'pending':
        return 'Pending';
      default:
        return status;
    }
  };

  // Get action button based on status
  const getActionButton = (assignment) => {
    switch (assignment.status) {
      case 'completed':
        return (
          <Button
            variant="outlined"
            color="primary"
            size="small"
            startIcon={<DownloadIcon />}
            onClick={() => handleDownloadCertificate(assignment.id)}
          >
            Certificate
          </Button>
        );
      case 'in_progress':
        return (
          <Button
            variant="contained"
            color="primary"
            size="small"
            onClick={() => handleCompleteCourse(assignment.id)}
          >
            Complete
          </Button>
        );
      case 'overdue':
      case 'pending':
        return (
          <Button
            variant="contained"
            color="primary"
            size="small"
            onClick={() => handleStartCourse(assignment.id)}
          >
            Start
          </Button>
        );
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">My Training Assignments</Typography>
        <Button
          variant="outlined"
          onClick={handleToggleViewMode}
        >
          {viewMode === 'cards' ? 'Table View' : 'Card View'}
        </Button>
      </Box>
      
      {viewMode === 'cards' ? (
        // Card view
        <Grid container spacing={3}>
          {assignments.map((assignment) => (
            <Grid item xs={12} sm={6} md={4} key={assignment.id}>
              <TrainingCard status={assignment.status} elevation={3}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Typography variant="h6" component="div">
                      {assignment.courseName}
                    </Typography>
                    <StatusChip
                      size="small"
                      label={getStatusText(assignment.status)}
                      status={assignment.status}
                      icon={getStatusIcon(assignment.status)}
                    />
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {assignment.courseDescription}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Duration: {assignment.courseDuration} minutes
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Due: {new Date(assignment.dueDate).toLocaleDateString()}
                  </Typography>
                  {assignment.completedDate && (
                    <Typography variant="body2" color="text.secondary">
                      Completed: {new Date(assignment.completedDate).toLocaleDateString()}
                    </Typography>
                  )}
                  {assignment.score && (
                    <Typography variant="body2" color="text.secondary">
                      Score: {assignment.score}%
                    </Typography>
                  )}
                </CardContent>
                <CardActions sx={{ justifyContent: 'space-between', p: 2 }}>
                  <Button
                    size="small"
                    onClick={() => handleOpenCourse(assignment)}
                  >
                    View Details
                  </Button>
                  {getActionButton(assignment)}
                </CardActions>
              </TrainingCard>
            </Grid>
          ))}
        </Grid>
      ) : (
        // Table view
        <Paper elevation={3}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Course</TableCell>
                  <TableCell>Due Date</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Completed Date</TableCell>
                  <TableCell>Score</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {assignments
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((assignment) => (
                    <TableRow key={assignment.id}>
                      <TableCell>{assignment.courseName}</TableCell>
                      <TableCell>{new Date(assignment.dueDate).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <StatusChip
                          size="small"
                          label={getStatusText(assignment.status)}
                          status={assignment.status}
                          icon={getStatusIcon(assignment.status)}
                        />
                      </TableCell>
                      <TableCell>
                        {assignment.completedDate ? new Date(assignment.completedDate).toLocaleDateString() : '-'}
                      </TableCell>
                      <TableCell>{assignment.score !== null ? `${assignment.score}%` : '-'}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button
                            size="small"
                            onClick={() => handleOpenCourse(assignment)}
                          >
                            View
                          </Button>
                          {getActionButton(assignment)}
                        </Box>
                      </TableCell>
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
        </Paper>
      )}
      
      {/* Course Details Dialog */}
      <Dialog open={openCourseDialog} onClose={handleCloseCourseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          Course Details
        </DialogTitle>
        <DialogContent>
          {currentCourse && (
            <Box>
              <Typography variant="h5" gutterBottom>
                {currentCourse.courseName}
              </Typography>
              <Typography variant="body1" paragraph>
                {currentCourse.courseDescription}
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2">Duration:</Typography>
                  <Typography variant="body2">{currentCourse.courseDuration} minutes</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2">Status:</Typography>
                  <StatusChip
                    size="small"
                    label={getStatusText(currentCourse.status)}
                    status={currentCourse.status}
                    icon={getStatusIcon(currentCourse.status)}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2">Assigned Date:</Typography>
                  <Typography variant="body2">{new Date(currentCourse.assignedDate).toLocaleDateString()}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2">Due Date:</Typography>
                  <Typography variant="body2">{new Date(currentCourse.dueDate).toLocaleDateString()}</Typography>
                </Grid>
                {currentCourse.completedDate && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2">Completed Date:</Typography>
                    <Typography variant="body2">{new Date(currentCourse.completedDate).toLocaleDateString()}</Typography>
                  </Grid>
                )}
                {currentCourse.score && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2">Score:</Typography>
                    <Typography variant="body2">{currentCourse.score}%</Typography>
                  </Grid>
                )}
              </Grid>
              
              {/* In a real app, we would display the course content here */}
              <Box sx={{ mt: 4 }}>
                <Typography variant="h6" gutterBottom>
                  Course Content
                </Typography>
                <Typography variant="body1">
                  This is a placeholder for the actual course content. In a real application, this would contain the training materials, videos, quizzes, etc.
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCourseDialog}>Close</Button>
          {currentCourse && getActionButton(currentCourse)}
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

export default TrainingAssignments;
