const { Pool } = require('pg');
require('dotenv').config(); // Loads .env variables into process.env

// Configuration using Environment Variables
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,     // Must be 'database' in Docker
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
  // Recommended for production-ready SaaS:
  max: 20,                       // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,      // How long a client is allowed to remain idle
  connectionTimeoutMillis: 2000, // How long to wait for a connection
});

// Test the connection logic
pool.on('connect', () => {
  console.log('✅ Connected to the PostgreSQL database successfully!');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle database client', err);
  process.exit(-1);
});

/**
 * Helper for standard queries
 */
const query = (text, params) => pool.query(text, params);

/**
 * Helper for Transaction Safety
 * Required for Step 3.1: Tenant Registration
 */
const getClient = async () => {
  const client = await pool.connect();
  const query = client.query.bind(client);
  const release = () => {
    client.release();
  };
  return { client, query, release };
};

module.exports = {
  query,
  pool,
  getClient
};