# HIPAA Compliance Tool - Remaining Epics (8-12)
**Continuation of EPICS_AND_STORIES.md**

This document contains the detailed stories for EPIC-008 through EPIC-012.

---

## EPIC-008: Error Handling & User Experience
**Priority:** MEDIUM
**Effort:** 20 points (2.5 days)
**Business Value:** Improved user experience, easier debugging
**Defects Addressed:** H-005, M-003

### Epic Description
Standardize error handling across the application, provide user-friendly error messages, and implement consistent API response formats.

### Success Metrics
- All API endpoints return standardized error format
- User-friendly error messages for all validation failures
- Zero sensitive information in error responses
- Error handling tests passing

### Stories

---

#### STORY-008.1: Standardize API Response Format
**Priority:** MEDIUM
**Points:** 5
**Defects:** H-005

**As a** frontend developer
**I want** consistent API response formats
**So that** error handling is predictable

**Acceptance Criteria:**
- [ ] Define standard success response format
- [ ] Define standard error response format
- [ ] Update all controllers to use standard format
- [ ] Include request ID in all responses
- [ ] Include timestamp in all responses
- [ ] Document response format in API docs

**Technical Implementation:**
```javascript
// utils/api-response.js
class ApiResponse {
  static success(data, message = 'Success', metadata = {}) {
    return {
      success: true,
      message,
      data,
      metadata,
      timestamp: new Date().toISOString()
    };
  }

  static error(message, code = 'INTERNAL_ERROR', details = null, statusCode = 500) {
    const response = {
      success: false,
      message,
      code,
      timestamp: new Date().toISOString()
    };

    // Include details only in development
    if (process.env.NODE_ENV === 'development' && details) {
      response.details = details;
    }

    return response;
  }

  static validationError(errors) {
    return {
      success: false,
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
      errors: errors.map(err => ({
        field: err.param,
        message: err.msg,
        value: err.value
      })),
      timestamp: new Date().toISOString()
    };
  }

  static notFound(resource = 'Resource') {
    return {
      success: false,
      message: `${resource} not found`,
      code: 'NOT_FOUND',
      timestamp: new Date().toISOString()
    };
  }

  static unauthorized(message = 'Unauthorized access') {
    return {
      success: false,
      message,
      code: 'UNAUTHORIZED',
      timestamp: new Date().toISOString()
    };
  }

  static forbidden(message = 'Access forbidden') {
    return {
      success: false,
      message,
      code: 'FORBIDDEN',
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = ApiResponse;
```

**Usage in Controllers:**
```javascript
// Before
return res.status(200).json({ success: true, data: users });

// After
return res.status(200).json(
  ApiResponse.success(users, 'Users retrieved successfully', {
    total: users.length
  })
);

// Before
return res.status(404).json({ success: false, message: 'User not found' });

// After
return res.status(404).json(ApiResponse.notFound('User'));

// Before
return res.status(400).json({ success: false, message: 'Validation error', errors });

// After
return res.status(400).json(ApiResponse.validationError(errors));
```

**Testing Requirements:**
- [ ] Test success response format
- [ ] Test error response format
- [ ] Test validation error format
- [ ] Test production vs development response differences
- [ ] Test all response codes (200, 201, 400, 401, 403, 404, 500)
- [ ] Verify timestamps are ISO 8601 format
- [ ] Verify no sensitive data in production errors

**Files to Create/Modify:**
- `utils/api-response.js` (create)
- All controller files (update to use ApiResponse)
- `tests/unit/utils/api-response.test.js` (create)
- All integration tests (update assertions)

**Dependencies:** None

---

#### STORY-008.2: Implement Field-Level Validation Error Messages
**Priority:** MEDIUM
**Points:** 3
**Defects:** M-003

**As a** user
**I want** specific validation error messages
**So that** I know exactly what to fix

**Acceptance Criteria:**
- [ ] Each validation error includes field name
- [ ] Each error includes user-friendly message
- [ ] Each error includes error code
- [ ] Group errors by field
- [ ] Return all validation errors at once (not just first)

