#!/bin/bash
set -e

# Test script for HIPAA Compliance Tool
# This script tests the integrated application components

echo "HIPAA Compliance Tool - Integration Test"
echo "========================================"
echo

# Test database connection
echo "Testing database connection..."
node -e "
const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME || 'hipaa_compliance',
  process.env.DB_USER || 'hipaa_user',
  process.env.DB_PASSWORD || 'your_secure_password',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false
  }
);

sequelize.authenticate()
  .then(() => {
    console.log('✓ Database connection successful');
    process.exit(0);
  })
  .catch(err => {
    console.error('✗ Database connection failed:', err.message);
    process.exit(1);
  });
"

# Test API endpoints
echo
echo "Testing API health endpoint..."
node -e "
const http = require('http');

const options = {
  hostname: 'localhost',
  port: process.env.PORT || 8080,
  path: '/api/health',
  method: 'GET',
  timeout: 5000
};

const req = http.request(options, res => {
  if (res.statusCode === 200) {
    console.log('✓ API health endpoint is responding correctly');
    process.exit(0);
  } else {
    console.error('✗ API health endpoint returned status:', res.statusCode);
    process.exit(1);
  }
});

req.on('error', error => {
  console.error('✗ API health endpoint test failed:', error.message);
  console.log('  Make sure the server is running with: npm start');
  process.exit(1);
});

req.on('timeout', () => {
  console.error('✗ API health endpoint test timed out');
  req.destroy();
  process.exit(1);
});

req.end();
"

# Test frontend build
echo
echo "Testing frontend build..."
if [ -d "client/build" ] && [ -f "client/build/index.html" ]; then
  echo "✓ Frontend build exists"
else
  echo "✗ Frontend build not found"
  echo "  Run: npm run client-build"
  exit 1
fi

echo
echo "All tests passed successfully!"
echo "The HIPAA Compliance Tool is properly integrated and ready for use."
echo
