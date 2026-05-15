/**
 * newsletter.js — HTML rendering for each newsletter section
 * Builds the DOM for the generated report
 */

// ─────────────────────────────────────────────
//  EXECUTIVE SUMMARY
// ─────────────────────────────────────────────
function renderExecutiveSummary(text) {
  return `
    <section class="nl-section" id="sec-summary">
      <div class="section-label">01 · Overview</div>
      <h2 class="section-title">Executive Summary</h2>
      <div class="summary-box">
        ${text.split('\n\n').map(p => `<p style="margin-bottom:0.85rem">${p.trim()}</p>`).join('')}
      </div>
    </section>
  `;
}

// ─────────────────────────────────────────────
//  TOP 5 ARTICLES
// ─────────────────────────────────────────────
function renderTopArticles(articles) {
  if (!articles?.length) return '';
  const cards = articles.slice(0, 5).map((a, i) => `
    <div class="article-card">
      <div class="article-num">0${i + 1} · ${a.topic?.toUpperCase() || 'MARKETS'}</div>
      <div class="article-headline">
        <a href="${a.url || '#'}" target="_blank" rel="noopener">${a.headline}</a>
      </div>
      <div class="article-summary">${a.summary}</div>
      <div class="article-source">Source: <a href="${a.url || '#'}" target="_blank" rel="noopener">${a.source}</a></div>
    </div>
  `).join('');

  return `
    <section class="nl-section" id="sec-articles">
      <div class="section-label">02 · Top Stories</div>
      <h2 class="section-title">This Week in Markets</h2>
      <div class="articles-grid">${cards}</div>
    </section>
  `;
}

// ─────────────────────────────────────────────
//  ECONOMIC INDICATORS
// ─────────────────────────────────────────────
function renderEconomicData(econData) {
  const KEYS = ['CPI', 'PPI', 'PCE', 'UNEMPLOYMENT', 'HOURLY_WAGES', 'NONFARM_PAYROLL'];
  const cards = KEYS.map(key => {
    const d = econData[key];
    if (!d || d.error) return `
      <div class="econ-card">
        <div class="econ-name">${d?.label || key}</div>
        <div class="econ-value" style="font-size:1.2rem;color:var(--text-muted)">Data unavailable</div>
        <div class="econ-desc">Could not load from FRED. <a href="https://fred.stlouisfed.org" target="_blank">View manually</a></div>
      </div>`;

    const yoy = parseFloat(d.yoyChange);
    const changeClass = isNaN(yoy) ? 'neutral' : yoy > 0 ? 'up' : 'down';
    const changeSign = yoy > 0 ? '+' : '';
    const displayVal = d.unit === '$'
      ? `$${d.latestValue?.toFixed(2)}`
      : d.unit === 'K'
        ? `${(d.latestValue / 1000).toFixed(1)}M`
        : `${d.latestValue?.toFixed(1)}${d.unit}`;

    return `
      <div class="econ-card">
        <div class="econ-card-header">
          <div class="econ-name">${d.label}</div>
          <div class="econ-badge">${d.latestDate ? formatDate(d.latestDate) : 'N/A'}</div>
        </div>
        <div class="econ-value">${displayVal}</div>
        <div class="econ-change ${changeClass}">
          ${!isNaN(yoy) ? `${changeSign}${yoy}% YoY` : 'YoY N/A'}
          ${d.monthChange && !isNaN(d.monthChange) ? ` · ${d.monthChange > 0 ? '+' : ''}${d.monthChange} MoM` : ''}
        </div>
        <div class="econ-desc">${d.desc}</div>
        <div class="econ-chart-wrap">
          <canvas id="chart-${key}" height="100"></canvas>
        </div>
        <div class="econ-source">
          Source: <a href="${d.sourceUrl}" target="_blank" rel="noopener">Federal Reserve (FRED)</a>
        </div>
      </div>
    `;
  }).join('');

  return `
    <section class="nl-section" id="sec-econ">
      <div class="section-label">03 · Economic Indicators</div>
      <h2 class="section-title">Key Economic Data <span style="font-size:0.9rem;color:var(--text-muted);font-weight:400">(Year-over-Year)</span></h2>
      <div class="econ-grid">${cards}</div>
    </section>
  `;
}

