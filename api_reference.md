# HIPAA Compliance Tool - API Reference

This document provides detailed information about the API endpoints available in the HIPAA Compliance Tool.

## Authentication

### POST /api/auth/login

Authenticates a user and returns a JWT token.

**Request Body:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "id": "number",
  "username": "string",
  "email": "string",
  "roles": ["string"],
  "accessToken": "string",
  "tokenType": "Bearer"
}
```

### POST /api/auth/logout

Invalidates the current session.

**Headers:**
- Authorization: Bearer {token}

**Response:**
```json
{
  "message": "Logged out successfully"
}
```

## User Management

### GET /api/users

Returns a list of users.

**Headers:**
- Authorization: Bearer {token}

**Query Parameters:**
- page: Page number (default: 1)
- limit: Items per page (default: 10)
- search: Search term for username or email
- role: Filter by role ID
- department: Filter by department ID

**Response:**
```json
{
  "totalItems": "number",
  "users": [
    {
      "id": "number",
      "username": "string",
      "email": "string",
      "firstName": "string",
      "lastName": "string",
      "role": {
        "id": "number",
        "name": "string"
      },
      "department": {
        "id": "number",
        "name": "string"
      },
      "isActive": "boolean",
      "lastLogin": "date",
      "createdAt": "date",
      "updatedAt": "date"
    }
  ],
  "totalPages": "number",
  "currentPage": "number"
}
```

### GET /api/users/:id

Returns a specific user by ID.

**Headers:**
- Authorization: Bearer {token}

**Response:**
```json
{
  "id": "number",
  "username": "string",
  "email": "string",
  "firstName": "string",
  "lastName": "string",
  "role": {
    "id": "number",
    "name": "string"
  },
  "department": {
    "id": "number",
    "name": "string"
  },
  "isActive": "boolean",
  "lastLogin": "date",
  "createdAt": "date",
  "updatedAt": "date"
}
```

### POST /api/users

Creates a new user.

**Headers:**
- Authorization: Bearer {token}

**Request Body:**
```json
{
  "username": "string",
  "email": "string",
  "password": "string",
  "firstName": "string",
  "lastName": "string",
  "roleId": "number",
  "departmentId": "number",
  "isActive": "boolean"
}
```

**Response:**
```json
{
  "id": "number",
  "username": "string",
  "email": "string",
  "firstName": "string",
  "lastName": "string",
  "role": {
    "id": "number",
    "name": "string"
  },
  "department": {
    "id": "number",
    "name": "string"
  },
  "isActive": "boolean",
  "createdAt": "date",
  "updatedAt": "date"
}
```

### PUT /api/users/:id

Updates an existing user.

**Headers:**
- Authorization: Bearer {token}

**Request Body:**
```json
{
  "email": "string",
  "firstName": "string",
  "lastName": "string",
  "roleId": "number",
  "departmentId": "number",
  "isActive": "boolean"
}
```

**Response:**
```json
{
  "id": "number",
  "username": "string",
  "email": "string",
  "firstName": "string",
  "lastName": "string",
  "role": {
    "id": "number",
    "name": "string"
  },
  "department": {
    "id": "number",
    "name": "string"
  },
  "isActive": "boolean",
  "updatedAt": "date"
}
```

### DELETE /api/users/:id

Deletes a user.

**Headers:**
- Authorization: Bearer {token}

**Response:**
```json
{
  "message": "User deleted successfully"
}
```

## Training Management

### GET /api/training/courses

Returns a list of training courses.

**Headers:**
- Authorization: Bearer {token}

**Query Parameters:**
- page: Page number (default: 1)
- limit: Items per page (default: 10)
- search: Search term for course title
- category: Filter by category

**Response:**
```json
{
  "totalItems": "number",
  "courses": [
    {
      "id": "number",
      "title": "string",
      "description": "string",
      "category": "string",
      "duration": "number",
      "isRequired": "boolean",
      "createdAt": "date",
      "updatedAt": "date"
    }
  ],
  "totalPages": "number",
  "currentPage": "number"
}
```

### GET /api/training/courses/:id

Returns a specific training course.

**Headers:**
- Authorization: Bearer {token}

**Response:**
```json
{
  "id": "number",
  "title": "string",
  "description": "string",
  "category": "string",
  "content": "string",
  "duration": "number",
  "isRequired": "boolean",
  "createdAt": "date",
  "updatedAt": "date"
}
```

### POST /api/training/courses

Creates a new training course.

**Headers:**
- Authorization: Bearer {token}

**Request Body:**
```json
{
  "title": "string",
  "description": "string",
  "category": "string",
  "content": "string",
  "duration": "number",
  "isRequired": "boolean"
}
```

**Response:**
```json
{
  "id": "number",
  "title": "string",
  "description": "string",
  "category": "string",
  "content": "string",
  "duration": "number",
  "isRequired": "boolean",
  "createdAt": "date",
  "updatedAt": "date"
}
```

### GET /api/training/assignments

Returns a list of training assignments.

**Headers:**
- Authorization: Bearer {token}

**Query Parameters:**
- page: Page number (default: 1)
- limit: Items per page (default: 10)
- userId: Filter by user ID
- courseId: Filter by course ID
- status: Filter by status (assigned, in_progress, completed)

**Response:**
```json
{
  "totalItems": "number",
  "assignments": [
    {
      "id": "number",
      "user": {
        "id": "number",
        "username": "string"
      },
      "course": {
        "id": "number",
        "title": "string"
      },
      "status": "string",
      "assignedDate": "date",
      "dueDate": "date",
      "completedDate": "date",
      "createdAt": "date",
      "updatedAt": "date"
    }
  ],
  "totalPages": "number",
  "currentPage": "number"
}
```

### POST /api/training/assignments

Creates a new training assignment.

**Headers:**
- Authorization: Bearer {token}

**Request Body:**
```json
{
  "userId": "number",
  "courseId": "number",
  "dueDate": "date"
}
```

**Response:**
```json
{
  "id": "number",
  "user": {
    "id": "number",
    "username": "string"
  },
  "course": {
    "id": "number",
    "title": "string"
  },
  "status": "assigned",
  "assignedDate": "date",
  "dueDate": "date",
  "createdAt": "date",
  "updatedAt": "date"
}
```

### PUT /api/training/assignments/:id/complete

Marks a training assignment as completed.

**Headers:**
- Authorization: Bearer {token}

**Response:**
```json
{
  "id": "number",
  "user": {
    "id": "number",
    "username": "string"
  },
  "course": {
    "id": "number",
    "title": "string"
  },
  "status": "completed",
  "assignedDate": "date",
  "dueDate": "date",
  "completedDate": "date",
  "updatedAt": "date"
}
```

## Document Management

### GET /api/documents

Returns a list of documents.

**Headers:**
- Authorization: Bearer {token}

**Query Parameters:**
- page: Page number (default: 1)
- limit: Items per page (default: 10)
- search: Search term for document title
- category: Filter by category ID

**Response:**
```json
{
  "totalItems": "number",
  "documents": [
    {
      "id": "number",
      "title": "string",
      "description": "string",
      "category": {
        "id": "number",
        "name": "string"
      },
      "version": "string",
      "requiresAcknowledgment": "boolean",
      "createdAt": "date",
      "updatedAt": "date"
    }
  ],
  "totalPages": "number",
  "currentPage": "number"
}
```

### GET /api/documents/:id

Returns a specific document.

**Headers:**
- Authorization: Bearer {token}

**Response:**
```json
{
  "id": "number",
  "title": "string",
  "description": "string",
  "content": "string",
  "category": {
    "id": "number",
    "name": "string"
  },
  "version": "string",
  "requiresAcknowledgment": "boolean",
  "createdAt": "date",
  "updatedAt": "date"
}
```

### POST /api/documents

Creates a new document.

**Headers:**
- Authorization: Bearer {token}

**Request Body:**
```json
{
  "title": "string",
  "description": "string",
  "content": "string",
  "categoryId": "number",
  "version": "string",
  "requiresAcknowledgment": "boolean"
}
```

**Response:**
```json
{
  "id": "number",
  "title": "string",
  "description": "string",
  "content": "string",
  "category": {
    "id": "number",
    "name": "string"
  },
  "version": "string",
  "requiresAcknowledgment": "boolean",
  "createdAt": "date",
  "updatedAt": "date"
}
```

### POST /api/documents/:id/acknowledge

Acknowledges a document.

**Headers:**
- Authorization: Bearer {token}

**Response:**
```json
{
  "id": "number",
  "user": {
    "id": "number",
    "username": "string"
  },
  "document": {
    "id": "number",
    "title": "string"
  },
  "acknowledgedAt": "date"
}
```

## Risk Assessment

### GET /api/risk/assessments

Returns a list of risk assessments.

**Headers:**
- Authorization: Bearer {token}

**Query Parameters:**
- page: Page number (default: 1)
- limit: Items per page (default: 10)
- status: Filter by status (in_progress, completed)

**Response:**
```json
{
  "totalItems": "number",
  "assessments": [
    {
      "id": "number",
      "title": "string",
      "description": "string",
      "status": "string",
      "startDate": "date",
      "completionDate": "date",
      "createdBy": {
        "id": "number",
        "username": "string"
      },
      "createdAt": "date",
      "updatedAt": "date"
    }
  ],
  "totalPages": "number",
  "currentPage": "number"
}
```

### GET /api/risk/assessments/:id

Returns a specific risk assessment.

**Headers:**
- Authorization: Bearer {token}

**Response:**
```json
{
  "id": "number",
  "title": "string",
  "description": "string",
  "status": "string",
  "startDate": "date",
  "completionDate": "date",
  "createdBy": {
    "id": "number",
    "username": "string"
  },
  "items": [
    {
      "id": "number",
      "description": "string",
      "category": "string",
      "likelihood": "number",
      "impact": "number",
      "riskLevel": "string",
      "mitigationPlan": "string",
      "mitigationStatus": "string"
    }
  ],
  "createdAt": "date",
  "updatedAt": "date"
}
```

### POST /api/risk/assessments

Creates a new risk assessment.

**Headers:**
- Authorization: Bearer {token}

**Request Body:**
```json
{
  "title": "string",
  "description": "string",
  "startDate": "date"
}
```

**Response:**
```json
{
  "id": "number",
  "title": "string",
  "description": "string",
  "status": "in_progress",
  "startDate": "date",
  "createdBy": {
    "id": "number",
    "username": "string"
  },
  "createdAt": "date",
  "updatedAt": "date"
}
```

### POST /api/risk/assessments/:id/items

Adds a risk item to an assessment.

**Headers:**
- Authorization: Bearer {token}

**Request Body:**
```json
{
  "description": "string",
  "category": "string",
  "likelihood": "number",
  "impact": "number",
  "mitigationPlan": "string"
}
```

**Response:**
```json
{
  "id": "number",
  "description": "string",
  "category": "string",
  "likelihood": "number",
  "impact": "number",
  "riskLevel": "string",
  "mitigationPlan": "string",
  "mitigationStatus": "not_started",
  "createdAt": "date",
  "updatedAt": "date"
}
```

## Incident Management

### GET /api/incidents

Returns a list of incidents.

**Headers:**
- Authorization: Bearer {token}

**Query Parameters:**
- page: Page number (default: 1)
- limit: Items per page (default: 10)
- status: Filter by status (reported, investigating, resolved, closed)
- severity: Filter by severity (low, medium, high, critical)

**Response:**
```json
{
  "totalItems": "number",
  "incidents": [
    {
      "id": "number",
      "title": "string",
      "description": "string",
      "status": "string",
      "severity": "string",
      "reportedBy": {
        "id": "number",
        "username": "string"
      },
      "reportedAt": "date",
      "resolvedAt": "date",
      "createdAt": "date",
      "updatedAt": "date"
    }
  ],
  "totalPages": "number",
  "currentPage": "number"
}
```

### GET /api/incidents/:id

Returns a specific incident.

**Headers:**
- Authorization: Bearer {token}

**Response:**
```json
{
  "id": "number",
  "title": "string",
  "description": "string",
  "status": "string",
  "severity": "string",
  "reportedBy": {
    "id": "number",
    "username": "string"
  },
  "reportedAt": "date",
  "resolvedAt": "date",
  "updates": [
    {
      "id": "number",
      "content": "string",
      "updatedBy": {
        "id": "number",
        "username": "string"
      },
      "createdAt": "date"
    }
  ],
  "createdAt": "date",
  "updatedAt": "date"
}
```

### POST /api/incidents

Reports a new incident.

**Headers:**
- Authorization: Bearer {token}

**Request Body:**
```json
{
  "title": "string",
  "description": "string",
  "severity": "string"
}
```

**Response:**
```json
{
  "id": "number",
  "title": "string",
  "description": "string",
  "status": "reported",
  "severity": "string",
  "reportedBy": {
    "id": "number",
    "username": "string"
  },
  "reportedAt": "date",
  "createdAt": "date",
  "updatedAt": "date"
}
```

### POST /api/incidents/:id/updates

Adds an update to an incident.

**Headers:**
- Authorization: Bearer {token}

**Request Body:**
```json
{
  "content": "string",
  "status": "string"
}
```

**Response:**
```json
{
  "id": "number",
  "content": "string",
  "updatedBy": {
    "id": "number",
    "username": "string"
  },
  "createdAt": "date"
}
```

## Audit Logging

### GET /api/audit/logs

Returns a list of audit logs.

**Headers:**
- Authorization: Bearer {token}

**Query Parameters:**
- page: Page number (default: 1)
- limit: Items per page (default: 10)
- userId: Filter by user ID
- action: Filter by action type
- startDate: Filter by start date
- endDate: Filter by end date

**Response:**
```json
{
  "totalItems": "number",
  "logs": [
    {
      "id": "number",
      "user": {
        "id": "number",
        "username": "string"
      },
      "action": "string",
      "entity": "string",
      "entityId": "number",
      "details": "string",
      "ipAddress": "string",
      "timestamp": "date"
    }
  ],
  "totalPages": "number",
  "currentPage": "number"
}
```

### GET /api/audit/logs/export

Exports audit logs to CSV.

**Headers:**
- Authorization: Bearer {token}

**Query Parameters:**
- startDate: Filter by start date
- endDate: Filter by end date
- userId: Filter by user ID
- action: Filter by action type

**Response:**
CSV file download

## Reporting

### GET /api/reports/compliance

Returns compliance status report.

**Headers:**
- Authorization: Bearer {token}

**Query Parameters:**
- departmentId: Filter by department ID

**Response:**
```json
{
  "trainingCompliance": {
    "total": "number",
    "completed": "number",
    "overdue": "number",
    "percentComplete": "number"
  },
  "documentCompliance": {
    "total": "number",
    "acknowledged": "number",
    "pending": "number",
    "percentComplete": "number"
  },
  "riskAssessment": {
    "total": "number",
    "highRisks": "number",
    "mediumRisks": "number",
    "lowRisks": "number",
    "mitigated": "number",
    "percentMitigated": "number"
  },
  "incidents": {
    "total": "number",
    "open": "number",
    "closed": "number",
    "breaches": "number"
  }
}
```

### GET /api/reports/training

Returns training completion report.

**Headers:**
- Authorization: Bearer {token}

**Query Parameters:**
- departmentId: Filter by department ID
- courseId: Filter by course ID
- startDate: Filter by start date
- endDate: Filter by end date

**Response:**
```json
{
  "totalAssignments": "number",
  "completed": "number",
  "inProgress": "number",
  "notStarted": "number",
  "overdue": "number",
  "percentComplete": "number",
  "byDepartment": [
    {
      "department": "string",
      "total": "number",
      "completed": "number",
      "percentComplete": "number"
    }
  ],
  "byCourse": [
    {
      "course": "string",
      "total": "number",
      "completed": "number",
      "percentComplete": "number"
    }
  ]
}
```

### GET /api/advanced-reports/custom

Generates a custom report.

**Headers:**
- Authorization: Bearer {token}

**Query Parameters:**
- type: Report type (training, documents, risks, incidents, audit)
- format: Output format (json, csv, pdf)
- filters: JSON string of filters

**Response:**
Report in requested format

## Health Check

### GET /api/health

Returns the health status of the API.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "date",
  "uptime": "number",
  "message": "HIPAA Compliance Tool API is running"
}
```
