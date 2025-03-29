import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Container,
  Paper,
  TextField,
  Button,
  Grid,
  Typography,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Box
} from '@mui/material';
import axios from 'axios';

function JobForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);

  const [formData, setFormData] = useState({
    title: '',
    company: '',
    location: '',
    workType: 'On-site',
    jobType: 'Full-time',
    postingLanguage: 'English',
    germanRequired: 'None',
    visaSponsorshipOffered: false,
    salary: {
      min: '',
      max: '',
      currency: 'EUR'
    },
    applicationStatus: 'Bookmarked',
    applicationDate: '',
    jobPostingUrl: '',
    companyType: 'Enterprise',
    notes: '',
    skills: ''
  });

  const fetchJob = useCallback(async () => {
    try {
      const response = await axios.get(`http://localhost:5000/api/jobs/${id}`);
      setFormData(response.data);
    } catch (error) {
      console.error('Error fetching job:', error);
    }
  }, [id]);

  useEffect(() => {
    if (isEditMode) {
      fetchJob();
    }
  }, [isEditMode, fetchJob]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditMode) {
        await axios.patch(`http://localhost:5000/api/jobs/${id}`, formData);
      } else {
        await axios.post('http://localhost:5000/api/jobs', formData);
      }
      navigate('/jobs');
    } catch (error) {
      console.error('Error saving job:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          {isEditMode ? 'Edit Job Application' : 'Add New Job Application'}
        </Typography>

        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                label="Job Title"
                name="title"
                value={formData.title}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                label="Company"
                name="company"
                value={formData.company}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                label="Location"
                name="location"
                value={formData.location}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                label="Work Type"
                name="workType"
                value={formData.workType}
                onChange={handleChange}
              >
                <MenuItem value="Remote">Remote</MenuItem>
                <MenuItem value="Hybrid">Hybrid</MenuItem>
                <MenuItem value="On-site">On-site</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                label="Job Type"
                name="jobType"
                value={formData.jobType}
                onChange={handleChange}
              >
                <MenuItem value="Full-time">Full-time</MenuItem>
                <MenuItem value="Part-time">Part-time</MenuItem>
                <MenuItem value="Contract">Contract</MenuItem>
                <MenuItem value="Internship">Internship</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                label="German Level Required"
                name="germanRequired"
                value={formData.germanRequired}
                onChange={handleChange}
                helperText={formData.germanRequired === 'C2' ? 
                  "Warning: C2 level positions may have very high language requirements" : 
                  "Select the required German language level"}
              >
                <MenuItem value="None">None</MenuItem>
                <MenuItem value="A1">A1</MenuItem>
                <MenuItem value="A2">A2</MenuItem>
                <MenuItem value="B1">B1</MenuItem>
                <MenuItem value="B2">B2</MenuItem>
                <MenuItem value="C1">C1</MenuItem>
                <MenuItem value="C2">C2 (Native-like proficiency required)</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                label="Company Type"
                name="companyType"
                value={formData.companyType}
                onChange={handleChange}
              >
                <MenuItem value="Startup">Startup</MenuItem>
                <MenuItem value="Mittelstand">Mittelstand</MenuItem>
                <MenuItem value="Enterprise">Enterprise</MenuItem>
                <MenuItem value="Other">Other</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Minimum Salary"
                name="salary.min"
                type="number"
                value={formData.salary.min}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Maximum Salary"
                name="salary.max"
                type="number"
                value={formData.salary.max}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Job Posting URL"
                name="jobPostingUrl"
                value={formData.jobPostingUrl}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Required Skills (comma-separated)"
                name="skills"
                value={formData.skills}
                onChange={handleChange}
                helperText="Enter skills separated by commas"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.visaSponsorshipOffered}
                    onChange={handleChange}
                    name="visaSponsorshipOffered"
                  />
                }
                label="Visa Sponsorship Offered"
              />
            </Grid>
          </Grid>

          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button
              variant="outlined"
              onClick={() => navigate('/jobs')}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="primary"
            >
              {isEditMode ? 'Update Job' : 'Add Job'}
            </Button>
          </Box>
        </form>
      </Paper>
    </Container>
  );
}

export default JobForm; 