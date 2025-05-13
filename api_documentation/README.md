# HIPAA Compliance Tool API Documentation

This directory contains OpenAPI 3.0 documentation for the HIPAA Compliance Tool API endpoints.

## Overview

The API documentation is organized by functional areas to make it easier to find specific endpoints:

- **Authentication** - User authentication, MFA, and session management
- **Users** - User management operations
- **Documents** - Document management and acknowledgment
- **Incidents** - Security incident management
- **Risk** - Risk assessment and management
- **Training** - Training management and assignments
- **Reporting** - Advanced reporting and analytics

## Using the Documentation

### Viewing the Documentation

You can use any OpenAPI/Swagger UI compatible tool to view this documentation. Some options include:

1. **Swagger UI** - Copy the JSON files into a Swagger UI instance
2. **Swagger Editor** - Visit [editor.swagger.io](https://editor.swagger.io/) and paste the contents
3. **Redoc** - Use Redoc to generate beautiful, responsive documentation
4. **Postman** - Import the OpenAPI files into Postman to create a collection

### Structure

- `index.json` - Main OpenAPI specification with shared components
- `/authentication/` - Authentication, MFA, and session management endpoints
- `/users/` - User management endpoints
- `/documents/` - Document management endpoints
- `/incidents/` - Incident management endpoints
- `/risk/` - Risk assessment endpoints
- `/reporting/` - Reporting and analytics endpoints

## Authentication

Most API endpoints require authentication using JWT tokens. To authenticate:

1. Call `POST /api/auth/login` with valid credentials
2. Retrieve the JWT token from the response
3. Include the token in the Authorization header for subsequent requests:
   ```
   Authorization: Bearer <your-token>
   ```

## Error Handling

The API uses standard HTTP status codes and provides consistent error responses:

```json
{
  "success": false,
  "message": "Error description for display",
  "error": "Detailed error information",
  "errorCode": "ERROR_CODE"
}
```

## Rate Limiting

The API implements rate limiting to prevent abuse. If you exceed the rate limits, you'll receive a `429 Too Many Requests` response.

## Pagination

List endpoints support pagination using the following query parameters:

- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20, max: 100)

Paginated responses include metadata:

```json
{
  "success": true,
  "data": [...],
  "meta": {
    "total": 42,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  }
}
```

## API Versioning

The current API version is v1. The version is not included in the URL path but may be included in future updates.

## Support

If you have questions or need assistance with the API, please contact the development team.