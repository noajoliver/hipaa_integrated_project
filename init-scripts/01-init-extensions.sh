#!/bin/bash
set -e

# PostgreSQL initialization script for HIPAA Compliance Tool
# This script will run automatically when the PostgreSQL container starts

# Create extensions if needed
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
EOSQL

echo "PostgreSQL initialized successfully"
