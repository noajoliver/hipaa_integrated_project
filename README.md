# HIPAA Compliance Tool - Integrated Solution

This README provides an overview of the enhanced HIPAA Compliance Tool integrated solution, which combines both backend and frontend components into a single, comprehensive project.

## Features

- **User and Role Management**: Complete role-based access control system
- **Training Management**: Course creation, assignment, and completion tracking
- **Document Repository**: Version-controlled document management with acknowledgment tracking
- **Risk Assessment**: Comprehensive risk assessment and mitigation tracking
- **Incident Management**: Security incident tracking and response workflow
- **Enhanced Audit Logging**: Detailed activity tracking and reporting
- **Advanced Reporting**: Customizable compliance reports and dashboards

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

The package includes test scripts for verifying the installation:

- `test-integration-windows.bat` / `test-integration.sh`: Tests the integrated application
- `test-docker-windows.bat` / `test-docker.sh`: Tests the Docker deployment

## Default Credentials

After initializing the database, you can log in with:
- Username: `admin`
- Password: `admin123`

## Security Considerations

- Change default credentials immediately after installation
- Use HTTPS in production environments
- Implement regular database backups
- Review audit logs periodically

## License

This project is licensed under the ISC License.
