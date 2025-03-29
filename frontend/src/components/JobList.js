import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Grid,
    CircularProgress,
    Alert,
    Chip,
    Button,
    Stack,
    Container,
    Paper,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel
} from '@mui/material';
import { 
    Refresh as RefreshIcon,
    Search as SearchIcon,
    Launch as LaunchIcon
} from '@mui/icons-material';
import axios from 'axios';

const JobList = ({ source }) => {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const [scraping, setScraping] = useState(false);
    const [companyFilter, setCompanyFilter] = useState('');
    const [sourceFilter, setSourceFilter] = useState('all');

    const fetchJobs = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            
            console.log('Fetching jobs...');
            let response;
            if (source && source !== 'all') {
                console.log(`Fetching jobs from source: ${source}`);
                response = await axios.get(`/api/scraper/jobs/${source.toLowerCase()}`);
            } else {
                console.log('Fetching all jobs');
                response = await axios.get('/api/scraper/jobs');
            }
            
            console.log('Response received:', response.data);
            if (response.data) {
                setJobs(response.data);
                console.log(`Set ${response.data.length} jobs`);
            } else {
                throw new Error('No data received from server');
            }
        } catch (err) {
            console.error('Error fetching jobs:', err);
            if (err.response) {
                console.error('Server response:', err.response.data);
                setError(`Server error: ${err.response.data.error || err.response.statusText}`);
            } else if (err.request) {
                console.error('No response received from server');
                setError('No response from server. Please check if the backend is running.');
            } else {
                console.error('Error setting up request:', err.message);
                setError('Error fetching jobs. Please try again later.');
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [source]);

    const scrapeJobs = async () => {
        try {
            setScraping(true);
            setError(null);
            setJobs([]); // Clear existing jobs
            
            console.log('Scraping jobs from all sources...');
            
            // First scrape from each source
            await Promise.all([
                axios.get('/api/scraper/jobs/linkedin'),
                axios.get('/api/scraper/jobs/xing'),
                axios.get('/api/scraper/jobs/stepstone')
            ]);
            
            // Then fetch all jobs
            const response = await axios.get('/api/scraper/jobs');
            
            if (response.data) {
                setJobs(response.data);
                console.log(`Set ${response.data.length} jobs`);
            }
        } catch (err) {
            console.error('Error scraping jobs:', err);
            if (err.response) {
                setError(`Scraping error: ${err.response.data.error || err.response.statusText}`);
            } else if (err.request) {
                setError('No response from server. Please check if the backend is running.');
            } else {
                setError('Error scraping jobs. Please try again later.');
            }
        } finally {
            setScraping(false);
        }
    };

    useEffect(() => {
        fetchJobs();
    }, [fetchJobs]);

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchJobs();
    };

    // Filter and sort jobs
    const filteredAndSortedJobs = useMemo(() => {
        console.log('Filtering jobs:', {
            companyFilter,
            sourceFilter,
            totalJobs: jobs.length
        });

        let filtered = jobs;

        // Apply company filter
        if (companyFilter) {
            filtered = filtered.filter(job => 
                job.company.toLowerCase().includes(companyFilter.toLowerCase())
            );
        }

        // Apply source filter
        if (sourceFilter !== 'all') {
            filtered = filtered.filter(job => 
                job.source.toLowerCase() === sourceFilter.toLowerCase()
            );
        }

        // Sort by lastUpdated
        filtered.sort((a, b) => {
            const dateA = new Date(a.lastUpdated || a.createdAt);
            const dateB = new Date(b.lastUpdated || b.createdAt);
            return dateB - dateA;
        });

        console.log('Filtered jobs count:', filtered.length);
        return filtered;
    }, [jobs, companyFilter, sourceFilter]);

    // Debug logging for filtering
    useEffect(() => {
        console.log('Filter state:', {
            companyFilter,
            sourceFilter,
            totalJobs: jobs.length,
            filteredJobs: filteredAndSortedJobs.length
        });
    }, [companyFilter, sourceFilter, jobs.length, filteredAndSortedJobs.length]);

    const getSourceColor = (source) => {
        switch (source.toLowerCase()) {
            case 'linkedin':
                return 'primary';
            case 'xing':
                return 'success';
            case 'stepstone':
                return 'secondary';
            default:
                return 'default';
        }
    };

    if (loading && !refreshing) {
        return (
            <Container maxWidth="lg">
                <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                    <CircularProgress />
                </Box>
            </Container>
        );
    }

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Paper elevation={3} sx={{ p: 3 }}>
                <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h4" component="h1" gutterBottom>
                        {source ? `${source} Jobs` : 'All Jobs'}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={scrapeJobs}
                            disabled={loading || scraping}
                            startIcon={<SearchIcon />}
                        >
                            {scraping ? 'Scraping...' : 'Scrape Jobs'}
                        </Button>
                        <Button
                            variant="outlined"
                            color="primary"
                            onClick={handleRefresh}
                            disabled={refreshing}
                            startIcon={<RefreshIcon />}
                        >
                            {refreshing ? 'Refreshing...' : 'Refresh'}
                        </Button>
                    </Box>
                </Box>

                {scraping && (
                    <Alert severity="info" sx={{ mb: 2 }}>
                        Scraping jobs from all sources... This may take a few minutes.
                    </Alert>
                )}

                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}

                <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
                    <TextField
                        label="Filter by Company"
                        variant="outlined"
                        value={companyFilter}
                        onChange={(e) => setCompanyFilter(e.target.value)}
                        sx={{ flexGrow: 1 }}
                    />
                    <FormControl sx={{ minWidth: 200 }}>
                        <InputLabel>Source</InputLabel>
                        <Select
                            value={sourceFilter}
                            label="Source"
                            onChange={(e) => setSourceFilter(e.target.value)}
                        >
                            <MenuItem value="all">All Sources</MenuItem>
                            <MenuItem value="Xing">Xing</MenuItem>
                            <MenuItem value="LinkedIn">LinkedIn</MenuItem>
                            <MenuItem value="StepStone">StepStone</MenuItem>
                        </Select>
                    </FormControl>
                </Box>

                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <>
                        <Typography variant="subtitle1" sx={{ mb: 2 }}>
                            Found {filteredAndSortedJobs.length} jobs
                        </Typography>
                        
                        {filteredAndSortedJobs.length === 0 ? (
                            <Alert severity="info">
                                {companyFilter 
                                    ? `No jobs found for company "${companyFilter}". Try a different filter.`
                                    : source 
                                        ? `No jobs found from ${source}. Try refreshing the page or checking back later.`
                                        : 'No jobs found. Try refreshing the page or checking back later.'}
                            </Alert>
                        ) : (
                            <Grid container spacing={3}>
                                {filteredAndSortedJobs.map((job) => (
                                    <Grid item xs={12} key={job._id}>
                                        <Card sx={{
                                            '&:hover': {
                                                boxShadow: 6,
                                                transform: 'translateY(-2px)',
                                                transition: 'all 0.2s ease-in-out'
                                            }
                                        }}>
                                            <CardContent>
                                                <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                                                    <Box flex={1}>
                                                        <Typography variant="h6" component="h3" gutterBottom>
                                                            {job.title}
                                                        </Typography>
                                                        <Typography color="textSecondary" gutterBottom>
                                                            {job.company}
                                                        </Typography>
                                                        <Typography variant="body2" color="textSecondary" gutterBottom>
                                                            {job.location}
                                                        </Typography>
                                                        <Stack direction="row" spacing={1} mt={1}>
                                                            <Chip 
                                                                label={job.source} 
                                                                size="small" 
                                                                color={getSourceColor(job.source)}
                                                                variant="outlined"
                                                            />
                                                            <Chip 
                                                                label={job.experienceLevel} 
                                                                size="small" 
                                                                color="primary" 
                                                                variant="outlined"
                                                            />
                                                        </Stack>
                                                    </Box>
                                                    <Button
                                                        variant="contained"
                                                        color="primary"
                                                        endIcon={<LaunchIcon />}
                                                        onClick={() => window.open(job.url, '_blank')}
                                                        sx={{ ml: 2 }}
                                                    >
                                                        Apply
                                                    </Button>
                                                </Box>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                ))}
                            </Grid>
                        )}
                    </>
                )}
            </Paper>
        </Container>
    );
};

export default JobList; 