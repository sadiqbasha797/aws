const express = require('express');
const cors = require('cors');
const { connectDB, setupConnectionHandlers } = require('./config/database');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect to database
connectDB();

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/team-members', require('./routes/teamMemberRoutes'));
app.use('/api/managers', require('./routes/managerRoutes'));
app.use('/api/reliability', require('./routes/reliabilityRoutes'));
app.use('/api/productivity', require('./routes/productivityRoutes'));
app.use('/api/files', require('./routes/fileRoutes'));
app.use('/api/sops', require('./routes/sopRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));

// Basic route
app.get('/', (req, res) => {
  res.json({
    message: 'AWS Project API is running!',
    status: 'success',
    timestamp: new Date().toISOString()
  });
});

// Health check route
app.get('/health', (req, res) => {
  const mongoose = require('mongoose');
  res.json({
    status: 'OK',
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    message: 'Route not found',
    status: 'error'
  });
});

// Setup database connection handlers
setupConnectionHandlers();

const PORT = process.env.PORT || 7000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
