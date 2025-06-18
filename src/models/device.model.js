const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const deviceSchema = new mongoose.Schema({
    deviceId: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    apiKey: {
        type: String,
        required: true,
        unique: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    lastLocation: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point'
        },
        coordinates: {
            type: [Number],
            default: [0, 0]
        },
        timestamp: {
            type: Date,
            default: Date.now
        }
    },
    geofences: [{
        name: String,
        radius: Number, // in meters
        center: {
            type: {
                type: String,
                enum: ['Point'],
                default: 'Point'
            },
            coordinates: [Number]
        }
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Indexes
deviceSchema.index({ deviceId: 1 });
deviceSchema.index({ 'lastLocation.coordinates': '2dsphere' });
deviceSchema.index({ 'geofences.center.coordinates': '2dsphere' });

// Generate API key before saving
deviceSchema.pre('save', async function(next) {
    if (!this.isModified('apiKey')) return next();
    
    try {
        const salt = await bcrypt.genSalt(10);
        this.apiKey = await bcrypt.hash(this.deviceId + Date.now(), salt);
    } catch (error) {
        return next(error);
    }
});

// Verify API key
deviceSchema.methods.verifyApiKey = async function(apiKey) {
    try {
        return await bcrypt.compare(apiKey, this.apiKey);
    } catch (error) {
        return false;
    }
};

module.exports = mongoose.model('Device', deviceSchema); 