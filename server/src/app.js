const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const apiRoutes = require('./routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Mount API v1 router
app.use('/api/v1', apiRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({
    name: 'Community Disaster Relief & Resource Allocation API',
    version: '1.0.0',
    documentation: '/api/v1/health'
  });
});

// Centralized Error Handling Middleware
app.use(errorHandler);

module.exports = app;
