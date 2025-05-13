@echo off
echo HIPAA Compliance Tool - Windows Setup Script
echo ==========================================
echo.

REM Check for Node.js installation
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Error: Node.js is not installed or not in your PATH.
    echo Please install Node.js from https://nodejs.org/ (version 14 or higher)
    exit /b 1
)

REM Check for npm installation
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Error: npm is not installed or not in your PATH.
    echo Please ensure npm is installed with Node.js
    exit /b 1
)

REM Check for PostgreSQL installation
where psql >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Warning: PostgreSQL command line tools not found in PATH.
    echo Please ensure PostgreSQL is installed and properly configured.
    echo You can download PostgreSQL from https://www.postgresql.org/download/windows/
    echo.
    echo Press any key to continue anyway or Ctrl+C to abort...
    pause >nul
)

echo Installing backend dependencies...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo Error: Failed to install backend dependencies.
    exit /b 1
)

echo Installing frontend dependencies...
cd client
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo Error: Failed to install frontend dependencies.
    exit /b 1
)
cd ..

REM Check if .env file exists, create from example if not
if not exist .env (
    echo Creating .env file from example...
    copy .env.example .env
    echo Please edit the .env file with your database credentials.
    echo.
)

echo.
echo Setup completed successfully!
echo.
echo Next steps:
echo 1. Edit the .env file with your database credentials
echo 2. Initialize the database with: npm run init-db
echo 3. Start the application with: npm run dev
echo.
echo For production deployment:
echo 1. Build the frontend with: npm run client-build
echo 2. Start the production server with: npm start
echo.
