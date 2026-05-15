# Weekly Financial Digest

An AI-powered weekly financial newsletter generator. All API calls run through a Netlify serverless proxy — no CORS issues, no exposed keys.

---

## Setup (One-Time)

### Step 1 — Get your free API keys

| Key | Where to get it |
|---|---|
| FRED_API_KEY | https://fred.stlouisfed.org/docs/api/api_key.html |
| ALPHAVANTAGE_API_KEY | https://www.alphavantage.co/support/#api-key |
| ANTHROPIC_API_KEY | https://console.anthropic.com/settings/keys |

---

### Step 2 — Push to GitHub

Create a GitHub repo and push this entire folder to it.

---

### Step 3 — Deploy to Netlify (free)

1. Go to netlify.com and sign up (free)
2. Click Add new site > Import an existing project
3. Connect your GitHub repo
4. Build settings auto-detect from netlify.toml — no changes needed
5. Click Deploy

---

### Step 4 — Add environment variables in Netlify

1. In your Netlify site dashboard, go to Site configuration > Environment variables
2. Add three variables: FRED_API_KEY, ALPHAVANTAGE_API_KEY, ANTHROPIC_API_KEY
3. Click Save, then Deploys > Trigger deploy to redeploy

---

### Step 5 — Local development

Use Netlify CLI instead of VS Code Live Server:

  npm install -g netlify-cli
  netlify login
  netlify dev

This opens the app at http://localhost:8888 with the proxy working.

Create a .env file in the project root for local keys:
  FRED_API_KEY=your_key_here
  ALPHAVANTAGE_API_KEY=your_key_here
  ANTHROPIC_API_KEY=your_key_here

Add .env to your .gitignore so it is never committed to GitHub.

---

## File Structure

  financial-newsletter/
  index.html               Main HTML shell
  styles.css               All styling
  api.js                   Data fetching (calls /api/proxy)
  charts.js                Chart.js wrappers
  newsletter.js            HTML section builders
  app.js                   App controller
  netlify.toml             Netlify routing config
  netlify/functions/
    proxy.js               Serverless proxy (runs server-side)
  README.md

---

## Alpha Vantage Free Tier Note

Free plan: 25 API calls/day. The newsletter uses 6 per run (one per benchmark),
so you can generate about 4 newsletters per day on the free tier.

---

For informational purposes only. Not financial advice.
