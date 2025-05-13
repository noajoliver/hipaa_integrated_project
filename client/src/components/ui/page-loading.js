import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

/**
 * Page loading component with spinner
 * Used as a fallback for React.Suspense when lazy loading components
 */
const PageLoading = () => {
  return (
    <Box
      display="flex"
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
      height="100vh"
      gap={2}
    >
      <CircularProgress size={60} />
      <Typography variant="h6" color="textSecondary">
        Loading...
      </Typography>
    </Box>
  );
};

export default PageLoading;