const API_BASE = 'https://content-ontology.philipp-koch.workers.dev';
let currentDays = 7;

// Chart instances
let toolUsageChart, statusChart, retentionChart;

// Initialize dashboard
async function init() {
  await loadData();
  setupEventListeners();

  // Auto-refresh every 60 seconds
  setInterval(loadData, 60000);
}

// Load all analytics data
async function loadData() {
  try {
    const [summary, tools, retention, errors] = await Promise.all([
      fetch(`${API_BASE}/analytics/summary?days=${currentDays}`).then(r => r.json()),
      fetch(`${API_BASE}/analytics/tools?days=${currentDays}`).then(r => r.json()),
      fetch(`${API_BASE}/analytics/retention?days=${currentDays}`).then(r => r.json()),
      fetch(`${API_BASE}/analytics/errors?days=${currentDays}&limit=20`).then(r => r.json()),
    ]);

    updateSummaryCards(summary);
    updateToolUsageChart(tools);
    updateStatusChart(tools);
    updateRetentionChart(retention);
    updateErrorsTable(errors);
  } catch (error) {
    console.error('Failed to load analytics:', error);
  }
}

// Update summary cards
function updateSummaryCards(summary) {
  document.getElementById('total-invocations').textContent = summary.total_invocations.toLocaleString();
  document.getElementById('unique-users').textContent = summary.unique_users.toLocaleString();
  document.getElementById('success-rate').textContent = `${summary.success_rate}%`;
  document.getElementById('avg-duration').textContent = `${summary.avg_duration_ms}ms`;
}

// Update tool usage chart
function updateToolUsageChart(tools) {
  const ctx = document.getElementById('tool-usage-chart').getContext('2d');

  if (toolUsageChart) toolUsageChart.destroy();

  toolUsageChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: tools.map(t => t.tool_name),
      datasets: [{
        label: 'Invocations',
        data: tools.map(t => t.invocations),
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
}

// Update status chart (success rates)
function updateStatusChart(tools) {
  const ctx = document.getElementById('status-chart').getContext('2d');

  if (statusChart) statusChart.destroy();

  statusChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: tools.map(t => t.tool_name),
      datasets: [{
        label: 'Success Rate',
        data: tools.map(t => parseFloat(t.success_rate)),
        backgroundColor: [
          '#4CAF50', '#2196F3', '#FFC107', '#FF5722', '#9C27B0', '#00BCD4'
        ],
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right'
        }
      }
    }
  });
}

// Update retention chart (DAU)
function updateRetentionChart(retention) {
  const ctx = document.getElementById('retention-chart').getContext('2d');

  if (retentionChart) retentionChart.destroy();

  retentionChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: retention.daily_active_users.map(d => d.date),
      datasets: [{
        label: 'Daily Active Users',
        data: retention.daily_active_users.map(d => d.dau),
        borderColor: 'rgba(75, 192, 192, 1)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.4,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
}

// Update errors table
function updateErrorsTable(errors) {
  const tbody = document.querySelector('#errors-table tbody');
  tbody.innerHTML = '';

  if (errors.count === 0) {
    const row = tbody.insertRow();
    const cell = row.insertCell();
    cell.colSpan = 4;
    cell.textContent = 'No errors found';
    cell.style.textAlign = 'center';
    return;
  }

  errors.errors.forEach(error => {
    const row = tbody.insertRow();
    row.insertCell().textContent = new Date(error.timestamp).toLocaleString();
    row.insertCell().textContent = error.tool_name;
    row.insertCell().textContent = error.error_type || 'unknown';
    row.insertCell().textContent = error.error_message?.substring(0, 100) || '-';
  });
}

// Event listeners
function setupEventListeners() {
  document.querySelectorAll('.time-range-selector button').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelector('.time-range-selector .active')?.classList.remove('active');
      e.target.classList.add('active');
      currentDays = parseInt(e.target.dataset.days);
      loadData();
    });
  });
}

// Initialize on load
init();
