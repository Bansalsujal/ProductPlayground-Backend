import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { RUBRICS, EVALUATION_PROMPT_TEMPLATE, INTERVIEWER_PROMPT } from '../config/prompts.js';
import { verifyToken } from './auth.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const router = express.Router();

// Initialize Google Generative AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const EVAL_MODEL = process.env.GEMINI_EVAL_MODEL || 'gemini-2.0-flash';

// AI Evaluation endpoint - secure, server-side only
router.post('/evaluate', verifyToken, async (req, res) => {
  try {
    const { conversation, questionType, sessionDuration } = req.body;

    if (!conversation || !questionType) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const rubric = RUBRICS[questionType] || RUBRICS.design;
    
    console.log('Selected rubric for question type', questionType, ':', rubric);
    const evaluationPrompt = EVALUATION_PROMPT_TEMPLATE(rubric);

    console.log('AI Evaluation request:', {
      userId: req.user.id,
      questionType,
      conversationLength: conversation.length,
      sessionDuration
    });

    // Log conversation details for debugging
    console.log('Full conversation being sent to AI:');
    conversation.forEach((msg, index) => {
      console.log(`Message ${index + 1} (${msg.role}): ${msg.message.substring(0, 100)}...`);
    });

    // Log evaluation prompt length and first 200 chars
    console.log('Evaluation prompt length:', evaluationPrompt.length);
    console.log('Evaluation prompt start:', evaluationPrompt.substring(0, 200));

    // Call Gemini API directly for evaluation
    const model = genAI.getGenerativeModel({ model: EVAL_MODEL });
    const fullPrompt = `${evaluationPrompt}

CONVERSATION TRANSCRIPT:
${conversation.map(msg => `${msg.role}: ${msg.message}`).join('\n')}

Please respond with ONLY a valid JSON object in this exact format: {"composite_score": 7.2, "dimension_scores": {...}, "what_worked_well": "...", "areas_to_improve": "..."}. Do not include any other text or formatting.`;

    console.log('Full prompt being sent to AI (length):', fullPrompt.length);
    
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: fullPrompt }]}]
    });
    
    const responseText = await result.response.text();
    
    // Parse JSON response
    let response;
    try {
      response = JSON.parse(responseText.trim());
    } catch (e) {
      // Extract JSON from text using regex
      const jsonMatch = responseText.match(/\{[^]*\}/);
      if (jsonMatch) {
        response = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Failed to parse evaluation response as JSON');
      }
    }

    console.log('AI evaluation completed:', {
      compositeScore: response.composite_score,
      dimensionCount: Object.keys(response.dimension_scores).length
    });

    res.json(response);
  } catch (error) {
    console.error('AI evaluation error:', error);
    res.status(500).json({ error: 'Failed to evaluate interview' });
  }
});

// AI Chat endpoint for interview interaction
router.post('/chat', verifyToken, async (req, res) => {
  try {
    const { message, conversation, questionContext } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const fullPrompt = `${INTERVIEWER_PROMPT}

Question: ${questionContext?.question || 'No question provided'}
Type: ${questionContext?.type || 'general'}

Previous conversation:
${conversation?.map(msg => `${msg.role}: ${msg.content}`).join('\n') || 'No previous conversation'}

Candidate's latest message: ${message}

Respond as the interviewer:`;

    // Call Gemini API directly for chat
    const model = genAI.getGenerativeModel({ model: MODEL });
    
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: fullPrompt }]}]
    });
    
    const responseText = await result.response.text();

    res.json({ response: responseText.trim() });
  } catch (error) {
    console.error('AI chat error:', error);
    res.status(500).json({ error: 'Failed to generate response' });
  }
});

export default router;