**Technical Implementation:**
```javascript
// middleware/validation.js
const { validationResult } = require('express-validator');

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(err => ({
      field: err.param,
      message: err.msg,
      value: err.value,
      location: err.location
    }));

    return res.status(400).json(
      ApiResponse.validationError(formattedErrors)
    );
  }

  next();
};

// Example validation with custom messages
router.post('/courses', [
  check('title')
    .trim()
    .notEmpty().withMessage('Title is required')
    .isLength({ max: 200 }).withMessage('Title must be 200 characters or less'),

  check('durationMinutes')
    .notEmpty().withMessage('Duration is required')
    .isInt({ min: 1, max: 10000 }).withMessage('Duration must be between 1 and 10000 minutes'),

  check('passingScore')
    .optional()
    .isInt({ min: 0, max: 100 }).withMessage('Passing score must be between 0 and 100'),

  validateRequest
], trainingController.createCourse);
```

**Testing Requirements:**
- [ ] Test single validation error
- [ ] Test multiple validation errors
- [ ] Test all error messages are user-friendly
- [ ] Test error format consistency

**Files to Modify:**
- `middleware/validation.js`
- All route files
- Integration tests

**Dependencies:** STORY-008.1

---

#### STORY-008.3: Add Request ID Middleware
**Priority:** MEDIUM
**Points:** 2

**As a** developer
**I want** unique request IDs for tracing
**So that** I can debug issues across logs

**Acceptance Criteria:**
- [ ] Generate unique request ID for each request
- [ ] Add request ID to all log entries
- [ ] Include request ID in all API responses
- [ ] Support client-provided request IDs
- [ ] Use UUIDs for request IDs

**Technical Implementation:**
```javascript
// middleware/request-id.js
const { v4: uuidv4 } = require('uuid');

const requestId = (req, res, next) => {
  // Use client-provided ID or generate new one
  req.id = req.headers['x-request-id'] || uuidv4();

  // Add to response header
  res.setHeader('X-Request-ID', req.id);

  // Make available to logger
  req.log = logger.child({ requestId: req.id });

  next();
};

module.exports = requestId;

// server.js
app.use(requestId);

// Usage in logging
req.log.info('Processing request', { url: req.url });
```

**Testing Requirements:**
- [ ] Test request ID generated
- [ ] Test request ID in response headers
- [ ] Test client-provided request ID used
- [ ] Test request ID in logs

**Files to Create:**
- `middleware/request-id.js`
- Update `server.js`
- Update logger configuration

**Dependencies:** None

---

#### STORY-008.4: Implement Structured Error Logging
**Priority:** MEDIUM
**Points:** 5

**As a** DevOps engineer
**I want** structured error logs
**So that** I can monitor and analyze errors effectively

**Acceptance Criteria:**
- [ ] Log all errors with structured data
- [ ] Include error context (user, endpoint, parameters)
- [ ] Categorize errors by type
- [ ] Support log aggregation (JSON format)
- [ ] Include stack traces for server errors
- [ ] Don't log sensitive data (passwords, tokens)

**Technical Implementation:**
```javascript
// utils/logger.js
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'hipaa-compliance-tool',
    environment: process.env.NODE_ENV
  },
  transports: [
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error'
    }),
    new winston.transports.File({
      filename: 'logs/combined.log'
    })
  ]
});

// Console output in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

// Error logging helper
const logError = (error, context = {}) => {
  logger.error('Error occurred', {
    message: error.message,
    name: error.name,
    stack: error.stack,
    ...context
  });
};

module.exports = { logger, logError };

// middleware/error-handler.js
const { logError } = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  // Log with context
  logError(err, {
    requestId: req.id,
    url: req.url,
    method: req.method,
    userId: req.userId,
    ip: req.ip,
    userAgent: req.headers['user-agent']
  });

  // Send response
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json(
    ApiResponse.error(
      err.message || 'Internal server error',
      err.code || 'INTERNAL_ERROR',
      process.env.NODE_ENV === 'development' ? err.stack : null,
      statusCode
    )
  );
};
```

**Testing Requirements:**
- [ ] Test errors are logged
- [ ] Test log format is JSON
- [ ] Test sensitive data not logged
- [ ] Test stack traces in logs
- [ ] Test log context includes all required fields

