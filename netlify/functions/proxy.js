/**
 * netlify/functions/proxy.js
 *
 * Serverless proxy — runs on Netlify's servers, never in the browser.
 *
 * Services:
 *   POST /api/proxy  { service: 'fred',          seriesId, limit }
 *   POST /api/proxy  { service: 'alphavantage',   ticker }
 *   POST /api/proxy  { service: 'gemini',         prompt }
 *
 * Environment variables (set in Netlify dashboard → Site → Environment variables):
 *   FRED_API_KEY
 *   ALPHAVANTAGE_API_KEY
 *   GEMINI_API_KEY
 */

exports.handler = async (event) => {
  
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: CORS,
      body: '',
    };
  }

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

  // ── GEMINI ────────────────────────────────────────────────────────
  if (service === 'gemini') {
    const { prompt } = body;
    const key = process.env.GEMINI_API_KEY;
    if (!key) return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'GEMINI_API_KEY not set' }) };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 7000,
        },
      }),
    });

    const data = await res.json();
    if (!res.ok) return { statusCode: res.status, headers: CORS, body: JSON.stringify({ error: data }) };

    // Extract text from Gemini response and return in a shape api.js expects
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ text }) };
  }

  return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: `Unknown service: ${service}` }) };
};
