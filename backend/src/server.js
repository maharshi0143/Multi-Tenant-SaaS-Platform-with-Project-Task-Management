// 1. Load .env first
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// 2. Import the configured app and database
const app = require('./app');
const { pool } = require('./config/db');

const PORT = process.env.PORT || 5000;

/**
 * Global Health Check (MANDATORY REQUIREMENT)
 * The evaluation script uses this to verify the system is ready.
 */
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1'); // Verify database connection
    res.status(200).json({ 
      status: 'ok', 
      database: 'connected',
      timestamp: new Date().toISOString() 
    });
  } catch (err) {
    console.error('❌ Health Check Failed:', err.message);
    res.status(500).json({ status: 'error', database: 'disconnected' });
  }
});

// 3. Start the Server
app.listen(PORT, () => {
  console.log(`🚀 Server is flying on port ${PORT}`);
  console.log(`✅ Health check: http://localhost:${PORT}/api/health`);
});