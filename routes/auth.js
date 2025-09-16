import express from 'express';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-key';

// Google OAuth login endpoint
router.get('/google', async (req, res) => {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `http://localhost:5000/auth/callback`
      }
    });

    if (error) throw error;
    
    res.redirect(data.url);
  } catch (error) {
    console.error('Google OAuth error:', error);
    res.status(500).json({ error: 'OAuth initialization failed' });
  }
});

// Middleware to verify JWT tokens
const verifyToken = async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    // First try to verify as custom JWT
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = { id: decoded.id, email: decoded.email };
      return next();
    } catch (jwtError) {
      console.log('Custom JWT verification failed, trying Supabase token...');
    }

    // Fallback to Supabase token verification
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Register endpoint
router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Create JWT token
    const token = jwt.sign(
      { 
        id: data.user.id, 
        email: data.user.email 
      }, 
      JWT_SECRET, 
      { expiresIn: '7d' }
    );

    res.json({
      user: {
        id: data.user.id,
        email: data.user.email
      },
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Create JWT token
    const token = jwt.sign(
      { 
        id: data.user.id, 
        email: data.user.email 
      }, 
      JWT_SECRET, 
      { expiresIn: '7d' }
    );

    res.json({
      user: {
        id: data.user.id,
        email: data.user.email
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user session
router.get('/me', verifyToken, async (req, res) => {
  try {
    res.json({
      user: {
        id: req.user.id,
        email: req.user.email,
        user_metadata: req.user.user_metadata
      }
    });
  } catch (error) {
    console.error('Session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Token refresh endpoint - works with expired tokens
router.post('/refresh', async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    // Try to decode expired token to get user info
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (jwtError) {
      // If JWT is expired, decode without verification to get user info
      if (jwtError.name === 'TokenExpiredError') {
        decoded = jwt.decode(token);
      } else {
        return res.status(401).json({ error: 'Invalid token' });
      }
    }

    if (!decoded || !decoded.id) {
      return res.status(401).json({ error: 'Invalid token payload' });
    }

    // Verify user still exists in Supabase
    const { data: { user }, error } = await supabase.auth.admin.getUserById(decoded.id);
    
    if (error || !user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Create new JWT token with extended expiry
    const newToken = jwt.sign(
      { 
        id: user.id, 
        email: user.email 
      }, 
      JWT_SECRET, 
      { expiresIn: '7d' }
    );

    res.json({ token: newToken });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout endpoint (client-side token removal)
router.post('/logout', (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

export { router, verifyToken };
