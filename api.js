/**
 * api.js — Data fetching via the Netlify serverless proxy
 *
 * API keys now live in Netlify environment variables (never in this file).
 * All fetch calls go to /api/proxy, which runs server-side — no CORS issues.
 *
 * LOCAL DEVELOPMENT:
 *   Install Netlify CLI:  npm install -g netlify-cli
 *   Run locally:          netlify dev
 *   Opens at:             http://localhost:8888
 *   (Do NOT use VS Code Live Server — use `netlify dev` instead)
 *
 * ENVIRONMENT VARIABLES (set once in Netlify dashboard → Site → Environment variables):
 *   FRED_API_KEY, ALPHAVANTAGE_API_KEY, ANTHROPIC_API_KEY
 */

const PROXY = '/.netlify/functions/proxy';

const FRED_SERIES = {
  CPI:             { id: 'CPIAUCSL',      label: 'CPI',             unit: '%', desc: 'Consumer Price Index (Urban, All Items), YoY' },
  PPI:             { id: 'PPIACO',        label: 'PPI',             unit: '%', desc: 'Producer Price Index, YoY' },
  PCE:             { id: 'PCEPI',         label: 'PCE',             unit: '%', desc: 'Personal Consumption Expenditures Price Index, YoY' },
  UNEMPLOYMENT:    { id: 'UNRATE',        label: 'Unemployment',    unit: '%', desc: 'US Unemployment Rate' },
  HOURLY_WAGES:    { id: 'CES0500000003', label: 'Hourly Wages',    unit: '$', desc: 'Average Hourly Earnings, All Employees' },
  NONFARM_PAYROLL: { id: 'PAYEMS',        label: 'Nonfarm Payrolls',unit: 'K', desc: 'Total Nonfarm Payrolls (Thousands)' },
  FED_RATE:        { id: 'FEDFUNDS',      label: 'Fed Funds Rate',  unit: '%', desc: 'Effective Federal Funds Rate' },
  MORTGAGE_30:     { id: 'MORTGAGE30US',  label: '30-Yr Mortgage',  unit: '%', desc: '30-Year Fixed Mortgage Rate' },
};

async function fetchFredSeries(seriesId, limit = 13) {
  const res = await fetch(PROXY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ service: 'fred', seriesId, limit }),
  });
  if (!res.ok) throw new Error(`FRED proxy error for ${seriesId}: ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return (data.observations || [])
    .filter(o => o.value !== '.')
    .map(o => ({ date: o.date, value: parseFloat(o.value) }))
    .reverse();
}

function calcYoY(series) {
  if (series.length < 13) return null;
  const latest = series[series.length - 1].value;
  const yearAgo = series[0].value;
  return ((latest - yearAgo) / yearAgo * 100).toFixed(2);
}

async function fetchEconomicData() {
  const results = {};
  for (const [key, meta] of Object.entries(FRED_SERIES)) {
    try {
      const series = await fetchFredSeries(meta.id, 13);
      const latest = series[series.length - 1];
      const prev   = series[series.length - 2];
      const yoy    = calcYoY(series);
      results[key] = {
        ...meta,
        series,
        latestDate:  latest?.date,
        latestValue: latest?.value,
        prevValue:   prev?.value,
        yoyChange:   yoy,
        monthChange: prev ? (latest.value - prev.value).toFixed(3) : null,
        sourceUrl:   `https://fred.stlouisfed.org/series/${meta.id}`,
        withinWeek:  isWithinDays(latest?.date, 7),
      };
    } catch (e) {
      console.warn(`Failed to fetch ${key}:`, e);
      results[key] = { ...meta, error: true };
    }
  }
  return results;
}

const BENCHMARKS = [
  { ticker: 'SPY',  label: 'S&P 500',      note: 'SPX proxy' },
  { ticker: 'QQQ',  label: 'Nasdaq 100',   note: 'NDX proxy' },
  { ticker: 'DIA',  label: 'Dow Jones',    note: 'DJI proxy' },
  { ticker: 'IWM',  label: 'Russell 2000', note: 'RUT proxy' },
  { ticker: 'GLD',  label: 'Gold',         note: 'XAUUSD proxy' },
  { ticker: 'VIXY', label: 'VIX',          note: 'Volatility proxy' },
];

