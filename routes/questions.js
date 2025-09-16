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

// Fallback sample questions if database is empty
const SAMPLE_QUESTIONS = [
  {
    id: '1',
    title: 'Design a mobile app for ordering food delivery',
    type: 'design',
    type_label: 'design',
    difficulty: 'medium'
  },
  {
    id: '2', 
    title: 'How would you improve user engagement on Instagram?',
    type: 'improvement',
    type_label: 'improvement',
    difficulty: 'medium'
  },
  {
    id: '3',
    title: 'Daily active users for a social media app dropped 20% last month. What happened?',
    type: 'rca',
    type_label: 'rca', 
    difficulty: 'medium'
  },
  {
    id: '4',
    title: 'How many pizza slices are consumed in New York City per day?',
    type: 'guesstimate',
    type_label: 'guesstimate',
    difficulty: 'medium'
  },
  {
    id: '5',
    title: 'Create a social media platform for book lovers',
    type: 'design',
    type_label: 'design',
    difficulty: 'medium'
  }
];

// Get questions with optional filters
router.get('/', verifyToken, async (req, res) => {
  try {
    let query = supabase.from('questions').select('*');

    // Apply filters if provided
    if (req.query.type_label) {
      query = query.eq('type_label', req.query.type_label);
    }
    if (req.query.type) {
      query = query.eq('type', req.query.type);
    }
    if (req.query.difficulty) {
      query = query.eq('difficulty', req.query.difficulty);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    // If no data from database or error, use sample questions
    if (error || !data || data.length === 0) {
      console.log('Using sample questions as fallback');
      let filteredQuestions = SAMPLE_QUESTIONS;
      
      if (req.query.type_label) {
        filteredQuestions = filteredQuestions.filter(q => q.type_label === req.query.type_label);
      }
      if (req.query.type) {
        filteredQuestions = filteredQuestions.filter(q => q.type === req.query.type);
      }
      
      return res.json(filteredQuestions);
    }

    res.json(data);
  } catch (error) {
    console.error('Error fetching questions:', error);
    // Return sample questions as fallback
    res.json(SAMPLE_QUESTIONS);
  }
});

// Get random question by type
router.get('/random/:type', verifyToken, async (req, res) => {
  try {
    const { type } = req.params;

    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .eq('type', type);

    if (error) throw error;

    if (data.length === 0) {
      return res.status(404).json({ error: 'No questions found for this type' });
    }

    // Return a random question
    const randomQuestion = data[Math.floor(Math.random() * data.length)];
    res.json(randomQuestion);
  } catch (error) {
    console.error('Error fetching random question:', error);
    res.status(500).json({ error: 'Failed to fetch random question' });
  }
});

// Get question by ID
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error('Error fetching question:', error);
    res.status(500).json({ error: 'Failed to fetch question' });
  }
});

export default router;
