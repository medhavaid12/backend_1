const admin = require('firebase-admin');

let adminInitialized = false;

/* ---------- INITIALIZE FIREBASE ADMIN ---------- */
if (
  process.env.FIREBASE_PROJECT_ID &&
  process.env.FIREBASE_CLIENT_EMAIL &&
  process.env.FIREBASE_PRIVATE_KEY
) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    });

    adminInitialized = true;
    console.log('✓ Firebase Admin initialized using environment variables');
  } catch (error) {
    console.error('✗ Firebase Admin initialization failed:', error.message);
  }
} else {
  console.warn(
    '⚠️ Firebase Admin not initialized (missing env vars). Auth middleware will allow requests.'
  );
}

/* ---------- VERIFY TOKEN MIDDLEWARE ---------- */
const verifyFirebaseToken = async (req, res, next) => {
  if (!adminInitialized) {
    // Allow requests if Firebase is not configured
    return next();
  }

  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.substring(7)
    : null;

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: missing token' });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Token verification failed:', error.message);
    return res.status(401).json({ error: 'Unauthorized: invalid token' });
  }
};

module.exports = {
  verifyFirebaseToken,
};
