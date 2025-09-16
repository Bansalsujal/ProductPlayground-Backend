// Environment Configuration Example
// Copy this file to config.js and update with your actual values

export const config = {
  // API Configuration
  API_PORT: 3001,
  NODE_ENV: 'development',

  // Supabase Configuration
  SUPABASE_URL: 'your_supabase_url_here',
  SUPABASE_SERVICE_ROLE_KEY: 'your_supabase_service_role_key_here',

  // Google Gemini API
  GEMINI_API_KEY: 'your_gemini_api_key_here',
  GEMINI_MODEL: 'gemini-2.0-flash',
  GEMINI_EVAL_MODEL: 'gemini-2.0-flash',

  // CORS Configuration
  ALLOWED_ORIGINS: 'http://localhost:5000,http://localhost:3000'
};

