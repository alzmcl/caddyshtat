const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const coursesRouter = require('./routes/courses');
const roundsRouter = require('./routes/rounds');
const playersRouter = require('./routes/players');
const authRouter = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable for now to allow inline scripts in React
}));

// Rate limiting - 100 requests per 15 minutes
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later'
});
app.use('/api/', limiter);

// CORS - restrict to your domain in production
const allowedOrigins = process.env.ALLOWED_ORIGIN 
  ? process.env.ALLOWED_ORIGIN.split(',')
  : ['http://localhost:5173', 'http://localhost:3000'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/courses', coursesRouter);
app.use('/api/rounds', roundsRouter);
app.use('/api/players', playersRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve static files from React build
const staticPath = path.join(__dirname, '../../client/dist');
app.use(express.static(staticPath));

// Handle React routing - serve index.html for non-API routes
app.use((req, res, next) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(staticPath, 'index.html'));
  } else {
    next();
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server - listen on all network interfaces
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Stats Tracker API server running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  console.log(`Network access: http://0.0.0.0:${PORT}`);
});

module.exports = app;
