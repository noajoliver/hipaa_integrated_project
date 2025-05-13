@echo off
echo HIPAA Compliance Tool - Docker Integration Test
echo ==============================================
echo.

REM Check if Docker is installed
where docker >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo X Docker is not installed or not in your PATH
    echo   Please install Docker Desktop from https://www.docker.com/products/docker-desktop
    exit /b 1
)
echo √ Docker is installed

REM Check if Docker is running
docker info >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo X Docker is not running
    echo   Please start Docker Desktop and try again
    exit /b 1
)
echo √ Docker is running

REM Check if docker-compose is installed
where docker-compose >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo X docker-compose is not installed or not in your PATH
    echo   Docker Compose should be included with Docker Desktop
    exit /b 1
)
echo √ docker-compose is installed

REM Build and start the containers
echo.
echo Building and starting Docker containers...
docker-compose up --build -d
if %ERRORLEVEL% NEQ 0 (
    echo X Failed to build and start Docker containers
    exit /b 1
)

REM Wait for containers to be ready
echo Waiting for containers to be ready...
timeout /t 10 /nobreak >nul

REM Check if containers are running
docker-compose ps -q > temp.txt
for /f %%i in ("temp.txt") do set size=%%~zi
if %size% EQU 0 (
    echo X Not all containers are running
    docker-compose logs
    docker-compose down
    del temp.txt
    exit /b 1
)
del temp.txt
echo √ All containers are running

REM Test API health endpoint
echo.
echo Testing API health endpoint...
curl -s -o nul -w "%%{http_code}" http://localhost:8080/api/health > status.txt
set /p STATUS=<status.txt
if "%STATUS%" == "200" (
    echo √ API health endpoint is responding correctly
) else (
    echo X API health endpoint returned status: %STATUS%
    docker-compose logs
    docker-compose down
    del status.txt
    exit /b 1
)
del status.txt

REM Clean up
echo.
echo Stopping Docker containers...
docker-compose down

echo.
echo All Docker integration tests passed successfully!
echo The HIPAA Compliance Tool Docker deployment is working correctly.
echo.
