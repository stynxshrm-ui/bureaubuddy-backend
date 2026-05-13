const CONFIG = require('./config.js');
const { checkRateLimit } = require('./storage.js');
const { analyzeWithGemini } = require('./analyzers/gemini.js');
const { analyzeWithAnthropic } = require('./analyzers/anthropic.js');
const { analyzeWithGroq } = require('./analyzers/groq.js');
const { analyzeWithMistral } = require('./analyzers/mistral.js');

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Device-ID'
};

function setCorsHeaders(res) {
  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));
}

module.exports = async function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { text, deviceId, sourceLanguage = 'Swedish', targetLanguage = 'English' } = req.body;

    if (!text || !deviceId) {
      return res.status(400).json({ error: 'Missing required fields: text, deviceId' });
    }

    const rateLimit = checkRateLimit(deviceId, CONFIG.FREE_TIER_LIMIT);

    if (!rateLimit.allowed) {
      return res.status(429).json({
        error: 'RATE_LIMIT_EXCEEDED',
        message: `You've used ${rateLimit.used}/${rateLimit.limit} free analyses this month`,
        resetDate: rateLimit.resetDate,
        upgrade: 'https://bureaubuddy.se/upgrade'
      });
    }

    let analysis;
    const model = CONFIG.MODEL.toLowerCase();

    if (model === 'gemini') {
      if (!CONFIG.GEMINI_API_KEY) {
        return res.status(500).json({ error: 'Gemini API key not configured' });
      }
      analysis = await analyzeWithGemini(text, CONFIG.GEMINI_API_KEY, sourceLanguage, targetLanguage);
    } else if (model === 'anthropic') {
      if (!CONFIG.ANTHROPIC_API_KEY) {
        return res.status(500).json({ error: 'Anthropic API key not configured' });
      }
      analysis = await analyzeWithAnthropic(text, CONFIG.ANTHROPIC_API_KEY, sourceLanguage, targetLanguage);
    } else if (model === 'groq') {
      if (!CONFIG.GROQ_API_KEY) {
        return res.status(500).json({ error: 'Groq API key not configured' });
      }
      console.log('Passing key to Groq:', CONFIG.GROQ_API_KEY ? CONFIG.GROQ_API_KEY.slice(0,8) + '...' : 'UNDEFINED');
      analysis = await analyzeWithGroq(text, CONFIG.GROQ_API_KEY, sourceLanguage, targetLanguage);
    } else if (model === 'mistral') {
      if (!CONFIG.MISTRAL_API_KEY) {
        return res.status(500).json({ error: 'Mistral API key not configured' });
      }
      analysis = await analyzeWithMistral(text, CONFIG.MISTRAL_API_KEY, sourceLanguage, targetLanguage);
    } else {
      return res.status(500).json({ error: `Unknown model: ${model}` });
    }

    return res.status(200).json({
      ok: true,
      data: analysis,
      usage: {
        used: rateLimit.used,
        limit: rateLimit.limit,
        resetDate: rateLimit.resetDate
      }
    });

  } catch (error) {
    console.error('API Error:', error);

    if (error.message === 'INVALID_API_KEY') {
      return res.status(500).json({ error: 'Backend API key misconfigured' });
    }
    if (error.message === 'RATE_LIMIT') {
      return res.status(429).json({ error: 'Model API rate limited' });
    }

    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};
