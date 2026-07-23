const STAGES = ['fabrication', 'ready', 'dispatched'];
const STAGE_LABELS = { fabrication: 'Fabrication', ready: 'Ready to Ship', dispatched: 'Dispatched' };
const STAGE_COLORS = { fabrication: '#f59e0b', ready: '#22c55e', dispatched: '#3b82f6' };

const STATE_COLORS = {
  'NSW': { bg: 'rgba(59,130,246,0.12)', border: '#3b82f6', text: '#60a5fa', dot: '#3b82f6' },
  'QLD': { bg: 'rgba(239,68,68,0.12)',  border: '#ef4444', text: '#f87171', dot: '#ef4444' },
  'WA':  { bg: 'rgba(34,197,94,0.12)',  border: '#22c55e', text: '#4ade80', dot: '#22c55e' },
  'VIC': { bg: 'rgba(168,85,247,0.12)', border: '#a855f7', text: '#c084fc', dot: '#a855f7' },
  'SA':  { bg: 'rgba(245,158,11,0.12)', border: '#f59e0b', text: '#fbbf24', dot: '#f59e0b' },
  'NT':  { bg: 'rgba(236,72,153,0.12)', border: '#ec4899', text: '#f472b6', dot: '#ec4899' },
  'TAS': { bg: 'rgba(20,184,166,0.12)', border: '#14b8a6', text: '#2dd4bf', dot: '#14b8a6' },
  'ACT': { bg: 'rgba(99,102,241,0.12)', border: '#6366f1', text: '#818cf8', dot: '#6366f1' },
};
const DEFAULT_STATE_COLOR = { bg: 'rgba(100,116,139,0.12)', border: '#64748b', text: '#94a3b8', dot: '#64748b' };

let allJobs = [];
let activeTab = 'fabrication';
let expandedId = null;

// Drag state
let draggedCard = null;
let draggedJobId = null;
let dragPlaceholder = null;

async function fetchJobs() {
  const res = await fetch('/api/jobs');
  allJobs = await res.json();
  render();
}

function getStateColor(state) {
  return STATE_COLORS[state?.toUpperCase()] || DEFAULT_STATE_COLOR;
}

function groupByState(jobs) {
  const groups = {};
  jobs.forEach(j => {
    const st = (j.state || 'OTHER').toUpperCase();
    if (!groups[st]) groups[st] = [];
    groups[st].push(j);
  });
  // Sort: NSW first, then QLD, WA, VIC, SA, NT, TAS, ACT, OTHER
  const order = ['NSW', 'QLD', 'WA', 'VIC', 'SA', 'NT', 'TAS', 'ACT', 'OTHER'];
  const sorted = {};
  order.forEach(s => { if (groups[s]) sorted[s] = groups[s]; });
  Object.keys(groups).forEach(s => { if (!sorted[s]) sorted[s] = groups[s]; });
  return sorted;
}

function render() {
  const board = document.getElementById('board');
  const stats = document.getElementById('stats');
  const tabs = document.getElementById('tabs');

  const bySt = {};
  STAGES.forEach(s => bySt[s] = allJobs.filter(j => j.stage === s));

  // Stats
  stats.innerHTML = `
    <div class="stat stat-fab"><div class="stat-num">${bySt.fabrication.length}</div><div class="stat-label">Build</div></div>
    <div class="stat stat-ready"><div class="stat-num">${bySt.ready.length}</div><div class="stat-label">Ready</div></div>
    <div class="stat stat-disp"><div class="stat-num">${bySt.dispatched.length}</div><div class="stat-label">Sent</div></div>
  `;

  // Tabs
  tabs.innerHTML = STAGES.map(s =>
    `<div class="tab ${activeTab === s ? 'active-' + s : ''}" onclick="switchTab('${s}')">${STAGE_LABELS[s]} (${bySt[s].length})</div>`
  ).join('');

  // Columns
  board.innerHTML = STAGES.map(stage => {
    const jobs = bySt[stage];
    const groups = groupByState(jobs);
    let cardsHtml = '';

    Object.entries(groups).forEach(([state, stJobs]) => {
      const sc = getStateColor(state);
      cardsHtml += `<div class="state-label"><span style="color:${sc.dot}">● </span><span style="color:${sc.text}">${state}</span> <span style="color:#475569">(${stJobs.length})</span></div>`;
      cardsHtml += `<div class="state-group" data-state="${state}" data-stage="${stage}">`;
      stJobs.forEach(j => {
        const sc2 = getStateColor(j.state);
        const isExp = expandedId === j.id;
        const prevStage = STAGES[STAGES.indexOf(stage) - 1];
        const nextStage = STAGES[STAGES.indexOf(stage) + 1];
        const prevBtn = prevStage ? `<button class="btn btn-prev" onclick="event.stopPropagation();moveJob(${j.id},'${prevStage}')">◀ ${STAGE_LABELS[prevStage]}</button>` : '';
        const nextBtn = nextStage ? `<button class="btn btn-next" onclick="event.stopPropagation();moveJob(${j.id},'${nextStage}')"> ${STAGE_LABELS[nextStage]} ▶</button>` : '';
        const deleteBtn = stage === 'dispatched' ? `<button class="btn btn-delete" onclick="event.stopPropagation();removeJob(${j.id},'${j.customer}')" style="background:#ef4444;color:#fff;flex:0.5">✕ Remove</button>` : '';
        const noteHtml = j.notes ? `<div class="card-notes">${j.notes}</div>` : '';
        cardsHtml += `
          <div class="card ${isExp ? 'expanded' : ''}"
               draggable="true"
               data-job-id="${j.id}"
               data-stage="${stage}"
               style="background:${sc2.bg};border-left-color:${sc2.border}"
               onclick="toggleCard(${j.id})"
               ondragstart="onDragStart(event,${j.id})"
               ondragend="onDragEnd(event)"
               ondragover="onDragOver(event)"
               ondrop="onDrop(event,${j.id})">
            <div class="card-customer">${j.customer}</div>
            <div class="card-product">${j.product || ''}</div>
            <div class="card-meta">
              ${j.order_ref ? '<span>' + j.order_ref + '</span>' : ''}
              <span class="card-qty">${j.quantity || 1}x</span>
              <span class="card-state-badge" style="background:${sc2.border};color:#fff;font-size:10px;font-weight:700;padding:1px 5px;border-radius:3px;">${(j.state || '').toUpperCase()}</span>
            </div>
            ${noteHtml}
            <div class="card-actions">${prevBtn}${nextBtn}${deleteBtn}</div>
          </div>`;
      });
      cardsHtml += '</div>';
    });

    return `
      <div class="column col-${stage} ${activeTab === stage ? 'active' : ''}"
           data-stage="${stage}"
           ondragover="onColumnDragOver(event)"
           ondrop="onColumnDrop(event,'${stage}')">
        <div class="column-header">${STAGE_LABELS[stage]} (${jobs.length})</div>
        <div class="column-body">${cardsHtml}</div>
      </div>`;
  }).join('');
}