**Files to Modify:**
- `utils/logger.js`
- `middleware/error-handler.js`
- All controllers

**Dependencies:** STORY-008.1, STORY-008.3

---

#### STORY-008.5: Add User-Friendly Error Pages
**Priority:** LOW
**Points:** 5

**As a** user
**I want** helpful error messages
**So that** I understand what went wrong and how to fix it

**Acceptance Criteria:**
- [ ] 404 error with helpful message
- [ ] 500 error with support contact info
- [ ] 401/403 errors explain authentication issues
- [ ] Include "what to do next" suggestions
- [ ] Log error details but show safe messages to users

**Dependencies:** STORY-008.1

---

## EPIC-009: Workflow & State Management
**Priority:** MEDIUM
**Effort:** 18 points (2 days)
**Business Value:** Prevents invalid operations, ensures data quality
**Defects Addressed:** H-008, H-009

### Epic Description
Implement proper state machine validation for incident and risk assessment workflows, prevent invalid state transitions, and enforce business rules.

### Stories

---

#### STORY-009.1: Implement Incident Status State Machine
**Priority:** MEDIUM
**Points:** 8
**Defects:** H-008

**As a** security officer
**I want** incident status transitions validated
**So that** workflows follow proper procedures

**Acceptance Criteria:**
- [ ] Define valid status transitions
- [ ] Validate transitions in controller
- [ ] Require specific fields for certain statuses
- [ ] Return 400 for invalid transitions with explanation
- [ ] Log invalid transition attempts
- [ ] Test all valid and invalid transitions

**Technical Implementation:**
```javascript
// utils/state-machine.js
class StateMachine {
  constructor(transitions) {
    this.transitions = transitions;
  }

  canTransition(from, to) {
    return this.transitions[from]?.includes(to) || false;
  }

  getValidTransitions(from) {
    return this.transitions[from] || [];
  }

  validateTransition(from, to) {
    if (!this.canTransition(from, to)) {
      throw new Error(
        `Invalid transition from '${from}' to '${to}'. ` +
        `Valid transitions: ${this.getValidTransitions(from).join(', ')}`
      );
    }
  }
}

// Incident status state machine
const incidentStatusMachine = new StateMachine({
  'reported': ['under_investigation', 'closed'],
  'under_investigation': ['remediated', 'closed'],
  'remediated': ['closed'],
  'closed': ['under_investigation'], // Can reopen if needed
  'archived': [] // Terminal state
});

module.exports = {
  StateMachine,
  incidentStatusMachine
};

// controllers/incident.controller.js
const { incidentStatusMachine } = require('../utils/state-machine');

exports.updateIncident = async (req, res) => {
  try {
    const { id } = req.params;
    const { status: newStatus, ...updateData } = req.body;

    const incident = await Incident.findByPk(id);

    if (!incident) {
      return res.status(404).json(ApiResponse.notFound('Incident'));
    }

    // Validate status transition
    if (newStatus && newStatus !== incident.status) {
      try {
        incidentStatusMachine.validateTransition(incident.status, newStatus);
      } catch (error) {
        return res.status(400).json(
          ApiResponse.error(
            error.message,
            'INVALID_STATE_TRANSITION',
            {
              currentStatus: incident.status,
              requestedStatus: newStatus,
              validTransitions: incidentStatusMachine.getValidTransitions(incident.status)
            }
          )
        );
      }

      // Validate required fields for specific transitions
      if (newStatus === 'closed') {
        if (!updateData.rootCause || !updateData.preventiveMeasures) {
          return res.status(400).json(
            ApiResponse.error(
              'Root cause and preventive measures are required to close an incident',
              'VALIDATION_ERROR'
            )
          );
        }
      }

      if (newStatus === 'remediated') {
        if (!updateData.remediationPlan || !updateData.remediationDate) {
          return res.status(400).json(
            ApiResponse.error(
              'Remediation plan and date are required',
              'VALIDATION_ERROR'
            )
          );
        }
      }
    }

    // Update incident
    await incident.update({
      ...updateData,
      status: newStatus || incident.status
    });

    // Create status update record
    if (newStatus && newStatus !== incident.status) {
      await IncidentUpdate.create({
        incidentId: id,
        updateDate: new Date(),
        updatedBy: req.userId,
        updateType: 'status_change',
        previousStatus: incident.status,
        newStatus: newStatus,
        description: `Status changed from ${incident.status} to ${newStatus}`
      });
    }

    return res.status(200).json(
      ApiResponse.success(incident, 'Incident updated successfully')
    );
  } catch (error) {
    logError(error, { incidentId: id, userId: req.userId });
    return res.status(500).json(
      ApiResponse.error('Failed to update incident')
    );
  }
};
```

