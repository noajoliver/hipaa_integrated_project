@echo off
echo HIPAA Compliance Tool - Development Mode
echo =======================================
echo.
echo Starting backend and frontend in development mode...
echo.
echo Backend API will be available at: http://localhost:8080/api
echo Frontend will be available at: http://localhost:3000
echo.
echo Press Ctrl+C to stop both servers
echo.

call npm run dev
