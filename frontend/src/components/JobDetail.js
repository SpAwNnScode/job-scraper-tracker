import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Grid,
  Chip,
  Button,
  Box,
  Divider,
  List,
  ListItem,
  ListItemText
} from '@mui/material';
import {
  Work as WorkIcon,
  LocationOn as LocationIcon,
  Language as LanguageIcon,
  Euro as EuroIcon,
  Business as BusinessIcon
} from '@mui/icons-material';
import axios from 'axios';

function JobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);

  const fetchJob = useCallback(async () => {
    try {
      const response = await axios.get(`http://localhost:5000/api/jobs/${id}`);
      setJob(response.data);
    } catch (error) {
      console.error('Error fetching job:', error);
    }
  }, [id]);

  useEffect(() => {
    fetchJob();
  }, [fetchJob]);

  if (!job) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Typography>Loading...</Typography>
      </Container>
    );
  }

  const getStatusColor = (status) => {
    const colors = {
      'Bookmarked': 'default',
      'Applied': 'primary',
      'Interview': 'warning',
      'Rejected': 'error',
      'Offer': 'success',
      'Accepted': 'success'
    };
    return colors[status] || 'default';
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 3 }}>
          <Box>
            <Typography variant="h4" gutterBottom>
              {job.title}
            </Typography>
            <Typography variant="h5" color="text.secondary" gutterBottom>
              {job.company}
            </Typography>
          </Box>
          <Chip
            label={job.applicationStatus}
            color={getStatusColor(job.applicationStatus)}
            size="large"
          />
        </Box>

        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <List>
              <ListItem>
                <LocationIcon sx={{ mr: 2 }} />
                <ListItemText 
                  primary="Location"
                  secondary={`${job.location} (${job.workType})`}
                />
              </ListItem>
              <ListItem>
                <WorkIcon sx={{ mr: 2 }} />
                <ListItemText 
                  primary="Job Type"
                  secondary={job.jobType}
                />
              </ListItem>
              <ListItem>
                <LanguageIcon sx={{ mr: 2 }} />
                <ListItemText 
                  primary="German Level Required"
                  secondary={job.germanRequired}
                />
              </ListItem>
            </List>
          </Grid>
          <Grid item xs={12} sm={6}>
            <List>
              <ListItem>
                <BusinessIcon sx={{ mr: 2 }} />
                <ListItemText 
                  primary="Company Type"
                  secondary={job.companyType}
                />
              </ListItem>
              <ListItem>
                <EuroIcon sx={{ mr: 2 }} />
                <ListItemText 
                  primary="Salary Range"
                  secondary={
                    job.salary.min || job.salary.max
                      ? `${job.salary.min || '?'} - ${job.salary.max || '?'} ${job.salary.currency}`
                      : 'Not specified'
                  }
                />
              </ListItem>
            </List>
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6" gutterBottom>
          Required Skills
        </Typography>
        <Box sx={{ mb: 3 }}>
          {job.skills ? (
            job.skills.split(',').map((skill, index) => (
              <Chip
                key={index}
                label={skill.trim()}
                sx={{ mr: 1, mb: 1 }}
              />
            ))
          ) : (
            <Typography color="text.secondary">No skills specified</Typography>
          )}
        </Box>

        <Typography variant="h6" gutterBottom>
          Notes
        </Typography>
        <Typography paragraph>
          {job.notes || 'No notes added'}
        </Typography>

        <Box sx={{ mt: 4 }}>
          <Typography variant="subtitle2" gutterBottom>
            Application Details
          </Typography>
          <Typography variant="body2">
            Application Date: {job.applicationDate ? new Date(job.applicationDate).toLocaleDateString() : 'Not applied yet'}
          </Typography>
          <Typography variant="body2">
            Visa Sponsorship: {job.visaSponsorshipOffered ? 'Offered' : 'Not specified'}
          </Typography>
          {job.jobPostingUrl && (
            <Typography variant="body2">
              Job Posting: <a href={job.jobPostingUrl} target="_blank" rel="noopener noreferrer">View Original Post</a>
            </Typography>
          )}
        </Box>

        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          <Button
            variant="outlined"
            onClick={() => navigate('/jobs')}
          >
            Back to List
          </Button>
          <Button
            variant="contained"
            onClick={() => navigate(`/jobs/${id}/edit`)}
          >
            Edit Job
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}

export default JobDetail; 