// ─────────────────────────────────────────────
//  MORTGAGE RATES
// ─────────────────────────────────────────────
function renderMortgageRate(mortgageData) {
  const d = mortgageData;
  const rate = d?.latestValue?.toFixed(2) || '—';
  const prev = d?.prevValue?.toFixed(2);
  const change = prev ? (parseFloat(rate) - parseFloat(prev)).toFixed(2) : null;
  const changeDir = change > 0 ? '↑' : change < 0 ? '↓' : '→';
  const changeClass = change > 0 ? 'up' : change < 0 ? 'down' : 'neutral';

  return `
    <section class="nl-section" id="sec-mortgage">
      <div class="section-label">04 · Housing</div>
      <h2 class="section-title">30-Year Mortgage Rate</h2>
      <div class="rate-display">
        <div class="rate-big">${rate}%</div>
        <div class="rate-meta">
          <div class="rate-label">30-Year Fixed Rate National Average</div>
          <div class="rate-note">
            ${change !== null ? `<span class="econ-change ${changeClass}" style="font-family:var(--font-mono);font-size:0.82rem">${changeDir} ${Math.abs(change)}% vs prior week</span><br/>` : ''}
            As of ${formatDate(d?.latestDate)}. Updated weekly by Freddie Mac via FRED.
          </div>
          <div class="rate-source">
            Source: <a href="${d?.sourceUrl || 'https://fred.stlouisfed.org/series/MORTGAGE30US'}" target="_blank" rel="noopener">Freddie Mac / FRED</a>
          </div>
        </div>
      </div>
    </section>
  `;
}

// ─────────────────────────────────────────────
//  FEDERAL RESERVE
// ─────────────────────────────────────────────
function renderFedSection(fedData, aiCommentary, fedMeetingOccurred) {
  const rate = fedData?.latestValue?.toFixed(2) || '—';
  const prev = fedData?.prevValue?.toFixed(2);
  const changed = prev && prev !== rate;

  return `
    <section class="nl-section" id="sec-fed">
      <div class="section-label">05 · Federal Reserve</div>
      <h2 class="section-title">Fed Policy & Commentary</h2>
      <div class="fed-box">
        <div class="fed-rate-row">
          <div class="fed-rate-display">
            <div class="fed-rate-label">Federal Funds Rate</div>
            <div class="fed-rate-value">${rate}%</div>
          </div>
          <div class="fed-divider"></div>
          <div class="fed-note">
            ${changed
              ? `<strong style="color:var(--accent)">Rate changed</strong> from ${prev}% to ${rate}% as of ${formatDate(fedData.latestDate)}.`
              : `Rate held steady at ${rate}% as of ${formatDate(fedData?.latestDate)}.`}
            ${fedMeetingOccurred
              ? `<br/>A Federal Open Market Committee (FOMC) meeting occurred this week.`
              : `<br/>No FOMC meeting this week.`}
          </div>
        </div>
        ${aiCommentary ? `
          <div class="fed-commentary">
            "${aiCommentary}"
          </div>` : ''}
        <div class="fed-source">
          Source: <a href="${fedData?.sourceUrl || 'https://fred.stlouisfed.org/series/FEDFUNDS'}" target="_blank" rel="noopener">Federal Reserve / FRED</a>
          · <a href="https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm" target="_blank" rel="noopener">FOMC Calendar</a>
        </div>
      </div>
    </section>
  `;
}

// ─────────────────────────────────────────────
//  EARNINGS
// ─────────────────────────────────────────────
function renderEarnings(earningsArr) {
  if (!earningsArr?.length) return '';

  const rows = earningsArr.map(e => {
    const beatLabel = e.beat === true ? `<span class="beat">✓ Beat</span>`
      : e.beat === false ? `<span class="miss">✗ Miss</span>`
      : `<span class="inline">—</span>`;

    return `
      <tr>
        <td><span class="ticker">${e.ticker}</span></td>
        <td style="color:var(--text-muted)">${e.company}</td>
        <td>${e.reportDate || '—'}</td>
        <td>${e.period || '—'}</td>
        <td style="color:var(--text-muted)">${e.epsEstimate ? `$${e.epsEstimate}` : '—'}</td>
        <td>${e.actual_eps ? `$${e.actual_eps}` : '—'}</td>
        <td>${beatLabel}</td>
        <td style="color:var(--text-dim);font-size:0.75rem">${e.note || ''}</td>
      </tr>
    `;
  }).join('');

  return `
    <section class="nl-section" id="sec-earnings">
      <div class="section-label">06 · Earnings</div>
      <h2 class="section-title">Notable Earnings Releases</h2>
      <div style="overflow-x:auto">
        <table class="earnings-table">
          <thead>
            <tr>
              <th>TICKER</th><th>COMPANY</th><th>DATE</th><th>PERIOD</th>
              <th>EPS EST.</th><th>ACTUAL EPS</th><th>RESULT</th><th>NOTES</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <p style="margin-top:0.75rem;font-family:var(--font-mono);font-size:0.68rem;color:var(--text-dim)">
        Sources: <a href="https://finance.yahoo.com/calendar/earnings" target="_blank" rel="noopener" style="color:var(--accent2)">Yahoo Finance</a>
        · <a href="https://www.earningswhispers.com" target="_blank" rel="noopener" style="color:var(--accent2)">Earnings Whispers</a>
      </p>
    </section>
  `;
}

