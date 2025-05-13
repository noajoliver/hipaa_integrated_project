@echo off
echo HIPAA Compliance Tool - Production Mode
echo =====================================
echo.
echo Building frontend and starting production server...
echo.

echo Building frontend...
call npm run client-build
if %ERRORLEVEL% NEQ 0 (
    echo Error: Failed to build frontend.
    exit /b 1
)

echo Starting production server...
echo.
echo Application will be available at: http://localhost:8080
echo.
echo Press Ctrl+C to stop the server
echo.

call npm start
