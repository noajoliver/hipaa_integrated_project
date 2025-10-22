# Test Infrastructure Setup Guide

## Overview

This guide explains how to set up and use the test infrastructure for the HIPAA Compliance Tool.

## Prerequisites

- Docker Desktop (for Mac/Windows) or Docker Engine + Docker Compose (for Linux)
- Node.js 16+ and npm
- At least 2GB of free disk space

## Quick Start

### 1. Set Up Test Database

```bash
# Make setup script executable (if not already)
chmod +x scripts/setup-test-db.sh

# Run setup script
./scripts/setup-test-db.sh
```

This script will:
- Start PostgreSQL test database in Docker
- Wait for database to be ready
- Run all database migrations
- Test the connection

### 2. Run Tests

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit                    # Unit tests only
npm run test:integration             # Integration tests only
npm run test:performance             # Performance tests
npm run test:e2e                     # End-to-end tests

# Run specific test file
npm test -- tests/integration/api/training.api.test.js

# Run with coverage
npm test -- --coverage

# Run in watch mode (for development)
npm test -- --watch
```

### 3. Tear Down Test Database

```bash
# Stop and remove test containers
./scripts/teardown-test-db.sh

# Or manually with Docker Compose
docker-compose -f docker-compose.test.yml down -v
```

## Manual Setup

If you prefer to set up manually or troubleshoot:

### 1. Start Test Database

```bash
docker-compose -f docker-compose.test.yml up -d
```

### 2. Wait for Database to Be Ready

```bash
# Check if database is ready
docker-compose -f docker-compose.test.yml exec postgres-test pg_isready -U test_user

# View logs if there are issues
docker-compose -f docker-compose.test.yml logs postgres-test
```

### 3. Run Migrations

```bash
NODE_ENV=test npx sequelize-cli db:migrate
```

### 4. Verify Connection

```bash
# Connect to test database
docker-compose -f docker-compose.test.yml exec postgres-test psql -U test_user -d hipaa_compliance_test

# Inside psql:
\dt  # List tables
\q   # Quit
```

## Test Database Details

### Connection Information

- **Host:** localhost
- **Port:** 5433 (not the default 5432 to avoid conflicts)
- **Database:** hipaa_compliance_test
- **Username:** test_user
- **Password:** test_password

### Environment Variables

All test environment variables are in `.env.test`:

```bash
NODE_ENV=test
TEST_DB_HOST=localhost
TEST_DB_PORT=5433
TEST_DB_NAME=hipaa_compliance_test
TEST_DB_USERNAME=test_user
TEST_DB_PASSWORD=test_password
```

## Test Data Management

### Test Data Factories

Test data is created using factories in `tests/utils/factories.js`:

```javascript
const Factories = require('./tests/utils/factories');

// Create a test user
const user = await Factories.createUser();

// Create an admin
const admin = await Factories.createAdmin();

// Create a compliance officer
const officer = await Factories.createComplianceOfficer();

// Create a training course
const course = await Factories.createCourse();

// Create multiple records
const users = await Factories.createMultiple(Factories.createUser, 10);
```

### Cleaning Up Test Data

```javascript
// Clean up all test data
await Factories.cleanup();
```

### Database Reset Between Tests

Tests use `beforeEach` and `afterEach` hooks to manage data:

```javascript
beforeEach(async () => {
  // Reset database to clean state
  await resetAndSeed();
});

afterEach(async () => {
  // Clean up test data
  await Factories.cleanup();
});
```

## Troubleshooting

### Database Connection Refused

**Problem:** Tests fail with `ECONNREFUSED 127.0.0.1:5433`

**Solution:**
```bash
# Check if PostgreSQL container is running
docker-compose -f docker-compose.test.yml ps

# If not running, start it
docker-compose -f docker-compose.test.yml up -d postgres-test

# Check logs
docker-compose -f docker-compose.test.yml logs postgres-test
```

### Port Already in Use

**Problem:** Port 5433 is already in use

**Solution:**
```bash
# Find what's using the port
lsof -i :5433

# Option 1: Stop the conflicting service
# Option 2: Change TEST_DB_PORT in .env.test and docker-compose.test.yml
```

### Migrations Not Running

**Problem:** Tables not found in test database

**Solution:**
```bash
# Manually run migrations
NODE_ENV=test npx sequelize-cli db:migrate

