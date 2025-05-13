# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a HIPAA Compliance Tool, an integrated solution that combines both backend (Node.js/Express) and frontend (React) components to help healthcare organizations manage their HIPAA compliance requirements. The application includes user management, training tracking, document management, risk assessment, incident management, audit logging, and advanced reporting features.

## Architecture

- **Backend**: Node.js + Express with RESTful API design
- **Database**: PostgreSQL with Sequelize ORM
- **Frontend**: React with React Router, Context API, and various UI component libraries
- **Authentication**: JWT-based auth with role-based access control

## Key Commands

### Installation

```bash
# Install all dependencies (backend and frontend)
npm run install-all

# Initialize the database
npm run init-db
```

### Development

```bash
# Start both backend and frontend in development mode
npm run dev

# Start only the backend (with nodemon for auto-restart)
npm run server

# Start only the frontend
npm run client

# Build the frontend for production
npm run client-build
```

### Testing

```bash
# Run Jest tests
npm test

# Run integration tests (platform-specific)
./test-integration.sh  # Linux/Mac
test-integration-windows.bat  # Windows

# Test Docker deployment (platform-specific)
./test-docker.sh  # Linux/Mac
test-docker-windows.bat  # Windows
```

### Production

```bash
# Start the application in production mode
npm start
```

## Directory Structure

- **Backend**:
  - `models/`: Database models using Sequelize
  - `controllers/`: API endpoint controllers
  - `routes/`: Express route definitions
  - `middleware/`: Express middleware (auth, audit logging)
  - `config/`: Configuration files
  - `init-scripts/`: Database initialization scripts

- **Frontend** (`client/` directory):
  - `src/components/`: UI components (layout and reusable UI)
  - `src/pages/`: Page components for different sections
  - `src/contexts/`: React Context providers
  - `src/hooks/`: Custom React hooks

## Deployment Options

The application supports:
1. Standard Node.js deployment
2. Docker containerized deployment
3. Windows-specific deployment using batch scripts

## Database

The application uses PostgreSQL with Sequelize ORM. Key models include:
- User and Role models for authentication
- TrainingCourse and TrainingAssignment for training management
- Document and DocumentAcknowledgment for document tracking
- RiskAssessment and RiskItem for risk tracking
- Incident and IncidentUpdate for incident management
- AuditLog for comprehensive activity logging

## Security Considerations

- The application implements JWT for authentication
- Passwords are hashed using bcrypt
- Role-based access control restricts access to features
- All user actions are logged in the audit system
- Sensitive data should be encrypted in the database

## Cross-Browser/Platform Considerations

The application provides specific scripts and guides for Windows environments:
- Windows-specific batch scripts for installation and initialization
- Docker-based deployment for cross-platform compatibility