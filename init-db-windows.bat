@echo off
echo HIPAA Compliance Tool - Database Initialization
echo ===========================================
echo.
echo This script will initialize the PostgreSQL database for the HIPAA Compliance Tool.
echo Please ensure PostgreSQL is running and your .env file is configured correctly.
echo.
echo Press any key to continue or Ctrl+C to abort...
pause >nul

REM Check if .env file exists
if not exist .env (
    echo Error: .env file not found.
    echo Please run setup-windows.bat first to create the .env file.
    exit /b 1
)

echo Initializing database...
call node init-db-windows.js
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Error: Database initialization failed.
    echo Please check your database connection settings in the .env file.
    echo.
    echo Common issues:
    echo - PostgreSQL service not running
    echo - Incorrect database credentials
    echo - Database or user does not exist
    echo.
    echo For detailed instructions, refer to the Windows deployment guide.
    exit /b 1
)

echo.
echo Database initialized successfully!
echo.
echo Default admin credentials:
echo Username: admin
echo Password: admin123
echo.
echo You can now start the application using:
echo - Development mode: start-dev-windows.bat
echo - Production mode: start-prod-windows.bat
echo.
