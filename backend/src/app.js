const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { pool } = require('./config/db'); // Added to check real DB status
require('dotenv').config();

// Import Routes
const authRoutes = require('./routes/authRoutes');
const tenantRoutes = require('./routes/tenantRoutes');
const projectRoutes = require('./routes/projectRoutes');
const taskRoutes = require('./routes/taskRoutes');
const userRoutes = require('./routes/userRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

const app = express();

// 1. Mandatory CORS Configuration
// Allows requests from your frontend Docker service or local dev
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "http://frontend:3000"
];

app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (Postman, curl)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    } else {
      return callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true
}));

// 2. Body Parser Middleware
app.use(express.json());

// 2b. Request logging for easier debugging
app.use(morgan('dev'));

// 3. Health Check Endpoint (MANDATORY for evaluation)
app.get('/api/health', async (req, res) => {
  try {
    // Logic must check actual database connection
    await pool.query('SELECT 1'); 
    res.status(200).json({
      status: 'ok',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(503).json({
      status: 'error',
      database: 'disconnected',
      message: err.message
    });
  }
});

// 4. API Routes
app.use('/api/auth', authRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/users', userRoutes);
app.use('/api/dashboard', dashboardRoutes);

// 5. Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ 
    success: false, 
    message: err.message || 'Internal Server Error' 
  });
});

module.exports = app;