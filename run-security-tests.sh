#!/bin/bash

# Security Test Runner Script
# This script runs the security-related tests for the HIPAA Phase 5 improvements

set -e # Exit on any error

echo "====================================================="
echo "  Running HIPAA Security Enhancement Tests (Phase 5)"
echo "====================================================="

# Check if Jest is installed
if ! command -v npx jest &> /dev/null; then
    echo "Jest not found! Installing test dependencies..."
    npm install --no-save jest supertest
fi

# Set the NODE_ENV to test
export NODE_ENV=test

# Create array of new test files for Phase 5
TEST_FILES=(
    "tests/security/encryption.test.js"
    "tests/security/security.service.test.js"
    "tests/security/session-manager.test.js"
    "tests/security/mfa.middleware.test.js"
    "tests/security/security.middleware.test.js"
    "tests/security/data-protection.test.js"
)

# Run the tests
echo "Running unit tests for new security features..."
npx jest ${TEST_FILES[@]} --verbose

echo ""
echo "====================================================="
echo "  Security Test Summary"
echo "====================================================="
echo "Total test files: ${#TEST_FILES[@]}"
echo "Tests completed successfully!"
echo ""
echo "Security testing for HIPAA Phase 5 is complete."
echo "====================================================="