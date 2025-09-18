# Sales Management System

A comprehensive sales management application with admin panel and mobile API for salesmen.

## Features

### Admin Panel (Web)
- **Dashboard**: Overview of salesmen, clients, and areas
- **User Management**: Create, edit, and manage salesmen accounts
- **Client Management**: Add, edit, and assign clients to areas
- **Area Management**: Create and manage geographical areas
- **Role-based Access**: Secure admin-only access

### Mobile API (For Salesmen App)
- **Authentication**: Secure login for salesmen
- **Client Access**: View only clients from assigned area
- **Profile Management**: Update personal information
- **Status Updates**: Track client interaction status

## Tech Stack

- **Backend**: Node.js, Express.js, MongoDB
- **Frontend**: React.js, Tailwind CSS
- **Authentication**: JWT tokens
- **Database**: MongoDB with Mongoose ODM

## Project Structure

```
sales-management/
├── server.js                 # Main server file
├── config.env               # Environment variables
├── package.json             # Backend dependencies
├── models/                  # Database models
│   ├── User.js             # User model (admin/salesman)
│   ├── Area.js             # Area model
│   └── Client.js           # Client model
├── routes/                  # API routes
│   ├── auth.js             # Authentication routes
│   ├── admin.js            # Admin-only routes
│   ├── salesmen.js         # Salesmen mobile API
│   ├── clients.js          # Client management
│   └── areas.js            # Area management
├── middleware/              # Custom middleware
│   └── auth.js             # Authentication middleware
└── client/                  # React frontend
    ├── package.json        # Frontend dependencies
    ├── public/             # Static files
    └── src/                # React components
        ├── components/     # UI components
        ├── contexts/       # React contexts
        └── App.js         # Main app component
```

## Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or cloud)
- npm or yarn

### Backend Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd sales-management
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   ```bash
   # Copy and edit the config file
   cp config.env.example config.env
   
   # Update the following variables:
   MONGODB_URI=mongodb://localhost:27017/sales-management
   JWT_SECRET=your-super-secret-jwt-key
   PORT=5000
   ```

4. **Start the server**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

### Frontend Setup

1. **Navigate to client directory**
   ```bash
   cd client
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm start
   ```

The React app will open at `http://localhost:3000`

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user profile
- `POST /api/auth/change-password` - Change password

### Admin Routes
- `GET /api/admin/dashboard` - Admin dashboard stats
- `POST /api/admin/users` - Create new salesman
- `GET /api/admin/users` - Get all users
- `PUT /api/admin/users/:id` - Update user
- `DELETE /api/admin/users/:id` - Deactivate user

### Areas
- `POST /api/areas` - Create new area
- `GET /api/areas` - Get all areas
- `PUT /api/areas/:id` - Update area
- `DELETE /api/areas/:id` - Deactivate area

### Clients
- `POST /api/clients` - Create new client
- `GET /api/clients` - Get clients (filtered by area for salesmen)
- `PUT /api/clients/:id` - Update client
- `DELETE /api/clients/:id` - Deactivate client

### Salesmen Mobile API
- `GET /api/salesmen/profile` - Get salesman profile
- `PUT /api/salesmen/profile` - Update profile
- `GET /api/salesmen/clients` - Get area-specific clients
- `GET /api/salesmen/dashboard` - Salesman dashboard
- `POST /api/salesmen/clients/:id/update-status` - Update client status

## Database Schema

### User Model
- `username`, `email`, `password` - Authentication fields
- `firstName`, `lastName`, `phone` - Personal information
- `role` - 'admin' or 'salesman'
- `area` - Reference to assigned area (for salesmen)
- `isActive` - Account status
- `lastLogin` - Last login timestamp

### Area Model
- `name`, `city`, `state`, `country` - Location information
- `description` - Optional area description
- `coordinates` - Latitude/longitude (optional)
- `isActive` - Area status

### Client Model
- `name`, `company`, `email`, `phone` - Contact information
- `address` - Street, city, state, zip code
- `area` - Reference to assigned area
- `status` - 'prospect', 'customer', 'active', 'inactive'
- `notes` - Additional information
- `lastContact` - Last interaction date

## Usage

### Initial Setup
1. Start MongoDB service
2. Start the backend server
3. Start the React frontend
4. Create an admin user directly in the database or use the first user as admin

### Admin Operations
1. **Login** to the admin panel
2. **Create Areas** for different geographical regions
3. **Add Salesmen** and assign them to specific areas
4. **Add Clients** and assign them to areas
5. **Monitor** salesmen activity and client status

### Mobile App Integration
The mobile app can use the salesmen API endpoints:
- Use `/api/auth/login` for authentication
- Include JWT token in Authorization header: `Bearer <token>`
- Access area-specific data through `/api/salesmen/*` endpoints

## Security Features

- **JWT Authentication** with configurable expiration
- **Role-based Access Control** (admin vs salesman)
- **Password Hashing** using bcrypt
- **Input Validation** using express-validator
- **CORS Protection** for cross-origin requests
- **Environment Variables** for sensitive configuration

## Development

### Adding New Features
1. Create new models in `models/` directory
2. Add routes in `routes/` directory
3. Create React components in `client/src/components/`
4. Update navigation and routing as needed

### Testing
```bash
# Backend tests
npm test

# Frontend tests
cd client && npm test
```

## Deployment

### Backend
- Set `NODE_ENV=production`
- Use environment variables for configuration
- Set up MongoDB connection string
- Configure JWT secret

### Frontend
```bash
cd client
npm run build
```
Serve the `build` folder from your web server.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please open an issue in the repository.