**Testing Requirements:**
- [ ] Test valid transition: reported → under_investigation
- [ ] Test valid transition: under_investigation → remediated
- [ ] Test valid transition: remediated → closed
- [ ] Test invalid transition: reported → remediated (should fail)
- [ ] Test invalid transition: closed → archived (without proper workflow)
- [ ] Test required fields validation for closure
- [ ] Test required fields for remediation
- [ ] Test reopening closed incident
- [ ] Verify incident update timeline created
- [ ] Test error messages are helpful

**Files to Create/Modify:**
- `utils/state-machine.js` (create)
- `controllers/incident.controller.js`
- `tests/unit/utils/state-machine.test.js` (create)
- `tests/integration/api/incident.api.test.js` (add state machine tests)

**Dependencies:** STORY-008.1

---

#### STORY-009.2: Implement Risk Assessment Workflow Validation
**Priority:** MEDIUM
**Points:** 5
**Defects:** H-008

**As a** compliance officer
**I want** risk assessment status transitions validated
**So that** assessments follow proper approval workflow

**Acceptance Criteria:**
- [ ] Define valid assessment status transitions
- [ ] Prevent skipping assessment steps
- [ ] Require risk items before completion
- [ ] Require approval before archival
- [ ] Test all transitions

**Technical Implementation:**
```javascript
const riskAssessmentStatusMachine = new StateMachine({
  'draft': ['in_progress'],
  'in_progress': ['completed', 'draft'],
  'completed': ['archived'],
  'archived': [] // Terminal
});

// Validation in controller
exports.updateRiskAssessment = async (req, res) => {
  // ... similar to incident

  // Additional validation: require risk items before completion
  if (newStatus === 'completed') {
    const riskItemCount = await RiskItem.count({
      where: { assessmentId: id }
    });

    if (riskItemCount === 0) {
      return res.status(400).json(
        ApiResponse.error(
          'Cannot complete assessment without risk items',
          'VALIDATION_ERROR'
        )
      );
    }
  }

  // Require approval before archival
  if (newStatus === 'archived') {
    if (!assessment.approvedBy || !assessment.approvalDate) {
      return res.status(400).json(
        ApiResponse.error(
          'Assessment must be approved before archival',
          'VALIDATION_ERROR'
        )
      );
    }
  }
};
```

**Testing Requirements:**
- [ ] Test cannot complete without risk items
- [ ] Test cannot archive without approval
- [ ] Test valid transitions
- [ ] Test invalid transitions return helpful errors

**Files to Modify:**
- `utils/state-machine.js`
- `controllers/risk.controller.js`
- `tests/integration/api/risk.api.test.js`

**Dependencies:** STORY-009.1

---

#### STORY-009.3: Prevent Duplicate Active Operations
**Priority:** MEDIUM
**Points:** 5
**Defects:** H-009

**As a** user
**I want** duplicate active assignments prevented
**So that** I don't have conflicting records

**Acceptance Criteria:**
- [ ] Check for existing active assignment before creating
- [ ] Check for existing active risk assessment
- [ ] Return helpful error message for duplicates
- [ ] Allow creating new assignment if previous is completed
- [ ] Test duplicate prevention

