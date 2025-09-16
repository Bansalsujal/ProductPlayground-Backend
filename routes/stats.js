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

// Get user stats
router.get('/', verifyToken, async (req, res) => {
  try {
    console.log('Fetching stats for user:', req.user.id);
    
    const { data, error } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', req.user.id);

    if (error) {
      console.error('Database error fetching stats:', error);
      throw error;
    }

    console.log('Stats query result:', data);

    // If no stats found, return empty array for filter compatibility
    if (!data || data.length === 0) {
      console.log('No stats found, returning empty array');
      return res.json([]);
    }

    console.log('Returning stats:', data);
    res.json(data);
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({ error: 'Failed to fetch user stats' });
  }
});

// Update user stats
router.put('/', verifyToken, async (req, res) => {
  try {
    console.log('Stats update request for user:', req.user.id);
    console.log('Stats data received:', req.body);
    
    const statsData = {
      ...req.body,
      user_id: req.user.id
    };

    console.log('Final stats data to upsert:', statsData);

    // Try to update first
    const { data: updateData, error: updateError } = await supabase
      .from('user_stats')
      .update(statsData)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (updateError && updateError.code === 'PGRST116') {
      // No existing record, create new one
      console.log('No existing stats found, creating new record...');
      const { data: insertData, error: insertError } = await supabase
        .from('user_stats')
        .insert([statsData])
        .select()
        .single();

      if (insertError) {
        console.error('Insert error:', insertError);
        throw insertError;
      }
      
      console.log('New stats record created:', insertData);
      return res.json(insertData);
    }

    if (updateError) {
      console.error('Update error:', updateError);
      throw updateError;
    }
    
    console.log('Stats record updated:', updateData);
    res.json(updateData);
  } catch (error) {
    console.error('Error updating user stats:', error);
    console.error('Error details:', error.message);
    console.error('Error code:', error.code);
    res.status(500).json({ error: 'Failed to update user stats', details: error.message });
  }
});

export default router;
