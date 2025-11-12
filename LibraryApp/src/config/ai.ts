// AI Configuration for Book Title Extraction
//
// Choose your AI provider:
//
// OPTION 1: OpenAI (recommended for reliability)
// 1. Get an OpenAI API key from https://platform.openai.com/api-keys
// 2. Set OPENAI_API_KEY below
//
// OPTION 2: Google Gemini
// 1. Get a Gemini API key from https://makersuite.google.com/app/apikey
// 2. Make sure your API key has access to Gemini models
// 3. Set GEMINI_API_KEY below
//
// The app will try Gemini first, then fall back to OpenAI, then basic text processing

export const AI_CONFIG = {
  // Primary: Gemini AI (currently having issues)
  GEMINI_API_KEY: 'AIzaSyChLLHZIavtONHKrjvqWXAniHunhN-1ZXE',

  // Fallback: OpenAI (if you have an OpenAI API key)
  OPENAI_API_KEY: 'your-openai-api-key-here', // Replace with OpenAI key if available
};