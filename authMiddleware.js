const admin = require('firebase-admin');
const path = require('path');

const isDev = process.env.NODE_ENV === 'development';
let adminInitialized = false;

// Initialize Firebase Admin SDK
try {
  // Check for service account file path
  const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || './serviceAccountKey.json';
  
  // Try to load the service account key
  let credential = null;
  try {
    const serviceAccountFile = path.resolve(serviceAccountPath);
    const serviceAccount = require(serviceAccountFile);
    credential = admin.credential.cert(serviceAccount);
    console.log('✓ Firebase Admin initialized from serviceAccountKey.json');
  } catch (err) {
    console.log('Service account key file not found, trying environment variable...');
    // Try environment variable as JSON string
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      credential = admin.credential.cert(serviceAccount);
      console.log('✓ Firebase Admin initialized from FIREBASE_SERVICE_ACCOUNT env var');
    }
  }

  if (credential) {
    admin.initializeApp({
      credential: credential
    });
    adminInitialized = true;
  } else {
    console.log('ℹ Firebase Admin not configured. Token verification disabled (demo mode).');
  }
} catch (error) {
  console.error('✗ Error initializing Firebase Admin:', error.message);
  adminInitialized = false;
}

// Middleware to verify Firebase token when admin is initialized
const verifyFirebaseToken = async (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.split('Bearer ')[1] : null;

  // Allow all requests in development for local testing (bypass token verification)
  if (isDev) {
    return next();
  }

  if (!adminInitialized) {
    // Production: allow demo mode if Firebase not configured
    console.log('ℹ Running in demo mode (no Firebase configured)');
    return next();
  }

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: missing token' });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    return next();
  } catch (error) {
    console.error('Token verification error:', error.message);
    return res.status(401).json({ error: 'Unauthorized: invalid token' });
  }
};

module.exports = { verifyFirebaseToken, admin, adminInitialized };
