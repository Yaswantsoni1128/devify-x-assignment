const express = require('express');
const router = express.Router();
const Device = require('../models/device.model');
const { authenticateAdmin } = require('../middleware/auth.middleware');
const { ApiError } = require('../middleware/error.middleware');

/**
 * @swagger
 * /api/devices/register:
 *   post:
 *     summary: Register a new device
 *     tags: [Devices]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - deviceId
 *               - name
 *             properties:
 *               deviceId:
 *                 type: string
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: Device registered successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */
router.post('/register', authenticateAdmin, async (req, res, next) => {
    try {
        const { deviceId, name } = req.body;

        if (!deviceId || !name) {
            throw new ApiError(400, 'Device ID and name are required');
        }

        // Check if device already exists
        const existingDevice = await Device.findOne({ deviceId });
        if (existingDevice) {
            throw new ApiError(400, 'Device ID already exists');
        }

        // Create new device
        const device = new Device({
            deviceId,
            name,
            apiKey: deviceId // Will be hashed in pre-save hook
        });

        await device.save();

        res.status(201).json({
            status: 'success',
            data: {
                device: {
                    deviceId: device.deviceId,
                    name: device.name,
                    apiKey: device.apiKey // Send API key only once during registration
                }
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /api/devices:
 *   get:
 *     summary: Get all devices
 *     tags: [Devices]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of all devices
 *       401:
 *         description: Unauthorized
 */
router.get('/', authenticateAdmin, async (req, res, next) => {
    try {
        const devices = await Device.find()
            .select('-apiKey')
            .sort({ createdAt: -1 });

        res.status(200).json({
            status: 'success',
            results: devices.length,
            data: { devices }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /api/devices/{deviceId}:
 *   get:
 *     summary: Get device by ID
 *     tags: [Devices]
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
 *         description: Device details
 *       404:
 *         description: Device not found
 */
router.get('/:deviceId', authenticateAdmin, async (req, res, next) => {
    try {
        const device = await Device.findOne({ deviceId: req.params.deviceId })
            .select('-apiKey');

        if (!device) {
            throw new ApiError(404, 'Device not found');
        }

        res.status(200).json({
            status: 'success',
            data: { device }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @swagger
 * /api/devices/{deviceId}/geofences:
 *   post:
 *     summary: Add geofence for device
 *     tags: [Devices]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: deviceId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - radius
 *               - center
 *             properties:
 *               name:
 *                 type: string
 *               radius:
 *                 type: number
 *               center:
 *                 type: object
 *                 properties:
 *                   coordinates:
 *                     type: array
 *                     items:
 *                       type: number
 *     responses:
 *       200:
 *         description: Geofence added successfully
 *       404:
 *         description: Device not found
 */
router.post('/:deviceId/geofences', authenticateAdmin, async (req, res, next) => {
    try {
        const { name, radius, center } = req.body;

        const device = await Device.findOne({ deviceId: req.params.deviceId });
        if (!device) {
            throw new ApiError(404, 'Device not found');
        }

        device.geofences.push({
            name,
            radius,
            center: {
                type: 'Point',
                coordinates: center.coordinates
            }
        });

        await device.save();

        res.status(200).json({
            status: 'success',
            data: { device }
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router; 