const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const noteRoutes = require('./routes/noteRoutes');
const { verifyFirebaseToken, adminInitialized } = require('./middleware/authMiddleware');

const app = express();
app.use(cors());
app.use(express.json());


app.use(verifyFirebaseToken);

app.use('/notes', noteRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'Backend is running' });
});

const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/leadnotes';
console.log('Attempting to connect to MongoDB at:', mongoUri);

const PORT = process.env.PORT || 5003;

// Start server immediately so the app responds even if MongoDB is down
const server = app.listen(PORT, () => console.log(`✓ Server running on port ${PORT}`));

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

// Try to connect to MongoDB in background
const tryConnect = async (uri) => {
  try {
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 1000,
    });
    console.log('✓ MongoDB connected to', uri);
    return true;
  } catch (err) {
    console.error('✗ MongoDB connection failed for', uri, ':', err.message);
    return false;
  }
};

(async () => {
  const primary = mongoUri;
  const localFallback = 'mongodb://localhost:27017/leadnotes';

  const okPrimary = await tryConnect(primary);
  if (!okPrimary) {
    console.log('Attempting local MongoDB fallback...');
    const okLocal = await tryConnect(localFallback);
    if (!okLocal) {
      console.log('Server is running without database. In-memory fallback is active.');
    }
  }
})();