async function fetchBenchmarkQuote(ticker) {
  const res = await fetch(PROXY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ service: 'alphavantage', ticker }),
  });
  if (!res.ok) throw new Error(`Proxy error for ${ticker}: ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  if (data.Note || data.Information) throw new Error(`Alpha Vantage limit: ${data.Note || data.Information}`);

  const ts = data['Time Series (Daily)'];
  if (!ts) throw new Error(`No data for ${ticker}`);

  const dates = Object.keys(ts).sort().reverse().slice(0, 6);
  const entries = dates.map(d => ({ date: d, close: parseFloat(ts[d]['4. close']) })).reverse();
  const latest  = entries[entries.length - 1];
  const fiveDay = entries[0];
  const change    = latest.close - fiveDay.close;
  const changePct = (change / fiveDay.close * 100).toFixed(2);

  return {
    ticker,
    close: latest.close.toFixed(2),
    change: change.toFixed(2),
    changePct,
    direction: change >= 0 ? 'up' : 'down',
    series: entries,
    date: latest.date,
  };
}

async function fetchAllBenchmarks() {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const results = [];
  for (const b of BENCHMARKS) {
    try {
      const q = await fetchBenchmarkQuote(b.ticker);
      results.push({ ...b, ...q });
    } catch (e) {
      console.warn(`Benchmark fetch failed for ${b.ticker}:`, e.message);
      results.push({ ...b, error: true, errorMsg: e.message });
    }
    await sleep(1200);
  }
  return results;
}

async function fetchAIContent(econData, mortgageRate, fedRate) {
  const today = new Date().toISOString().split('T')[0];
  const econSummary = Object.entries(econData)
    .filter(([k]) => !['FED_RATE', 'MORTGAGE_30'].includes(k))
    .map(([k, v]) => `${v.label}: ${v.latestValue ?? 'N/A'}${v.unit} (YoY: ${v.yoyChange ?? 'N/A'}%)`)
    .join(', ');

  const prompt = `You are a financial analyst writing a weekly newsletter digest. Today is ${today}.

Current economic context: ${econSummary}
30-year mortgage rate: ${mortgageRate}%
Federal Funds Rate: ${fedRate}%

Respond ONLY with valid JSON — no markdown, no backticks, no explanation:

{
  "executiveSummary": "2 paragraph executive summary of current market conditions written for financial planners",
  "topArticles": [
    { "headline": "...", "summary": "1 paragraph", "source": "Publication", "url": "https://...", "topic": "stocks|economy|rates|earnings|markets" }
  ],
  "fedCommentary": "2-3 sentences on recent Fed commentary.",
  "fedMeetingOccurred": false,
  "anticipatedEarnings": [
    { "ticker": "AAPL", "company": "Apple Inc.", "reportDate": "YYYY-MM-DD", "period": "Q2 2025", "epsEstimate": "1.60", "revenueEstimate": "$94.3B", "actual_eps": null, "actual_revenue": null, "beat": null, "note": "..." }
  ],
  "upcomingWeek": [
    { "date": "Mon", "type": "earnings|economic|fed|other", "description": "..." }
  ]
}

Provide exactly 3 topArticles, 3 anticipatedEarnings, 3-4 upcomingWeek events.`;

  const res = await fetch(PROXY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ service: 'gemini', prompt }),
  });

  if (!res.ok) throw new Error(`Gemini proxy error: ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(JSON.stringify(data.error));

  const text = data.text || '{}';
  try {
    return JSON.parse(text.replace(/```json|```/g, '').trim());
  } catch (e) {
    console.error('Failed to parse AI JSON:', e, text);
    return {};
  }
}

function isWithinDays(dateStr, days) {
  if (!dateStr) return false;
  return (new Date() - new Date(dateStr + 'T00:00:00')) / 86400000 <= days;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
