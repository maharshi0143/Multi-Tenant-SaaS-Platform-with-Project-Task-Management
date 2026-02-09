// 1. Load .env first
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// 2. Import the configured app and database
const app = require('./app');
const { pool } = require('./config/db');

const PORT = process.env.PORT || 5000;

// 3. Start the Server
app.listen(PORT, () => {
  console.log(`🚀 Server is flying on port ${PORT}`);
  console.log(`✅ Health check: http://localhost:${PORT}/api/health`);
});