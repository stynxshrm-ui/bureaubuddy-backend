# Troubleshooting Guide

## Common Issues & Solutions

### Extension Issues

#### "Ready to analyze – no setup needed" but nothing happens when I click
**Problem**: Backend URL is wrong or backend is down

**Solutions**:
1. Check backend URL in `src/background.js` line 5
   ```javascript
   const BACKEND_API_URL = "https://your-domain.vercel.app/api/analyze";
   ```
2. Test backend directly:
   ```bash
   curl -X POST https://your-domain.vercel.app/api/analyze \
     -H "Content-Type: application/json" \
     -d '{"text":"test","deviceId":"test-123"}'
   ```
3. Check Vercel logs:
   ```bash
   vercel logs your-project-name
   ```

---

#### Device ID shows "Loading…"
**Problem**: Background service worker not responding

**Solutions**:
1. Reload extension: `chrome://extensions/` → Find extension → Reload
2. Check DevTools console for errors:
   - Right-click popup → Inspect
   - Check Console tab
3. Verify `chrome.storage.local` permissions in manifest.json

---

#### "API error" or "Unknown error"
**Problem**: Backend returned an error

**Solutions**:
1. Open DevTools → Network tab
2. Analyze text again
3. Look for `/api/analyze` request
4. Click → Response tab → Check error message
5. See "Backend Issues" section below for specific errors

---

#### Usage counter stuck at "0 / 5"
**Problem**: Usage not updating from backend

**Solutions**:
1. Clear browser storage:
   - `chrome://extensions/` → BureauBuddy → Clear browsing data
   - Reload extension
2. Check backend response includes `usage` field:
   ```bash
   curl -X POST <backend-url>/api/analyze \
     -H "Content-Type: application/json" \
     -d '{"text":"test","deviceId":"test-123"}' | jq .usage
   ```

---

### Backend Issues

#### "Backend API key not configured"
**Problem**: API key not set in environment variables

**Solutions**:
1. Check Vercel env vars:
   ```bash
   vercel env list
   ```
2. Should show `BB_MODEL`, `GOOGLE_API_KEY` (or `ANTHROPIC_API_KEY`)
3. If missing:
   ```bash
   vercel env add GOOGLE_API_KEY your_key_here
   vercel
   ```
4. Redeploy and try again

---

#### "Gemini API key not configured" (but I added it!)
**Problem**: Environment variables not picked up

**Solutions**:
1. Redeploy backend:
   ```bash
   vercel
   ```
   (This applies env var changes)
2. Wait 30 seconds for redeployment
3. Try again

---

#### 401 Unauthorized from Gemini/Anthropic
**Problem**: API key is invalid or expired

**Solutions**:
1. Verify key in Vercel dashboard
2. Try key locally:
   ```bash
   BB_MODEL=gemini GOOGLE_API_KEY=your_key node api/analyze.js
   curl -X POST http://localhost:3000/api/analyze ...
   ```
3. If it fails locally, key is invalid
4. Generate new key:
   - Gemini: https://ai.google.dev
   - Anthropic: https://console.anthropic.com
5. Update in Vercel and redeploy

---

#### "You've used 5/5 analyses" after only 2 uses
**Problem**: Rate limiting is overly aggressive

**Solutions**:
1. This is in-memory storage—resets when Vercel redeploys
2. For persistent rate limiting:
   - Add Redis to `api/storage.js`
   - For now, restart is acceptable for MVP
3. To clear and test:
   ```bash
   vercel redeploy
   ```

---

#### CORS errors in browser console
**Problem**: Backend not allowing requests from extension

**Solutions**:
1. Check `Access-Control-Allow-Origin` in backend response
2. Currently allows `*` (all origins)
3. If still failing:
   - Check browser DevTools Network tab
   - Look for OPTIONS preflight request
   - Verify it returns 200 OK
4. Backend config:
   ```javascript
   // api/analyze.js
   'Access-Control-Allow-Origin': '*'
   ```

---

### Deployment Issues

#### `vercel` command not found
**Problem**: Vercel CLI not installed

**Solutions**:
```bash
npm install -g vercel
vercel --version
```

---

#### "Permission denied" during deployment
**Problem**: Not logged into Vercel

**Solutions**:
```bash
vercel logout
vercel login
# Follow prompts
vercel
```

---

#### Deployment succeeds but site returns 404
**Problem**: Vercel rewrites not configured

