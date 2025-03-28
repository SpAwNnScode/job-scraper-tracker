const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const cron = require('node-cron');
const JobScraper = require('./services/jobScraper');
const Job = require('./models/Job');
const scraperRoutes = require('./routes/scraper');
const jobRoutes = require('./routes/jobs');

dotenv.config();

const app = express();

// CORS configuration
app.use(cors({
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Database connection with detailed logging
console.log('Attempting to connect to MongoDB...');
const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/job-tracker';
console.log('MongoDB URI:', mongoURI);

mongoose.connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('Successfully connected to MongoDB');
    console.log('Database name:', mongoose.connection.name);
    
    // Test database connection by trying to find jobs
    return Job.find().then(jobs => {
        console.log(`Found ${jobs.length} jobs in database`);
    });
}).catch((error) => {
    console.error('MongoDB connection error:', error);
    console.error('Full error details:', JSON.stringify(error, null, 2));
});

// Monitor MongoDB connection
mongoose.connection.on('error', err => {
    console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
    console.log('MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
    console.log('MongoDB reconnected');
});

// Basic route for testing
app.get('/', (req, res) => {
    res.json({ 
        message: 'Welcome to Job Tracker API',
        dbStatus: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    });
});

// Routes
app.use('/api/scraper', scraperRoutes);
app.use('/api/jobs', jobRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    console.error('Stack trace:', err.stack);
    res.status(500).json({ 
        error: 'Something broke!',
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

// Schedule job updates every 6 hours
cron.schedule('0 */6 * * *', async () => {
    try {
        if (mongoose.connection.readyState !== 1) {
            console.error('MongoDB not connected. Skipping scheduled job update.');
            return;
        }

        console.log('Starting scheduled job update...');
        const jobs = await JobScraper.getAllJobs();
        console.log(`Scraped ${jobs.length} jobs`);
        
        let savedCount = 0;
        let updatedCount = 0;
        
        for (const job of jobs) {
            if (!job.title || !job.company || !job.location || !job.url || !job.source) {
                console.log('Skipping invalid job:', job);
                continue;
            }

            try {
                const existingJob = await Job.findOne({
                    title: job.title,
                    company: job.company,
                    url: job.url
                });
                
                if (!existingJob) {
                    await Job.create({
                        ...job,
                        germanLevel: job.germanLevel || 'Unknown',
                        experienceLevel: job.experienceLevel || 'Junior',
                        postedAt: new Date(),
                        lastUpdated: new Date()
                    });
                    savedCount++;
                } else {
                    await Job.findByIdAndUpdate(existingJob._id, {
                        lastUpdated: new Date()
                    });
                    updatedCount++;
                }
            } catch (err) {
                console.error('Error saving/updating job:', err);
            }
        }
        
        console.log(`Scheduled job update completed. Saved: ${savedCount}, Updated: ${updatedCount}`);
    } catch (error) {
        console.error('Error in scheduled job update:', error);
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}); 