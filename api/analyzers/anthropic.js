const { SYSTEM_PROMPT, buildUserPrompt } = require('./prompts.js');

async function analyzeWithAnthropic(text, apiKey, sourceLanguage = 'Swedish', targetLanguage = 'English') {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildUserPrompt(text, sourceLanguage, targetLanguage) }],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    if (response.status === 401) throw new Error('INVALID_API_KEY');
    if (response.status === 429) throw new Error('RATE_LIMIT');
    throw new Error(err.error?.message || `Anthropic API error ${response.status}`);
  }

  const data = await response.json();
  const content = data.content?.[0]?.text || '';

  try {
    return JSON.parse(content);
  } catch {
    throw new Error('Failed to parse model response');
  }
}

module.exports = { analyzeWithAnthropic };
