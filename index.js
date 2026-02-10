const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const noteRoutes = require('./routes/noteRoutes');
const { verifyFirebaseToken } = require('./middleware/authMiddleware');

const app = express();

/* ---------- MIDDLEWARE ---------- */
app.use(cors());
app.use(express.json());

/* ---------- HEALTH CHECK (NO AUTH) ---------- */
app.get('/health', (req, res) => {
  res.json({ status: 'Backend is running' });
});

/* ---------- PROTECTED ROUTES ---------- */
app.use('/notes', verifyFirebaseToken, noteRoutes);

/* ---------- SERVER ---------- */
const PORT = process.env.PORT || 5003;
const server = app.listen(PORT, () =>
  console.log(`✓ Server running on port ${PORT}`)
);

/* ---------- GRACEFUL SHUTDOWN ---------- */
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => console.log('Process terminated'));
});

/* ---------- DATABASE ---------- */
const mongoUri = process.env.MONGO_URI;

if (!mongoUri) {
  console.warn('⚠️ MONGO_URI not set. Server running without DB.');
} else {
  mongoose
    .connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
    })
    .then(() => console.log('✓ MongoDB connected'))
    .catch(err =>
      console.error('✗ MongoDB connection failed:', err.message)
    );
}
