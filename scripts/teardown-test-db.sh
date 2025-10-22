#!/bin/bash
set -e

echo "========================================="
echo "HIPAA Compliance Tool - Test DB Teardown"
echo "========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Stop and remove containers
echo "Stopping test containers..."
docker-compose -f docker-compose.test.yml down -v

echo -e "${GREEN}✓${NC} Test database containers stopped and removed"
echo -e "${YELLOW}Note:${NC} Docker volume 'postgres-test-data' has been removed"
echo ""
