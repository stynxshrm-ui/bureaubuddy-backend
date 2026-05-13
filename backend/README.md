# BureauBuddy Backend

Serverless Node.js backend for document analysis API. Handles rate limiting, API key management, and model routing.

## Quick Start

1. **Get an API key**
   - Gemini: https://ai.google.dev (free)
   - Anthropic: https://console.anthropic.com (paid)

2. **Deploy to Vercel**
   ```bash
   vercel
   ```

3. **Set environment variables**
   ```bash
   vercel env add BB_MODEL gemini
   vercel env add GOOGLE_API_KEY your_key_here
   vercel
   ```

4. **Update extension URL** in `src/background.js`

See [SETUP.md](./SETUP.md) for detailed instructions.

## Files

- `api/analyze.js` - Main Vercel endpoint
- `api/config.js` - Configuration for model selection
- `api/storage.js` - Rate limiting logic
- `api/analyzers/gemini.js` - Google Gemini integration
- `api/analyzers/anthropic.js` - Anthropic Claude integration
- `vercel.json` - Vercel deployment config
- `package.json` - Dependencies

## Architecture

```
POST /api/analyze
├─ Validate request (text, deviceId)
├─ Check rate limit (5/month per device)
├─ Route to model (Gemini or Anthropic based on BB_MODEL env var)
├─ Call API
└─ Return analysis + usage stats
```

## Request

```json
POST /api/analyze
{
  "text": "Document text to analyze",
  "deviceId": "uuid-of-device",
  "sourceLanguage": "Swedish",
  "targetLanguage": "English"
}
```

## Response (Success)

```json
{
  "ok": true,
  "data": {
    "sender": "Skatteverket",
    "documentType": "Notice",
    "summary": "...",
    "actionRequired": true,
    "actions": [...],
    ...
  },
  "usage": {
    "used": 2,
    "limit": 5,
    "resetDate": "2026-06-13T..."
  }
}
```

## Response (Rate Limited)

```json
{
  "error": "RATE_LIMIT_EXCEEDED",
  "message": "You've used 5/5 free analyses this month",
  "resetDate": "2026-06-13T...",
  "upgrade": "https://bureaubuddy.se/upgrade"
}
```

## Configuration

### Environment Variables

| Variable | Options | Default |
|----------|---------|---------|
| `BB_MODEL` | `gemini`, `anthropic` | `gemini` |
| `GOOGLE_API_KEY` | Your Gemini key | - |
| `ANTHROPIC_API_KEY` | Your Anthropic key | - |
| `CORS_ORIGIN` | URL pattern | `http://localhost:3000` |

### Model Switching

Change model without touching code:
```bash
vercel env add BB_MODEL anthropic
vercel
```

Both models use same API interface.

## Local Development

```bash
npm install
BB_MODEL=gemini GOOGLE_API_KEY=your_key node api/analyze.js
```

Test:
```bash
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Kära medborgare, ...",
    "deviceId": "test-123"
  }'
```

## Deployment

### To Vercel
```bash
vercel login
vercel
vercel env add BB_MODEL gemini
vercel env add GOOGLE_API_KEY your_key
vercel
```

### Custom Domain
```bash
vercel env add CORS_ORIGIN your-domain.com
vercel
```

## Rate Limiting

- **Free tier**: 5 analyses per calendar month
- **Per device**: Identified by UUID in extension
- **Tracking**: 30-day rolling window
- **Server-side**: Enforced on backend

### Future Enhancements

- Redis for persistent rate limiting across deployments
- Database for usage analytics
- IP-based fallback rate limiting (prevent abuse)
- Regional rate limit variations
- Per-user limits when authentication is added

## Production Considerations

- In-memory rate limiting resets on Vercel redeploy
- For persistent rate limiting, add Redis:
  ```javascript
  import redis from '@vercel/kv';
  // Track usage in Redis instead of memory
  ```

- Add error tracking:
  ```javascript
  import * as Sentry from "@sentry/node";
  ```

- Monitor with Vercel Analytics

## Model Details

### Gemini Flash
- **Cost**: Free tier available (generous limits)
- **Speed**: Very fast
- **Quality**: Good for summarization
- **Recommended**: For free tier users

### Anthropic Claude
- **Cost**: Requires paid account ($5-50/month typical usage)
- **Speed**: Moderate
- **Quality**: Excellent for nuanced analysis
- **Recommended**: For premium tier

Both models process Swedish documents excellently.

## Troubleshooting

**400 Bad Request**
- Missing `text` or `deviceId` in request body

**401 Unauthorized**
- API key not set or invalid

**429 Too Many Requests**
- Rate limit hit (5/month per device)
- Model API rate limit (rare)

**500 Internal Error**
- Check Vercel logs: `vercel logs`
- Verify environment variables: `vercel env list`

## Support

See `SETUP.md` for deployment details.
See `ARCHITECTURE.md` for design overview.
