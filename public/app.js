const STAGES = ['fabrication', 'ready', 'dispatched'];
const STAGE_LABELS = { fabrication: 'In Fabrication', ready: 'Ready for Dispatch', dispatched: 'Dispatched' };
const STATE_ORDER = ['NSW', 'QLD', 'VIC', 'WA', 'SA', 'NT', 'TAS'];

const STATE_COLORS = {
  'NSW': { border: '#3b82f6', bg: 'rgba(59,130,246,0.12)', label: '#3b82f6' },
  'QLD': { border: '#ef4444', bg: 'rgba(239,68,68,0.12)', label: '#ef4444' },
  'VIC': { border: '#a855f7', bg: 'rgba(168,85,247,0.12)', label: '#a855f7' },
  'WA':  { border: '#22c55e', bg: 'rgba(34,197,94,0.12)', label: '#22c55e' },
  'SA':  { border: '#f59e0b', bg: 'rgba(245,158,11,0.12)', label: '#f59e0b' },
  'NT':  { border: '#ec4899', bg: 'rgba(236,72,153,0.12)', label: '#ec4899' },
  'TAS': { border: '#06b6d4', bg: 'rgba(6,182,212,0.12)', label: '#06b6d4' },
  'OTHER': { border: '#64748b', bg: 'rgba(100,116,139,0.12)', label: '#64748b' }
};

let jobs = [];
let expandedId = null;
let activeTab = 'fabrication';

async function fetchJobs() {
  try {
    const res = await fetch('/api/jobs');
    jobs = await res.json();
    render();
  } catch (e) {
    console.error('Failed to fetch jobs:', e);
  }
}

async function updateJob(id, data) {
  try {
    await fetch(`/api/jobs/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    await fetchJobs();
  } catch (e) {
    console.error('Failed to update job:', e);
  }
}

function groupByState(stageJobs) {
  const groups = {};
  stageJobs.forEach(j => {
    const st = j.state && STATE_ORDER.includes(j.state.toUpperCase()) ? j.state.toUpperCase() : 'OTHER';
    if (!groups[st]) groups[st] = [];
    groups[st].push(j);
  });
  const sorted = {};
  [...STATE_ORDER, 'OTHER'].forEach(s => {
    if (groups[s]) sorted[s] = groups[s];
  });
  return sorted;
}

function nextStage(stage) {
  const i = STAGES.indexOf(stage);
  return i < STAGES.length - 1 ? STAGES[i + 1] : null;
}

function prevStage(stage) {
  const i = STAGES.indexOf(stage);
  return i > 0 ? STAGES[i - 1] : null;
}

function esc(s) {
  if (!s) return '';
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function getStateColor(state) {
  const st = state && STATE_ORDER.includes(state.toUpperCase()) ? state.toUpperCase() : 'OTHER';
  return STATE_COLORS[st] || STATE_COLORS['OTHER'];
}

function renderCard(job) {
  const isExpanded = expandedId === job.id;
  const next = nextStage(job.stage);
  const prev = prevStage(job.stage);
  const color = getStateColor(job.state);

  return `
    <div class="card ${isExpanded ? 'expanded' : ''}" data-id="${job.id}" style="border-left: 3px solid ${color.border}; background: ${color.bg};">
      <div class="card-top" onclick="toggleExpand(${job.id})">
        <div>
          <div class="card-customer">${esc(job.customer)}</div>
          <div class="card-product">${esc(job.product)}</div>
          <div class="card-meta">
            <span class="card-qty">${esc(job.state || '')}</span>
            <span class="card-qty">×${job.quantity}</span>
            ${job.order_ref ? `<span>${esc(job.order_ref)}</span>` : ''}
          </div>
        </div>
      </div>
      ${job.notes ? `<div class="card-notes">${esc(job.notes)}</div>` : ''}
      <div class="card-actions">
        ${prev ? `<button class="btn btn-prev" onclick="event.stopPropagation(); moveJob(${job.id}, '${prev}')">◀ ${STAGE_LABELS[prev]}</button>` : ''}
        ${next ? `<button class="btn btn-next" onclick="event.stopPropagation(); moveJob(${job.id}, '${next}')">${STAGE_LABELS[next]} ▶</button>` : ''}
      </div>
    </div>
  `;
}

function toggleExpand(id) {
  expandedId = expandedId === id ? null : id;
  render();
}

function moveJob(id, newStage) {
  expandedId = null;
  updateJob(id, { stage: newStage });
}

function render() {
  const statsEl = document.getElementById('stats');
  const fabCount = jobs.filter(j => j.stage === 'fabrication').length;
  const readyCount = jobs.filter(j => j.stage === 'ready').length;
  const dispCount = jobs.filter(j => j.stage === 'dispatched').length;
  statsEl.innerHTML = `
    <div class="stat stat-fab"><div class="stat-num">${fabCount}</div><div class="stat-label">Build</div></div>
    <div class="stat stat-ready"><div class="stat-num">${readyCount}</div><div class="stat-label">Ready</div></div>
    <div class="stat stat-disp"><div class="stat-num">${dispCount}</div><div class="stat-label">Sent</div></div>
  `;

  const tabsEl = document.getElementById('tabs');
  tabsEl.innerHTML = STAGES.map(s =>
    `<div class="tab ${activeTab === s ? 'active-' + s : ''}" onclick="setTab('${s}')">${STAGE_LABELS[s]} (${jobs.filter(j => j.stage === s).length})</div>`
  ).join('');

  const boardEl = document.getElementById('board');
  boardEl.innerHTML = STAGES.map(stage => {
    const stageJobs = jobs.filter(j => j.stage === stage);
    const groups = groupByState(stageJobs);
    let cardsHtml = '';
    for (const [state, stateJobs] of Object.entries(groups)) {
      const stColor = STATE_COLORS[state] || STATE_COLORS['OTHER'];
      cardsHtml += `<div class="state-group"><div class="state-label" style="color: ${stColor.label};">● ${state}</div>${stateJobs.map(renderCard).join('')}</div>`;
    }
    if (stageJobs.length === 0) cardsHtml = '<div style="text-align:center;color:#475569;padding:40px;font-size:14px;">No jobs</div>';
    return `
      <div class="column col-${stage} ${activeTab === stage ? 'active' : ''}">
        <div class="column-header">${STAGE_LABELS[stage]} (${stageJobs.length})</div>
        <div class="column-body">${cardsHtml}</div>
      </div>
    `;
  }).join('');
}

function setTab(stage) {
  activeTab = stage;
  render();
}

fetchJobs();
setInterval(fetchJobs, 30000);
