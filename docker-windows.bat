@echo off
echo HIPAA Compliance Tool - Docker Deployment
echo =====================================
echo.
echo This script will build and run the HIPAA Compliance Tool using Docker.
echo Please ensure Docker Desktop is installed and running.
echo.
echo Press any key to continue or Ctrl+C to abort...
pause >nul

REM Check if Docker is installed
where docker >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Error: Docker is not installed or not in your PATH.
    echo Please install Docker Desktop from https://www.docker.com/products/docker-desktop
    exit /b 1
)

REM Check if Docker is running
docker info >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Error: Docker is not running.
    echo Please start Docker Desktop and try again.
    exit /b 1
)

echo Building and starting Docker containers...
docker-compose up --build -d

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Error: Failed to build and start Docker containers.
    exit /b 1
)

echo.
echo Docker containers started successfully!
echo.
echo The HIPAA Compliance Tool is now available at: http://localhost:8080
echo.
echo To stop the containers, run: docker-compose down
echo To view logs, run: docker-compose logs -f
echo.
