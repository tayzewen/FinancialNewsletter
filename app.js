/**
 * app.js — Main application controller
 * Handles the launch screen, report generation flow, and PDF download
 */

// ─────────────────────────────────────────────
//  LAUNCH HANDLER
// ─────────────────────────────────────────────

// Allow "run" keyword or Enter key to trigger generation
document.getElementById('run-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') handleLaunch();
});

document.getElementById('run-input').addEventListener('input', (e) => {
  const val = e.target.value.trim().toLowerCase();
  if (val === 'run') handleLaunch();
});

function handleLaunch() {
  showNewsletter();
  generateReport();
}

// ─────────────────────────────────────────────
//  SHOW / HIDE
// ─────────────────────────────────────────────

function showNewsletter() {
  document.getElementById('launch-screen').classList.add('hidden');
  document.getElementById('newsletter').classList.remove('hidden');

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
  document.getElementById('header-date').textContent = `Week of ${dateStr}`;
  document.getElementById('footer-date').textContent = dateStr;
}

function resetToLaunch() {
  document.getElementById('newsletter').classList.add('hidden');
  document.getElementById('launch-screen').classList.remove('hidden');
  document.getElementById('run-input').value = '';
  document.getElementById('loading-state').classList.remove('hidden');
  document.getElementById('nl-sections').classList.add('hidden');
  document.getElementById('nl-sections').innerHTML = '';
  document.getElementById('loading-steps').innerHTML = '';
}

// ─────────────────────────────────────────────
//  LOADING STEP MANAGER
// ─────────────────────────────────────────────

const STEPS = [
  { id: 'step-econ',    label: 'Fetching economic indicators from FRED...' },
  { id: 'step-mort',   label: 'Pulling mortgage rate data...' },
  { id: 'step-fed',    label: 'Loading Federal Reserve data...' },
  { id: 'step-bench',  label: 'Fetching market benchmark quotes...' },
  { id: 'step-ai',     label: 'Running AI analysis and summaries...' },
  { id: 'step-render', label: 'Building your newsletter...' },
];

function initLoadingSteps() {
  const container = document.getElementById('loading-steps');
  container.innerHTML = '';
  STEPS.forEach(s => {
    container.insertAdjacentHTML('beforeend', `
      <div class="loading-step" id="${s.id}">
        <div class="step-icon">○</div>
        <span>${s.label}</span>
      </div>
    `);
  });
}

function setStep(id, state) {
  const el = document.getElementById(id);
  if (!el) return;
  el.className = `loading-step ${state}`;
  const icon = el.querySelector('.step-icon');
  if (state === 'active') icon.innerHTML = '<div class="spinner"></div>';
  else if (state === 'done')   icon.textContent = '✓';
  else if (state === 'error')  icon.textContent = '✗';
  else icon.textContent = '○';
}

// ─────────────────────────────────────────────
//  MAIN GENERATION FLOW
// ─────────────────────────────────────────────

async function generateReport() {
  initLoadingSteps();
  document.getElementById('loading-state').classList.remove('hidden');
  document.getElementById('nl-sections').classList.add('hidden');

  let econData = {};
  let benchmarks = [];
  let aiContent = {};

  // 1. Economic indicators
  setStep('step-econ', 'active');
  try {
    econData = await fetchEconomicData();
    // Remove mortgage and fed from the main econ set for separate rendering
    setStep('step-econ', 'done');
  } catch (e) {
    console.error('Economic data error:', e);
    setStep('step-econ', 'error');
  }

  // 2. Mortgage
  setStep('step-mort', 'active');
  await sleep(300); // slight pause for UX clarity
  if (econData.MORTGAGE_30) setStep('step-mort', 'done');
  else setStep('step-mort', 'error');

  // 3. Fed rate
  setStep('step-fed', 'active');
  await sleep(200);
  if (econData.FED_RATE) setStep('step-fed', 'done');
  else setStep('step-fed', 'error');

  // 4. Benchmarks
  setStep('step-bench', 'active');
  try {
    benchmarks = await fetchAllBenchmarks();
    setStep('step-bench', 'done');
  } catch (e) {
    console.error('Benchmark error:', e);
    setStep('step-bench', 'error');
    benchmarks = BENCHMARKS.map(b => ({ ...b, error: true }));
  }

  // 5. AI content
  setStep('step-ai', 'active');
  try {
    const mortgageRate = econData.MORTGAGE_30?.latestValue || 'N/A';
    const fedRate = econData.FED_RATE?.latestValue || 'N/A';
    aiContent = await fetchAIContent(econData, mortgageRate, fedRate);
    setStep('step-ai', 'done');
  } catch (e) {
    console.error('AI content error:', e);
    setStep('step-ai', 'error');
    aiContent = {
      executiveSummary: 'AI summary unavailable.',
      topArticles: [],
      fedCommentary: '',
      anticipatedEarnings: [],
      upcomingWeek: [],
    };
  }

  // 6. Render
  setStep('step-render', 'active');
  await sleep(200);

  try {
    const html = assembleNewsletter({ aiContent, econData, benchmarks });
    const sectionsEl = document.getElementById('nl-sections');
    sectionsEl.innerHTML = html;

    // Show sections, hide loading
    document.getElementById('loading-state').classList.add('hidden');
    sectionsEl.classList.remove('hidden');

    // Draw charts after DOM is ready
    requestAnimationFrame(() => {
      initCharts(econData, benchmarks);
    });

    setStep('step-render', 'done');
  } catch (e) {
    console.error('Render error:', e);
    setStep('step-render', 'error');
    document.getElementById('nl-sections').innerHTML = `
      <div style="padding:2rem;color:var(--accent-red);font-family:var(--font-mono)">
        Error rendering newsletter: ${e.message}
      </div>
    `;
    document.getElementById('loading-state').classList.add('hidden');
    document.getElementById('nl-sections').classList.remove('hidden');
  }
}

// ─────────────────────────────────────────────
//  PDF DOWNLOAD
// ─────────────────────────────────────────────

async function downloadPDF() {
  window.print();
  // const btn = document.querySelector('.btn-primary');
  // const originalText = btn.textContent;
  // btn.textContent = 'Generating PDF...';
  // btn.disabled = true;

  // const now = new Date();
  // const dateTag = now.toISOString().split('T')[0];
  // const filename = `Weekly-Financial-Digest-${dateTag}.pdf`;

  // const element = document.getElementById('nl-content');

  // const opt = {
  //   margin:       [0.5, 0.5, 0.5, 0.5],
  //   filename:     filename,
  //   image:        { type: 'jpeg', quality: 0.92 },
  //   html2canvas:  {
  //     scale: 2,
  //     useCORS: true,
  //     backgroundColor: '#0a0c0f',
  //     logging: false,
  //   },
  //   jsPDF: {
  //     unit: 'in',
  //     format: 'letter',
  //     orientation: 'portrait',
  //   },
  //   pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
  // };

  // try {
  //   await html2pdf().set(opt).from(element).save();
  // } catch (e) {
  //   console.error('PDF error:', e);
  //   alert('PDF generation failed. Please try printing the page instead (Ctrl+P / Cmd+P).');
  // }

  // btn.textContent = originalText;
  // btn.disabled = false;
}

// ─────────────────────────────────────────────
//  UTILITY
// ─────────────────────────────────────────────

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
