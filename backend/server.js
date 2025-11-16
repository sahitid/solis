require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const eventsRoutes = require('./routes/events');
const conflictsRoutes = require('./routes/conflicts');
const rescheduleRoutes = require('./routes/reschedule');
const rescheduleDecisionRoutes = require('./routes/rescheduleDecisionTree');
const { startPeriodicSync } = require('./utils/syncScheduler');

const app = express();

// Middleware
app.use(cors({
  origin: function (origin, callback) {
    // Allow Chrome extension origins (chrome-extension://...)
    if (!origin || origin.startsWith('chrome-extension://')) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all for development
    }
  },
  credentials: true
}));
app.use(express.json());

// Database connection
mongoose.connect(process.env.MONGO_URI)
.then(() => {
  console.log('✅ MongoDB Atlas connected successfully');
  console.log(`   Database: ${mongoose.connection.name}`);
})
.catch((err) => {
  console.error('❌ MongoDB connection error:', err.message);
  console.error('   Please check your MONGO_URI in .env file');
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/conflicts', conflictsRoutes);
app.use('/api/reschedule', rescheduleRoutes);
app.use('/api/reschedule-decision', rescheduleDecisionRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running', timestamp: new Date() });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  
  // Start periodic calendar sync (every 15 minutes)
  // Comment this out if you prefer webhook-only approach
  if (process.env.ENABLE_PERIODIC_SYNC !== 'false') {
    startPeriodicSync(15);
  }
});

module.exports = app;

