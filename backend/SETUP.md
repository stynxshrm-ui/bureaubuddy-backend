# BureauBuddy Backend Setup

This backend replaces the need for users to provide their own API keys. The extension now calls your backend, which handles model selection, rate limiting, and API key security.

## Quick Start

### 1. Get API Keys

**Option A: Gemini Flash (Recommended for Free Tier)**
- Go to https://ai.google.dev
- Create a new project or use existing one
- Generate API key from "Get API Key" → "Create API key in new project"
- Copy the key

**Option B: Anthropic (For Premium)**
- Go to https://console.anthropic.com
- Create API key
- Copy the key

### 2. Deploy to Vercel

#### Install Vercel CLI
```bash
npm install -g vercel
```

#### Deploy
```bash
cd backend
vercel
```

Follow the prompts:
- Link to your Vercel account
- Select default settings
- Will create `.vercel` config

#### Set Environment Variables
```bash
vercel env add BB_MODEL          # Enter: gemini (or anthropic)
vercel env add GOOGLE_API_KEY    # Paste your Gemini key (if using gemini)
vercel env add ANTHROPIC_API_KEY # Paste your Anthropic key (if using anthropic)
```

Redeploy after adding env vars:
```bash
vercel
```

### 3. Update Extension

In [background.js](../src/background.js), line 5, update the backend URL:

```javascript
const BACKEND_API_URL = "https://your-vercel-app.vercel.app/api/analyze";
```

Replace `your-vercel-app` with your actual Vercel domain (shown in console after deployment).

## Architecture

```
Extension (content-generic.js) 
  ↓ sends text
Background Service Worker (background.js)
  ↓ calls
Backend (api/analyze.js)
  ├─ Rate limit check (5/month free tier)
  ├─ Route to analyzer (Gemini or Anthropic)
  ├─ Call model API
  └─ Return analysis + usage stats
```

### Model Selection

Set `BB_MODEL` environment variable:
- `gemini` (default) - Uses Google Gemini Flash (free tier available)
- `anthropic` - Uses Anthropic Claude (requires paid account)

No code changes needed—switch between models via environment variable.

## Rate Limiting

Free tier: **5 analyses per month per device**

- Device identified by UUID stored in `chrome.storage.local`
- Rate limit tracked server-side
- After limit exceeded, users see upgrade link

## Usage Tracking

Responses include usage stats:
```json
{
  "ok": true,
  "data": { /* analysis */ },
  "usage": {
    "used": 2,
    "limit": 5,
    "resetDate": "2026-06-13T15:32:00Z"
  }
}
```

## Local Development

### Start local backend
```bash
cd backend
npm install
NODE_ENV=development BB_MODEL=gemini GOOGLE_API_KEY=your_key node api/analyze.js
```

Then test:
```bash
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Your document text here",
    "deviceId": "test-device-123",
    "sourceLanguage": "Swedish",
    "targetLanguage": "English"
  }'
```

### Update extension for local testing
In `src/background.js`:
```javascript
const BACKEND_API_URL = "http://localhost:3000/api/analyze";
```

## Error Handling

The backend returns proper error responses:

**Rate limit exceeded:**
```json
{
  "error": "RATE_LIMIT_EXCEEDED",
  "message": "You've used 5/5 free analyses this month",
  "resetDate": "2026-06-13T15:32:00Z",
  "upgrade": "https://bureaubuddy.se/upgrade"
}
```

**API key misconfigured:**
```json
{
  "error": "Gemini API key not configured"
}
```

## Migration from User API Keys

The extension stores no API keys. Previous settings can be ignored:
- `apiKey` in `chrome.storage.sync` is no longer used
- Users can delete the key if they had saved one

## Monitoring

Vercel provides:
- Real-time logs: `vercel logs <project-name>`
- Usage analytics in Vercel dashboard
- Error tracking and alerts

For production, consider adding:
- Database for persistent rate limiting (Redis/MongoDB)
- Error tracking (Sentry)
- Analytics (Posthog, Mixpanel)

## Troubleshooting

**"Backend API key not configured"**
- Check environment variables in Vercel dashboard
- Run `vercel env list` to verify
- Ensure you redeployed after setting env vars

**CORS errors in extension**
- Verify backend URL in `background.js`
- Check backend allows all origins (currently set to `*`)

**Rate limiting not working**
- In-memory storage resets on Vercel redeploy
- For production, implement Redis-backed rate limiting

**Model not responding**
- Check API key has quota remaining
- Verify correct model name in config
- Check Vercel logs: `vercel logs`
