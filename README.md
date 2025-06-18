# Location Tracker API

A robust RESTful API for tracking GPS locations of multiple devices in real-time. Built with Node.js, Express, and MongoDB.

## Features

- Device Registration with unique identifiers
- Real-time GPS data ingestion
- Data validation and integrity checks
- JWT-based authentication
- Location history retrieval with time filtering
- Latest location endpoint
- Comprehensive error handling
- Auto-generated API documentation (Swagger/OpenAPI)
- WebSocket integration for real-time updates
- Geofencing capabilities
- Admin dashboard for visualization
- Rate limiting for API protection

## Technical Requirements

- Node.js v14 or above
- MongoDB
- npm or yarn package manager

## Installation

1. Clone the repository:
```bash
git clone https://github.com/Yaswantsoni1128/devify-x-assignment.git
cd location-tracker-api
```

2. Install dependencies:
```bash
npm install
```

3. Create a .env file in the root directory with the following variables:
```env
PORT=3000
MONGODB_URI=your_mongo_uri
JWT_SECRET=your_super_secure_secret_key_here_change_this
ADMIN_USERNAME=admin
ADMIN_PASSWORD=123456
NODE_ENV=development
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100
MAX_LOCATION_HISTORY_DAYS=30
GEOFENCE_CHECK_INTERVAL=30000
```

## Running the Application

### Development mode:
```bash
npm run dev
```

### Production mode:
```bash
npm start
```

## API Documentation

Once the server is running, access the Swagger documentation at:
```
http://localhost:3000/api-docs
```

## API Endpoints

### Device Management
- POST /api/devices/register - Register a new device
- GET /api/devices - List all registered devices

### Location Data
- POST /api/locations - Submit GPS coordinates
- GET /api/locations/:deviceId - Get location history
- GET /api/locations/:deviceId/latest - Get latest location

### Authentication
- POST /api/auth/login - Get authentication token
- POST /api/auth/refresh - Refresh authentication token

### WebSocket
- WS /ws - WebSocket endpoint for real-time updates

## Security

- JWT authentication required for all protected endpoints
- Rate limiting implemented to prevent abuse
- Data validation on all inputs
- Secure headers with Helmet
- CORS protection

## Error Handling

The API implements standardized error responses:
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 429: Too Many Requests
- 500: Internal Server Error

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

MIT 
