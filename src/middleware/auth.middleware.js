const jwt = require('jsonwebtoken');
const { ApiError } = require('./error.middleware');
const Device = require('../models/device.model');
const User = require('../models/user.model');

const authenticateUser = async (req, res, next) => {
    try {
        // Check for JWT token in headers
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new ApiError(401, 'No token provided');
        }

        const token = authHeader.split(' ')[1];
        
        try {
            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            // Find user and check if still exists and active
            const user = await User.findById(decoded.userId);
            if (!user || !user.isActive) {
                throw new ApiError(401, 'User not found or inactive');
            }

            // Attach user info to request
            req.user = {
                userId: user._id,
                username: user.username,
                role: user.role
            };
            
            next();
        } catch (error) {
            throw new ApiError(401, 'Invalid token');
        }
    } catch (error) {
        next(error);
    }
};

const authenticateDevice = async (req, res, next) => {
    try {
        // Check for API key in headers
        const apiKey = req.headers['x-api-key'];
        if (!apiKey) {
            throw new ApiError(401, 'No API key provided');
        }

        // Find device by deviceId in header
        const deviceId = req.headers['x-device-id'];
        if (!deviceId) {
            throw new ApiError(401, 'No device ID provided');
        }

        // Verify device exists and API key is valid
        const device = await Device.findOne({ deviceId });
        if (!device) {
            throw new ApiError(404, 'Device not found');
        }

        const isValid = await device.verifyApiKey(apiKey);
        if (!isValid) {
            throw new ApiError(401, 'Invalid API key');
        }

        // Check if device is active
        if (!device.isActive) {
            throw new ApiError(403, 'Device is inactive');
        }

        // Attach device to request
        req.device = device;
        next();
    } catch (error) {
        next(error);
    }
};

const authenticateAdmin = async (req, res, next) => {
    try {
        // First authenticate user
        await authenticateUser(req, res, async () => {
            // Check if user has admin role
            if (req.user.role !== 'admin') {
                return next(new ApiError(403, 'Admin access required'));
            }
            next();
        });
    } catch (error) {
        next(error);
    }
};

// Middleware to check if user owns the device or is admin
const authorizeDeviceAccess = async (req, res, next) => {
    try {
        const deviceId = req.params.deviceId || req.body.deviceId;
        const user = await User.findById(req.user.userId);

        if (user.role === 'admin') {
            return next(); // Admins have access to all devices
        }

        if (!user.devices.includes(deviceId)) {
            throw new ApiError(403, 'You do not have access to this device');
        }

        next();
    } catch (error) {
        next(error);
    }
};

module.exports = {
    authenticateUser,
    authenticateDevice,
    authenticateAdmin,
    authorizeDeviceAccess
}; 