**Solutions**:
1. Check `backend/vercel.json` exists
2. Verify it has:
   ```json
   {
     "rewrites": [{
       "source": "/api/analyze",
       "destination": "/api/analyze.js"
     }]
   }
   ```
3. Redeploy:
   ```bash
   vercel
   ```

---

### Testing Issues

#### "Cannot find module" when testing locally
**Problem**: Dependencies not installed

**Solutions**:
```bash
cd backend
npm install
node api/analyze.js
```

---

#### Local backend won't start
**Problem**: Port in use or environment variables missing

**Solutions**:
1. Check env vars:
   ```bash
   echo $BB_MODEL
   echo $GOOGLE_API_KEY
   ```
2. Set them:
   ```bash
   export BB_MODEL=gemini
   export GOOGLE_API_KEY=your_key
   node api/analyze.js
   ```
3. If port conflict:
   ```bash
   lsof -i :3000
   # Kill the process or use different port
   ```

---

#### Model returns blank or invalid JSON
**Problem**: Model API returned unexpected format

**Solutions**:
1. Check Vercel logs:
   ```bash
   vercel logs your-project-name
   ```
2. Look for:
   - `Failed to parse model response`
   - API key being rejected
   - Rate limit from model provider
3. Test model directly:
   ```bash
   # For Gemini
   curl -X POST "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=YOUR_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "contents": {"parts": [{"text": "Hello"}]}
     }' | jq
   ```

---

## Debugging Tools

### Chrome DevTools
```javascript
// In popup console
chrome.storage.local.get(null, (data) => console.log(data));
// Shows: { deviceId: "...", usageCount: ... }

// Check background worker
// Right-click extension → Service Worker
// Or: chrome://extensions/ → Details → Service Worker
```

### Vercel CLI
```bash
# View logs
vercel logs your-project-name

# Check environment variables
vercel env list

# Redeploy
vercel

# View deployment history
vercel ls

# Remove a deployment
vercel remove your-project-name
```

### cURL Testing
```bash
# Test backend
curl -v -X POST https://your-domain.vercel.app/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Test document",
    "deviceId": "device-123",
    "sourceLanguage": "Swedish",
    "targetLanguage": "English"
  }'

# Expected response:
# {"ok":true,"data":{...},"usage":{...}}

# If 429 (rate limited):
# {"error":"RATE_LIMIT_EXCEEDED",...}
```

### Network Analysis
1. Open DevTools → Network tab
2. Analyze text in extension
3. Look for `/api/analyze` request
4. Check:
   - Status code (should be 200)
   - Request body (has `text`, `deviceId`)
   - Response body (has `data`, `usage`)
   - Headers (Content-Type: application/json)

---

## Performance Issues

#### Analysis is very slow
**Problem**: Model is slow or network latency

**Solutions**:
1. Check which model:
   ```bash
   vercel env list | grep BB_MODEL
   ```
2. Gemini Flash is faster than Claude
3. Check Vercel region is close to you:
   - Vercel auto-selects (usually optimal)
4. Profile in DevTools → Network tab → note request duration

#### Backend returns "timeout"
**Problem**: Model took too long

**Solutions**:
1. Gemini Flash should respond in <5 seconds
2. If consistently slow:
   - Try different model
   - Check API key quota isn't exhausted
   - Check document is actually <10KB
3. Check logs:
   ```bash
   vercel logs --tail
   ```

---

## Data Issues

#### Same document returns different results
**Problem**: This is expected (model is non-deterministic)

**Solutions**:
- Models are probabilistic
- Set `temperature: 0.3` in Gemini or `temperature: 0.1` in Claude for consistency
- See `api/analyzers/gemini.js` line where `generationConfig` is set

---

## Help & Escalation

### Still stuck?
1. Check the docs:
   - `backend/SETUP.md` — Deployment walkthrough
   - `backend/ARCHITECTURE.md` — Design overview
   - `DEPLOYMENT_CHECKLIST.md` — Quick reference

2. Check logs:
   - Browser: DevTools Console
   - Backend: `vercel logs your-project-name`
   - Check error messages carefully

3. Verify prerequisites:
   - API key is valid and not expired
   - Vercel deployment succeeded
   - Extension URL is correct
   - Device ID exists (check storage)

### Still need help?
- Review error messages in console
- Check Vercel dashboard for deployment status
- Try the test request in cURL first
- Ensure you followed DEPLOYMENT_CHECKLIST.md exactly
