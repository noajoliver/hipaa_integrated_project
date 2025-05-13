import React, { useState, useEffect } from 'react';
import { Box, Typography, Grid, Paper, CircularProgress } from '@mui/material';
import { styled } from '@mui/material/styles';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';

// Chart components
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

// API URL
const API_URL = 'http://localhost:8080/api';

// Styled components
const DashboardCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
}));

const StatCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
  textAlign: 'center',
}));

const Dashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    trainingStats: {
      completed: 0,
      pending: 0,
      overdue: 0,
      total: 0
    },
    documentStats: {
      policies: 0,
      procedures: 0,
      forms: 0,
      training: 0,
      total: 0
    },
    riskStats: {
      high: 0,
      medium: 0,
      low: 0,
      total: 0
    },
    incidentStats: {
      open: 0,
      inProgress: 0,
      closed: 0,
      total: 0
    },
    complianceScore: 0,
    recentActivities: []
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${API_URL}/dashboard`);
        setDashboardData(response.data);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        // Use mock data if API fails
        setDashboardData({
          trainingStats: {
            completed: 24,
            pending: 8,
            overdue: 3,
            total: 35
          },
          documentStats: {
            policies: 12,
            procedures: 18,
            forms: 7,
            training: 9,
            total: 46
          },
          riskStats: {
            high: 2,
            medium: 5,
            low: 8,
            total: 15
          },
          incidentStats: {
            open: 1,
            inProgress: 2,
            closed: 5,
            total: 8
          },
          complianceScore: 87,
          recentActivities: [
            { id: 1, type: 'training', description: 'HIPAA Basics training completed', timestamp: '2025-04-10T14:30:00Z' },
            { id: 2, type: 'document', description: 'Privacy Policy updated', timestamp: '2025-04-09T11:15:00Z' },
            { id: 3, type: 'risk', description: 'New risk assessment started', timestamp: '2025-04-08T09:45:00Z' },
            { id: 4, type: 'incident', description: 'Security incident reported', timestamp: '2025-04-07T16:20:00Z' },
            { id: 5, type: 'audit', description: 'System audit completed', timestamp: '2025-04-06T13:10:00Z' }
          ]
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Prepare chart data
  const trainingChartData = {
    labels: ['Completed', 'Pending', 'Overdue'],
    datasets: [
      {
        data: [
          dashboardData.trainingStats.completed,
          dashboardData.trainingStats.pending,
          dashboardData.trainingStats.overdue
        ],
        backgroundColor: [
          'rgba(75, 192, 192, 0.6)',
          'rgba(255, 206, 86, 0.6)',
          'rgba(255, 99, 132, 0.6)'
        ],
        borderColor: [
          'rgba(75, 192, 192, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(255, 99, 132, 1)'
        ],
        borderWidth: 1,
      },
    ],
  };

  const riskChartData = {
    labels: ['High', 'Medium', 'Low'],
    datasets: [
      {
        data: [
          dashboardData.riskStats.high,
          dashboardData.riskStats.medium,
          dashboardData.riskStats.low
        ],
        backgroundColor: [
          'rgba(255, 99, 132, 0.6)',
          'rgba(255, 206, 86, 0.6)',
          'rgba(75, 192, 192, 0.6)'
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(75, 192, 192, 1)'
        ],
        borderWidth: 1,
      },
    ],
  };

  const documentChartData = {
    labels: ['Policies', 'Procedures', 'Forms', 'Training'],
    datasets: [
      {
        label: 'Document Count',
        data: [
          dashboardData.documentStats.policies,
          dashboardData.documentStats.procedures,
          dashboardData.documentStats.forms,
          dashboardData.documentStats.training
        ],
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
      },
    ],
  };

  const barOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Document Distribution',
      },
    },
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      <Typography variant="subtitle1" gutterBottom>
        Welcome, {user?.firstName || user?.username}!
      </Typography>

      {/* Stats Overview */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard elevation={3}>
            <Typography variant="h6" color="textSecondary">
              Compliance Score
            </Typography>
            <Box sx={{ position: 'relative', display: 'inline-flex', my: 1 }}>
              <CircularProgress 
                variant="determinate" 
                value={dashboardData.complianceScore} 
                size={80} 
                color={dashboardData.complianceScore > 80 ? "success" : dashboardData.complianceScore > 60 ? "warning" : "error"} 
              />
              <Box
                sx={{
                  top: 0,
                  left: 0,
                  bottom: 0,
                  right: 0,
                  position: 'absolute',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Typography variant="h6" component="div" color="text.secondary">
                  {`${dashboardData.complianceScore}%`}
                </Typography>
              </Box>
            </Box>
          </StatCard>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard elevation={3}>
            <Typography variant="h6" color="textSecondary">
              Training
            </Typography>
            <Typography variant="h3" color="primary">
              {dashboardData.trainingStats.total}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              {dashboardData.trainingStats.completed} Completed, {dashboardData.trainingStats.overdue} Overdue
            </Typography>
          </StatCard>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard elevation={3}>
            <Typography variant="h6" color="textSecondary">
              Documents
            </Typography>
            <Typography variant="h3" color="primary">
              {dashboardData.documentStats.total}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Across {Object.keys(dashboardData.documentStats).length - 1} Categories
            </Typography>
          </StatCard>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard elevation={3}>
            <Typography variant="h6" color="textSecondary">
              Incidents
            </Typography>
            <Typography variant="h3" color={dashboardData.incidentStats.open > 0 ? "error" : "primary"}>
              {dashboardData.incidentStats.open}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Open Incidents
            </Typography>
          </StatCard>
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <DashboardCard elevation={3}>
            <Typography variant="h6" gutterBottom>
              Training Status
            </Typography>
            <Box sx={{ height: 250, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <Pie data={trainingChartData} />
            </Box>
          </DashboardCard>
        </Grid>
        <Grid item xs={12} md={4}>
          <DashboardCard elevation={3}>
            <Typography variant="h6" gutterBottom>
              Risk Assessment
            </Typography>
            <Box sx={{ height: 250, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <Pie data={riskChartData} />
            </Box>
          </DashboardCard>
        </Grid>
        <Grid item xs={12} md={4}>
          <DashboardCard elevation={3}>
            <Typography variant="h6" gutterBottom>
              Document Types
            </Typography>
            <Box sx={{ height: 250 }}>
              <Bar options={barOptions} data={documentChartData} />
            </Box>
          </DashboardCard>
        </Grid>
      </Grid>

      {/* Recent Activities */}
      <DashboardCard elevation={3}>
        <Typography variant="h6" gutterBottom>
          Recent Activities
        </Typography>
        {dashboardData.recentActivities.length > 0 ? (
          dashboardData.recentActivities.map((activity) => (
            <Box key={activity.id} sx={{ py: 1, borderBottom: '1px solid #eee' }}>
              <Typography variant="body2" color="textSecondary">
                {new Date(activity.timestamp).toLocaleString()}
              </Typography>
              <Typography variant="body1">
                {activity.description}
              </Typography>
            </Box>
          ))
        ) : (
          <Typography variant="body1">No recent activities</Typography>
        )}
      </DashboardCard>
    </Box>
  );
};

export default Dashboard;
