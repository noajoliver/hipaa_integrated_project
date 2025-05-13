#!/bin/bash
set -e

# User initialization script for HIPAA Compliance Tool
# This script will run automatically when the PostgreSQL container starts

# Wait for the database to be ready and schema to be initialized
until PGPASSWORD=$POSTGRES_PASSWORD psql -h localhost -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT 1 FROM roles LIMIT 1"; do
  echo "Waiting for schema initialization..."
  sleep 2
done

# Create users table and admin user
PGPASSWORD=$POSTGRES_PASSWORD psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Create users table if it doesn't exist
    CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        first_name VARCHAR(255),
        last_name VARCHAR(255),
        role_id INTEGER REFERENCES roles(id),
        department_id INTEGER REFERENCES departments(id),
        is_active BOOLEAN DEFAULT TRUE,
        last_login TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Insert admin user if it doesn't exist
    -- Password is 'admin123' (this is a SHA-256 hash for Docker compatibility)
    INSERT INTO users (username, email, password, first_name, last_name, role_id, department_id, is_active)
    SELECT 
        'admin', 
        'admin@example.com', 
        '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 
        'System', 
        'Administrator', 
        (SELECT id FROM roles WHERE name = 'admin'), 
        (SELECT id FROM departments WHERE name = 'Administration'), 
        TRUE
    WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'admin');

    -- Insert compliance officer user if it doesn't exist
    -- Password is 'compliance123' (this is a SHA-256 hash for Docker compatibility)
    INSERT INTO users (username, email, password, first_name, last_name, role_id, department_id, is_active)
    SELECT 
        'compliance', 
        'compliance@example.com', 
        '7d0d211a3f5a3c1b5ca00a2f8a6b9f8f7b382a33a0b7b4f90e9f9bc120f1d8c8', 
        'Compliance', 
        'Officer', 
        (SELECT id FROM roles WHERE name = 'compliance_officer'), 
        (SELECT id FROM departments WHERE name = 'Compliance'), 
        TRUE
    WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'compliance');
EOSQL

echo "Default users created successfully"