// ─────────────────────────────────────────────
//  BENCHMARKS
// ─────────────────────────────────────────────
function renderBenchmarks(benchmarks) {
  const cards = benchmarks.map((b, i) => {
    if (b.error) return `
      <div class="benchmark-card">
        <div class="bench-ticker">${b.ticker}</div>
        <div class="bench-name">${b.label}</div>
        <div class="bench-value" style="font-size:1rem;color:var(--text-muted)">N/A</div>
      </div>`;

    return `
      <div class="benchmark-card">
        <div class="bench-ticker">${b.ticker}</div>
        <div class="bench-name">${b.label}<br/><span style="color:var(--text-dim)">${b.note}</span></div>
        <div class="bench-value">$${Number(b.close).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
        <div class="bench-change ${b.direction}">
          ${b.direction === 'up' ? '▲' : '▼'} ${Math.abs(b.changePct)}% (5d)
        </div>
        <div class="bench-chart">
          <canvas id="sparkline-${i}" height="40"></canvas>
        </div>
      </div>
    `;
  }).join('');

  return `
    <section class="nl-section" id="sec-benchmarks">
      <div class="section-label">07 · Market Performance</div>
      <h2 class="section-title">5-Day Benchmark Performance</h2>
      <div class="benchmarks-grid">${cards}</div>
      <p style="margin-top:0.75rem;font-family:var(--font-mono);font-size:0.68rem;color:var(--text-dim)">
        Source: <a href="https://www.alphavantage.co" target="_blank" rel="noopener" style="color:var(--accent2)">Alpha Vantage</a>
        · ETF proxies used: SPY (SPX), QQQ (NDX), DIA (DJI), IWM (RUT), GLD (XAUUSD), VIXY (VIX)
      </p>
    </section>
  `;
}

// ─────────────────────────────────────────────
//  UPCOMING WEEK
// ─────────────────────────────────────────────
function renderUpcomingWeek(events) {
  if (!events?.length) return '';

  const typeColors = {
    earnings: 'var(--accent)',
    economic: 'var(--accent2)',
    fed:      'var(--accent3)',
    other:    'var(--text-muted)',
  };

  const items = events.map(e => `
    <div class="upcoming-item">
      <div class="upcoming-date">${e.date}</div>
      <div class="upcoming-type" style="border-color:${typeColors[e.type] || typeColors.other};color:${typeColors[e.type] || typeColors.other}">
        ${e.type?.toUpperCase() || 'EVENT'}
      </div>
      <div class="upcoming-desc">${e.description}</div>
    </div>
  `).join('');

  return `
    <section class="nl-section" id="sec-upcoming">
      <div class="section-label">08 · What's Next</div>
      <h2 class="section-title">Anticipated Events Next Week</h2>
      <div class="upcoming-list">${items}</div>
      <p style="margin-top:0.75rem;font-family:var(--font-mono);font-size:0.68rem;color:var(--text-dim)">
        Sources: <a href="https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm" target="_blank" rel="noopener" style="color:var(--accent2)">Fed Calendar</a>
        · <a href="https://finance.yahoo.com/calendar" target="_blank" rel="noopener" style="color:var(--accent2)">Yahoo Finance Calendar</a>
        · <a href="https://www.bls.gov/schedule/news_release/schedule.htm" target="_blank" rel="noopener" style="color:var(--accent2)">BLS Release Schedule</a>
      </p>
    </section>
  `;
}

// ─────────────────────────────────────────────
//  ASSEMBLE FULL NEWSLETTER HTML
// ─────────────────────────────────────────────
function assembleNewsletter(data) {
  const {
    aiContent,
    econData,
    benchmarks,
  } = data;

  const mortgage = econData.MORTGAGE_30;
  const fed = econData.FED_RATE;

  return [
    renderExecutiveSummary(aiContent.executiveSummary || 'Summary unavailable.'),
    renderTopArticles(aiContent.topArticles),
    renderEconomicData(econData),
    renderMortgageRate(mortgage),
    renderFedSection(fed, aiContent.fedCommentary, aiContent.fedMeetingOccurred),
    renderEarnings(aiContent.anticipatedEarnings),
    renderBenchmarks(benchmarks),
    renderUpcomingWeek(aiContent.upcomingWeek),
  ].join('');
}

// ─────────────────────────────────────────────
//  POST-RENDER: Draw charts after DOM is set
// ─────────────────────────────────────────────
function initCharts(econData, benchmarks) {
  // Economic indicator charts
  const KEYS = ['CPI', 'PPI', 'PCE', 'UNEMPLOYMENT', 'HOURLY_WAGES', 'NONFARM_PAYROLL'];
  for (const key of KEYS) {
    const d = econData[key];
    if (d?.series?.length) {
      renderEconChart(`chart-${key}`, d.series, econChartColor(key), d.unit);
    }
  }

  // Benchmark sparklines
  benchmarks.forEach((b, i) => {
    if (!b.error && b.series?.length) {
      renderBenchmarkSparkline(`sparkline-${i}`, b.series, b.direction);
    }
  });
}
