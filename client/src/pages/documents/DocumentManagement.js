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
  Tabs,
  Tab,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Breadcrumbs,
  Link
} from '@mui/material';
import { styled } from '@mui/material/styles';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';

// Icons
import FolderIcon from '@mui/icons-material/Folder';
import DescriptionIcon from '@mui/icons-material/Description';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DownloadIcon from '@mui/icons-material/Download';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';

// API URL
const API_URL = 'http://localhost:8080/api';

// Styled components
const DocumentsContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
}));

const ActionButton = styled(IconButton)(({ theme }) => ({
  marginRight: theme.spacing(1),
}));

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`documents-tabpanel-${index}`}
      aria-labelledby={`documents-tab-${index}`}
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

const DocumentManagement = () => {
  const { hasRole } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [documents, setDocuments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [openDialog, setOpenDialog] = useState(false);
  const [openUploadDialog, setOpenUploadDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState('add'); // 'add' or 'edit'
  const [currentDocument, setCurrentDocument] = useState(null);
  const [currentPath, setCurrentPath] = useState([]);
  const [currentCategory, setCurrentCategory] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    categoryId: '',
    version: '1.0',
    status: 'draft'
  });
  const [uploadData, setUploadData] = useState({
    file: null,
    title: '',
    description: '',
    categoryId: '',
    version: '1.0',
    status: 'draft'
  });
  const [formErrors, setFormErrors] = useState({});
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  // Fetch documents and categories
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch categories
        const categoriesResponse = await axios.get(`${API_URL}/documents/categories`);
        setCategories(categoriesResponse.data);
        
        // Fetch documents
        const documentsResponse = await axios.get(`${API_URL}/documents`);
        setDocuments(documentsResponse.data);
      } catch (error) {
        console.error('Error fetching data:', error);
        showSnackbar('Error loading document data', 'error');
        
        // Mock data for development
        setCategories([
          { id: 1, name: 'Policies', description: 'Organization policies' },
          { id: 2, name: 'Procedures', description: 'Standard operating procedures' },
          { id: 3, name: 'Forms', description: 'Required forms' },
          { id: 4, name: 'Training Materials', description: 'Training documents and resources' },
          { id: 5, name: 'Compliance Reports', description: 'Compliance audit reports' }
        ]);
        
        setDocuments([
          { 
            id: 1, 
            title: 'Privacy Policy', 
            description: 'Organization privacy policy',
            categoryId: 1,
            category: 'Policies',
            version: '1.2',
            status: 'active',
            fileUrl: '/documents/privacy_policy.pdf',
            createdBy: 1,
            createdAt: '2025-01-15T10:00:00Z',
            updatedAt: '2025-03-10T14:30:00Z'
          },
          { 
            id: 2, 
            title: 'Security Policy', 
            description: 'Information security policy',
            categoryId: 1,
            category: 'Policies',
            version: '2.0',
            status: 'active',
            fileUrl: '/documents/security_policy.pdf',
            createdBy: 1,
            createdAt: '2025-01-20T11:15:00Z',
            updatedAt: '2025-02-15T09:45:00Z'
          },
          { 
            id: 3, 
            title: 'Incident Response Procedure', 
            description: 'Procedure for responding to security incidents',
            categoryId: 2,
            category: 'Procedures',
            version: '1.1',
            status: 'active',
            fileUrl: '/documents/incident_response.pdf',
            createdBy: 2,
            createdAt: '2025-02-05T13:20:00Z',
            updatedAt: '2025-02-05T13:20:00Z'
          },
          { 
            id: 4, 
            title: 'Business Associate Agreement', 
            description: 'Template for business associate agreements',
            categoryId: 3,
            category: 'Forms',
            version: '1.0',
            status: 'active',
            fileUrl: '/documents/baa_template.docx',
            createdBy: 2,
            createdAt: '2025-02-10T15:45:00Z',
            updatedAt: '2025-02-10T15:45:00Z'
          },
          { 
            id: 5, 
            title: 'HIPAA Training Slides', 
            description: 'Slides for HIPAA training sessions',
            categoryId: 4,
            category: 'Training Materials',
            version: '2.1',
            status: 'active',
            fileUrl: '/documents/hipaa_training.pptx',
            createdBy: 1,
            createdAt: '2025-01-25T09:30:00Z',
            updatedAt: '2025-03-05T11:20:00Z'
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
    setCurrentPath([]);
    setCurrentCategory(null);
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

  // Open dialog for adding a new document
  const handleAddDocument = () => {
    setDialogMode('add');
    setFormData({
      title: '',
      description: '',
      categoryId: currentCategory || '',
      version: '1.0',
      status: 'draft'
    });
    setFormErrors({});
    setOpenDialog(true);
  };

  // Open dialog for editing a document
  const handleEditDocument = (document) => {
    setDialogMode('edit');
    setCurrentDocument(document);
    setFormData({
      title: document.title,
      description: document.description,
      categoryId: document.categoryId,
      version: document.version,
      status: document.status
    });
    setFormErrors({});
    setOpenDialog(true);
  };

  // Open dialog for uploading a document
  const handleUploadDocument = () => {
    setUploadData({
      file: null,
      title: '',
      description: '',
      categoryId: currentCategory || '',
      version: '1.0',
      status: 'draft'
    });
    setFormErrors({});
    setOpenUploadDialog(true);
  };

  // Handle dialog close
  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  // Handle upload dialog close
  const handleCloseUploadDialog = () => {
    setOpenUploadDialog(false);
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

  // Handle upload form input change
  const handleUploadInputChange = (e) => {
    const { name, value } = e.target;
    setUploadData({
      ...uploadData,
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

  // Handle file input change
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadData({
        ...uploadData,
        file: file,
        title: file.name.split('.')[0] // Set default title to filename without extension
      });
      
      // Clear error for file field
      if (formErrors.file) {
        setFormErrors({
          ...formErrors,
          file: null
        });
      }
    }
  };

  // Validate form
  const validateForm = () => {
    const errors = {};
    
    if (!formData.title) errors.title = 'Title is required';
    if (!formData.categoryId) errors.categoryId = 'Category is required';
    if (!formData.version) errors.version = 'Version is required';
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Validate upload form
  const validateUploadForm = () => {
    const errors = {};
    
    if (!uploadData.file) errors.file = 'File is required';
    if (!uploadData.title) errors.title = 'Title is required';
    if (!uploadData.categoryId) errors.categoryId = 'Category is required';
    if (!uploadData.version) errors.version = 'Version is required';
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    try {
      if (dialogMode === 'add') {
        // Add new document
        await axios.post(`${API_URL}/documents`, formData);
        showSnackbar('Document added successfully', 'success');
      } else {
        // Update existing document
        await axios.put(`${API_URL}/documents/${currentDocument.id}`, formData);
        showSnackbar('Document updated successfully', 'success');
      }
      
      // Refresh document list
      const response = await axios.get(`${API_URL}/documents`);
      setDocuments(response.data);
      
      // Close dialog
      handleCloseDialog();
    } catch (error) {
      console.error('Error saving document:', error);
      showSnackbar(error.response?.data?.message || 'Error saving document', 'error');
      
      // For development - simulate success
      if (dialogMode === 'add') {
        const category = categories.find(cat => cat.id === parseInt(formData.categoryId));
        const newDocument = {
          id: documents.length + 1,
          ...formData,
          categoryId: parseInt(formData.categoryId),
          category: category ? category.name : 'Unknown',
          fileUrl: '/documents/new_document.pdf',
          createdBy: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        setDocuments([...documents, newDocument]);
      } else {
        const category = categories.find(cat => cat.id === parseInt(formData.categoryId));
        const updatedDocuments = documents.map(doc => 
          doc.id === currentDocument.id ? { 
            ...doc, 
            ...formData,
            categoryId: parseInt(formData.categoryId),
            category: category ? category.name : doc.category,
            updatedAt: new Date().toISOString() 
          } : doc
        );
        setDocuments(updatedDocuments);
      }
      handleCloseDialog();
    }
  };

  // Handle upload submission
  const handleUploadSubmit = async () => {
    if (!validateUploadForm()) return;
    
    try {
      // In a real app, we would upload the file and create a document
      // const formData = new FormData();
      // formData.append('file', uploadData.file);
      // formData.append('title', uploadData.title);
      // formData.append('description', uploadData.description);
      // formData.append('categoryId', uploadData.categoryId);
      // formData.append('version', uploadData.version);
      // formData.append('status', uploadData.status);
      
      // await axios.post(`${API_URL}/documents/upload`, formData, {
      //   headers: {
      //     'Content-Type': 'multipart/form-data'
      //   }
      // });
      
      showSnackbar('Document uploaded successfully', 'success');
      
      // For development - simulate success
      const category = categories.find(cat => cat.id === parseInt(uploadData.categoryId));
      const newDocument = {
        id: documents.length + 1,
        title: uploadData.title,
        description: uploadData.description,
        categoryId: parseInt(uploadData.categoryId),
        category: category ? category.name : 'Unknown',
        version: uploadData.version,
        status: uploadData.status,
        fileUrl: '/documents/uploaded_document.pdf',
        createdBy: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      setDocuments([...documents, newDocument]);
      
      // Close dialog
      handleCloseUploadDialog();
    } catch (error) {
      console.error('Error uploading document:', error);
      showSnackbar('Error uploading document', 'error');
    }
  };

  // Handle document deletion
  const handleDeleteDocument = async (documentId) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;
    
    try {
      await axios.delete(`${API_URL}/documents/${documentId}`);
      showSnackbar('Document deleted successfully', 'success');
      
      // Update document list
      setDocuments(documents.filter(doc => doc.id !== documentId));
    } catch (error) {
      console.error('Error deleting document:', error);
      showSnackbar('Error deleting document', 'error');
      
      // For development - simulate success
      setDocuments(documents.filter(doc => doc.id !== documentId));
    }
  };

  // Handle document download
  const handleDownloadDocument = async (document) => {
    try {
      // In a real app, we would download the file
      // const response = await axios.get(`${API_URL}/documents/${document.id}/download`, { responseType: 'blob' });
      // const url = window.URL.createObjectURL(new Blob([response.data]));
      // const link = document.createElement('a');
      // link.href = url;
      // link.setAttribute('download', document.title);
      // document.body.appendChild(link);
      // link.click();
      
      showSnackbar('Document downloaded successfully', 'success');
    } catch (error) {
      console.error('Error downloading document:', error);
      showSnackbar('Error downloading document', 'error');
    }
  };

  // Handle category click
  const handleCategoryClick = (categoryId) => {
    setCurrentCategory(categoryId);
    const category = categories.find(cat => cat.id === categoryId);
    setCurrentPath([{ id: categoryId, name: category ? category.name : 'Unknown' }]);
  };

  // Handle breadcrumb click
  const handleBreadcrumbClick = (index) => {
    if (index === 0) {
      // Clicked on "Documents"
      setCurrentPath([]);
      setCurrentCategory(null);
    } else {
      // Clicked on a category
      setCurrentPath(currentPath.slice(0, index));
      setCurrentCategory(currentPath[index - 1].id);
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

  // Get filtered documents based on current category
  const getFilteredDocuments = () => {
    if (!currentCategory) return documents;
    return documents.filter(doc => doc.categoryId === currentCategory);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <DocumentsContainer>
      <Typography variant="h4" gutterBottom>
        Document Management
      </Typography>
      
      <Paper elevation={3} sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          centered
        >
          <Tab label="Browse Documents" />
          <Tab label="All Documents" />
        </Tabs>
        
        {/* Browse Documents Tab */}
        <TabPanel value={tabValue} index={0}>
          {/* Breadcrumbs */}
          <Breadcrumbs 
            separator={<NavigateNextIcon fontSize="small" />} 
            aria-label="document-navigation"
            sx={{ mb: 2 }}
          >
            <Link
              color="inherit"
              href="#"
              onClick={() => handleBreadcrumbClick(0)}
            >
              Documents
            </Link>
            {currentPath.map((item, index) => (
              <Link
                key={item.id}
                color={index === currentPath.length - 1 ? "text.primary" : "inherit"}
                href="#"
                onClick={() => handleBreadcrumbClick(index + 1)}
              >
                {item.name}
              </Link>
            ))}
          </Breadcrumbs>
          
          {/* Action Buttons */}
          {(hasRole('admin') || hasRole('compliance_officer')) && (
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
              <Button
                variant="contained"
                color="primary"
                startIcon={<UploadFileIcon />}
                onClick={handleUploadDocument}
                sx={{ mr: 1 }}
              >
                Upload Document
              </Button>
              <Button
                variant="outlined"
                color="primary"
                startIcon={<AddIcon />}
                onClick={handleAddDocument}
              >
                Add Document
              </Button>
            </Box>
          )}
          
          {/* Categories or Documents */}
          {!currentCategory ? (
            // Show categories
            <List>
              {categories.map((category) => (
                <ListItem 
                  key={category.id}
                  button
                  onClick={() => handleCategoryClick(category.id)}
                >
                  <ListItemIcon>
                    <FolderIcon />
                  </ListItemIcon>
                  <ListItemText 
                    primary={category.name} 
                    secondary={category.description} 
                  />
                </ListItem>
              ))}
            </List>
          ) : (
            // Show documents in the selected category
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Title</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Version</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Last Updated</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {getFilteredDocuments()
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((document) => (
                      <TableRow key={document.id}>
                        <TableCell>{document.title}</TableCell>
                        <TableCell>{document.description}</TableCell>
                        <TableCell>{document.version}</TableCell>
                        <TableCell>{document.status}</TableCell>
                        <TableCell>{new Date(document.updatedAt).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <ActionButton
                            color="primary"
                            size="small"
                            onClick={() => handleDownloadDocument(document)}
                          >
                            <DownloadIcon fontSize="small" />
                          </ActionButton>
                          {(hasRole('admin') || hasRole('compliance_officer')) && (
                            <>
                              <ActionButton
                                color="primary"
                                size="small"
                                onClick={() => handleEditDocument(document)}
                              >
                                <EditIcon fontSize="small" />
                              </ActionButton>
                              <ActionButton
                                color="error"
                                size="small"
                                onClick={() => handleDeleteDocument(document.id)}
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
                count={getFilteredDocuments().length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
              />
            </TableContainer>
          )}
        </TabPanel>
        
        {/* All Documents Tab */}
        <TabPanel value={tabValue} index={1}>
          {/* Action Buttons */}
          {(hasRole('admin') || hasRole('compliance_officer')) && (
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
              <Button
                variant="contained"
                color="primary"
                startIcon={<UploadFileIcon />}
                onClick={handleUploadDocument}
                sx={{ mr: 1 }}
              >
                Upload Document
              </Button>
              <Button
                variant="outlined"
                color="primary"
                startIcon={<AddIcon />}
                onClick={handleAddDocument}
              >
                Add Document
              </Button>
            </Box>
          )}
          
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Title</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Version</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Last Updated</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {documents
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((document) => (
                    <TableRow key={document.id}>
                      <TableCell>{document.title}</TableCell>
                      <TableCell>{document.category}</TableCell>
                      <TableCell>{document.description}</TableCell>
                      <TableCell>{document.version}</TableCell>
                      <TableCell>{document.status}</TableCell>
                      <TableCell>{new Date(document.updatedAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <ActionButton
                          color="primary"
                          size="small"
                          onClick={() => handleDownloadDocument(document)}
                        >
                          <DownloadIcon fontSize="small" />
                        </ActionButton>
                        {(hasRole('admin') || hasRole('compliance_officer')) && (
                          <>
                            <ActionButton
                              color="primary"
                              size="small"
                              onClick={() => handleEditDocument(document)}
                            >
                              <EditIcon fontSize="small" />
                            </ActionButton>
                            <ActionButton
                              color="error"
                              size="small"
                              onClick={() => handleDeleteDocument(document.id)}
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
            count={documents.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </TabPanel>
      </Paper>
      
      {/* Add/Edit Document Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {dialogMode === 'add' ? 'Add New Document' : 'Edit Document'}
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
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth error={!!formErrors.categoryId}>
                <InputLabel>Category</InputLabel>
                <Select
                  name="categoryId"
                  value={formData.categoryId}
                  onChange={handleInputChange}
                  label="Category"
                >
                  {categories.map((category) => (
                    <MenuItem key={category.id} value={category.id}>
                      {category.name}
                    </MenuItem>
                  ))}
                </Select>
                {formErrors.categoryId && (
                  <Typography variant="caption" color="error">
                    {formErrors.categoryId}
                  </Typography>
                )}
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                name="version"
                label="Version"
                fullWidth
                value={formData.version}
                onChange={handleInputChange}
                error={!!formErrors.version}
                helperText={formErrors.version}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  label="Status"
                >
                  <MenuItem value="draft">Draft</MenuItem>
                  <MenuItem value="review">Under Review</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="archived">Archived</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">
            {dialogMode === 'add' ? 'Add Document' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Upload Document Dialog */}
      <Dialog open={openUploadDialog} onClose={handleCloseUploadDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          Upload Document
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <Button
                variant="outlined"
                component="label"
                fullWidth
                sx={{ height: 56, borderStyle: formErrors.file ? 'solid' : 'dashed', borderColor: formErrors.file ? 'error.main' : 'inherit' }}
              >
                {uploadData.file ? uploadData.file.name : 'Select File'}
                <input
                  type="file"
                  hidden
                  onChange={handleFileChange}
                />
              </Button>
              {formErrors.file && (
                <Typography variant="caption" color="error">
                  {formErrors.file}
                </Typography>
              )}
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="title"
                label="Title"
                fullWidth
                value={uploadData.title}
                onChange={handleUploadInputChange}
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
                value={uploadData.description}
                onChange={handleUploadInputChange}
                error={!!formErrors.description}
                helperText={formErrors.description}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth error={!!formErrors.categoryId}>
                <InputLabel>Category</InputLabel>
                <Select
                  name="categoryId"
                  value={uploadData.categoryId}
                  onChange={handleUploadInputChange}
                  label="Category"
                >
                  {categories.map((category) => (
                    <MenuItem key={category.id} value={category.id}>
                      {category.name}
                    </MenuItem>
                  ))}
                </Select>
                {formErrors.categoryId && (
                  <Typography variant="caption" color="error">
                    {formErrors.categoryId}
                  </Typography>
                )}
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                name="version"
                label="Version"
                fullWidth
                value={uploadData.version}
                onChange={handleUploadInputChange}
                error={!!formErrors.version}
                helperText={formErrors.version}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  name="status"
                  value={uploadData.status}
                  onChange={handleUploadInputChange}
                  label="Status"
                >
                  <MenuItem value="draft">Draft</MenuItem>
                  <MenuItem value="review">Under Review</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="archived">Archived</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseUploadDialog}>Cancel</Button>
          <Button onClick={handleUploadSubmit} variant="contained" color="primary">
            Upload
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
    </DocumentsContainer>
  );
};

export default DocumentManagement;