function switchTab(s) { activeTab = s; render(); }
function toggleCard(id) { expandedId = expandedId === id ? null : id; render(); }

async function moveJob(id, newStage) {
  await fetch(`/api/jobs/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stage: newStage })
  });
  const job = allJobs.find(j => j.id === id);
  if (job) job.stage = newStage;
  expandedId = null;
  render();
}

async function removeJob(id, customer) {
  if (!confirm(`Remove "${customer}" from Dispatched?`)) return;
  await fetch(`/api/jobs/${id}`, { method: 'DELETE' });
  allJobs = allJobs.filter(j => j.id !== id);
  expandedId = null;
  render();
}

// ── Drag & Drop (reorder within column) ──

function onDragStart(e, jobId) {
  draggedJobId = jobId;
  draggedCard = e.target;
  e.target.style.opacity = '0.4';
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', jobId);
}

function onDragEnd(e) {
  e.target.style.opacity = '1';
  draggedJobId = null;
  draggedCard = null;
  // Remove any leftover placeholders
  document.querySelectorAll('.drag-placeholder').forEach(el => el.remove());
}

function onDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';

  // Visual indicator
  const card = e.target.closest('.card');
  if (!card || !draggedCard || card === draggedCard) return;

  // Same stage only
  if (card.dataset.stage !== draggedCard.dataset.stage) return;

  const rect = card.getBoundingClientRect();
  const midY = rect.top + rect.height / 2;
  const parent = card.parentNode;

  // Remove old placeholder
  document.querySelectorAll('.drag-placeholder').forEach(el => el.remove());

  const placeholder = document.createElement('div');
  placeholder.className = 'drag-placeholder';
  placeholder.style.cssText = 'height:4px;background:#f59e0b;border-radius:2px;margin:4px 0;';

  if (e.clientY < midY) {
    parent.insertBefore(placeholder, card);
  } else {
    parent.insertBefore(placeholder, card.nextSibling);
  }
}

function onColumnDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
}

function onDrop(e, targetJobId) {
  e.preventDefault();
  document.querySelectorAll('.drag-placeholder').forEach(el => el.remove());

  if (!draggedJobId || draggedJobId === targetJobId) return;

  const draggedJob = allJobs.find(j => j.id === draggedJobId);
  const targetJob = allJobs.find(j => j.id === targetJobId);
  if (!draggedJob || !targetJob) return;

  // Only reorder within same stage and state
  if (draggedJob.stage !== targetJob.stage) return;

  const stage = draggedJob.stage;
  const stageJobs = allJobs.filter(j => j.stage === stage);

  // Get the card element to determine above/below
  const targetCard = document.querySelector(`.card[data-job-id="${targetJobId}"]`);
  const rect = targetCard?.getBoundingClientRect();
  const dropAbove = rect ? e.clientY < (rect.top + rect.height / 2) : true;

  // Remove dragged from list
  const filtered = stageJobs.filter(j => j.id !== draggedJobId);
  const targetIdx = filtered.findIndex(j => j.id === targetJobId);
  const insertIdx = dropAbove ? targetIdx : targetIdx + 1;
  filtered.splice(insertIdx, 0, draggedJob);

  // Update priorities
  const orders = filtered.map((j, i) => ({ id: j.id, priority: i }));
  orders.forEach(o => {
    const job = allJobs.find(j => j.id === o.id);
    if (job) job.priority = o.priority;
  });

  expandedId = null;
  render();

  // Persist
  fetch('/api/jobs/reorder', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orders })
  });
}

function onColumnDrop(e, stage) {
  e.preventDefault();
  document.querySelectorAll('.drag-placeholder').forEach(el => el.remove());
  // If dropped on empty area of column, handled by card drop
}

// Initial load
fetchJobs();
// Auto-refresh every 30s
setInterval(fetchJobs, 30000);