# Check migration status
NODE_ENV=test npx sequelize-cli db:migrate:status

# Reset database (WARNING: deletes all data)
NODE_ENV=test npx sequelize-cli db:migrate:undo:all
NODE_ENV=test npx sequelize-cli db:migrate
```

### Tests Timeout

**Problem:** Tests timeout waiting for database

**Solution:**
```bash
# Increase Jest timeout in package.json
{
  "jest": {
    "testTimeout": 30000  // 30 seconds
  }
}

# Or in individual test files
jest.setTimeout(30000);
```

### Container Won't Stop

**Problem:** `docker-compose down` hangs

**Solution:**
```bash
# Force stop containers
docker-compose -f docker-compose.test.yml kill

# Remove containers
docker-compose -f docker-compose.test.yml rm -f

# Remove volumes
docker volume rm hipaa_integrated_project_postgres-test-data
```

## CI/CD Integration

### GitHub Actions

The test database is automatically set up in CI using the service container:

```yaml
# .github/workflows/ci.yml
services:
  postgres:
    image: postgres:14
    env:
      POSTGRES_DB: hipaa_compliance_test
      POSTGRES_USER: test_user
      POSTGRES_PASSWORD: test_password
    ports:
      - 5432:5432
```

### Running Tests in CI

```bash
# Tests run with these environment variables in CI
NODE_ENV=test \
TEST_DB_HOST=localhost \
TEST_DB_PORT=5432 \
npm test
```

## Performance Considerations

### Test Speed

- **Unit tests:** Should complete in < 5 seconds
- **Integration tests:** Should complete in < 30 seconds
- **E2E tests:** May take 1-2 minutes

### Optimizations

1. **Use transactions in tests:**
   ```javascript
   let transaction;
   beforeEach(async () => {
     transaction = await sequelize.transaction();
   });
   afterEach(async () => {
     await transaction.rollback();
   });
   ```

2. **Run tests in parallel:**
   ```bash
   npm test -- --maxWorkers=4
   ```

3. **Skip slow tests during development:**
   ```javascript
   describe.skip('Slow integration tests', () => {
     // These only run in CI
   });
   ```

## Writing New Tests

### Test File Structure

```
tests/
├── unit/                  # Unit tests for individual functions
│   ├── models/           # Model tests
│   ├── utils/            # Utility function tests
│   └── middleware/       # Middleware tests
├── integration/          # Integration tests
│   ├── api/             # API endpoint tests
│   └── models/          # Model integration tests
├── performance/          # Performance tests
├── e2e/                 # End-to-end workflow tests
└── utils/               # Test utilities
    ├── factories.js     # Test data factories
    ├── test-db.js       # Database utilities
    └── assertions.js    # Custom assertions
```

### Example Test

```javascript
const request = require('supertest');
const app = require('../../server');
const { connect, resetAndSeed, disconnect } = require('../utils/test-db');
const Factories = require('../utils/factories');

describe('Training API', () => {
  beforeAll(async () => {
    await connect();
    await resetAndSeed();
  });

  afterAll(async () => {
    await disconnect();
  });

  beforeEach(async () => {
    await Factories.cleanup();
  });

  it('should create a training course', async () => {
    const admin = await Factories.createAdmin();
    const token = generateToken(admin);

    const response = await request(app)
      .post('/api/training/courses')
      .set('x-access-token', token)
      .send({
        title: 'Test Course',
        durationMinutes: 60
      })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('id');
  });
});
```

## Best Practices

1. **Isolate tests:** Each test should be independent
2. **Clean up data:** Always clean up test data after tests
3. **Use factories:** Don't create test data manually
4. **Mock external services:** Don't call real APIs in tests
5. **Test error cases:** Don't just test the happy path
6. **Keep tests fast:** Optimize for speed
7. **Descriptive names:** Test names should explain what they test

## Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Sequelize Testing Guide](https://sequelize.org/docs/v6/other-topics/migrations/)
- [Docker Documentation](https://docs.docker.com/)

## Support

If you encounter issues not covered in this guide:
1. Check the troubleshooting section
2. Review existing test files for examples
3. Contact the development team

---

**Last Updated:** October 22, 2025
**Version:** 1.0
