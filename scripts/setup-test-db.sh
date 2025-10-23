#!/bin/bash
set -e

echo "========================================="
echo "HIPAA Compliance Tool - Test DB Setup"
echo "========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Load test environment variables
if [ -f .env.test ]; then
  echo -e "${GREEN}✓${NC} Loading test environment variables from .env.test"
  export $(cat .env.test | grep -v '^#' | xargs)
else
  echo -e "${YELLOW}⚠${NC} .env.test not found, using defaults"
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
  echo -e "${RED}✗${NC} Docker is not installed. Please install Docker first."
  exit 1
fi

echo -e "${GREEN}✓${NC} Docker is installed"

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
  echo -e "${RED}✗${NC} Docker Compose is not installed. Please install Docker Compose first."
  exit 1
fi

echo -e "${GREEN}✓${NC} Docker Compose is installed"

# Stop and remove existing test containers
echo ""
echo "Cleaning up existing test containers..."
docker-compose -f docker-compose.test.yml down -v 2>/dev/null || true

# Start test database
echo ""
echo "Starting PostgreSQL test database..."
docker-compose -f docker-compose.test.yml up -d postgres-test

# Wait for database to be ready
echo ""
echo "Waiting for PostgreSQL to be ready..."
max_attempts=30
attempt=0

while [ $attempt -lt $max_attempts ]; do
  if docker-compose -f docker-compose.test.yml exec -T postgres-test pg_isready -U test_user -d hipaa_compliance_test &> /dev/null; then
    echo -e "${GREEN}✓${NC} PostgreSQL is ready!"
    break
  fi

  attempt=$((attempt + 1))
  echo -n "."
  sleep 1
done

if [ $attempt -eq $max_attempts ]; then
  echo -e "\n${RED}✗${NC} PostgreSQL failed to start within 30 seconds"
  docker-compose -f docker-compose.test.yml logs postgres-test
  exit 1
fi

# Run database migrations
echo ""
echo "Running database migrations..."
if NODE_ENV=test npx sequelize-cli db:migrate; then
  echo -e "${GREEN}✓${NC} Migrations completed successfully"
else
  echo -e "${RED}✗${NC} Migration failed"
  exit 1
fi

# Test database connection
echo ""
echo "Testing database connection..."
if node -e "
  const { sequelize } = require('./models');
  sequelize.authenticate()
    .then(() => { console.log('Connection successful'); process.exit(0); })
    .catch(err => { console.error('Connection failed:', err.message); process.exit(1); });
"; then
  echo -e "${GREEN}✓${NC} Database connection test passed"
else
  echo -e "${RED}✗${NC} Database connection test failed"
  exit 1
fi

echo ""
echo "========================================="
echo -e "${GREEN}✓ Test database setup complete!${NC}"
echo "========================================="
echo ""
echo "Test database details:"
echo "  Host: localhost"
echo "  Port: 5433"
echo "  Database: hipaa_compliance_test"
echo "  Username: test_user"
echo ""
echo "To run tests:"
echo "  npm test"
echo ""
echo "To stop test database:"
echo "  docker-compose -f docker-compose.test.yml down"
echo ""
