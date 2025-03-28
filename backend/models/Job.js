const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    company: {
        type: String,
        required: true
    },
    location: {
        type: String,
        required: true
    },
    url: {
        type: String,
        required: true
    },
    source: {
        type: String,
        required: true,
        enum: ['LinkedIn', 'Xing', 'StepStone']
    },
    experienceLevel: {
        type: String,
        required: true,
        default: 'Junior'
    },
    germanLevel: {
        type: String,
        enum: ['None', 'B1', 'B2', 'C1', 'C2', 'Unknown'],
        default: 'Unknown'
    },
    postedAt: {
        type: Date,
        default: Date.now
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    }
});

// Update the updatedAt timestamp before saving
jobSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Job', jobSchema); 