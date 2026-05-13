// Fallback for local dev — dotenv never overwrites vars already set by vercel dev
try { require('dotenv').config({ path: '.env.local' }); } catch {}

const CONFIG = {
  MODEL: process.env.BB_MODEL || 'gemini',

  GEMINI_API_KEY:    process.env.GOOGLE_API_KEY,
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  GROQ_API_KEY:      process.env.GROQ_API_KEY,
  MISTRAL_API_KEY: process.env.MISTRAL_API_KEY,

  FREE_TIER_LIMIT: 5,
  RATE_LIMIT_WINDOW_MS: 30 * 24 * 60 * 60 * 1000,

  ALLOWED_ORIGINS: [
    'chrome-extension://*',
    process.env.CORS_ORIGIN || 'http://localhost:3000'
  ],

  MODELS: {
    gemini: {
      name: 'gemini-1.5-flash',
      maxTokens: 1500,
      apiUrl: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent'
    },
    anthropic: {
      name: 'claude-sonnet-4-20250514',
      maxTokens: 1500,
      apiUrl: 'https://api.anthropic.com/v1/messages'
    },
    groq: {
      name: 'llama-3.3-70b-versatile',
      maxTokens: 1500,
      apiUrl: 'https://api.groq.com/openai/v1/chat/completions'
    },
    mistral: {
      name: 'mistral-small-latest',
      maxTokens: 1500,
      apiUrl: 'https://api.mistral.ai/v1/chat/completions'
    }
  }
};

module.exports = CONFIG;
