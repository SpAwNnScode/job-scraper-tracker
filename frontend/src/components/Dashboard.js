import { useState, useEffect } from 'react';
import { Container, Grid, Paper, Typography, Box } from '@mui/material';
import axios from 'axios';

function Dashboard() {
  const [stats, setStats] = useState({
    total: 0,
    applied: 0,
    interview: 0,
    offer: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/jobs');
        const jobs = response.data;
        
        const newStats = {
          total: jobs.length,
          applied: jobs.filter(job => job.applicationStatus === 'Applied').length,
          interview: jobs.filter(job => job.applicationStatus === 'Interview').length,
          offer: jobs.filter(job => job.applicationStatus === 'Offer').length
        };
        
        setStats(newStats);
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };

    fetchStats();
  }, []);

  const StatCard = ({ title, value, color }) => (
    <Paper
      sx={{
        p: 3,
        textAlign: 'center',
        color: 'white',
        bgcolor: color,
      }}
    >
      <Typography variant="h6">{title}</Typography>
      <Typography variant="h3">{value}</Typography>
    </Paper>
  );

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Job Application Dashboard
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Total Applications" value={stats.total} color="#1976d2" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Applied" value={stats.applied} color="#2e7d32" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Interviews" value={stats.interview} color="#ed6c02" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Offers" value={stats.offer} color="#9c27b0" />
        </Grid>
      </Grid>
      
      <Box sx={{ mt: 4 }}>
        <Typography variant="h5" gutterBottom>
          Recent Activity
        </Typography>
        {/* Add recent activity list here */}
      </Box>
    </Container>
  );
}

export default Dashboard; 