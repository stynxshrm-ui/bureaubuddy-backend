const { SYSTEM_PROMPT, buildUserPrompt } = require('./prompts.js');

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';
const MAX_RETRIES = 2;

async function analyzeWithGroq(text, apiKey, sourceLanguage = 'Swedish', targetLanguage = 'English') {
  const cleanKey = apiKey.trim();
  let lastError;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      await new Promise(r => setTimeout(r, attempt * 1500));
    }

    const response = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cleanKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user',   content: buildUserPrompt(text, sourceLanguage, targetLanguage) },
        ],
        max_tokens: 1500,
        temperature: 0.3,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
      try {
        const cleaned = content.replace(/```json|```/g, '').trim();
        return JSON.parse(cleaned);
      } catch {
        throw new Error('Failed to parse model response');
      }
    }

    const err = await response.json().catch(() => ({}));

    if (response.status === 401 || response.status === 403) throw new Error('INVALID_API_KEY');
    if (response.status === 429) { lastError = new Error('RATE_LIMIT'); continue; }

    throw new Error(err.error?.message || `Groq API error ${response.status}`);
  }

  throw lastError;
}

module.exports = { analyzeWithGroq };
