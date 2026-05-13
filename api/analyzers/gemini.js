const { SYSTEM_PROMPT, buildUserPrompt } = require('./prompts.js');

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
const MAX_RETRIES = 2;

async function analyzeWithGemini(text, apiKey, sourceLanguage = 'Swedish', targetLanguage = 'English') {
  let lastError;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      await new Promise(r => setTimeout(r, attempt * 1500));
    }

    const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: { text: SYSTEM_PROMPT } },
        contents: { parts: [{ text: buildUserPrompt(text, sourceLanguage, targetLanguage) }] },
        generationConfig: { maxOutputTokens: 1500, temperature: 0.3 },
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      try {
        return JSON.parse(content);
      } catch {
        throw new Error('Failed to parse model response');
      }
    }

    const err = await response.json().catch(() => ({}));

    if (response.status === 401 || response.status === 403) {
      throw new Error('INVALID_API_KEY');
    }

    if (response.status === 429) {
      lastError = new Error('RATE_LIMIT');
      continue; // retry
    }

    throw new Error(err.error?.message || `Gemini API error ${response.status}`);
  }

  throw lastError;
}

module.exports = { analyzeWithGemini };
