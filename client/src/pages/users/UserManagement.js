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
  Alert
} from '@mui/material';
import { styled } from '@mui/material/styles';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';

// Icons
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonAddIcon from '@mui/icons-material/PersonAdd';

// API URL
const API_URL = 'http://localhost:8080/api';

// Styled components
const UserManagementContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
}));

const ActionButton = styled(IconButton)(({ theme }) => ({
  marginRight: theme.spacing(1),
}));

const UserManagement = () => {
  const { hasRole } = useAuth();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState('add'); // 'add' or 'edit'
  const [currentUser, setCurrentUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    departmentId: '',
    roles: []
  });
  const [formErrors, setFormErrors] = useState({});
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  // Fetch users, roles, and departments
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch users
        const usersResponse = await axios.get(`${API_URL}/users`);
        setUsers(usersResponse.data);
        
        // Fetch roles
        const rolesResponse = await axios.get(`${API_URL}/roles`);
        setRoles(rolesResponse.data);
        
        // Fetch departments
        const departmentsResponse = await axios.get(`${API_URL}/departments`);
        setDepartments(departmentsResponse.data);
      } catch (error) {
        console.error('Error fetching data:', error);
        showSnackbar('Error loading user data', 'error');
        
        // Mock data for development
        setUsers([
          { id: 1, username: 'admin', email: 'admin@example.com', firstName: 'Admin', lastName: 'User', accountStatus: 'active', departmentId: 1, roles: ['admin'] },
          { id: 2, username: 'compliance', email: 'compliance@example.com', firstName: 'Compliance', lastName: 'Officer', accountStatus: 'active', departmentId: 3, roles: ['compliance_officer'] },
          { id: 3, username: 'manager1', email: 'manager1@example.com', firstName: 'John', lastName: 'Manager', accountStatus: 'active', departmentId: 2, roles: ['manager'] },
          { id: 4, username: 'employee1', email: 'employee1@example.com', firstName: 'Jane', lastName: 'Employee', accountStatus: 'active', departmentId: 4, roles: ['employee'] }
        ]);
        
        setRoles([
          { id: 1, name: 'admin' },
          { id: 2, name: 'compliance_officer' },
          { id: 3, name: 'manager' },
          { id: 4, name: 'employee' }
        ]);
        
        setDepartments([
          { id: 1, name: 'Administration', description: 'Administrative staff' },
          { id: 2, name: 'IT', description: 'Information Technology department' },
          { id: 3, name: 'Compliance', description: 'Compliance department' },
          { id: 4, name: 'Operations', description: 'Operations department' },
          { id: 5, name: 'Human Resources', description: 'HR department' }
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

  // Open dialog for adding a new user
  const handleAddUser = () => {
    setDialogMode('add');
    setFormData({
      username: '',
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      departmentId: '',
      roles: []
    });
    setFormErrors({});
    setOpenDialog(true);
  };

  // Open dialog for editing a user
  const handleEditUser = (user) => {
    setDialogMode('edit');
    setCurrentUser(user);
    setFormData({
      username: user.username,
      email: user.email,
      password: '', // Don't populate password for security
      firstName: user.firstName,
      lastName: user.lastName,
      departmentId: user.departmentId,
      roles: user.roles
    });
    setFormErrors({});
    setOpenDialog(true);
  };

  // Handle dialog close
  const handleCloseDialog = () => {
    setOpenDialog(false);
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

  // Handle roles selection change
  const handleRolesChange = (e) => {
    setFormData({
      ...formData,
      roles: e.target.value
    });
  };

  // Validate form
  const validateForm = () => {
    const errors = {};
    
    if (!formData.username) errors.username = 'Username is required';
    if (!formData.email) errors.email = 'Email is required';
    if (dialogMode === 'add' && !formData.password) errors.password = 'Password is required';
    if (!formData.firstName) errors.firstName = 'First name is required';
    if (!formData.lastName) errors.lastName = 'Last name is required';
    if (!formData.departmentId) errors.departmentId = 'Department is required';
    if (!formData.roles.length) errors.roles = 'At least one role is required';
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    try {
      if (dialogMode === 'add') {
        // Add new user
        await axios.post(`${API_URL}/users`, formData);
        showSnackbar('User added successfully', 'success');
      } else {
        // Update existing user
        const updateData = { ...formData };
        if (!updateData.password) delete updateData.password; // Don't send empty password
        
        await axios.put(`${API_URL}/users/${currentUser.id}`, updateData);
        showSnackbar('User updated successfully', 'success');
      }
      
      // Refresh user list
      const response = await axios.get(`${API_URL}/users`);
      setUsers(response.data);
      
      // Close dialog
      handleCloseDialog();
    } catch (error) {
      console.error('Error saving user:', error);
      showSnackbar(error.response?.data?.message || 'Error saving user', 'error');
      
      // For development - simulate success
      if (dialogMode === 'add') {
        const newUser = {
          id: users.length + 1,
          ...formData,
          accountStatus: 'active'
        };
        setUsers([...users, newUser]);
      } else {
        const updatedUsers = users.map(user => 
          user.id === currentUser.id ? { ...user, ...formData } : user
        );
        setUsers(updatedUsers);
      }
      handleCloseDialog();
    }
  };

  // Handle user deletion
  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    
    try {
      await axios.delete(`${API_URL}/users/${userId}`);
      showSnackbar('User deleted successfully', 'success');
      
      // Update user list
      setUsers(users.filter(user => user.id !== userId));
    } catch (error) {
      console.error('Error deleting user:', error);
      showSnackbar('Error deleting user', 'error');
      
      // For development - simulate success
      setUsers(users.filter(user => user.id !== userId));
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

  // Get department name by ID
  const getDepartmentName = (departmentId) => {
    const department = departments.find(dept => dept.id === departmentId);
    return department ? department.name : 'Unknown';
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <UserManagementContainer>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">User Management</Typography>
        {hasRole('admin') && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<PersonAddIcon />}
            onClick={handleAddUser}
          >
            Add User
          </Button>
        )}
      </Box>
      
      <Paper elevation={3}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Username</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Department</TableCell>
                <TableCell>Roles</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.username}</TableCell>
                    <TableCell>{`${user.firstName} ${user.lastName}`}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{getDepartmentName(user.departmentId)}</TableCell>
                    <TableCell>{user.roles.join(', ')}</TableCell>
                    <TableCell>{user.accountStatus}</TableCell>
                    <TableCell>
                      {hasRole('admin') && (
                        <>
                          <ActionButton
                            color="primary"
                            size="small"
                            onClick={() => handleEditUser(user)}
                          >
                            <EditIcon fontSize="small" />
                          </ActionButton>
                          <ActionButton
                            color="error"
                            size="small"
                            onClick={() => handleDeleteUser(user.id)}
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
          count={users.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>
      
      {/* Add/Edit User Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {dialogMode === 'add' ? 'Add New User' : 'Edit User'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                name="username"
                label="Username"
                fullWidth
                value={formData.username}
                onChange={handleInputChange}
                error={!!formErrors.username}
                helperText={formErrors.username}
                disabled={dialogMode === 'edit'} // Username cannot be changed once created
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="email"
                label="Email"
                type="email"
                fullWidth
                value={formData.email}
                onChange={handleInputChange}
                error={!!formErrors.email}
                helperText={formErrors.email}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="firstName"
                label="First Name"
                fullWidth
                value={formData.firstName}
                onChange={handleInputChange}
                error={!!formErrors.firstName}
                helperText={formErrors.firstName}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="lastName"
                label="Last Name"
                fullWidth
                value={formData.lastName}
                onChange={handleInputChange}
                error={!!formErrors.lastName}
                helperText={formErrors.lastName}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="password"
                label={dialogMode === 'add' ? 'Password' : 'New Password (leave blank to keep current)'}
                type="password"
                fullWidth
                value={formData.password}
                onChange={handleInputChange}
                error={!!formErrors.password}
                helperText={formErrors.password}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth error={!!formErrors.departmentId}>
                <InputLabel>Department</InputLabel>
                <Select
                  name="departmentId"
                  value={formData.departmentId}
                  onChange={handleInputChange}
                  label="Department"
                >
                  {departments.map((department) => (
                    <MenuItem key={department.id} value={department.id}>
                      {department.name}
                    </MenuItem>
                  ))}
                </Select>
                {formErrors.departmentId && (
                  <Typography variant="caption" color="error">
                    {formErrors.departmentId}
                  </Typography>
                )}
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth error={!!formErrors.roles}>
                <InputLabel>Roles</InputLabel>
                <Select
                  multiple
                  name="roles"
                  value={formData.roles}
                  onChange={handleRolesChange}
                  label="Roles"
                >
                  {roles.map((role) => (
                    <MenuItem key={role.id} value={role.name}>
                      {role.name}
                    </MenuItem>
                  ))}
                </Select>
                {formErrors.roles && (
                  <Typography variant="caption" color="error">
                    {formErrors.roles}
                  </Typography>
                )}
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">
            {dialogMode === 'add' ? 'Add User' : 'Save Changes'}
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
    </UserManagementContainer>
  );
};

export default UserManagement;