**Technical Implementation:**
```javascript
// controllers/training.controller.js
exports.createAssignment = async (req, res) => {
  try {
    const { userId, courseId, dueDate } = req.body;

    // Check for existing active assignment
    const existingAssignment = await TrainingAssignment.findOne({
      where: {
        userId,
        courseId,
        status: {
          [Op.in]: ['assigned', 'in_progress']
        }
      }
    });

    if (existingAssignment) {
      return res.status(400).json(
        ApiResponse.error(
          'User already has an active assignment for this course',
          'DUPLICATE_ASSIGNMENT',
          {
            existingAssignmentId: existingAssignment.id,
            status: existingAssignment.status,
            dueDate: existingAssignment.dueDate
          }
        )
      );
    }

    // Create assignment
    const assignment = await TrainingAssignment.create({
      userId,
      courseId,
      assignedBy: req.userId,
      assignedDate: new Date(),
      dueDate,
      status: 'assigned'
    });

    return res.status(201).json(
      ApiResponse.success(assignment, 'Assignment created successfully')
    );
  } catch (error) {
    logError(error);
    return res.status(500).json(
      ApiResponse.error('Failed to create assignment')
    );
  }
};
```

**Testing Requirements:**
- [ ] Test creating first assignment succeeds
- [ ] Test creating duplicate active assignment fails
- [ ] Test creating assignment after completion succeeds
- [ ] Test error message includes existing assignment details

**Files to Modify:**
- `controllers/training.controller.js`
- `controllers/risk.controller.js`
- `tests/integration/api/training.api.test.js`

**Dependencies:** None

---

## EPIC-010: Monitoring & Observability
**Priority:** MEDIUM
**Effort:** 15 points (2 days)
**Business Value:** Enables proactive issue detection, performance monitoring
**Defects Addressed:** M-007, M-013

### Epic Description
Implement comprehensive monitoring, logging, and observability tools to track application health, performance, and user activity.

### Stories

---

#### STORY-010.1: Enhance Health Check Endpoint
**Priority:** MEDIUM
**Points:** 3
**Defects:** M-013

**As a** DevOps engineer
**I want** comprehensive health checks
**So that** I can monitor application status

**Acceptance Criteria:**
- [ ] Check database connectivity
- [ ] Check Redis connectivity (if applicable)
- [ ] Check disk space
- [ ] Check memory usage
- [ ] Return detailed health status
- [ ] Support /health/ready and /health/live endpoints

**Technical Implementation:**
```javascript
// routes/health.routes.js
const express = require('express');
const router = express.Router();
const os = require('os');
const { sequelize } = require('../models');

// Liveness probe - is app running?
router.get('/live', (req, res) => {
  res.status(200).json({
    status: 'UP',
    timestamp: new Date().toISOString()
  });
});

// Readiness probe - is app ready to serve traffic?
router.get('/ready', async (req, res) => {
  const health = {
    status: 'UP',
    timestamp: new Date().toISOString(),
    checks: {}
  };

  let isHealthy = true;

  // Check database
  try {
    await sequelize.authenticate();
    health.checks.database = {
      status: 'UP',
      responseTime: Date.now()
    };
  } catch (error) {
    health.checks.database = {
      status: 'DOWN',
      error: error.message
    };
    isHealthy = false;
  }

  // Check disk space
  const diskUsage = os.totalmem() - os.freemem();
  const diskUsagePercent = (diskUsage / os.totalmem()) * 100;

  health.checks.disk = {
    status: diskUsagePercent < 90 ? 'UP' : 'DOWN',
    usagePercent: diskUsagePercent.toFixed(2),
    totalMemory: os.totalmem(),
    freeMemory: os.freemem()
  };

  if (diskUsagePercent >= 90) {
    isHealthy = false;
  }

  // Check memory
  const memUsage = process.memoryUsage();
  health.checks.memory = {
    status: 'UP',
    heapUsed: memUsage.heapUsed,
    heapTotal: memUsage.heapTotal,
    external: memUsage.external
  };

  health.status = isHealthy ? 'UP' : 'DOWN';

  res.status(isHealthy ? 200 : 503).json(health);
});

// Detailed health endpoint
router.get('/', async (req, res) => {
  const health = {
    status: 'UP',
    version: process.env.APP_VERSION || '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    checks: {}
  };

  // All health checks...

  res.json(health);
});

module.exports = router;
```

