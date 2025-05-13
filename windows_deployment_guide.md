# HIPAA Compliance Tool - Windows Deployment Guide

This guide provides detailed instructions for deploying the HIPAA Compliance Tool on Windows environments. The integrated application includes both the backend API and frontend UI in a single project.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Database Setup](#database-setup)
4. [Running the Application](#running-the-application)
5. [Production Deployment](#production-deployment)
6. [Docker Deployment](#docker-deployment)
7. [Troubleshooting](#troubleshooting)
8. [Security Considerations](#security-considerations)

## Prerequisites

Before installing the HIPAA Compliance Tool, ensure your system meets the following requirements:

### Required Software

- **Node.js**: Version 14.0.0 or higher
  - Download from: https://nodejs.org/
  - Verify installation with: `node --version`

- **PostgreSQL**: Version 12 or higher
  - Download from: https://www.postgresql.org/download/windows/
  - Verify installation with: `psql --version`

- **Git** (optional, for cloning the repository)
  - Download from: https://git-scm.com/download/win

### Hardware Requirements

- **CPU**: 2+ cores recommended
- **RAM**: 4GB minimum, 8GB recommended
- **Disk Space**: 1GB for application, plus storage for database

### Network Requirements

- Ports 8080 (application) and 5432 (PostgreSQL) must be available
- Internet connection for initial setup (npm package installation)

## Installation

Follow these steps to install the HIPAA Compliance Tool:

1. **Extract or Clone the Repository**
   - Extract the provided ZIP file to a directory of your choice
   - Or clone using Git: `git clone [repository-url] hipaa-compliance-tool`

2. **Run the Setup Script**
   - Navigate to the project directory in Command Prompt or PowerShell
   - Run the setup script: `setup-windows.bat`
   - This script will:
     - Check for required software
     - Install backend dependencies
     - Install frontend dependencies
     - Create a default .env file if one doesn't exist

3. **Configure Environment Variables**
   - Edit the `.env` file in the project root directory
   - Update the following variables:
     ```
     NODE_ENV=development
     PORT=8080
     DB_HOST=localhost
     DB_USER=hipaa_user
     DB_PASSWORD=your_secure_password
     DB_NAME=hipaa_compliance
     DB_PORT=5432
     JWT_SECRET=your_secure_jwt_secret
     ```
   - Replace placeholder values with your actual database credentials

## Database Setup

1. **Create PostgreSQL Database and User**
   - Open Command Prompt as Administrator
   - Connect to PostgreSQL as a superuser:
     ```
     psql -U postgres
     ```
   - Create a database user:
     ```sql
     CREATE USER hipaa_user WITH PASSWORD 'your_secure_password';
     ```
   - Create the database:
     ```sql
     CREATE DATABASE hipaa_compliance;
     ```
   - Grant privileges to the user:
     ```sql
     GRANT ALL PRIVILEGES ON DATABASE hipaa_compliance TO hipaa_user;
     ```
   - Exit PostgreSQL:
     ```
     \q
     ```

2. **Initialize the Database**
   - Run the database initialization script:
     ```
     init-db-windows.bat
     ```
   - This script will create all necessary tables and populate them with initial data
   - Default admin credentials will be created:
     - Username: `admin`
     - Password: `admin123`

## Running the Application

### Development Mode

Development mode runs the backend and frontend separately, with hot-reloading enabled for both:

1. Start the application in development mode:
   ```
   start-dev-windows.bat
   ```

2. Access the application:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8080/api

3. To stop the application, press `Ctrl+C` in the command prompt window

### Production Mode

Production mode builds the frontend and serves it through the backend server:

1. Start the application in production mode:
   ```
   start-prod-windows.bat
   ```

2. Access the application:
   - http://localhost:8080

3. To stop the application, press `Ctrl+C` in the command prompt window

## Production Deployment

For a production environment, consider the following additional steps:

### Running as a Windows Service

To run the application as a Windows service, you can use tools like NSSM (Non-Sucking Service Manager):

1. Download NSSM from: https://nssm.cc/download

2. Install the service:
   ```
   nssm install HIPAAComplianceTool
   ```

3. In the NSSM dialog:
   - Path: `C:\Path\to\node.exe`
   - Startup directory: `C:\Path\to\hipaa-compliance-tool`
   - Arguments: `server.js`
   - Set appropriate service name and description

4. Configure environment variables in the Environment tab

5. Start the service:
   ```
   nssm start HIPAAComplianceTool
   ```

### Using IIS as a Reverse Proxy

For enterprise environments, you can use IIS as a reverse proxy:

1. Install URL Rewrite and Application Request Routing in IIS

2. Create a new website in IIS

3. Configure URL Rewrite rules to proxy requests to the Node.js application

4. Set up HTTPS with a valid SSL certificate

## Docker Deployment

The application can also be deployed using Docker:

1. Install Docker Desktop for Windows
   - Download from: https://www.docker.com/products/docker-desktop

2. Run the Docker deployment script:
   ```
   docker-windows.bat
   ```

3. Access the application:
   - http://localhost:8080

4. To stop the Docker containers:
   ```
   docker-compose down
   ```

### Manual Docker Commands

If you prefer to run Docker commands manually:

1. Build and start containers:
   ```
   docker-compose up --build -d
   ```

2. View logs:
   ```
   docker-compose logs -f
   ```

3. Stop containers:
   ```
   docker-compose down
   ```

## Troubleshooting

### Common Issues and Solutions

#### Database Connection Issues

- **Error**: "Failed to connect to PostgreSQL database"
  - **Solution**: 
    - Verify PostgreSQL is running: `sc query postgresql`
    - Check database credentials in .env file
    - Ensure the database and user exist
    - Test connection: `psql -U hipaa_user -d hipaa_compliance`

#### Node.js Errors

- **Error**: "Error: Cannot find module 'xyz'"
  - **Solution**: 
    - Run `npm install` to reinstall dependencies
    - Check for Node.js version compatibility

#### Port Conflicts

- **Error**: "Error: listen EADDRINUSE: address already in use :::8080"
  - **Solution**:
    - Identify the process using the port: `netstat -ano | findstr :8080`
    - Kill the process: `taskkill /PID [PID] /F`
    - Or change the port in the .env file

### Logs

Application logs can be found in:
- Console output when running in development mode
- Windows Event Logs when running as a service

## Security Considerations

### Securing the Application

1. **Change Default Credentials**
   - Immediately change the default admin password after installation

2. **Use HTTPS**
   - Configure a reverse proxy with HTTPS
   - Or use a tool like Caddy for automatic HTTPS

3. **Secure Database**
   - Use a strong password for the database user
   - Restrict network access to the database
   - Enable PostgreSQL encryption

4. **Regular Updates**
   - Keep Node.js, npm packages, and PostgreSQL updated
   - Apply security patches promptly

5. **Backup Strategy**
   - Implement regular database backups
   - Test restoration procedures

### HIPAA Compliance Considerations

1. **Access Controls**
   - Implement proper user roles and permissions
   - Use the built-in role-based access control

2. **Audit Logging**
   - Enable comprehensive audit logging
   - Regularly review audit logs

3. **Data Encryption**
   - Ensure data is encrypted at rest and in transit
   - Use HTTPS for all communications

4. **Business Associate Agreements**
   - Ensure all third-party services have BAAs in place

5. **Risk Assessment**
   - Use the built-in risk assessment tools
   - Conduct regular security assessments
