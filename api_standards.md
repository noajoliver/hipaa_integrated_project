# API Standards for HIPAA Compliance Application

This document outlines the standards for API design and implementation in the HIPAA Compliance Application.

## 1. API Response Format

All API responses should follow a consistent format to ensure predictability and ease of use.

### Success Response Format

```json
{
  "success": true,
  "message": "Operation successful message",
  "statusCode": 200,
  "data": { ... },
  "timestamp": "2023-05-11T14:30:45.123Z"
}
```

### Error Response Format

```json
{
  "success": false,
  "message": "Error message",
  "statusCode": 400,
  "errorCode": "ERROR_CODE",
  "errors": { ... },
  "timestamp": "2023-05-11T14:30:45.123Z"
}
```

### Paginated Response Format

```json
{
  "success": true,
  "message": "Data retrieved successfully",
  "statusCode": 200,
  "data": [ ... ],
  "pagination": {
    "totalItems": 100,
    "totalPages": 10,
    "currentPage": 1,
    "itemsPerPage": 10,
    "hasNext": true,
    "hasPrevious": false
  },
  "timestamp": "2023-05-11T14:30:45.123Z"
}
```

## 2. HTTP Status Codes

- **200 OK** - Request was successful
- **201 Created** - Resource was successfully created
- **204 No Content** - Request was successful but no content to return
- **400 Bad Request** - Invalid request parameters
- **401 Unauthorized** - Authentication failed or token expired
- **403 Forbidden** - Authentication succeeded but user lacks permission
- **404 Not Found** - Resource not found
- **409 Conflict** - Resource already exists or state conflict
- **422 Unprocessable Entity** - Validation errors
- **500 Internal Server Error** - Server error

## 3. Error Codes

All error responses should include a standardized error code to identify the specific error type. Error codes should be in ALL_CAPS with underscores.

### Authentication Error Codes
- `AUTH_MISSING_TOKEN` - No authentication token provided
- `AUTH_INVALID_TOKEN` - Invalid authentication token
- `AUTH_EXPIRED_TOKEN` - Authentication token has expired
- `AUTH_USER_NOT_FOUND` - User associated with token no longer exists
- `INVALID_CREDENTIALS` - Invalid username or password
- `ACCOUNT_LOCKED` - Account is locked
- `ACCOUNT_DEACTIVATED` - Account has been deactivated
- `ACCOUNT_PENDING` - Account is pending approval

### Validation Error Codes
- `VALIDATION_ERROR` - General validation error
- `PASSWORD_VALIDATION_ERROR` - Password doesn't meet requirements
- `DUPLICATE_USER` - Username or email already exists
- `DUPLICATE_ROLE` - Role already exists
- `DUPLICATE_DEPARTMENT` - Department already exists
- `SAME_PASSWORD` - New password must be different from current password

### Permission Error Codes
- `ROLE_NOT_ASSIGNED` - No role assigned to user
- `ADMIN_ACCESS_REQUIRED` - Requires administrator access
- `COMPLIANCE_ACCESS_REQUIRED` - Requires compliance officer access
- `MANAGER_ACCESS_REQUIRED` - Requires department manager access

### General Error Codes
- `NOT_FOUND` - Resource not found
- `INTERNAL_ERROR` - Internal server error

## 4. API Endpoint Naming Convention

- Use plural nouns for resource names
- Use kebab-case for endpoint paths
- Include resource hierarchy in path
- Use query parameters for filtering, sorting, and pagination

Examples:
- `GET /api/users` - List all users
- `GET /api/users/123` - Get user with ID 123
- `GET /api/departments/5/users` - List users in department 5
- `GET /api/training-courses?status=active&sort=name` - List active training courses sorted by name

## 5. Authentication

All API endpoints except public ones (e.g., login, register) should require authentication using JWT tokens.

- Include token in `x-access-token` header or `Authorization: Bearer <token>` header
- Tokens should expire after a configured time period (default: 8 hours)
- Include standardized token claims (user ID, role, expiration)

## 6. API Versioning

- Include API version in URL path: `/api/v1/users`
- Use semantic versioning for API versions
- Major version changes should be reflected in the URL

## 7. Documentation

- All API endpoints should be documented using JSDoc in the controller files
- Include endpoint description, request parameters, response format, and error codes
- Generate API reference documentation from JSDoc comments

## 8. Rate Limiting

- Implement rate limiting for all API endpoints
- Include rate limit headers in responses:
  - `X-RateLimit-Limit` - Requests allowed per time window
  - `X-RateLimit-Remaining` - Requests remaining in current window
  - `X-RateLimit-Reset` - Time when rate limit resets

## 9. Pagination

- Use query parameters for pagination:
  - `page` - Page number (default: 1)
  - `limit` - Items per page (default: 10, max: 100)
- Include pagination details in response

## 10. Filtering and Sorting

- Use query parameters for filtering:
  - `filter[field]=value` - Filter by field
  - `sort=field` - Sort by field ascending
  - `sort=-field` - Sort by field descending

## 11. Security Headers

All API responses should include appropriate security headers:

- `Content-Security-Policy`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`