**Testing Requirements:**
- [ ] Test /health/live returns 200
- [ ] Test /health/ready with healthy database
- [ ] Test /health/ready with database down returns 503
- [ ] Test health check includes all components

**Files to Create/Modify:**
- `routes/health.routes.js`
- `server.js`
- `tests/integration/health.test.js`

**Dependencies:** None

---

#### STORY-010.2: Implement Request/Response Logging
**Priority:** MEDIUM
**Points:** 5
**Defects:** M-007

**As a** developer
**I want** all HTTP requests logged
**So that** I can debug issues and monitor usage

**Acceptance Criteria:**
- [ ] Log all HTTP requests
- [ ] Include method, URL, status code, response time
- [ ] Log request/response bodies (sanitized)
- [ ] Don't log sensitive data (passwords, tokens)
- [ ] Support log levels
- [ ] Performance impact < 5ms per request

**Technical Implementation:**
```javascript
// middleware/request-logger.js
const morgan = require('morgan');
const logger = require('../utils/logger');

// Custom token for response time
morgan.token('response-time-ms', (req, res) => {
  const duration = Date.now() - req._startTime;
  return duration.toString();
});

// Create custom format
const requestLogger = morgan((tokens, req, res) => {
  return JSON.stringify({
    requestId: req.id,
    method: tokens.method(req, res),
    url: tokens.url(req, res),
    status: tokens.status(req, res),
    responseTime: `${tokens['response-time-ms'](req, res)}ms`,
    contentLength: tokens.res(req, res, 'content-length'),
    userAgent: tokens['user-agent'](req, res),
    userId: req.userId,
    ip: req.ip,
    timestamp: new Date().toISOString()
  });
}, {
  stream: {
    write: (message) => {
      const log = JSON.parse(message);
      logger.info('HTTP Request', log);
    }
  }
});

// Add start time to request
const addStartTime = (req, res, next) => {
  req._startTime = Date.now();
  next();
};

module.exports = { requestLogger, addStartTime };
```

**Testing Requirements:**
- [ ] Test requests are logged
- [ ] Test log format is correct
- [ ] Test sensitive data not logged
- [ ] Performance test logging overhead

**Files to Create:**
- `middleware/request-logger.js`
- Update `server.js`

**Dependencies:** STORY-008.3

---

#### STORY-010.3: Add Performance Metrics Collection
**Priority:** MEDIUM
**Points:** 5

**As a** DevOps engineer
**I want** performance metrics collected
**So that** I can identify bottlenecks

**Acceptance Criteria:**
- [ ] Track response times by endpoint
- [ ] Track database query times
- [ ] Track error rates
- [ ] Expose metrics endpoint
- [ ] Support Prometheus format (optional)

**Dependencies:** STORY-010.2

---

#### STORY-010.4: Implement Application-Level Monitoring
**Priority:** LOW
**Points:** 3

**As a** administrator
**I want** monitoring dashboards
**So that** I can see application health at a glance

**Acceptance Criteria:**
- [ ] Create admin dashboard with system stats
- [ ] Show active users
- [ ] Show error rate trends
- [ ] Show performance metrics

**Dependencies:** STORY-010.2, STORY-010.3

---

## EPIC-011: CI/CD & Automation
**Priority:** MEDIUM
**Effort:** 20 points (2.5 days)
**Business Value:** Faster deployments, automated quality checks
**Defects Addressed:** Testing automation needs

### Epic Description
Set up continuous integration and continuous deployment pipeline with automated testing, security scanning, and deployment automation.

### Stories

---

#### STORY-011.1: Create GitHub Actions CI Pipeline
**Priority:** MEDIUM
**Points:** 8

**As a** developer
**I want** automated testing on every commit
**So that** bugs are caught early

**Acceptance Criteria:**
- [ ] Run tests on every pull request
- [ ] Run tests on every push to develop
- [ ] Block merge if tests fail
- [ ] Run linting and formatting checks
- [ ] Generate code coverage report
- [ ] Publish coverage to service (e.g., Codecov)

