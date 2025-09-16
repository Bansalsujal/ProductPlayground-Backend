import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { verifyToken } from './auth.js';
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

// Get user sessions
router.get('/', verifyToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('interview_sessions')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_date', { ascending: false });

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

// Create new session
router.post('/', verifyToken, async (req, res) => {
  try {
    console.log('Creating new session for user:', req.user.id);
    console.log('Session data received:', req.body);
    
    const sessionData = {
      ...req.body,
      user_id: req.user.id,
      created_date: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('interview_sessions')
      .insert([sessionData])
      .select()
      .single();

    if (error) {
      console.error('Database error creating session:', error);
      throw error;
    }

    console.log('Session created successfully:', data.id);
    res.json(data);
  } catch (error) {
    console.error('Error creating session:', error);
    console.error('Error details:', error.message);
    res.status(500).json({ error: 'Failed to create session', details: error.message });
  }
});

// Update session
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Updating session:', id, 'for user:', req.user.id);
    console.log('Update data received:', req.body);
    
    const updateData = {
      ...req.body,
      user_id: req.user.id // Ensure user_id for RLS
    };

    const { data, error } = await supabase
      .from('interview_sessions')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) {
      console.error('Database error updating session:', error);
      throw error;
    }

    console.log('Session updated successfully:', data.id);
    res.json(data);
  } catch (error) {
    console.error('Error updating session:', error);
    console.error('Error details:', error.message);
    console.error('Update data:', updateData);
    res.status(500).json({ error: 'Failed to update session', details: error.message });
  }
});

// Get session by ID
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('interview_sessions')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error('Error fetching session:', error);
    res.status(500).json({ error: 'Failed to fetch session' });
  }
});

export default router;
