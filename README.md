# HIPAA Compliance Tool - Integrated Solution

This README provides an overview of the enhanced HIPAA Compliance Tool integrated solution, which combines both backend and frontend components into a single, comprehensive project.

## Technology Stack

- **Backend**: Node.js 18+ with Express.js framework
- **Database**: PostgreSQL 16 with Sequelize ORM
- **Frontend**: React with React Router and Context API
- **Authentication**: JWT-based authentication with role-based access control
- **Testing**: Jest with Supertest for API integration testing
- **Security**: bcrypt password hashing, account lockout protection, MFA support

## Features

- **User and Role Management**: Complete role-based access control system
- **Training Management**: Course creation, assignment, and completion tracking
- **Document Repository**: Version-controlled document management with acknowledgment tracking
- **Risk Assessment**: Comprehensive risk assessment and mitigation tracking
- **Incident Management**: Security incident tracking and response workflow
- **Enhanced Audit Logging**: Detailed activity tracking and reporting
- **Advanced Reporting**: Customizable compliance reports and dashboards
- **Multi-Factor Authentication**: Optional MFA with TOTP and backup codes
- **Account Protection**: Failed login tracking with automatic account lockout
- **Session Management**: Multi-device session tracking with individual revocation

## Cross-Platform Support

This integrated solution has been enhanced to support:

- **Windows Environments**: Dedicated batch scripts and Windows-specific deployment guide
- **Docker Deployment**: Containerized deployment with Docker Compose
- **Linux/Unix Environments**: Shell scripts for deployment and testing

## Getting Started

### Windows Deployment

1. Extract the package to your desired location
2. Run `setup-windows.bat` to install dependencies
3. Configure your database settings in the `.env` file
4. Run `init-db-windows.bat` to initialize the database
5. Start the application with `start-dev-windows.bat` (development) or `start-prod-windows.bat` (production)

For detailed instructions, see the [Windows Deployment Guide](windows_deployment_guide.md).

### Docker Deployment

1. Ensure Docker and Docker Compose are installed
2. Run `docker-windows.bat` (Windows) or `./test-docker.sh` (Linux/Unix)
3. Access the application at http://localhost:8080

## Documentation

- [Comprehensive Documentation](documentation.md): Complete system documentation
- [API Reference](api_reference.md): Detailed API endpoint documentation
- [Windows Deployment Guide](windows_deployment_guide.md): Windows-specific deployment instructions

## Testing

### Test Suite Status

**100% Test Pass Rate Achieved** - All 152 API integration tests passing

| API Suite | Tests | Status |
|-----------|-------|--------|
| Training API | 37/37 | ✅ 100% |
| Document API | 33/33 | ✅ 100% |
| Risk API | 27/27 | ✅ 100% |
| Incident API | 31/31 | ✅ 100% |
| User API | 14/14 | ✅ 100% |
| Auth API | 10/10 | ✅ 100% |

### Running Tests

```bash
# Run all API integration tests
npm test -- tests/integration/api/

# Run specific test suite
npm test -- tests/integration/api/auth.api.test.js
npm test -- tests/integration/api/training.api.test.js
npm test -- tests/integration/api/document.api.test.js
npm test -- tests/integration/api/risk.api.test.js
npm test -- tests/integration/api/incident.api.test.js
npm test -- tests/integration/api/user.api.test.js

# Run tests sequentially (recommended for integration tests)
npm test -- --runInBand tests/integration/api/
```

### Platform-Specific Test Scripts

The package includes test scripts for verifying the installation:

- `test-integration-windows.bat` / `test-integration.sh`: Tests the integrated application
- `test-docker-windows.bat` / `test-docker.sh`: Tests the Docker deployment

### Recent Test Fixes

The test suite has been comprehensively fixed to achieve 100% pass rate:

- **Auth API**: Fixed Sequelize Op imports, database field alignments, and test authentication
- **Document API**: Resolved concurrent acknowledgment race conditions
- **Incident API**: Fixed SQL enum type casting in UNION queries
- **User API**: Corrected route ordering to prevent wildcard conflicts
- **Account Protection**: Updated database schema references from deprecated fields

## Default Credentials

After initializing the database, you can log in with:
- Username: `admin`
- Password: `Password123!`

**Important**: Change the default password immediately after first login for security.

## Security Considerations

- Change default credentials immediately after installation
- Use HTTPS in production environments
- Implement regular database backups
- Review audit logs periodically

## License

This project is licensed under the ISC License.
