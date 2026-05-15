/**
 * charts.js — Chart rendering for economic indicator line graphs
 * Uses Chart.js (loaded via CDN in index.html)
 */

const CHART_DEFAULTS = {
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 600, easing: 'easeInOutQuart' },
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#1a1f27',
      borderColor: '#232b38',
      borderWidth: 1,
      titleColor: '#c8a96e',
      bodyColor: '#e8e4dd',
      titleFont: { family: 'IBM Plex Mono', size: 10 },
      bodyFont: { family: 'IBM Plex Mono', size: 11 },
      padding: 8,
      displayColors: false,
      callbacks: {
        title: (items) => items[0]?.label || '',
        label: (item) => ` ${item.formattedValue}`,
      }
    }
  },
  scales: {
    x: {
      grid: { color: 'rgba(35,43,56,0.6)', drawBorder: false },
      ticks: {
        color: '#454f60',
        font: { family: 'IBM Plex Mono', size: 9 },
        maxRotation: 0,
        maxTicksLimit: 6,
      },
    },
    y: {
      position: 'right',
      grid: { color: 'rgba(35,43,56,0.6)', drawBorder: false },
      ticks: {
        color: '#454f60',
        font: { family: 'IBM Plex Mono', size: 9 },
        maxTicksLimit: 4,
      },
    }
  }
};

// Track created chart instances so we can destroy on re-render
const chartInstances = {};

/**
 * Render a sparkline-style line chart for an economic indicator
 * @param {string} canvasId - ID of the canvas element
 * @param {Array}  series   - [{date, value}, ...]
 * @param {string} color    - CSS color string
 * @param {string} unit     - '%' | '$' | 'K'
 */
function renderEconChart(canvasId, series, color = '#c8a96e', unit = '') {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  // Destroy existing chart if any
  if (chartInstances[canvasId]) {
    chartInstances[canvasId].destroy();
  }

  const labels = series.map(d => {
    const dt = new Date(d.date + 'T00:00:00');
    return dt.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  });

  const values = series.map(d => d.value);

  const gradient = canvas.getContext('2d').createLinearGradient(0, 0, 0, canvas.offsetHeight || 100);
  gradient.addColorStop(0, color + '33');
  gradient.addColorStop(1, color + '00');

  const chart = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data: values,
        borderColor: color,
        borderWidth: 1.5,
        backgroundColor: gradient,
        fill: true,
        tension: 0.35,
        pointRadius: 2,
        pointHoverRadius: 4,
        pointBackgroundColor: color,
        pointBorderColor: '#0a0c0f',
        pointBorderWidth: 1,
      }]
    },
    options: {
      ...CHART_DEFAULTS,
      plugins: {
        ...CHART_DEFAULTS.plugins,
        tooltip: {
          ...CHART_DEFAULTS.plugins.tooltip,
          callbacks: {
            title: (items) => labels[items[0]?.dataIndex] || '',
            label: (item) => ` ${item.formattedValue}${unit}`,
          }
        }
      }
    }
  });

  chartInstances[canvasId] = chart;
  return chart;
}

/**
 * Render a mini sparkline for benchmark cards
 */
function renderBenchmarkSparkline(canvasId, series, direction = 'up') {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  if (chartInstances[canvasId]) {
    chartInstances[canvasId].destroy();
  }

  const color = direction === 'up' ? '#3dd68c' : '#ff5a5a';
  const values = series.map(d => d.close);
  const labels = series.map(d => d.date);

  const chart = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data: values,
        borderColor: color,
        borderWidth: 1.5,
        backgroundColor: 'transparent',
        fill: false,
        tension: 0.3,
        pointRadius: 0,
        pointHoverRadius: 3,
        pointBackgroundColor: color,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 400 },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1a1f27',
          borderColor: '#232b38',
          borderWidth: 1,
          titleColor: color,
          bodyColor: '#e8e4dd',
          titleFont: { family: 'IBM Plex Mono', size: 9 },
          bodyFont: { family: 'IBM Plex Mono', size: 10 },
          padding: 6,
          displayColors: false,
          callbacks: {
            title: (items) => labels[items[0]?.dataIndex] || '',
            label: (item) => ` $${Number(item.raw).toFixed(2)}`,
          }
        }
      },
      scales: {
        x: { display: false },
        y: { display: false }
      }
    }
  });

  chartInstances[canvasId] = chart;
}

/**
 * Pick a chart color based on the indicator key
 */
function econChartColor(key) {
  const colors = {
    CPI:             '#c8a96e',  // gold
    PPI:             '#4a9eff',  // blue
    PCE:             '#a78bfa',  // purple
    UNEMPLOYMENT:    '#ff5a5a',  // red
    HOURLY_WAGES:    '#3dd68c',  // green
    NONFARM_PAYROLL: '#f59e0b',  // amber
  };
  return colors[key] || '#c8a96e';
}
