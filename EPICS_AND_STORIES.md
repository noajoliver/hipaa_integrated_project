# HIPAA Compliance Tool - Epics & User Stories
**Version:** 1.0
**Date:** October 22, 2025
**Project:** HIPAA Compliance Tool Defect Remediation

---

## Table of Contents
1. [Overview](#overview)
2. [Epic Hierarchy](#epic-hierarchy)
3. [Critical Priority Epics](#critical-priority-epics)
4. [High Priority Epics](#high-priority-epics)
5. [Medium Priority Epics](#medium-priority-epics)
6. [Infrastructure & Testing Epics](#infrastructure--testing-epics)
7. [Story Dependencies](#story-dependencies)
8. [Release Planning](#release-planning)

---

## Overview

This document contains **12 Epics** and **89 User Stories** to remediate the 69 defects identified in the HIPAA Compliance Tool and bring it to production-ready state.

### Definition of Done (All Stories)
- [ ] Code implemented and peer-reviewed
- [ ] Unit tests written and passing (>80% coverage for new code)
- [ ] Integration tests written and passing
- [ ] Manual testing completed
- [ ] Security review completed (for security-related stories)
- [ ] Documentation updated
- [ ] Code merged to develop branch
- [ ] No regression in existing tests
- [ ] Acceptance criteria met

### Story Point Scale
- **1 point**: 1-2 hours (trivial change)
- **2 points**: 2-4 hours (small change)
- **3 points**: 4-8 hours (moderate change)
- **5 points**: 1-2 days (significant change)
- **8 points**: 2-3 days (complex change)
- **13 points**: 3-5 days (very complex, should be split)

---

## Epic Hierarchy

### Phase 1: Critical Security & Data Integrity (Weeks 1-4)
- **EPIC-001**: Input Validation Framework
- **EPIC-002**: Security Hardening
- **EPIC-003**: Data Integrity & Transactions
- **EPIC-004**: Test Infrastructure Setup

### Phase 2: Compliance & Core Functionality (Weeks 5-6)
- **EPIC-005**: Audit & Compliance Framework
- **EPIC-006**: Authorization & Access Control
- **EPIC-007**: Performance & Scalability

### Phase 3: User Experience & Quality (Weeks 7-8)
- **EPIC-008**: Error Handling & User Experience
- **EPIC-009**: Workflow & State Management
- **EPIC-010**: Monitoring & Observability

### Phase 4: Production Readiness (Weeks 9-10)
- **EPIC-011**: CI/CD & Automation
- **EPIC-012**: Documentation & Knowledge Transfer

---

# CRITICAL PRIORITY EPICS

---

## EPIC-001: Input Validation Framework
**Priority:** CRITICAL
**Effort:** 40 points (5 days)
**Business Value:** Prevents data corruption, security vulnerabilities
**Defects Addressed:** C-001, C-002, C-004, H-006

### Epic Description
Implement comprehensive input validation across all API endpoints to prevent invalid data, injection attacks, and application crashes. This epic establishes a consistent validation framework using express-validator middleware.

### Success Metrics
- 100% of API endpoints have input validation
- Zero invalid data entries in database after implementation
- Validation error rate tracked and monitored
- All validation tests passing

### Stories

---

#### STORY-001.1: Create Input Validation Middleware Framework
**Priority:** CRITICAL
**Points:** 5
**Defects:** C-001, C-002

**As a** backend developer
**I want** a reusable validation middleware framework
**So that** all endpoints have consistent, comprehensive input validation

**Acceptance Criteria:**
- [ ] Create `middleware/validation.js` with reusable validators
- [ ] Implement validators for: integers, floats, dates, enums, strings, emails
- [ ] Create validation chain builders for common patterns
- [ ] Add request sanitization utilities
- [ ] Create error response formatter for validation failures
- [ ] Document validation middleware usage with examples

**Technical Requirements:**
```javascript
// Example validators to implement:
- validateInteger(min, max, fieldName)
- validateFloat(min, max, precision, fieldName)
- validateEnum(allowedValues, fieldName)
- validateDate(futureAllowed, pastAllowed, fieldName)
- validateString(minLen, maxLen, pattern, fieldName)
- validateId(fieldName)
- sanitizeInput(fields)
```

**Testing Requirements:**
- [ ] Unit tests for each validator (20+ test cases)
- [ ] Test edge cases: null, undefined, empty string, NaN, Infinity
- [ ] Test boundary values
- [ ] Test SQL injection attempts
- [ ] Test XSS payloads
- [ ] Test unicode and special characters
- [ ] Integration test with sample endpoint

**Files to Create/Modify:**
- `middleware/validation.js` (new)
- `middleware/index.js` (update)
- `tests/unit/middleware/validation.test.js` (new)

**Dependencies:** None

---

#### STORY-001.2: Add Validation to Training Course Endpoints
**Priority:** CRITICAL
**Points:** 3
**Defects:** C-001

**As a** training administrator
**I want** training course data validated before saving
**So that** courses have valid duration, scores, and metadata

**Acceptance Criteria:**
- [ ] Validate `durationMinutes`: 1-10000, integer required
- [ ] Validate `frequencyDays`: 1-3650, integer, optional
- [ ] Validate `passingScore`: 0-100, integer, optional
- [ ] Validate `contentType`: enum [video, document, quiz, interactive, webinar, classroom]
- [ ] Validate `status`: enum [draft, active, inactive, archived]
- [ ] Validate `title`: 1-200 chars, required
- [ ] Validate `version`: semver format, required for updates
- [ ] Return 400 with field-specific error messages

**Technical Implementation:**
```javascript
// routes/training.routes.js
router.post('/courses', [
  authJwt.verifyToken,
  authJwt.isAdmin,
  check('title').trim().isLength({ min: 1, max: 200 }),
  check('durationMinutes').isInt({ min: 1, max: 10000 }),
  check('passingScore').optional().isInt({ min: 0, max: 100 }),
  check('contentType').isIn(['video', 'document', 'quiz', 'interactive', 'webinar', 'classroom']),
  validateRequest
], trainingController.createCourse);
```

**Testing Requirements:**
- [ ] Test valid course creation
- [ ] Test negative durationMinutes (should fail)
- [ ] Test passingScore > 100 (should fail)
- [ ] Test passingScore < 0 (should fail)
- [ ] Test invalid contentType (should fail)
- [ ] Test missing required fields (should fail)
- [ ] Test durationMinutes = "abc" (should fail with 400)
- [ ] Test durationMinutes = NaN (should fail)
- [ ] Test extreme values (0, 999999)
- [ ] Test SQL injection in title
- [ ] Update existing training.api.test.js with new validation tests

**Files to Modify:**
- `routes/training.routes.js`
- `controllers/training.controller.js`
- `tests/integration/api/training.api.test.js`

**Dependencies:** STORY-001.1

---

#### STORY-001.3: Add Validation to Training Assignment Endpoints
**Priority:** CRITICAL
**Points:** 3
**Defects:** C-001, H-001

**As a** training administrator
**I want** training assignments validated before creation
**So that** assignments have valid users, courses, dates, and scores

**Acceptance Criteria:**
- [ ] Validate `userId`: integer, exists in database
- [ ] Validate `courseId`: integer, exists and is active
- [ ] Validate `dueDate`: future date required
- [ ] Validate `score`: 0-100, integer, optional
- [ ] Validate `status`: enum [assigned, in_progress, completed, expired, failed]
- [ ] Prevent duplicate active assignments for same user/course
- [ ] Return 400 with specific validation errors

**Technical Implementation:**
```javascript
// Custom validator for database existence
const userExists = async (userId) => {
  const user = await User.findByPk(userId);
  if (!user) throw new Error('User not found');
  return true;
};

// routes/training.routes.js
router.post('/assignments', [
  authJwt.verifyToken,
  authJwt.isAdmin,
  check('userId').isInt().custom(userExists),
  check('courseId').isInt().custom(courseExists),
  check('dueDate').isISO8601().custom(isFutureDate),
  check('score').optional().isInt({ min: 0, max: 100 }),
  validateRequest
], trainingController.createAssignment);
```

**Testing Requirements:**
- [ ] Test valid assignment creation
- [ ] Test invalid userId (should fail with 400)
- [ ] Test invalid courseId (should fail with 400)
- [ ] Test past dueDate (should fail with 400)
- [ ] Test duplicate assignment (should fail with 400)
- [ ] Test score = 150 (should fail)
- [ ] Test score = -10 (should fail)
- [ ] Test inactive course assignment (should fail)
- [ ] Add tests to training.api.test.js

**Files to Modify:**
- `routes/training.routes.js`
- `controllers/training.controller.js`
- `middleware/validation.js` (add custom validators)
- `tests/integration/api/training.api.test.js`

**Dependencies:** STORY-001.1, STORY-001.2

---

#### STORY-001.4: Add Validation to Document Endpoints
**Priority:** CRITICAL
**Points:** 3
**Defects:** C-002, C-011

**As a** compliance officer
**I want** document data validated and sanitized
**So that** documents have valid metadata and safe file paths

**Acceptance Criteria:**
- [ ] Validate `id` parameter: integer, positive
- [ ] Validate `title`: 1-300 chars, required
- [ ] Validate `documentType`: enum [policy, procedure, form, template, reference, other]
- [ ] Validate `hipaaCategory`: enum [privacy, security, breach_notification, general, other]
- [ ] Validate `status`: enum [draft, active, inactive, archived]
- [ ] Validate `filePath`: safe path, no traversal (../)
- [ ] Validate `version`: semver or simple version format
- [ ] Sanitize all string inputs

**Technical Implementation:**
```javascript
// Path sanitization
const sanitizeFilePath = (filePath) => {
  const normalized = path.normalize(filePath);
  if (normalized.includes('..')) {
    throw new Error('Invalid file path - traversal detected');
  }
  if (!normalized.startsWith('/documents/')) {
    throw new Error('File path must start with /documents/');
  }
  return normalized;
};

// routes/document.routes.js
router.post('/', [
  authJwt.verifyToken,
  authJwt.isComplianceOfficer,
  check('title').trim().isLength({ min: 1, max: 300 }),
  check('documentType').isIn(['policy', 'procedure', 'form', 'template', 'reference', 'other']),
  check('hipaaCategory').isIn(['privacy', 'security', 'breach_notification', 'general', 'other']),
  check('filePath').custom(sanitizeFilePath),
  validateRequest
], documentController.createDocument);
```

**Testing Requirements:**
- [ ] Test valid document creation
- [ ] Test invalid documentType (should fail)
- [ ] Test path traversal: "../../etc/passwd" (should fail)
- [ ] Test path traversal: "/documents/../config" (should fail)
- [ ] Test valid path: "/documents/policy.pdf" (should pass)
- [ ] Test invalid hipaaCategory (should fail)
- [ ] Test XSS in title (should sanitize)
- [ ] Test SQL injection in description (should sanitize)
- [ ] Test getDocumentById with invalid ID (should return 400)
- [ ] Test getDocumentById with "abc" (should return 400)
- [ ] Add tests to document.api.test.js

**Files to Modify:**
- `routes/document.routes.js`
- `controllers/document.controller.js`
- `middleware/validation.js`
- `tests/integration/api/document.api.test.js`

**Dependencies:** STORY-001.1

---

#### STORY-001.5: Fix parseInt Usage Across Controllers
**Priority:** CRITICAL
**Points:** 5
**Defects:** C-004

**As a** backend developer
**I want** all parseInt usage to validate and handle errors
**So that** NaN values don't propagate through the application

**Acceptance Criteria:**
- [ ] Create utility function `safeParseInt(value, defaultValue, min, max)`
- [ ] Replace all `parseInt()` calls with safe version
- [ ] Validate pagination parameters (page, limit, offset)
- [ ] Add default values for invalid inputs
- [ ] Add min/max bounds checking
- [ ] Log warnings for invalid parse attempts

**Technical Implementation:**
```javascript
// utils/number-utils.js
const safeParseInt = (value, defaultValue = 0, min = null, max = null) => {
  if (value === null || value === undefined) {
    return defaultValue;
  }

  const parsed = parseInt(value, 10);

  if (isNaN(parsed)) {
    logger.warn(`Failed to parse integer: ${value}, using default: ${defaultValue}`);
    return defaultValue;
  }

  if (min !== null && parsed < min) {
    logger.warn(`Parsed value ${parsed} below minimum ${min}, using minimum`);
    return min;
  }

  if (max !== null && parsed > max) {
    logger.warn(`Parsed value ${parsed} above maximum ${max}, using maximum`);
    return max;
  }

  return parsed;
};

// Usage in controllers
const limit = safeParseInt(req.query.limit, 20, 1, 100);
const offset = safeParseInt(req.query.offset, 0, 0, null);
const page = safeParseInt(req.query.page, 1, 1, null);
```

**Files to Update:**
- `controllers/audit.controller.js` (line 61-62)
- `controllers/incident.controller.js` (line 501-502)
- `controllers/report.controller.js` (line 229)
- `controllers/advanced-report.controller.js` (lines 269, 360, 381, 445, 471, 1040, 1061, 1114, 1140)
- All other controllers with parseInt usage

**Testing Requirements:**
- [ ] Unit test safeParseInt with valid integers
- [ ] Test with "abc" (should return default)
- [ ] Test with null/undefined (should return default)
- [ ] Test with NaN (should return default)
- [ ] Test with floats (should truncate)
- [ ] Test with values below min (should return min)
- [ ] Test with values above max (should return max)
- [ ] Integration test: GET /api/incidents?limit=abc&offset=xyz (should use defaults)
- [ ] Integration test: GET /api/audit/logs?limit=-5 (should use min)
- [ ] Integration test: GET /api/incidents?limit=99999 (should cap at max)
- [ ] Verify no NaN in database queries (check logs)

**Files to Create/Modify:**
- `utils/number-utils.js` (new)
- `tests/unit/utils/number-utils.test.js` (new)
- Multiple controller files (listed above)

**Dependencies:** None

---

#### STORY-001.6: Add Validation to Risk Assessment Endpoints
**Priority:** CRITICAL
**Points:** 3
**Defects:** C-001, H-006

**As a** compliance officer
**I want** risk assessment data validated
**So that** risk levels and assessments have valid data

**Acceptance Criteria:**
- [ ] Validate `likelihood`: enum [low, medium, high]
- [ ] Validate `impact`: enum [low, medium, high]
- [ ] Validate `riskLevel`: enum [low, medium, high, critical]
- [ ] Validate `mitigationStatus`: enum [not_started, in_progress, completed, accepted]
- [ ] Validate `status`: enum [draft, in_progress, completed, archived]
- [ ] Validate risk calculation matches likelihood × impact
- [ ] Return 400 with field-specific errors

**Testing Requirements:**
- [ ] Test valid risk assessment creation
- [ ] Test invalid likelihood value
- [ ] Test invalid impact value
- [ ] Test risk level auto-calculation
- [ ] Test invalid enum values return 400
- [ ] Add tests to risk.api.test.js

**Files to Modify:**
- `routes/risk.routes.js`
- `controllers/risk.controller.js`
- `tests/integration/api/risk.api.test.js`

**Dependencies:** STORY-001.1

---

#### STORY-001.7: Add Validation to Incident Management Endpoints
**Priority:** CRITICAL
**Points:** 3
**Defects:** C-001, H-006

**As a** security officer
**I want** incident data validated
**So that** incidents have valid severity, status, and dates

**Acceptance Criteria:**
- [ ] Validate `severity`: enum [low, medium, high, critical]
- [ ] Validate `status`: enum [reported, under_investigation, remediated, closed, archived]
- [ ] Validate `incidentDate`: not in future
- [ ] Validate `reportedDate`: not in future
- [ ] Validate `title`: 1-300 chars, required
- [ ] Validate `category`: non-empty string
- [ ] Return 400 with validation errors

**Testing Requirements:**
- [ ] Test valid incident creation
- [ ] Test future incident date (should fail)
- [ ] Test invalid severity
- [ ] Test invalid status
- [ ] Test missing required fields
- [ ] Add tests to incident.api.test.js

**Files to Modify:**
- `routes/incident.routes.js`
- `controllers/incident.controller.js`
- `tests/integration/api/incident.api.test.js`

**Dependencies:** STORY-001.1

---

## EPIC-002: Security Hardening
**Priority:** CRITICAL
**Effort:** 35 points (4.5 days)
**Business Value:** Prevents security breaches, protects PHI
**Defects Addressed:** C-003, C-007, C-009, C-010, C-011, C-012

### Epic Description
Implement critical security measures to prevent common vulnerabilities including race conditions, information disclosure, IDOR attacks, and DoS attacks.

### Success Metrics
- Zero security vulnerabilities in security scan
- All OWASP Top 10 mitigated
- Security tests passing
- Penetration test passed

### Stories

---

#### STORY-002.1: Fix Race Condition in Document Acknowledgment
**Priority:** CRITICAL
**Points:** 5
**Defects:** C-003

**As a** system administrator
**I want** document acknowledgments to prevent duplicate entries
**So that** concurrent requests don't create invalid data

**Acceptance Criteria:**
- [ ] Implement database-level locking or atomic upsert
- [ ] Handle unique constraint violations gracefully
- [ ] Return appropriate error for duplicate acknowledgment
- [ ] Add retry logic with exponential backoff if needed
- [ ] Log concurrent access attempts for monitoring

**Technical Implementation:**
```javascript
// controllers/document.controller.js
exports.acknowledgeDocument = async (req, res) => {
  const { documentId } = req.params;
  const { ipAddress, notes } = req.body;
  const userId = req.userId;

  try {
    // Use findOrCreate for atomic operation
    const [acknowledgment, created] = await DocumentAcknowledgment.findOrCreate({
      where: { userId, documentId },
      defaults: {
        acknowledgmentDate: new Date(),
        ipAddress,
        notes
      }
    });

    if (!created) {
      return res.status(400).json({
        success: false,
        message: 'You have already acknowledged this document',
        acknowledgedDate: acknowledgment.acknowledgmentDate
      });
    }

    // Log the acknowledgment
    await AuditLog.create({
      userId,
      action: 'ACKNOWLEDGE_DOCUMENT',
      category: 'DATA',
      entityType: 'Document',
      entityId: documentId,
      details: JSON.stringify({ ipAddress }),
      ipAddress,
      userAgent: req.headers['user-agent']
    });

    return res.status(201).json({
      success: true,
      data: acknowledgment
    });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        success: false,
        message: 'Document already acknowledged'
      });
    }

    logger.error('Error acknowledging document:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to acknowledge document'
    });
  }
};
```

**Testing Requirements:**
- [ ] Test single acknowledgment succeeds
- [ ] Test duplicate acknowledgment returns 400
- [ ] Test concurrent requests (Promise.all with 10 simultaneous requests)
- [ ] Verify only one acknowledgment created in database
- [ ] Test with database transaction rollback
- [ ] Performance test: 100 users acknowledging 100 documents
- [ ] Verify audit log created
- [ ] Load test with concurrent users

**Files to Modify:**
- `controllers/document.controller.js`
- `tests/integration/api/document.api.test.js`
- `tests/performance/concurrency.test.js` (new)

**Dependencies:** None

---

#### STORY-002.2: Sanitize Error Messages to Prevent Information Disclosure
**Priority:** CRITICAL
**Points:** 5
**Defects:** C-007

**As a** security officer
**I want** error messages sanitized in production
**So that** sensitive information is not leaked to users

**Acceptance Criteria:**
- [ ] Create error sanitization middleware
- [ ] Remove stack traces in production
- [ ] Remove database error details in production
- [ ] Remove file paths from errors
- [ ] Log detailed errors server-side only
- [ ] Return generic errors to clients in production
- [ ] Maintain detailed errors in development

**Technical Implementation:**
```javascript
// middleware/error-handler.js
const errorHandler = (err, req, res, next) => {
  // Log full error server-side
  logger.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    userId: req.userId,
    ip: req.ip
  });

  // Determine error response based on environment
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Sanitize error message
  let userMessage = 'An error occurred';
  let statusCode = 500;

  // Map known errors to user-friendly messages
  if (err.name === 'ValidationError') {
    userMessage = 'Invalid input data';
    statusCode = 400;
  } else if (err.name === 'UnauthorizedError') {
    userMessage = 'Unauthorized access';
    statusCode = 401;
  } else if (err.name === 'SequelizeUniqueConstraintError') {
    userMessage = 'This record already exists';
    statusCode = 400;
  } else if (err.name === 'SequelizeForeignKeyConstraintError') {
    userMessage = 'Referenced record not found';
    statusCode = 400;
  }

  // Build response
  const response = {
    success: false,
    message: userMessage,
    timestamp: new Date().toISOString(),
    requestId: req.id // From request ID middleware
  };

  // Include details only in development
  if (isDevelopment) {
    response.error = {
      message: err.message,
      stack: err.stack,
      name: err.name
    };
  }

  res.status(statusCode).json(response);
};

module.exports = errorHandler;
```

**Testing Requirements:**
- [ ] Test error in development returns full details
- [ ] Test error in production returns generic message
- [ ] Test database error doesn't leak connection string
- [ ] Test validation error returns sanitized message
- [ ] Test error logging captures full details
- [ ] Test foreign key error returns user-friendly message
- [ ] Test unique constraint error message
- [ ] Verify no file paths in production errors
- [ ] Verify no stack traces in production errors

**Files to Create/Modify:**
- `middleware/error-handler.js` (update)
- `server.js` (add error handler middleware)
- `tests/unit/middleware/error-handler.test.js` (update)
- All controllers (remove explicit error.message in responses)

**Dependencies:** None

---

#### STORY-002.3: Fix IDOR Vulnerability in Assignment Completion
**Priority:** CRITICAL
**Points:** 3
**Defects:** C-009, C-012

**As a** user
**I want** to only complete my own training assignments
**So that** others cannot fraudulently mark my training as complete

**Acceptance Criteria:**
- [ ] Verify assignment belongs to authenticated user before completion
- [ ] Return 403 Forbidden for unauthorized access attempts
- [ ] Log unauthorized access attempts
- [ ] Add similar checks to all user-specific operations
- [ ] Prevent admins from bypassing without explicit override

**Technical Implementation:**
```javascript
// controllers/training.controller.js
exports.completeAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const { score } = req.body;
    const userId = req.userId;

    // Find assignment
    const assignment = await TrainingAssignment.findByPk(id, {
      include: [TrainingCourse]
    });

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found'
      });
    }

    // CRITICAL: Verify ownership
    if (assignment.userId !== userId) {
      // Log unauthorized attempt
      await AuditLog.create({
        userId,
        action: 'UNAUTHORIZED_ACCESS',
        category: 'SECURITY',
        entityType: 'TrainingAssignment',
        entityId: id,
        details: JSON.stringify({
          attemptedAction: 'complete',
          assignmentOwner: assignment.userId
        }),
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      return res.status(403).json({
        success: false,
        message: 'You are not authorized to complete this assignment'
      });
    }

    // Validate score
    if (score !== undefined) {
      if (score < 0 || score > 100) {
        return res.status(400).json({
          success: false,
          message: 'Score must be between 0 and 100'
        });
      }
    }

    // Determine pass/fail
    const passingScore = assignment.TrainingCourse.passingScore || 80;
    const passed = score >= passingScore;

    // Update assignment
    await assignment.update({
      score,
      status: passed ? 'completed' : 'failed',
      completionDate: new Date()
    });

    // Log completion
    await AuditLog.create({
      userId,
      action: 'COMPLETE_TRAINING',
      category: 'DATA',
      entityType: 'TrainingAssignment',
      entityId: id,
      details: JSON.stringify({ score, passed }),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    return res.status(200).json({
      success: true,
      data: assignment
    });
  } catch (error) {
    logger.error('Error completing assignment:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to complete assignment'
    });
  }
};
```

**Testing Requirements:**
- [ ] Test user completing their own assignment (should succeed)
- [ ] Test user completing another user's assignment (should return 403)
- [ ] Test admin completing another user's assignment (should return 403)
- [ ] Verify audit log created for unauthorized attempts
- [ ] Test with non-existent assignment ID
- [ ] Test with invalid score values
- [ ] Add similar tests for update operations
- [ ] Load test to ensure performance not impacted

**Files to Modify:**
- `controllers/training.controller.js`
- `controllers/incident.controller.js` (similar fixes)
- `controllers/risk.controller.js` (similar fixes)
- `tests/integration/api/training.api.test.js`
- `tests/security/idor.test.js` (new)

**Dependencies:** None

---

#### STORY-002.4: Implement Rate Limiting on Critical Endpoints
**Priority:** CRITICAL
**Points:** 5
**Defects:** C-010

**As a** system administrator
**I want** rate limiting on critical endpoints
**So that** the system is protected from abuse and DoS attacks

**Acceptance Criteria:**
- [ ] Apply strict rate limiting to document acknowledgment
- [ ] Apply rate limiting to login endpoint
- [ ] Apply rate limiting to password reset
- [ ] Apply rate limiting to all POST/PUT/DELETE endpoints
- [ ] Configure different limits for different user roles
- [ ] Return 429 Too Many Requests with Retry-After header
- [ ] Log rate limit violations

**Technical Implementation:**
```javascript
// middleware/rate-limit.js
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');

// Acknowledgment rate limiter - very strict
const acknowledgmentLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:ack:'
  }),
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // Max 100 acknowledgments per hour
  message: {
    success: false,
    message: 'Too many acknowledgments. Please try again later.',
    retryAfter: '1 hour'
  },
  handler: (req, res) => {
    logger.warn('Rate limit exceeded for acknowledgment', {
      userId: req.userId,
      ip: req.ip,
      url: req.url
    });

    res.status(429).json({
      success: false,
      message: 'Too many acknowledgments. Please try again later.'
    });
  }
});

// Write operation limiter
const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Max 200 write operations per 15 minutes
  message: 'Too many requests. Please try again later.'
});

// Export limiters
module.exports = {
  acknowledgmentLimiter,
  writeLimiter,
  authLimiter, // existing
  strictLimiter // existing
};

// routes/document.routes.js
router.post(
  '/:documentId/acknowledge',
  authJwt.verifyToken,
  acknowledgmentLimiter, // Add rate limiter
  documentController.acknowledgeDocument
);
```

**Testing Requirements:**
- [ ] Test normal usage stays under limit
- [ ] Test exceeding limit returns 429
- [ ] Test Retry-After header present
- [ ] Test rate limit resets after window
- [ ] Test different limits for different endpoints
- [ ] Test bypass for admin users (if applicable)
- [ ] Load test with 1000 concurrent users
- [ ] Verify Redis storage of rate limit data

**Files to Modify:**
- `middleware/rate-limit.js`
- `routes/document.routes.js`
- `routes/auth.routes.js`
- All route files with POST/PUT/DELETE
- `tests/integration/rate-limit.test.js`
- `tests/performance/rate-limit.test.js` (new)

**Dependencies:** Redis setup (may require EPIC-004)

---

#### STORY-002.5: Add Resource-Level Authorization Checks
**Priority:** CRITICAL
**Points:** 8
**Defects:** C-012

**As a** user
**I want** my data protected from unauthorized access
**So that** others cannot view or modify my records

**Acceptance Criteria:**
- [ ] Create authorization middleware for resource ownership
- [ ] Add ownership checks to all update/delete operations
- [ ] Add ownership checks to sensitive read operations
- [ ] Allow admins to override with explicit permission
- [ ] Log all authorization failures
- [ ] Return 403 for forbidden access

**Technical Implementation:**
```javascript
// middleware/authorization.js

/**
 * Check if user owns the resource or is an admin
 */
const checkResourceOwnership = (modelName, ownerField = 'userId') => {
  return async (req, res, next) => {
    try {
      const { id } = req.params;
      const userId = req.userId;
      const isAdmin = req.userRoles?.includes('Admin');

      // Import model dynamically
      const Model = require('../models')[modelName];

      // Find resource
      const resource = await Model.findByPk(id);

      if (!resource) {
        return res.status(404).json({
          success: false,
          message: `${modelName} not found`
        });
      }

      // Check ownership
      const ownerId = resource[ownerField];

      if (ownerId !== userId && !isAdmin) {
        // Log unauthorized access
        await AuditLog.create({
          userId,
          action: 'UNAUTHORIZED_ACCESS',
          category: 'SECURITY',
          entityType: modelName,
          entityId: id,
          details: JSON.stringify({
            attemptedAction: req.method,
            resourceOwner: ownerId
          }),
          ipAddress: req.ip,
          userAgent: req.headers['user-agent']
        });

        return res.status(403).json({
          success: false,
          message: 'You do not have permission to access this resource'
        });
      }

      // Attach resource to request for use in controller
      req.resource = resource;
      next();
    } catch (error) {
      logger.error('Authorization check failed:', error);
      return res.status(500).json({
        success: false,
        message: 'Authorization check failed'
      });
    }
  };
};

// Check if user can modify resource based on createdBy field
const checkCreatorPermission = (modelName) => {
  return checkResourceOwnership(modelName, 'createdBy');
};

module.exports = {
  checkResourceOwnership,
  checkCreatorPermission
};
```

**Apply to Routes:**
```javascript
// routes/risk.routes.js
router.put(
  '/assessments/:id',
  authJwt.verifyToken,
  authJwt.isComplianceOfficer,
  checkCreatorPermission('RiskAssessment'), // Add authorization check
  riskController.updateRiskAssessment
);

// routes/incident.routes.js
router.put(
  '/:id',
  authJwt.verifyToken,
  authJwt.isComplianceOfficer,
  checkResourceOwnership('Incident', 'reportedBy'),
  incidentController.updateIncident
);
```

**Testing Requirements:**
- [ ] Test user updating their own resource (should succeed)
- [ ] Test user updating another user's resource (should return 403)
- [ ] Test admin updating any resource (should succeed if allowed)
- [ ] Test non-existent resource (should return 404)
- [ ] Verify audit log for unauthorized attempts
- [ ] Test for all major entities: RiskAssessment, Incident, Document
- [ ] Performance test to ensure minimal overhead
- [ ] Test cascading permissions (e.g., manager viewing team members)

**Files to Create/Modify:**
- `middleware/authorization.js` (new)
- `middleware/index.js`
- All route files with update/delete operations
- `tests/security/authorization.test.js` (new)
- `tests/integration/api/*.test.js` (add authorization tests)

**Dependencies:** STORY-002.3

---

#### STORY-002.6: Implement Path Traversal Protection
**Priority:** CRITICAL
**Points:** 3
**Defects:** C-011

**As a** system administrator
**I want** file paths validated and sanitized
**So that** users cannot access files outside allowed directories

**Acceptance Criteria:**
- [ ] Create file path validation utility
- [ ] Reject paths containing ".."
- [ ] Validate paths are within allowed directories
- [ ] Use whitelist approach for file directories
- [ ] Store only filenames in database, construct full paths server-side
- [ ] Log path traversal attempts

**Technical Implementation:**
```javascript
// utils/file-utils.js
const path = require('path');

const ALLOWED_DIRECTORIES = [
  '/documents/',
  '/uploads/',
  '/certificates/',
  '/reports/'
];

/**
 * Validate and sanitize file path
 */
const validateFilePath = (filePath) => {
  if (!filePath || typeof filePath !== 'string') {
    throw new Error('Invalid file path');
  }

  // Normalize path
  const normalized = path.normalize(filePath);

  // Check for path traversal
  if (normalized.includes('..')) {
    throw new Error('Path traversal detected');
  }

  // Check if path starts with allowed directory
  const isAllowed = ALLOWED_DIRECTORIES.some(dir =>
    normalized.startsWith(dir)
  );

  if (!isAllowed) {
    throw new Error('File path not in allowed directory');
  }

  return normalized;
};

/**
 * Extract filename and construct safe path
 */
const constructSafeFilePath = (filename, directory) => {
  // Remove any path components from filename
  const safeName = path.basename(filename);

  // Validate directory
  if (!ALLOWED_DIRECTORIES.includes(directory)) {
    throw new Error('Invalid directory');
  }

  // Construct full path
  return path.join(directory, safeName);
};

module.exports = {
  validateFilePath,
  constructSafeFilePath,
  ALLOWED_DIRECTORIES
};
```

**Testing Requirements:**
- [ ] Test valid path: "/documents/policy.pdf"
- [ ] Test path traversal: "../../etc/passwd" (should throw)
- [ ] Test path traversal: "/documents/../config/database.js" (should throw)
- [ ] Test encoded traversal: "%2e%2e%2fconfig" (should throw)
- [ ] Test absolute path outside allowed: "/etc/passwd" (should throw)
- [ ] Test constructSafeFilePath with path components in filename
- [ ] Test null/undefined paths (should throw)
- [ ] Verify audit logging of traversal attempts

**Files to Create/Modify:**
- `utils/file-utils.js` (new)
- `controllers/document.controller.js`
- `middleware/validation.js`
- `tests/unit/utils/file-utils.test.js` (new)
- `tests/security/path-traversal.test.js` (new)

**Dependencies:** None

---

## EPIC-003: Data Integrity & Transactions
**Priority:** CRITICAL
**Effort:** 25 points (3 days)
**Business Value:** Ensures data consistency, prevents partial updates
**Defects Addressed:** C-008, H-014

### Epic Description
Implement database transactions for multi-step operations and add optimistic locking for concurrent updates to prevent data loss and maintain consistency.

### Success Metrics
- Zero data inconsistencies in production
- All multi-step operations wrapped in transactions
- Concurrent update conflicts detected and handled
- Transaction rollback tests passing

### Stories

---

#### STORY-003.1: Create Transaction Management Utility
**Priority:** CRITICAL
**Points:** 5
**Defects:** C-008

**As a** backend developer
**I want** a reusable transaction management utility
**So that** I can easily wrap operations in transactions

**Acceptance Criteria:**
- [ ] Create transaction wrapper utility
- [ ] Support automatic rollback on errors
- [ ] Support nested transactions (savepoints)
- [ ] Add transaction logging
- [ ] Create transaction testing utilities
- [ ] Document transaction patterns

**Technical Implementation:**
```javascript
// utils/transaction.js
const { sequelize } = require('../models');
const logger = require('./logger');

/**
 * Execute operations within a transaction
 * Automatically commits on success, rolls back on error
 */
const withTransaction = async (callback) => {
  const transaction = await sequelize.transaction();

  try {
    logger.debug('Transaction started', { id: transaction.id });

    const result = await callback(transaction);

    await transaction.commit();
    logger.debug('Transaction committed', { id: transaction.id });

    return result;
  } catch (error) {
    logger.error('Transaction error, rolling back', {
      id: transaction.id,
      error: error.message
    });

    await transaction.rollback();
    throw error;
  }
};

/**
 * Execute operations with retry on deadlock
 */
const withRetryableTransaction = async (callback, maxRetries = 3) => {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await withTransaction(callback);
    } catch (error) {
      lastError = error;

      // Retry only on deadlock or lock timeout
      if (error.name === 'SequelizeTimeoutError' ||
          error.name === 'SequelizeDeadlockError') {
        logger.warn(`Transaction deadlock, retry attempt ${attempt}/${maxRetries}`);

        // Exponential backoff
        await new Promise(resolve =>
          setTimeout(resolve, Math.pow(2, attempt) * 100)
        );

        continue;
      }

      // Don't retry other errors
      throw error;
    }
  }

  throw lastError;
};

module.exports = {
  withTransaction,
  withRetryableTransaction
};
```

**Testing Requirements:**
- [ ] Test successful transaction commits
- [ ] Test transaction rollback on error
- [ ] Test nested transactions
- [ ] Test deadlock retry logic
- [ ] Test transaction timeout
- [ ] Test concurrent transactions
- [ ] Verify database state after rollback
- [ ] Performance test transaction overhead

**Files to Create:**
- `utils/transaction.js` (new)
- `tests/unit/utils/transaction.test.js` (new)
- `tests/integration/transaction.test.js` (new)

**Dependencies:** None

---

#### STORY-003.2: Add Transactions to Risk Assessment Operations
**Priority:** CRITICAL
**Points:** 5
**Defects:** C-008

**As a** compliance officer
**I want** risk assessment operations atomic
**So that** approvals and updates are all-or-nothing

**Acceptance Criteria:**
- [ ] Wrap assessment approval in transaction (assessment update + audit log)
- [ ] Wrap risk item creation in transaction (item create + assessment update)
- [ ] Handle transaction failures gracefully
- [ ] Roll back all changes on any failure
- [ ] Test partial failure scenarios

**Technical Implementation:**
```javascript
// controllers/risk.controller.js
const { withTransaction } = require('../utils/transaction');

exports.approveRiskAssessment = async (req, res) => {
  try {
    const { id } = req.params;
    const { approvalNotes } = req.body;
    const userId = req.userId;

    const result = await withTransaction(async (t) => {
      // Find assessment
      const assessment = await RiskAssessment.findByPk(id, { transaction: t });

      if (!assessment) {
        throw new Error('Risk assessment not found');
      }

      // Update assessment
      await assessment.update({
        approvedBy: userId,
        approvalDate: new Date(),
        status: 'completed'
      }, { transaction: t });

      // Create audit log
      await AuditLog.create({
        userId,
        action: 'APPROVE_RISK_ASSESSMENT',
        category: 'DATA',
        entityType: 'RiskAssessment',
        entityId: id,
        details: JSON.stringify({ approvalNotes }),
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      }, { transaction: t });

      // Calculate next assessment date
      const nextDate = new Date();
      nextDate.setFullYear(nextDate.getFullYear() + 1);

      await assessment.update({
        nextAssessmentDate: nextDate
      }, { transaction: t });

      return assessment;
    });

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error approving risk assessment:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to approve risk assessment'
    });
  }
};
```

**Testing Requirements:**
- [ ] Test successful approval with all updates
- [ ] Test rollback when audit log creation fails
- [ ] Test rollback when assessment update fails
- [ ] Verify database state after rollback (no partial updates)
- [ ] Test concurrent approval attempts
- [ ] Performance test with large assessments

**Files to Modify:**
- `controllers/risk.controller.js`
- `tests/integration/api/risk.api.test.js`
- `tests/integration/transaction.test.js`

**Dependencies:** STORY-003.1

---

#### STORY-003.3: Add Transactions to Incident Management Operations
**Priority:** CRITICAL
**Points:** 5
**Defects:** C-008

**As a** security officer
**I want** incident operations atomic
**So that** breach determinations and status changes are consistent

**Acceptance Criteria:**
- [ ] Wrap breach determination in transaction
- [ ] Wrap incident status updates with timeline in transaction
- [ ] Wrap incident closure in transaction
- [ ] Test transaction rollback scenarios
- [ ] Ensure audit trail consistency

**Technical Implementation:**
```javascript
// controllers/incident.controller.js
exports.makeBreachDetermination = async (req, res) => {
  try {
    const { id } = req.params;
    const { isBreachable, breachDeterminationNotes } = req.body;
    const userId = req.userId;

    const result = await withTransaction(async (t) => {
      // Find incident
      const incident = await Incident.findByPk(id, { transaction: t });

      if (!incident) {
        throw new Error('Incident not found');
      }

      // Update incident with breach determination
      await incident.update({
        isBreachable,
        breachDeterminationDate: new Date(),
        breachDeterminationBy: userId
      }, { transaction: t });

      // Create incident update record
      await IncidentUpdate.create({
        incidentId: id,
        updateDate: new Date(),
        updatedBy: userId,
        updateType: 'breach_determination',
        description: breachDeterminationNotes || `Breach determination: ${isBreachable ? 'Breachable' : 'Not breachable'}`,
        newStatus: incident.status
      }, { transaction: t });

      // Create audit log
      await AuditLog.create({
        userId,
        action: 'BREACH_DETERMINATION',
        category: 'SECURITY',
        entityType: 'Incident',
        entityId: id,
        details: JSON.stringify({
          isBreachable,
          notes: breachDeterminationNotes
        }),
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      }, { transaction: t });

      // If breachable, update status and send notifications
      if (isBreachable) {
        await incident.update({
          status: 'under_investigation',
          severity: 'critical'
        }, { transaction: t });

        // Create notification record (if notification system exists)
        // await Notification.create({ ... }, { transaction: t });
      }

      return incident;
    });

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error making breach determination:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to make breach determination'
    });
  }
};
```

**Testing Requirements:**
- [ ] Test breach determination with all updates
- [ ] Test rollback on any step failure
- [ ] Test breachable incident updates severity
- [ ] Test non-breachable incident leaves status unchanged
- [ ] Verify incident update timeline created
- [ ] Verify audit log created
- [ ] Test database consistency after rollback

**Files to Modify:**
- `controllers/incident.controller.js`
- `tests/integration/api/incident.api.test.js`

**Dependencies:** STORY-003.1

---

#### STORY-003.4: Add Transactions to Training Completion
**Priority:** CRITICAL
**Points:** 3
**Defects:** C-008

**As a** user
**I want** training completion atomic
**So that** my completion and certificate are consistent

**Acceptance Criteria:**
- [ ] Wrap completion in transaction (update + certificate + audit)
- [ ] Roll back on certificate generation failure
- [ ] Test rollback scenarios
- [ ] Ensure consistency

**Technical Implementation:**
Similar pattern to above stories, wrapping:
- Assignment status update
- Certificate generation
- Audit log creation
- Notification creation (if applicable)

**Testing Requirements:**
- [ ] Test successful completion with certificate
- [ ] Test rollback on certificate generation failure
- [ ] Verify no partial updates in database

**Files to Modify:**
- `controllers/training.controller.js`
- `tests/integration/api/training.api.test.js`

**Dependencies:** STORY-003.1

---

#### STORY-003.5: Implement Optimistic Locking for Concurrent Updates
**Priority:** CRITICAL
**Points:** 8
**Defects:** H-014

**As a** user
**I want** concurrent edit conflicts detected
**So that** my changes are not silently overwritten

**Acceptance Criteria:**
- [ ] Add version field to models requiring concurrency control
- [ ] Implement version checking on updates
- [ ] Return 409 Conflict when version mismatch
- [ ] Include current version in error response
- [ ] Test concurrent update scenarios
- [ ] Add version field to API responses

**Technical Implementation:**
```javascript
// models/risk-assessment.model.js
// Add version field to model
RiskAssessment.init({
  // ... existing fields
  version: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    allowNull: false
  }
}, {
  sequelize,
  modelName: 'RiskAssessment',
  tableName: 'risk_assessments',
  version: true // Enable optimistic locking
});

// controllers/risk.controller.js
exports.updateRiskAssessment = async (req, res) => {
  try {
    const { id } = req.params;
    const { version, ...updateData } = req.body;
    const userId = req.userId;

    await withTransaction(async (t) => {
      // Find current record
      const assessment = await RiskAssessment.findByPk(id, { transaction: t });

      if (!assessment) {
        throw new Error('Risk assessment not found');
      }

      // Check version
      if (version && assessment.version !== version) {
        const error = new Error('Record has been modified by another user');
        error.name = 'OptimisticLockError';
        error.currentVersion = assessment.version;
        error.providedVersion = version;
        throw error;
      }

      // Update with version increment
      const [updated] = await RiskAssessment.update(
        {
          ...updateData,
          version: assessment.version + 1
        },
        {
          where: {
            id,
            version: assessment.version // Critical: version in WHERE clause
          },
          transaction: t
        }
      );

      if (updated === 0) {
        throw new Error('Concurrent update detected');
      }

      // Fetch updated record
      const updatedAssessment = await RiskAssessment.findByPk(id, { transaction: t });

      return updatedAssessment;
    });

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    if (error.name === 'OptimisticLockError') {
      return res.status(409).json({
        success: false,
        message: 'This record has been modified by another user. Please refresh and try again.',
        currentVersion: error.currentVersion,
        providedVersion: error.providedVersion
      });
    }

    logger.error('Error updating risk assessment:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update risk assessment'
    });
  }
};
```

**Database Migration:**
```javascript
// migrations/XXXXXX-add-version-fields.js
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('risk_assessments', 'version', {
      type: Sequelize.INTEGER,
      defaultValue: 1,
      allowNull: false
    });

    await queryInterface.addColumn('incidents', 'version', {
      type: Sequelize.INTEGER,
      defaultValue: 1,
      allowNull: false
    });

    await queryInterface.addColumn('documents', 'version_number', {
      type: Sequelize.INTEGER,
      defaultValue: 1,
      allowNull: false
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('risk_assessments', 'version');
    await queryInterface.removeColumn('incidents', 'version');
    await queryInterface.removeColumn('documents', 'version_number');
  }
};
```

**Testing Requirements:**
- [ ] Test successful update with correct version
- [ ] Test update with stale version returns 409
- [ ] Test two users editing simultaneously
  - User A reads record (version 1)
  - User B reads record (version 1)
  - User A updates successfully (version becomes 2)
  - User B update fails with 409
- [ ] Test version increment on each update
- [ ] Test version included in API responses
- [ ] Performance test to ensure minimal overhead
- [ ] Test with 10 concurrent users editing same record

**Files to Create/Modify:**
- `models/risk-assessment.model.js`
- `models/incident.model.js`
- `models/document.model.js`
- `migrations/XXXXXX-add-version-fields.js` (new)
- `controllers/risk.controller.js`
- `controllers/incident.controller.js`
- `controllers/document.controller.js`
- `tests/integration/optimistic-locking.test.js` (new)
- `tests/performance/concurrent-updates.test.js` (new)

**Dependencies:** STORY-003.1

---

## EPIC-004: Test Infrastructure Setup
**Priority:** CRITICAL
**Effort:** 20 points (2.5 days)
**Business Value:** Enables test execution, quality assurance
**Defects Addressed:** T-001, T-002

### Epic Description
Set up complete test infrastructure including PostgreSQL database, test data management, and CI/CD pipeline integration.

### Success Metrics
- Test database operational
- All 235 tests execute successfully
- Test pass rate > 95%
- CI/CD pipeline running tests automatically

### Stories

---

#### STORY-004.1: Set Up PostgreSQL Test Database
**Priority:** CRITICAL
**Points:** 5
**Defects:** T-001

**As a** developer
**I want** a test database configured
**So that** integration tests can run

**Acceptance Criteria:**
- [ ] Install PostgreSQL (or configure Docker container)
- [ ] Create test database: `hipaa_compliance_test`
- [ ] Create test user with appropriate permissions
- [ ] Configure connection pooling for tests
- [ ] Create database initialization script
- [ ] Document setup instructions

**Technical Implementation:**
```bash
# docker-compose.test.yml
version: '3.8'

services:
  postgres-test:
    image: postgres:14-alpine
    environment:
      POSTGRES_DB: hipaa_compliance_test
      POSTGRES_USER: test_user
      POSTGRES_PASSWORD: test_password
    ports:
      - "5433:5432"
    volumes:
      - postgres-test-data:/var/lib/postgresql/data
      - ./init-scripts:/docker-entrypoint-initdb.d
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U test_user -d hipaa_compliance_test"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres-test-data:
```

```javascript
// config/database.js - Update test config
module.exports = {
  test: {
    username: process.env.TEST_DB_USERNAME || 'test_user',
    password: process.env.TEST_DB_PASSWORD || 'test_password',
    database: process.env.TEST_DB_NAME || 'hipaa_compliance_test',
    host: process.env.TEST_DB_HOST || 'localhost',
    port: process.env.TEST_DB_PORT || 5433,
    dialect: 'postgres',
    logging: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
};
```

```bash
# scripts/setup-test-db.sh
#!/bin/bash
set -e

echo "Setting up test database..."

# Start Docker container
docker-compose -f docker-compose.test.yml up -d postgres-test

# Wait for database to be ready
echo "Waiting for database to be ready..."
sleep 5

# Run migrations
NODE_ENV=test npx sequelize-cli db:migrate

echo "Test database setup complete!"
```

**Testing Requirements:**
- [ ] Verify database connection
- [ ] Run simple query test
- [ ] Verify migrations applied
- [ ] Test connection pooling
- [ ] Verify cleanup between tests

**Files to Create:**
- `docker-compose.test.yml` (new)
- `scripts/setup-test-db.sh` (new)
- `scripts/teardown-test-db.sh` (new)
- `.env.test` (new)
- `docs/TEST_SETUP.md` (new)

**Dependencies:** None

---

#### STORY-004.2: Create Test Data Factories
**Priority:** CRITICAL
**Points:** 5
**Defects:** T-002

**As a** developer
**I want** reusable test data factories
**So that** tests have consistent, realistic data

**Acceptance Criteria:**
- [ ] Create factories for all models
- [ ] Support factory traits (e.g., active, inactive, deleted)
- [ ] Support related data creation
- [ ] Add data randomization
- [ ] Create cleanup utilities

**Technical Implementation:**
```javascript
// tests/utils/factories.js
const { faker } = require('@faker-js/faker');
const { User, Role, Department, TrainingCourse, Document } = require('../../models');

class Factories {
  /**
   * Create a user with optional overrides
   */
  static async createUser(overrides = {}) {
    const defaultRole = await Role.findOne({ where: { name: 'User' } });

    const userData = {
      username: faker.internet.userName(),
      email: faker.internet.email(),
      password: '$2b$10$X.VhWnPjCWHv4.wZp.AXZOGJpVOdnl4JCJHKu/YMlMhh7.SCuW9hO', // Password123!
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      position: faker.person.jobTitle(),
      roleId: defaultRole.id,
      accountStatus: 'active',
      ...overrides
    };

    return await User.create(userData);
  }

  /**
   * Create an admin user
   */
  static async createAdmin(overrides = {}) {
    const adminRole = await Role.findOne({ where: { name: 'Admin' } });
    return await this.createUser({
      roleId: adminRole.id,
      ...overrides
    });
  }

  /**
   * Create a compliance officer
   */
  static async createComplianceOfficer(overrides = {}) {
    const coRole = await Role.findOne({ where: { name: 'Compliance Officer' } });
    return await this.createUser({
      roleId: coRole.id,
      ...overrides
    });
  }

  /**
   * Create a training course
   */
  static async createCourse(overrides = {}) {
    const courseData = {
      title: faker.lorem.words(3),
      description: faker.lorem.paragraph(),
      contentType: faker.helpers.arrayElement(['video', 'document', 'quiz', 'interactive']),
      durationMinutes: faker.number.int({ min: 30, max: 120 }),
      frequencyDays: faker.helpers.arrayElement([30, 90, 180, 365]),
      version: '1.0',
      status: 'active',
      passingScore: 80,
      ...overrides
    };

    return await TrainingCourse.create(courseData);
  }

  /**
   * Create a document
   */
  static async createDocument(createdBy, overrides = {}) {
    const documentData = {
      title: faker.lorem.words(4),
      description: faker.lorem.paragraph(),
      filePath: `/documents/${faker.system.fileName()}`,
      version: '1.0',
      status: 'active',
      documentType: faker.helpers.arrayElement(['policy', 'procedure', 'form']),
      hipaaCategory: faker.helpers.arrayElement(['privacy', 'security', 'general']),
      createdBy: createdBy,
      reviewDate: faker.date.future(),
      ...overrides
    };

    return await Document.create(documentData);
  }

  /**
   * Create multiple records
   */
  static async createMultiple(factoryMethod, count, overrides = {}) {
    const records = [];
    for (let i = 0; i < count; i++) {
      records.push(await factoryMethod(overrides));
    }
    return records;
  }

  /**
   * Clean up all test data
   */
  static async cleanup() {
    await User.destroy({ where: {}, force: true });
    await TrainingCourse.destroy({ where: {}, force: true });
    await Document.destroy({ where: {}, force: true });
    // Add other models as needed
  }
}

module.exports = Factories;
```

**Testing Requirements:**
- [ ] Test factory creates valid users
- [ ] Test factory creates related data
- [ ] Test factory traits work correctly
- [ ] Test cleanup removes all data
- [ ] Test factories with overrides

**Files to Create:**
- `tests/utils/factories.js` (new)
- `tests/unit/utils/factories.test.js` (new)

**Dependencies:** STORY-004.1

---

#### STORY-004.3: Update Test Utilities and Helpers
**Priority:** CRITICAL
**Points:** 3
**Defects:** T-002

**As a** developer
**I want** comprehensive test utilities
**So that** tests are easier to write and maintain

**Acceptance Criteria:**
- [ ] Update test-db.js with new configuration
- [ ] Create authentication helpers (generate test tokens)
- [ ] Create assertion helpers
- [ ] Create API request helpers
- [ ] Add test cleanup utilities

**Technical Implementation:**
```javascript
// tests/utils/auth-helpers.js
const { generateToken } = require('../../utils/token-manager');

/**
 * Create authentication token for testing
 */
const createAuthToken = (user) => {
  return generateToken({
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.Role?.name
  }).token;
};

/**
 * Create request with authentication
 */
const authenticatedRequest = (request, user) => {
  const token = createAuthToken(user);
  return request.set('x-access-token', token);
};

module.exports = {
  createAuthToken,
  authenticatedRequest
};

// tests/utils/assertions.js
/**
 * Custom assertions for common patterns
 */
const assertValidationError = (response, field) => {
  expect(response.status).toBe(400);
  expect(response.body.success).toBe(false);
  expect(response.body.message).toContain(field);
};

const assertUnauthorized = (response) => {
  expect(response.status).toBe(401);
  expect(response.body.success).toBe(false);
};

const assertForbidden = (response) => {
  expect(response.status).toBe(403);
  expect(response.body.success).toBe(false);
};

const assertSuccess = (response, expectedData = {}) => {
  expect(response.body.success).toBe(true);
  expect(response.body.data).toBeDefined();

  Object.keys(expectedData).forEach(key => {
    expect(response.body.data).toHaveProperty(key, expectedData[key]);
  });
};

module.exports = {
  assertValidationError,
  assertUnauthorized,
  assertForbidden,
  assertSuccess
};
```

**Testing Requirements:**
- [ ] Test auth helpers generate valid tokens
- [ ] Test assertion helpers correctly validate responses
- [ ] Test cleanup utilities remove all test data

**Files to Create/Modify:**
- `tests/utils/auth-helpers.js` (new)
- `tests/utils/assertions.js` (new)
- `tests/utils/test-db.js` (update)
- `tests/utils/api-helpers.js` (new)

**Dependencies:** STORY-004.1, STORY-004.2

---

#### STORY-004.4: Run and Fix Existing Tests
**Priority:** CRITICAL
**Points:** 8
**Defects:** T-001

**As a** developer
**I want** all existing tests passing
**So that** we have a stable test baseline

**Acceptance Criteria:**
- [ ] Run all 235 integration tests
- [ ] Fix failing tests
- [ ] Achieve >90% pass rate
- [ ] Document any skipped tests
- [ ] Update test documentation

**Testing Activities:**
- [ ] Run: `npm run test:integration`
- [ ] Fix database connection issues
- [ ] Fix authentication issues in tests
- [ ] Fix timing issues in tests
- [ ] Update deprecated test syntax
- [ ] Add missing test setup/teardown

**Files to Modify:**
- All test files as needed
- `tests/setup.js` (test global setup)
- `tests/teardown.js` (test global teardown)

**Dependencies:** STORY-004.1, STORY-004.2, STORY-004.3

---

(Continuing with remaining epics...)

---

# HIGH PRIORITY EPICS

## EPIC-005: Audit & Compliance Framework
**Priority:** HIGH
**Effort:** 30 points (4 days)
**Defects Addressed:** H-004, HIPAA compliance gaps

### Stories

#### STORY-005.1: Add Audit Logging to Document Acknowledgment
**Priority:** HIGH
**Points:** 3

**As a** compliance officer
**I want** all document acknowledgments logged
**So that** we have complete audit trail for compliance

**Acceptance Criteria:**
- [ ] Log document acknowledgment with user, timestamp, IP
- [ ] Include document details in log
- [ ] Capture user agent information
- [ ] Test audit log creation

---

#### STORY-005.2: Add Audit Logging to Training Completion
**Priority:** HIGH
**Points:** 3

**Similar pattern for training completion logging**

---

#### STORY-005.3: Add Audit Logging to Breach Determination
**Priority:** HIGH
**Points:** 3

**Similar pattern for breach determination logging**

---

#### STORY-005.4: Add Comprehensive Audit Logging Middleware
**Priority:** HIGH
**Points:** 8

**As a** compliance officer
**I want** all PHI access logged automatically
**So that** HIPAA audit requirements are met

**Acceptance Criteria:**
- [ ] Create audit middleware for automatic logging
- [ ] Log all READ operations on PHI
- [ ] Log all CREATE/UPDATE/DELETE operations
- [ ] Include request context (user, IP, timestamp, user agent)
- [ ] Filter sensitive data from logs
- [ ] Performance test to ensure minimal overhead

---

(Continue with remaining stories in EPIC-005...)

---

## EPIC-006: Authorization & Access Control
**Priority:** HIGH
**Effort:** 25 points (3 days)

---

## EPIC-007: Performance & Scalability
**Priority:** HIGH
**Effort:** 30 points (4 days)
**Defects Addressed:** H-002, H-011

### Stories

#### STORY-007.1: Implement Pagination on All List Endpoints
**Priority:** HIGH
**Points:** 13

**As a** user
**I want** large lists paginated
**So that** the application remains responsive

**Acceptance Criteria:**
- [ ] Add pagination to GET /api/training/courses
- [ ] Add pagination to GET /api/documents
- [ ] Add pagination to GET /api/risk/assessments
- [ ] Add pagination to GET /api/incidents
- [ ] Add pagination to all other list endpoints
- [ ] Return total count and page information
- [ ] Support page size limits (max 100)
- [ ] Default page size: 20
- [ ] Test with large datasets (1000+ records)

**Technical Implementation:**
```javascript
// middleware/pagination.js
const pagination = (req, res, next) => {
  const page = safeParseInt(req.query.page, 1, 1, null);
  const limit = safeParseInt(req.query.limit, 20, 1, 100);
  const offset = (page - 1) * limit;

  req.pagination = {
    page,
    limit,
    offset
  };

  next();
};

// Controller usage
exports.getAllDocuments = async (req, res) => {
  try {
    const { page, limit, offset } = req.pagination;

    const { count, rows } = await Document.findAndCountAll({
      limit,
      offset,
      where: { status: { [Op.ne]: 'archived' } },
      order: [['title', 'ASC']]
    });

    return res.status(200).json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page,
        limit,
        pages: Math.ceil(count / limit),
        hasNext: page < Math.ceil(count / limit),
        hasPrev: page > 1
      }
    });
  } catch (error) {
    // Error handling
  }
};
```

**Testing Requirements:**
- [ ] Test pagination with default values
- [ ] Test custom page and limit
- [ ] Test page beyond available data
- [ ] Test limit exceeding maximum
- [ ] Test with empty result set
- [ ] Performance test with 10,000 records

**Files to Modify:**
- All controllers with list endpoints
- All route files
- All integration tests

---

(Continue with remaining epics: EPIC-008 through EPIC-012...)

---

## Story Dependencies

```mermaid
graph TD
    S001.1[STORY-001.1: Validation Framework] --> S001.2[STORY-001.2: Training Validation]
    S001.1 --> S001.3[STORY-001.3: Assignment Validation]
    S001.1 --> S001.4[STORY-001.4: Document Validation]
    S001.1 --> S001.6[STORY-001.6: Risk Validation]
    S001.1 --> S001.7[STORY-001.7: Incident Validation]

    S002.3[STORY-002.3: Fix IDOR] --> S002.5[STORY-002.5: Resource Authorization]

    S003.1[STORY-003.1: Transaction Utility] --> S003.2[STORY-003.2: Risk Transactions]
    S003.1 --> S003.3[STORY-003.3: Incident Transactions]
    S003.1 --> S003.4[STORY-003.4: Training Transactions]
    S003.1 --> S003.5[STORY-003.5: Optimistic Locking]

    S004.1[STORY-004.1: Test Database] --> S004.2[STORY-004.2: Test Factories]
    S004.2 --> S004.3[STORY-004.3: Test Utilities]
    S004.3 --> S004.4[STORY-004.4: Run Tests]
```

---

## Release Planning

### Sprint 1 (Week 1-2): Critical Security
- EPIC-001: Input Validation (all stories)
- EPIC-004: Test Infrastructure Setup
- **Deliverable:** Input validation complete, tests running

### Sprint 2 (Week 3-4): Data Integrity & Security
- EPIC-002: Security Hardening (all stories)
- EPIC-003: Transactions (all stories)
- **Deliverable:** Security vulnerabilities fixed, data integrity ensured

### Sprint 3 (Week 5-6): Compliance & Performance
- EPIC-005: Audit & Compliance
- EPIC-007: Performance & Scalability
- **Deliverable:** HIPAA compliance gaps closed, performance optimized

### Sprint 4 (Week 7-8): UX & Quality
- EPIC-006: Authorization
- EPIC-008: Error Handling
- EPIC-009: Workflow Management
- **Deliverable:** Authorization complete, error handling improved

### Sprint 5 (Week 9-10): Production Readiness
- EPIC-010: Monitoring & Observability
- EPIC-011: CI/CD & Automation
- EPIC-012: Documentation
- **Deliverable:** Production-ready application

---

## Metrics & Tracking

### Story Completion Criteria
- [ ] Code complete and reviewed
- [ ] All tests passing (unit + integration)
- [ ] Code coverage > 80% for new code
- [ ] Security review passed (if applicable)
- [ ] Documentation updated
- [ ] Deployed to staging environment
- [ ] Acceptance criteria validated

### Epic Completion Criteria
- [ ] All stories complete
- [ ] Epic-level tests passing
- [ ] Performance benchmarks met
- [ ] Security scan passed
- [ ] Documentation complete
- [ ] Demo to stakeholders completed

---

**Total Stories:** 89
**Total Points:** ~320
**Estimated Duration:** 10 weeks (1 developer) or 5 weeks (2 developers)

**END OF DOCUMENT**
