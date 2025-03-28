const express = require('express');
const router = express.Router();
const JobScraper = require('../services/jobScraper');
const Job = require('../models/Job');

// Helper function to check if a job is a duplicate
const isDuplicateJob = (newJob, existingJob) => {
    return (
        newJob.title.toLowerCase() === existingJob.title.toLowerCase() &&
        newJob.company.toLowerCase() === existingJob.company.toLowerCase() &&
        newJob.location.toLowerCase() === existingJob.location.toLowerCase()
    );
};

// Helper function to filter junior jobs
const isJuniorJob = (title) => {
    const juniorKeywords = ['junior', 'entry', 'graduate', 'trainee', 'entry-level', 'entry level'];
    const title_lower = title.toLowerCase();
    return juniorKeywords.some(keyword => title_lower.includes(keyword));
};

// Get all jobs from database
router.get('/jobs', async (req, res) => {
    try {
        console.log('GET /api/scraper/jobs - Fetching all jobs from database...');
        const jobs = await Job.find().sort({ lastUpdated: -1 });
        console.log(`Found ${jobs.length} jobs in database`);
        res.json(jobs);
    } catch (error) {
        console.error('Error fetching jobs:', error);
        res.status(500).json({ error: 'Failed to fetch jobs' });
    }
});

// Scrape jobs from specific source
router.get('/jobs/:source', async (req, res) => {
    try {
        const source = req.params.source.toLowerCase();
        console.log(`GET /api/scraper/jobs/${source} - Starting job scraping...`);
        
        // Get existing jobs from database
        const existingJobs = await Job.find();
        console.log(`Found ${existingJobs.length} existing jobs in database`);
        
        let newJobs = [];
        switch (source) {
            case 'linkedin':
                newJobs = await JobScraper.scrapeLinkedIn();
                break;
            case 'xing':
                newJobs = await JobScraper.scrapeXing();
                break;
            case 'stepstone':
                newJobs = await JobScraper.scrapeStepStone();
                break;
            default:
                console.log(`Invalid source: ${source}`);
                return res.status(400).json({ error: 'Invalid source' });
        }

        console.log(`Scraped ${newJobs.length} jobs from ${source}`);
        
        // Filter and save new jobs
        let savedCount = 0;
        const filteredJobs = newJobs.filter(job => {
            // Check if job has all required fields
            if (!job.title || !job.company || !job.location || !job.url || !job.source) {
                console.log('Skipping invalid job:', job);
                return false;
            }

            // Check if it's a junior position
            if (!isJuniorJob(job.title)) {
                console.log('Skipping non-junior job:', job.title);
                return false;
            }

            // Check if job already exists in database
            const isDuplicate = existingJobs.some(existingJob => 
                isDuplicateJob(job, existingJob)
            );

            if (isDuplicate) {
                console.log('Skipping duplicate job:', job.title);
                return false;
            }

            return true;
        });

        console.log(`Filtered down to ${filteredJobs.length} new unique junior jobs`);

        // Save filtered jobs
        for (const job of filteredJobs) {
            try {
                await Job.create({
                    ...job,
                    experienceLevel: 'Junior',
                    postedAt: new Date(),
                    lastUpdated: new Date()
                });
                savedCount++;
            } catch (err) {
                console.error('Error saving job:', err);
            }
        }

        console.log(`Successfully saved ${savedCount} new jobs from ${source}`);
        
        // Return all jobs including new ones
        const allJobs = await Job.find().sort({ lastUpdated: -1 });
        console.log(`Returning ${allJobs.length} total jobs`);
        res.json(allJobs);
    } catch (error) {
        console.error(`Error scraping jobs from ${req.params.source}:`, error);
        res.status(500).json({ error: `Failed to scrape jobs from ${req.params.source}` });
    }
});

module.exports = router; 