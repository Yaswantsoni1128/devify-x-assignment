const Device = require('../models/device.model');

class WebSocketService {
    constructor() {
        this.connections = new Map();
    }

    // Initialize WebSocket server
    setupWebSocket(wss) {
        wss.on('connection', (ws) => {
            console.log('New WebSocket connection');

            ws.on('message', async (message) => {
                try {
                    const data = JSON.parse(message);
                    
                    // Handle subscription to device updates
                    if (data.type === 'subscribe' && data.deviceId) {
                        // Verify device exists
                        const device = await Device.findOne({ deviceId: data.deviceId });
                        if (!device) {
                            ws.send(JSON.stringify({
                                type: 'error',
                                message: 'Device not found'
                            }));
                            return;
                        }

                        // Store connection with deviceId
                        this.connections.set(data.deviceId, ws);
                        
                        ws.send(JSON.stringify({
                            type: 'subscribed',
                            deviceId: data.deviceId
                        }));
                    }
                } catch (error) {
                    ws.send(JSON.stringify({
                        type: 'error',
                        message: 'Invalid message format'
                    }));
                }
            });

            ws.on('close', () => {
                // Remove connection when closed
                for (const [deviceId, conn] of this.connections.entries()) {
                    if (conn === ws) {
                        this.connections.delete(deviceId);
                    }
                }
            });
        });
    }

    // Broadcast location update to subscribed clients
    broadcastLocation(deviceId, locationData) {
        const connection = this.connections.get(deviceId);
        if (connection && connection.readyState === 1) { // 1 = OPEN
            connection.send(JSON.stringify({
                type: 'location_update',
                deviceId,
                data: locationData
            }));
        }
    }

    // Broadcast geofence event
    broadcastGeofenceEvent(deviceId, eventType, geofence) {
        const connection = this.connections.get(deviceId);
        if (connection && connection.readyState === 1) {
            connection.send(JSON.stringify({
                type: 'geofence_event',
                deviceId,
                eventType, // 'enter' or 'exit'
                geofence
            }));
        }
    }
}

// Create singleton instance
const wsService = new WebSocketService();

module.exports = {
    setupWebSocket: (wss) => wsService.setupWebSocket(wss),
    broadcastLocation: (deviceId, data) => wsService.broadcastLocation(deviceId, data),
    broadcastGeofenceEvent: (deviceId, eventType, geofence) => 
        wsService.broadcastGeofenceEvent(deviceId, eventType, geofence)
}; 