# BureauBuddy – Refactored Architecture

## What Changed

**Before:**
- Users had to provide their own Anthropic API key
- Extension called Anthropic directly with user's key
- No rate limiting (except Anthropic's own limits)
- Poor UX for non-technical users

**After:**
- Zero setup required for users
- Backend securely handles API calls
- Free tier: 5 analyses per month per device
- Easy model switching (Gemini ↔ Anthropic)
- Device fingerprinting for anonymous user tracking

## How It Works

### User Flow
1. User installs extension → **done**, no setup needed
2. User highlights text on supported site
3. Extension generates or retrieves device UUID
4. Extension calls your backend API
5. Backend:
   - Checks if device used their 5 free analyses
   - Calls Gemini Flash (or Anthropic)
   - Returns analysis + usage stats
6. Extension displays result to user

### Device Identification
- UUID stored in `chrome.storage.local` (browser storage)
- Not sent to analytics, just used for rate limiting
- No login required
- Can be reset by clearing extension storage

### Rate Limiting
- **Free tier**: 5 analyses per calendar month
- Tracked server-side by device ID
- 30-day rolling window (resets monthly)
- Upgrade path when limit exceeded

## Project Structure

```
/
├── backend/
│   ├── api/
│   │   ├── analyze.js              # Main Vercel endpoint
│   │   ├── config.js               # Model selection & config
│   │   ├── storage.js              # Rate limiting logic
│   │   └── analyzers/
│   │       ├── gemini.js           # Gemini Flash integration
│   │       └── anthropic.js        # Anthropic Claude integration
│   ├── package.json
│   ├── vercel.json                 # Vercel config
│   ├── .env.example
│   └── SETUP.md                    # Deployment guide
│
├── src/
│   ├── background.js               # Updated: calls backend
│   ├── popup.js                    # Updated: shows device ID
│   ├── content-generic.js
│   ├── content-gmail.js
│   ├── content.css
│   └── utils.js                    # Device ID utilities
│
├── popup.html                      # Updated: removed API key input
├── manifest.json                   # Updated: added backend permission
└── README.md
```

## Configuration

### Environment Variables

**Backend (.env or Vercel console)**
```
BB_MODEL=gemini              # or 'anthropic'
GOOGLE_API_KEY=...          # Required if BB_MODEL=gemini
ANTHROPIC_API_KEY=...       # Required if BB_MODEL=anthropic
```

**Extension (src/background.js)**
```javascript
const BACKEND_API_URL = "https://your-backend.vercel.app/api/analyze";
```

## Benefits

| Aspect | Before | After |
|--------|--------|-------|
| **Setup** | Copy API key, paste in settings | Just install |
| **Security** | User's key in browser | Your key on server |
| **Rate Limiting** | No limit (or Anthropic's) | 5/month free tier |
| **Model Flexibility** | Hardcoded Claude | Config flag to swap |
| **Scaling** | Per-user API spend | Centralized billing |
| **Analytics** | None | Track usage per device |

## Next Steps

1. **Deploy backend**
   - Get Gemini or Anthropic API key
   - Follow [backend/SETUP.md](backend/SETUP.md)

2. **Test locally**
   - Set `BACKEND_API_URL = "http://localhost:3000/api/analyze"` in background.js
   - Deploy backend locally for testing

3. **Update extension URL**
   - Change `BACKEND_API_URL` to production backend

4. **Add authentication (when going paid)**
   - Move from device UUID → user accounts
   - Integrate Stripe for payments
   - Backend already ready for this

## Model Switching

To switch from Gemini to Anthropic (when ready):
1. Get Anthropic API key
2. Set `BB_MODEL=anthropic` and `ANTHROPIC_API_KEY=...` in Vercel
3. Redeploy: `vercel`
4. Done—extension works with Claude automatically

No code changes needed. Same API interface supports both.

## Production Considerations

### Now
- In-memory rate limiting (resets on deploy)
- Basic CORS
- No metrics/logging

### Upgrade later
- Add Redis for persistent rate limiting
- Database for detailed usage analytics
- Error tracking (Sentry)
- Metrics (Datadog/New Relic)
- Custom domains + SSL
- Load balancing if needed

## Troubleshooting

**Q: Why no login?**
A: Device ID is enough for free tier. Login comes when they upgrade to paid plan.

**Q: Can users reset their device ID?**
A: Yes—if they clear extension storage or uninstall/reinstall. Then they get 5 new free analyses.

**Q: What if I want to track more user data?**
A: Add optional analytics collection—but keep the free tier signup-free. You want frictionless adoption.

**Q: Can I offer different free limits per region?**
A: Yes—add device geolocation to config logic.

**Q: How do I handle abuse (same person with multiple device IDs)?**
A: Rate limit by IP address as fallback, or require payment after 3 devices per IP per month.
