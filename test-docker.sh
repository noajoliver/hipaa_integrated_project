#!/bin/bash
set -e

# Docker integration test for HIPAA Compliance Tool
# This script tests the Docker deployment of the integrated application

echo "HIPAA Compliance Tool - Docker Integration Test"
echo "=============================================="
echo

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "✗ Docker is not installed or not in your PATH"
    echo "  Please install Docker from https://www.docker.com/get-started"
    exit 1
fi

echo "✓ Docker is installed"

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo "✗ Docker is not running"
    echo "  Please start Docker and try again"
    exit 1
fi

echo "✓ Docker is running"

# Check if docker-compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "✗ docker-compose is not installed or not in your PATH"
    echo "  Please install docker-compose from https://docs.docker.com/compose/install/"
    exit 1
fi

echo "✓ docker-compose is installed"

# Build and start the containers
echo
echo "Building and starting Docker containers..."
docker-compose up --build -d

# Wait for containers to be ready
echo "Waiting for containers to be ready..."
sleep 10

# Check if containers are running
if [ "$(docker-compose ps -q | wc -l)" -ne 2 ]; then
    echo "✗ Not all containers are running"
    docker-compose logs
    docker-compose down
    exit 1
fi

echo "✓ All containers are running"

# Test API health endpoint
echo
echo "Testing API health endpoint..."
HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/api/health)
if [ "$HEALTH_STATUS" -eq 200 ]; then
    echo "✓ API health endpoint is responding correctly"
else
    echo "✗ API health endpoint returned status: $HEALTH_STATUS"
    docker-compose logs
    docker-compose down
    exit 1
fi

# Test database connection through API
echo
echo "Testing database connection through API..."
DB_STATUS=$(curl -s http://localhost:8080/api/health | grep -c "ok")
if [ "$DB_STATUS" -eq 1 ]; then
    echo "✓ Database connection is working"
else
    echo "✗ Database connection test failed"
    docker-compose logs
    docker-compose down
    exit 1
fi

# Clean up
echo
echo "Stopping Docker containers..."
docker-compose down

echo
echo "All Docker integration tests passed successfully!"
echo "The HIPAA Compliance Tool Docker deployment is working correctly."
echo
