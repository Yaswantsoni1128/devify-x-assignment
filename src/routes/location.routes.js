const express = require('express');
const router = express.Router();
const Location = require('../models/location.model');
const { authenticateDevice, authenticateAdmin } = require('../middleware/auth.middleware');
const { ApiError } = require('../middleware/error.middleware');
const { broadcastLocation, broadcastGeofenceEvent } = require('../services/websocket.service');

/**
 * @swagger
 * /api/locations:
 *   post:
 *     summary: Submit new location data
 *     tags: [Locations]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - coordinates
 *             properties:
 *               coordinates:
 *                 type: array
 *                 items:
 *                   type: number
 *               altitude:
 *                 type: number
 *               speed:
 *                 type: number
 *               accuracy:
 *                 type: number
 *               metadata:
 *                 type: object
 *     responses:
 *       201:
 *         description: Location data saved successfully
 *       401:
 *         description: Unauthorized
 */
router.post('/', authenticateDevice, async (req, res, next) => {
    try {
        const { coordinates, altitude, speed, accuracy, metadata } = req.body;

        if (!coordinates || !Array.isArray(coordinates) || coordinates.length !== 2) {
            throw new ApiError(400, 'Valid coordinates are required');
        }

        // Create location record
        const location = new Location({
            deviceId: req.device.deviceId,
            location: {
                type: 'Point',
                coordinates
            },
            altitude,
            speed,
            accuracy,
            metadata: new Map(Object.entries(metadata || {}))
        });

        await location.save();

        // Update device's last location
        req.device.lastLocation = {
            type: 'Point',
            coordinates,
            timestamp: new Date()
        };
        await req.device.save();

        // Broadcast location update via WebSocket
        broadcastLocation(req.device.deviceId, {
            coordinates,
            altitude,
            speed,
            accuracy,
            timestamp: location.timestamp
        });

        // Check geofences
        if (req.device.geofences && req.device.geofences.length > 0) {
            for (const geofence of req.device.geofences) {
                const distance = calculateDistance(
                    coordinates,
                    geofence.center.coordinates
                );

                const wasInside = req.device.lastLocation ? 
                    calculateDistance(req.device.lastLocation.coordinates, geofence.center.coordinates) <= geofence.radius :
                    false;
                
                const isInside = distance <= geofence.radius;

                if (!wasInside && isInside) {
                    broadcastGeofenceEvent(req.device.deviceId, 'enter', geofence);
                } else if (wasInside && !isInside) {
                    broadcastGeofenceEvent(req.device.deviceId, 'exit', geofence);
                }
            }
        }

        res.status(201).json({
            status: 'success',
            data: { location }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /api/locations/{deviceId}/history:
 *   get:
 *     summary: Get location history for a device
 *     tags: [Locations]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: deviceId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: startTime
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endTime
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: Location history retrieved successfully
 *       404:
 *         description: Device not found
 */
router.get('/:deviceId/history', authenticateAdmin, async (req, res, next) => {
    try {
        const { startTime, endTime } = req.query;
        const locations = await Location.getLocationHistory(
            req.params.deviceId,
            startTime,
            endTime
        );

        res.status(200).json({
            status: 'success',
            results: locations.length,
            data: { locations }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /api/locations/{deviceId}/latest:
 *   get:
 *     summary: Get latest location for a device
 *     tags: [Locations]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: deviceId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Latest location retrieved successfully
 *       404:
 *         description: Device not found or no location data
 */
router.get('/:deviceId/latest', authenticateAdmin, async (req, res, next) => {
    try {
        const location = await Location.getLatestLocation(req.params.deviceId);
        
        if (!location) {
            throw new ApiError(404, 'No location data found for this device');
        }

        res.status(200).json({
            status: 'success',
            data: { location }
        });
    } catch (error) {
        next(error);
    }
});

// Helper function to calculate distance between two points in meters
function calculateDistance(point1, point2) {
    const [lon1, lat1] = point1;
    const [lon2, lat2] = point2;
    
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
}

module.exports = router; 