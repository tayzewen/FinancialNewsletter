/**
 * netlify/functions/proxy.js
 *
 * Serverless proxy that runs on Netlify's servers (not the browser),
 * so API keys are never exposed and CORS is never an issue.
 *
 * Handles three services:
 *   POST /api/proxy  { service: 'fred',        seriesId, limit }
 *   POST /api/proxy  { service: 'alphavantage', ticker }
 *   POST /api/proxy  { service: 'claude',       messages, system? }
 *
 * Environment variables (set in Netlify dashboard → Site → Environment variables):
 *   FRED_API_KEY
 *   ALPHAVANTAGE_API_KEY
 *   ANTHROPIC_API_KEY
 */

exports.handler = async (event) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { service } = body;

  // ── FRED ──────────────────────────────────────────────────────────
  if (service === 'fred') {
    const { seriesId, limit = 13 } = body;
    const key = process.env.FRED_API_KEY;
    if (!key) return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'FRED_API_KEY not set' }) };

    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${key}&file_type=json&sort_order=desc&limit=${limit}`;
    const res = await fetch(url);
    const data = await res.json();
    return { statusCode: res.status, headers: CORS, body: JSON.stringify(data) };
  }

  // ── ALPHA VANTAGE ─────────────────────────────────────────────────
  if (service === 'alphavantage') {
    const { ticker } = body;
    const key = process.env.ALPHAVANTAGE_API_KEY;
    if (!key) return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'ALPHAVANTAGE_API_KEY not set' }) };

    const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${ticker}&outputsize=compact&apikey=${key}`;
    const res = await fetch(url);
    const data = await res.json();
    return { statusCode: res.status, headers: CORS, body: JSON.stringify(data) };
  }

  // ── CLAUDE (ANTHROPIC) ────────────────────────────────────────────
  if (service === 'claude') {
    const { messages, system } = body;
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'ANTHROPIC_API_KEY not set' }) };

    const payload = {
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2500,
      messages,
      ...(system ? { system } : {}),
    };

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    return { statusCode: res.status, headers: CORS, body: JSON.stringify(data) };
  }

  return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: `Unknown service: ${service}` }) };
};
