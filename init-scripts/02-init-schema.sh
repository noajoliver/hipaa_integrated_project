#!/bin/bash
set -e

# Database schema initialization script for HIPAA Compliance Tool
# This script will run automatically when the PostgreSQL container starts

# Wait for the database to be ready
until PGPASSWORD=$POSTGRES_PASSWORD psql -h localhost -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c '\q'; do
  echo "Waiting for database to be ready..."
  sleep 2
done

# Create schema and initial data
PGPASSWORD=$POSTGRES_PASSWORD psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Create roles table
    CREATE TABLE IF NOT EXISTS roles (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Create departments table
    CREATE TABLE IF NOT EXISTS departments (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Insert default roles if they don't exist
    INSERT INTO roles (name, description)
    SELECT 'admin', 'Administrator with full system access'
    WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'admin');

    INSERT INTO roles (name, description)
    SELECT 'compliance_officer', 'Manages compliance activities and reporting'
    WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'compliance_officer');

    INSERT INTO roles (name, description)
    SELECT 'manager', 'Department manager with oversight responsibilities'
    WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'manager');

    INSERT INTO roles (name, description)
    SELECT 'employee', 'Regular employee with basic access'
    WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'employee');

    -- Insert default departments if they don't exist
    INSERT INTO departments (name, description)
    SELECT 'Administration', 'Administrative department'
    WHERE NOT EXISTS (SELECT 1 FROM departments WHERE name = 'Administration');

    INSERT INTO departments (name, description)
    SELECT 'IT', 'Information Technology department'
    WHERE NOT EXISTS (SELECT 1 FROM departments WHERE name = 'IT');

    INSERT INTO departments (name, description)
    SELECT 'Compliance', 'Compliance and Risk Management'
    WHERE NOT EXISTS (SELECT 1 FROM departments WHERE name = 'Compliance');

    INSERT INTO departments (name, description)
    SELECT 'Clinical', 'Clinical Operations'
    WHERE NOT EXISTS (SELECT 1 FROM departments WHERE name = 'Clinical');
EOSQL

echo "Database schema initialized successfully"