**Technical Implementation:**
```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [ develop, main ]
  pull_request:
    branches: [ develop, main ]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_DB: hipaa_compliance_test
          POSTGRES_USER: test_user
          POSTGRES_PASSWORD: test_password
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '16'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint

      - name: Run tests
        env:
          NODE_ENV: test
          TEST_DB_HOST: localhost
          TEST_DB_PORT: 5432
          TEST_DB_NAME: hipaa_compliance_test
          TEST_DB_USERNAME: test_user
          TEST_DB_PASSWORD: test_password
        run: npm test -- --coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info

      - name: Run security audit
        run: npm audit --audit-level=moderate

  lint:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '16'

      - name: Install dependencies
        run: npm ci

      - name: Run ESLint
        run: npm run lint

  security:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Run Snyk security scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
```

**Testing Requirements:**
- [ ] Test pipeline runs on PR
- [ ] Test pipeline blocks merge on failure
- [ ] Test coverage report generated
- [ ] Test security scan runs

**Files to Create:**
- `.github/workflows/ci.yml`
- `.eslintrc.js` (if not exists)
- `.prettierrc` (if not exists)

**Dependencies:** STORY-004.1

---

#### STORY-011.2: Add Pre-commit Hooks
**Priority:** MEDIUM
**Points:** 3

**As a** developer
**I want** code quality checks before commit
**So that** bad code doesn't enter the repository

**Acceptance Criteria:**
- [ ] Run linter before commit
- [ ] Run formatter before commit
- [ ] Run tests before push
- [ ] Block commit if checks fail
- [ ] Document pre-commit setup

**Technical Implementation:**
```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged",
      "pre-push": "npm test"
    }
  },
  "lint-staged": {
    "*.js": [
      "eslint --fix",
      "prettier --write"
    ]
  }
}
```

**Files to Modify:**
- `package.json`
- Add `husky` and `lint-staged` dependencies

**Dependencies:** None

---

#### STORY-011.3: Create Deployment Pipeline
**Priority:** MEDIUM
**Points:** 8

**As a** DevOps engineer
**I want** automated deployments
**So that** releases are consistent and reliable

**Acceptance Criteria:**
- [ ] Deploy to staging on merge to develop
- [ ] Deploy to production on tag
- [ ] Run smoke tests after deployment
- [ ] Rollback on deployment failure
- [ ] Notify team of deployments

**Dependencies:** STORY-011.1

---

#### STORY-011.4: Add Database Migration Automation
**Priority:** LOW
**Points:** 3

**As a** developer
**I want** database migrations automated
**So that** schema changes are managed consistently

**Acceptance Criteria:**
- [ ] Run migrations in CI/CD
- [ ] Verify migrations before deployment
- [ ] Backup database before migrations
- [ ] Test migration rollback

**Dependencies:** STORY-011.3

---

## EPIC-012: Documentation & Knowledge Transfer
**Priority:** LOW
**Effort:** 15 points (2 days)
**Business Value:** Easier onboarding, better maintenance
**Defects Addressed:** M-014

### Epic Description
Create comprehensive documentation for API, architecture, deployment, and development processes.

### Stories

---

#### STORY-012.1: Generate OpenAPI/Swagger Documentation
**Priority:** MEDIUM
**Points:** 5
**Defects:** M-014

**As a** API consumer
**I want** interactive API documentation
**So that** I can understand and test endpoints

**Acceptance Criteria:**
- [ ] Generate OpenAPI 3.0 spec
- [ ] Document all endpoints
- [ ] Include request/response examples
- [ ] Add authentication documentation
- [ ] Host Swagger UI
- [ ] Keep documentation in sync with code

**Technical Implementation:**
```javascript
// Install swagger-jsdoc and swagger-ui-express
npm install swagger-jsdoc swagger-ui-express

// server.js
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'HIPAA Compliance Tool API',
      version: '1.0.0',
      description: 'API documentation for HIPAA Compliance Tool',
    },
    servers: [
      {
        url: 'http://localhost:8080/api',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./routes/*.js'], // Files containing annotations
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Add annotations to routes
/**
 * @swagger
 * /training/courses:
 *   get:
 *     summary: Get all training courses
 *     tags: [Training]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of training courses
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/TrainingCourse'
 */
router.get('/courses', authJwt.verifyToken, trainingController.getAllCourses);
```

