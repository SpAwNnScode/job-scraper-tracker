const express = require('express');
const router = express.Router();
const Job = require('../models/Job');

// Get all jobs from database
router.get('/', async (req, res) => {
    try {
        console.log('Fetching all jobs from database...');
        const jobs = await Job.find().sort({ lastUpdated: -1 });
        console.log(`Found ${jobs.length} jobs`);
        res.json(jobs);
    } catch (error) {
        console.error('Error fetching jobs:', error);
        res.status(500).json({ error: 'Failed to fetch jobs' });
    }
});

// Get jobs by source
router.get('/source/:source', async (req, res) => {
    try {
        const source = req.params.source.charAt(0).toUpperCase() + req.params.source.slice(1);
        console.log(`Fetching jobs from source: ${source}`);
        const jobs = await Job.find({ source }).sort({ lastUpdated: -1 });
        console.log(`Found ${jobs.length} jobs from ${source}`);
        res.json(jobs);
    } catch (error) {
        console.error(`Error fetching jobs from ${req.params.source}:`, error);
        res.status(500).json({ error: `Failed to fetch jobs from ${req.params.source}` });
    }
});

// Get jobs by experience level
router.get('/level/:level', async (req, res) => {
    try {
        const level = req.params.level.charAt(0).toUpperCase() + req.params.level.slice(1);
        console.log(`Fetching jobs with level: ${level}`);
        const jobs = await Job.find({ experienceLevel: level }).sort({ lastUpdated: -1 });
        console.log(`Found ${jobs.length} jobs with level ${level}`);
        res.json(jobs);
    } catch (error) {
        console.error(`Error fetching jobs with level ${req.params.level}:`, error);
        res.status(500).json({ error: `Failed to fetch jobs with level ${req.params.level}` });
    }
});

// Get jobs by German level
router.get('/german/:level', async (req, res) => {
    try {
        const level = req.params.level.charAt(0).toUpperCase() + req.params.level.slice(1);
        console.log(`Fetching jobs with German level: ${level}`);
        const jobs = await Job.find({ germanLevel: level }).sort({ lastUpdated: -1 });
        console.log(`Found ${jobs.length} jobs with German level ${level}`);
        res.json(jobs);
    } catch (error) {
        console.error(`Error fetching jobs with German level ${req.params.level}:`, error);
        res.status(500).json({ error: `Failed to fetch jobs with German level ${req.params.level}` });
    }
});

// Update a job's German level
router.patch('/:id/german-level', async (req, res) => {
    try {
        const { germanLevel } = req.body;
        console.log(`Updating German level for job ${req.params.id} to ${germanLevel}`);
        const job = await Job.findByIdAndUpdate(
            req.params.id,
            { 
                germanLevel,
                lastUpdated: new Date()
            },
            { new: true }
        );
        if (!job) {
            console.error(`Job not found with ID: ${req.params.id}`);
            return res.status(404).json({ error: 'Job not found' });
        }
        console.log('Job updated successfully');
        res.json(job);
    } catch (error) {
        console.error('Error updating job German level:', error);
        res.status(500).json({ error: 'Failed to update job German level' });
    }
});

// Delete a job
router.delete('/:id', async (req, res) => {
    try {
        console.log(`Deleting job with ID: ${req.params.id}`);
        const job = await Job.findByIdAndDelete(req.params.id);
        if (!job) {
            console.error(`Job not found with ID: ${req.params.id}`);
            return res.status(404).json({ error: 'Job not found' });
        }
        console.log('Job deleted successfully');
        res.json({ message: 'Job deleted successfully' });
    } catch (error) {
        console.error('Error deleting job:', error);
        res.status(500).json({ error: 'Failed to delete job' });
    }
});

module.exports = router; 