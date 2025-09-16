import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Loading environment variables...');
dotenv.config({ path: path.join(__dirname, '.env') });

console.log('Environment check:');
console.log('- SUPABASE_URL:', process.env.SUPABASE_URL ? 'Set' : 'Missing');
console.log('- SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Missing');
console.log('- GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? 'Set' : 'Missing');

try {
  console.log('Testing Supabase import...');
  const { createClient } = await import('@supabase/supabase-js');
  
  console.log('Creating Supabase client...');
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  console.log('✅ Supabase client created successfully');
  
  console.log('Testing Express import...');
  const express = await import('express');
  console.log('✅ Express imported successfully');
  
  console.log('All imports successful!');
  process.exit(0);
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
}