**Testing Requirements:**
- [ ] Verify Swagger UI accessible
- [ ] Verify all endpoints documented
- [ ] Test API calls from Swagger UI

**Files to Modify:**
- `server.js`
- All route files (add annotations)

**Dependencies:** None

---

#### STORY-012.2: Create Developer Setup Guide
**Priority:** MEDIUM
**Points:** 3

**As a** new developer
**I want** clear setup instructions
**So that** I can start contributing quickly

**Acceptance Criteria:**
- [ ] Document prerequisites
- [ ] Document installation steps
- [ ] Document environment setup
- [ ] Document running tests
- [ ] Document common issues

**Files to Create:**
- `docs/DEVELOPER_SETUP.md`

**Dependencies:** None

---

#### STORY-012.3: Document Architecture and Design Decisions
**Priority:** MEDIUM
**Points:** 5

**As a** developer
**I want** architecture documentation
**So that** I understand design decisions

**Acceptance Criteria:**
- [ ] Create architecture diagrams
- [ ] Document major design decisions
- [ ] Document security architecture
- [ ] Document data flow
- [ ] Create ADR (Architecture Decision Records)

**Files to Create:**
- `docs/ARCHITECTURE.md`
- `docs/adr/` (directory for ADRs)

**Dependencies:** None

---

#### STORY-012.4: Create Runbook for Operations
**Priority:** MEDIUM
**Points:** 3

**As an** operations engineer
**I want** operational runbooks
**So that** I can handle incidents effectively

**Acceptance Criteria:**
- [ ] Document common operational tasks
- [ ] Document incident response procedures
- [ ] Document backup/restore procedures
- [ ] Document monitoring and alerting
- [ ] Document troubleshooting steps

**Files to Create:**
- `docs/RUNBOOK.md`

**Dependencies:** STORY-010.1

---

## Summary

### Total Effort Breakdown by Epic

| Epic | Priority | Stories | Points | Days |
|------|----------|---------|--------|------|
| EPIC-001: Input Validation | CRITICAL | 7 | 28 | 3.5 |
| EPIC-002: Security Hardening | CRITICAL | 6 | 35 | 4.5 |
| EPIC-003: Data Integrity | CRITICAL | 5 | 25 | 3 |
| EPIC-004: Test Infrastructure | CRITICAL | 4 | 20 | 2.5 |
| EPIC-005: Audit & Compliance | HIGH | 6 | 30 | 4 |
| EPIC-006: Authorization | HIGH | 4 | 25 | 3 |
| EPIC-007: Performance | HIGH | 5 | 30 | 4 |
| EPIC-008: Error Handling | MEDIUM | 5 | 20 | 2.5 |
| EPIC-009: Workflow | MEDIUM | 3 | 18 | 2 |
| EPIC-010: Monitoring | MEDIUM | 4 | 15 | 2 |
| EPIC-011: CI/CD | MEDIUM | 4 | 20 | 2.5 |
| EPIC-012: Documentation | LOW | 4 | 15 | 2 |
| **TOTAL** | | **89** | **~320** | **40** |

### Timeline with 2 Developers (20 weeks total / 2 = 10 weeks)

### Epic Completion Order
1. EPIC-004: Test Infrastructure (foundational)
2. EPIC-001: Input Validation (critical security)
3. EPIC-002: Security Hardening (critical security)
4. EPIC-003: Data Integrity (critical data)
5. EPIC-005: Audit & Compliance (high - compliance)
6. EPIC-007: Performance (high - scalability)
7. EPIC-006: Authorization (high - security)
8. EPIC-008: Error Handling (medium - UX)
9. EPIC-009: Workflow (medium - data quality)
10. EPIC-010: Monitoring (medium - operations)
11. EPIC-011: CI/CD (medium - automation)
12. EPIC-012: Documentation (low - knowledge transfer)

---

**END OF REMAINING EPICS**
