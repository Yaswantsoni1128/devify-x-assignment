const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
    deviceId: {
        type: String,
        required: true,
        ref: 'Device'
    },
    location: {
        type: {
            type: String,
            enum: ['Point'],
            required: true
        },
        coordinates: {
            type: [Number],
            required: true
        }
    },
    altitude: {
        type: Number,
        default: 0
    },
    speed: {
        type: Number,
        default: 0
    },
    accuracy: {
        type: Number,
        default: 0
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    metadata: {
        type: Map,
        of: String,
        default: new Map()
    }
});

// Indexes
locationSchema.index({ deviceId: 1, timestamp: -1 });
locationSchema.index({ location: '2dsphere' });

// Create TTL index to automatically delete old records
locationSchema.index({ timestamp: 1 }, { 
    expireAfterSeconds: process.env.MAX_LOCATION_HISTORY_DAYS * 24 * 60 * 60 || 30 * 24 * 60 * 60 
});

// Methods
locationSchema.statics.getLocationHistory = async function(deviceId, startTime, endTime) {
    const query = { deviceId };
    if (startTime || endTime) {
        query.timestamp = {};
        if (startTime) query.timestamp.$gte = new Date(startTime);
        if (endTime) query.timestamp.$lte = new Date(endTime);
    }
    
    return this.find(query)
        .sort({ timestamp: -1 })
        .select('-__v');
};

locationSchema.statics.getLatestLocation = async function(deviceId) {
    return this.findOne({ deviceId })
        .sort({ timestamp: -1 })
        .select('-__v');
};

module.exports = mongoose.model('Location', locationSchema); 