/**
 * This script sets the necessary database permissions for the PostgreSQL user
 * Run this script after initializing the database
 */
const { Client } = require('pg');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Database connection configuration
const config = {
  user: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'hipaa_compliance',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432
};

async function initializePermissions() {
  const client = new Client(config);
  
  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected successfully');
    
    console.log('Setting up permissions...');
    
    // Get list of all sequences
    const result = await client.query(`
      SELECT sequence_name
      FROM information_schema.sequences
      WHERE sequence_schema = 'public'
    `);
    
    const sequences = result.rows.map(row => row.sequence_name);
    console.log(`Found ${sequences.length} sequences`);
    
    // Grant usage and update permissions to all sequences
    for (const sequence of sequences) {
      console.log(`Granting permissions to sequence: ${sequence}`);
      await client.query(`
        GRANT USAGE, SELECT, UPDATE ON SEQUENCE ${sequence} TO ${config.user};
      `);
    }
    
    // Grant permissions on all tables
    await client.query(`
      GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ${config.user};
    `);
    
    console.log('Permissions set successfully');
    
  } catch (error) {
    console.error('Error setting permissions:', error);
  } finally {
    await client.end();
    console.log('Database connection closed');
  }
}

// Run the function
initializePermissions();
