let data = null;
let editing = false;
let dirty = false;

const STATUS_COLORS = {
  completed: '#2FA84F',
  inprogress: '#2440D0',
  waiting: '#F0A93B',
  upcoming: '#9a9a9a'
};
const STATUS_LABELS = {
  completed: 'COMPLETED',
  inprogress: 'IN PROGRESS',
  waiting: 'WAITING ON CLIENT',
  upcoming: 'UPCOMING'
};

const CLIENT_VIEW = document.body.dataset.view === 'client';

const app = document.getElementById('app');
const editBtn = document.getElementById('editBtn');
const saveBtn = document.getElementById('saveBtn');
const resetBtn = document.getElementById('resetBtn');
const saveStatus = document.getElementById('saveStatus');
const copyLinkBtn = document.getElementById('copyLinkBtn');

init();

async function init() {
  const res = await fetch('/api/data');
  data = await res.json();
  render();
}

if (CLIENT_VIEW) editing = false; // read-only view never enters edit mode

editBtn?.addEventListener('click', () => {
  editing = true;
  editBtn.style.display = 'none';
  saveBtn.style.display = 'inline-block';
  render();
});

saveBtn?.addEventListener('click', async () => {
  saveStatus.textContent = 'Saving…';
  const res = await fetch('/api/data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (res.ok) {
    saveStatus.textContent = 'Saved.';
    dirty = false;
    editing = false;
    editBtn.style.display = 'inline-block';
    saveBtn.style.display = 'none';
    render();
    setTimeout(() => (saveStatus.textContent = ''), 2500);
  } else {
    saveStatus.textContent = 'Failed to save.';
  }
});

resetBtn?.addEventListener('click', async () => {
  if (!confirm('Reset the dashboard back to its original content? This discards any edits.')) return;
  const res = await fetch('/api/reset', { method: 'POST' });
  const json = await res.json();
  data = json.data;
  editing = false;
  editBtn.style.display = 'inline-block';
  saveBtn.style.display = 'none';
  render();
});

copyLinkBtn?.addEventListener('click', async () => {
  const clientUrl = location.origin + '/client';
  try {
    await navigator.clipboard.writeText(clientUrl);
    saveStatus.textContent = 'Client link copied: ' + clientUrl;
  } catch {
    saveStatus.textContent = 'Client link: ' + clientUrl;
  }
  setTimeout(() => (saveStatus.textContent = ''), 5000);
});

function markDirty() { dirty = true; }

/* ---------- small DOM helpers ---------- */
function el(tag, className, text) {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text !== undefined) e.textContent = text;
  return e;
}
function editableInput(value, onChange, tag = 'input') {
  const i = document.createElement(tag);
  i.className = 'editable';
  if (tag === 'input') i.type = 'text';
  i.value = value || '';
  i.addEventListener('input', () => { onChange(i.value); markDirty(); });
  return i;
}
function selectStatus(value, onChange) {
  const s = document.createElement('select');
  s.className = 'editable';
  ['waiting', 'inprogress', 'completed', 'upcoming'].forEach(st => {
    const o = document.createElement('option');
    o.value = st; o.textContent = STATUS_LABELS[st];
    if (st === value) o.selected = true;
    s.appendChild(o);
  });
  s.addEventListener('change', () => { onChange(s.value); markDirty(); render(); });
  return s;
}
function smallBtn(label, onClick, danger) {
  const b = document.createElement('button');
  b.className = 'small-btn' + (danger ? ' danger' : '');
  b.textContent = label;
  b.addEventListener('click', onClick);
  return b;
}

/* ---------- master render ---------- */
function render() {
  app.innerHTML = '';
  app.appendChild(renderHeader());
  app.appendChild(renderCardsRow());
  app.appendChild(renderTimeline());
  data.packageDetails.forEach((pkg, idx) => app.appendChild(renderPackageSection(pkg, idx)));
}

/* ---------- header ---------- */
function renderHeader() {
  const header = el('div', 'header');

  const left = el('div');
  left.appendChild(el('h1', null, 'PROJECT DASHBOARD'));
  header.appendChild(left);

  const mid = el('div', 'meta-block');
  if (editing) {
    const l1 = document.createElement('div');
    l1.append('PROJECT NAME: ');
    l1.appendChild(editableInput(data.meta.projectName, v => data.meta.projectName = v));
    const l2 = document.createElement('div');
    l2.append('LAST UPDATED: ');
    l2.appendChild(editableInput(data.meta.lastUpdated, v => data.meta.lastUpdated = v));
    mid.appendChild(l1); mid.appendChild(l2);
  } else {
    mid.innerHTML = `<div class="proj-name">PROJECT NAME: ${esc(data.meta.projectName)}</div><div>LAST UPDATED: ${esc(data.meta.lastUpdated)}</div>`;
  }
  header.appendChild(mid);

  const right = el('div', 'studio-block');
  if (editing) {
    right.appendChild(editableInput(data.meta.studioName, v => data.meta.studioName = v));
    right.appendChild(editableInput(data.meta.studioEmail, v => data.meta.studioEmail = v));
  } else {
    right.innerHTML = `<div>${esc(data.meta.studioName)}</div><div>${esc(data.meta.studioEmail)}</div>`;
  }
  header.appendChild(right);

  return header;
}

/* ---------- cards row ---------- */
function renderCardsRow() {
  const row = el('div', 'cards-row');
  row.appendChild(renderStatusCard());
  row.appendChild(renderPhasesCard());
  row.appendChild(renderGlanceCard());
  row.appendChild(renderThisWeekCard());
  row.appendChild(renderWaitingCard());
  return row;
}

function renderStatusCard() {
  const c = el('div', 'card');
  c.appendChild(el('h3', null, 'PROJECT STATUS'));
  c.appendChild(el('div', 'label', 'CURRENT PHASE:'));
  if (editing) {
    c.appendChild(editableInput(data.status.currentPhase, v => data.status.currentPhase = v));
  } else {
    c.appendChild(el('div', 'value', data.status.currentPhase));
  }

  c.appendChild(el('div', 'label', 'PROJECT PROGRESS'));
  const pr = el('div', 'big-progress');
  if (editing) {
    const num = document.createElement('input');
    num.type = 'number'; num.min = 0; num.max = 100; num.className = 'editable';
    num.style.width = '70px';
    num.value = data.status.progress;
    num.addEventListener('input', () => { data.status.progress = Number(num.value); markDirty(); track.style.width = num.value + '%'; pctLabel.textContent = num.value + '%'; });
    const pctLabel = document.createElement('span');
    pctLabel.textContent = data.status.progress + '%';
    const trackWrap = el('div', 'progress-track');
    const track = el('div', 'progress-fill');
    track.style.width = data.status.progress + '%';
    trackWrap.appendChild(track);
    pr.appendChild(num); pr.appendChild(trackWrap);
  } else {
    const trackWrap = el('div', 'progress-track');
    const track = el('div', 'progress-fill');
    track.style.width = data.status.progress + '%';
    trackWrap.appendChild(track);
    pr.append(data.status.progress + '%');
    pr.appendChild(trackWrap);
  }
  c.appendChild(pr);

  const dateRow = el('div', 'date-row');
  const startCol = el('div');
  startCol.appendChild(el('div', 'label', 'START DATE'));
  const endCol = el('div');
  endCol.appendChild(el('div', 'label', 'TARGET END DATE'));
  if (editing) {
    startCol.appendChild(editableInput(data.status.startDate, v => data.status.startDate = v));
    endCol.appendChild(editableInput(data.status.targetEndDate, v => data.status.targetEndDate = v));
  } else {
    startCol.appendChild(el('div', 'value', data.status.startDate));
    endCol.appendChild(el('div', 'value', data.status.targetEndDate));
  }
  dateRow.appendChild(startCol); dateRow.appendChild(endCol);
  c.appendChild(dateRow);
  return c;
}

function renderPhasesCard() {
  const c = el('div', 'card');
  c.appendChild(el('h3', null, 'PHASES'));
  const list = el('ul', 'phase-list');
  data.phases.forEach((ph, i) => {
    const li = document.createElement('li');
    const dot = el('span', 'status-dot status-' + ph.status, ph.status === 'completed' ? '✓' : '');
    li.appendChild(dot);
    if (editing) {
      li.appendChild(el('span', null, (i + 1) + '.'));
      li.appendChild(editableInput(ph.name, v => ph.name = v));
      li.appendChild(selectStatus(ph.status, v => ph.status = v));
      li.appendChild(smallBtn('✕', () => { data.phases.splice(i, 1); markDirty(); render(); }, true));
    } else {
      li.appendChild(document.createTextNode((i + 1) + '. ' + ph.name));
    }
    list.appendChild(li);
  });
  c.appendChild(list);
  if (editing) {
    const addBtn = smallBtn('+ Add phase', () => {
      data.phases.push({ id: Date.now(), name: 'New phase', status: 'upcoming' });
      markDirty(); render();
    });
    addBtn.classList.add('add-row-btn');
    c.appendChild(addBtn);
  }
  return c;
}

function renderGlanceCard() {
  const c = el('div', 'card');
  c.appendChild(el('h3', null, 'AT A GLANCE'));
  const counts = { completed: 0, inprogress: 0, waiting: 0, upcoming: 0 };
  data.phases.forEach(p => counts[p.status] = (counts[p.status] || 0) + 1);
  ['completed', 'inprogress', 'waiting', 'upcoming'].forEach(st => {
    const row = el('div', 'glance-row');
    const badge = el('span', 'glance-count', String(counts[st]));
    badge.style.background = STATUS_COLORS[st];
    row.appendChild(badge);
    row.appendChild(el('span', null, STATUS_LABELS[st]));
    c.appendChild(row);
  });
  const note = el('div', 'label', 'Counts are calculated automatically from the Phases list.');
  note.style.marginTop = '8px';
  note.style.fontStyle = 'italic';
  c.appendChild(note);
  return c;
}

function renderThisWeekCard() {
  const c = el('div', 'card');
  c.appendChild(el('h3', null, 'THIS WEEK'));
  if (editing) {
    c.appendChild(editableInput(data.thisWeek.dateRange, v => data.thisWeek.dateRange = v));
  } else {
    c.appendChild(el('div', 'this-week-range', data.thisWeek.dateRange));
  }

  c.appendChild(renderStringList(data.thisWeek.tasks, 'Tasks', editing));

  c.appendChild(el('div', 'mini-heading', 'UPCOMING MILESTONE'));
  c.appendChild(renderStringList(data.thisWeek.upcomingMilestones, 'Milestones', editing, true));
  return c;
}

function renderWaitingCard() {
  const c = el('div', 'card');
  c.appendChild(el('h3', null, 'WAITING ON CLIENT'));
  c.appendChild(renderStringList(data.waitingOnClient, 'Item', editing, false, true));
  return c;
}

/* generic editable string list (bullets) */
function renderStringList(arr, label, isEditing, milestoneStyle, waitingStyle) {
  const wrap = document.createElement('div');
  if (!isEditing) {
    const ul = el('ul', milestoneStyle ? 'milestone-list' : (waitingStyle ? 'waiting-list' : 'mini-list'));
    arr.forEach(t => { const li = document.createElement('li'); li.textContent = t; ul.appendChild(li); });
    wrap.appendChild(ul);
    return wrap;
  }
  arr.forEach((t, i) => {
    const row = document.createElement('div');
    row.style.display = 'flex'; row.style.gap = '6px'; row.style.marginBottom = '4px';
    const inp = editableInput(t, v => arr[i] = v);
    row.appendChild(inp);
    row.appendChild(smallBtn('✕', () => { arr.splice(i, 1); markDirty(); render(); }, true));
    wrap.appendChild(row);
  });
  const addBtn = smallBtn('+ Add ' + label.toLowerCase(), () => { arr.push(''); markDirty(); render(); });
  addBtn.classList.add('add-row-btn');
  wrap.appendChild(addBtn);
  return wrap;
}

/* ---------- timeline / gantt ---------- */
function totalWeeks() {
  return data.timelineMonths.reduce((a, m) => a + m.weeks, 0);
}

const NAME_COL_W = 170;
const WEEK_COL_W = 30;

function renderTimeline() {
  const wrap = el('div', 'timeline-wrap');

  const titleRow = el('div', 'timeline-title');
  titleRow.appendChild(document.createTextNode('MASTER TIMELINE'));
  const cwField = el('div', 'current-week-field');
  cwField.appendChild(document.createTextNode('Current week:'));
  if (editing) {
    cwField.appendChild(numberInput(data.currentWeek, 1, totalWeeks(), v => { data.currentWeek = v; }));
  } else {
    const badge = el('span', null, 'W' + data.currentWeek);
    badge.style.color = 'var(--red)'; badge.style.fontWeight = '800';
    cwField.appendChild(badge);
  }
  titleRow.appendChild(cwField);
  wrap.appendChild(titleRow);

  const nWeeks = totalWeeks();
  const tableContainer = el('div', 'timeline-table-container');
  const table = document.createElement('table');
  table.className = 'gantt';
  table.style.width = (NAME_COL_W + nWeeks * WEEK_COL_W) + 'px';

  const colgroup = document.createElement('colgroup');
  const nameCol = document.createElement('col'); nameCol.style.width = NAME_COL_W + 'px';
  colgroup.appendChild(nameCol);
  for (let w = 1; w <= nWeeks; w++) {
    const c = document.createElement('col'); c.style.width = WEEK_COL_W + 'px';
    colgroup.appendChild(c);
  }
  table.appendChild(colgroup);

  const monthRow = document.createElement('tr');
  monthRow.appendChild(el('th', null, 'PACKAGES'));
  data.timelineMonths.forEach(m => {
    const th = el('th', 'month-head', m.label);
    th.colSpan = m.weeks;
    monthRow.appendChild(th);
  });
  table.appendChild(monthRow);

  const weekRow = document.createElement('tr');
  weekRow.appendChild(el('td', 'pkg-name', ''));
  for (let w = 1; w <= nWeeks; w++) {
    const td = el('td', 'week-head' + (w === data.currentWeek ? ' current-week' : ''), 'W' + w);
    weekRow.appendChild(td);
  }
  table.appendChild(weekRow);

  data.timelinePackages.forEach((pkg, idx) => {
    const tr = document.createElement('tr');
    const nameCell = el('td', 'pkg-name');
    if (editing) {
      nameCell.appendChild(editableInput(pkg.name, v => pkg.name = v));
      const ctrl = document.createElement('div');
      ctrl.style.display = 'flex'; ctrl.style.gap = '4px'; ctrl.style.marginTop = '4px';
      const startSel = numberInput(pkg.startWeek, 1, nWeeks, v => pkg.startWeek = v);
      const endSel = numberInput(pkg.endWeek, 1, nWeeks, v => pkg.endWeek = v);
      ctrl.appendChild(startSel); ctrl.appendChild(el('span', null, 'to')); ctrl.appendChild(endSel);
      nameCell.appendChild(ctrl);
      nameCell.appendChild(selectStatus(pkg.status, v => pkg.status = v));
      nameCell.appendChild(smallBtn('✕ remove', () => { data.timelinePackages.splice(idx, 1); markDirty(); render(); }, true));
    } else {
      nameCell.textContent = pkg.name;
    }
    tr.appendChild(nameCell);

    const barTd = document.createElement('td');
    barTd.className = 'bar-cell';
    barTd.colSpan = nWeeks;
    barTd.style.position = 'relative';
    const bar = el('div', 'bar');
    const pct = 100 / nWeeks;
    bar.style.left = ((pkg.startWeek - 1) * pct) + '%';
    bar.style.width = ((pkg.endWeek - pkg.startWeek + 1) * pct) + '%';
    bar.style.background = STATUS_COLORS[pkg.status] || '#999';
    barTd.appendChild(bar);
    tr.appendChild(barTd);

    table.appendChild(tr);
  });

  tableContainer.appendChild(table);

  if (data.currentWeek >= 1 && data.currentWeek <= nWeeks) {
    const stripeLeft = NAME_COL_W + (data.currentWeek - 1) * WEEK_COL_W;
    const stripe = el('div', 'current-week-stripe');
    stripe.style.left = stripeLeft + 'px';
    stripe.style.width = WEEK_COL_W + 'px';
    const dashed = el('div', 'current-week-dashed');
    dashed.style.left = (stripeLeft + WEEK_COL_W / 2) + 'px';
    tableContainer.appendChild(stripe);
    tableContainer.appendChild(dashed);
  }

  wrap.appendChild(tableContainer);

  if (editing) {
    const addBtn = smallBtn('+ Add timeline row', () => {
      data.timelinePackages.push({ id: Date.now(), name: 'New package', startWeek: 1, endWeek: 2, status: 'upcoming' });
      markDirty(); render();
    });
    addBtn.classList.add('add-row-btn');
    wrap.appendChild(addBtn);
  }

  const legend = el('div', 'legend');
  ['completed', 'inprogress', 'waiting', 'upcoming'].forEach(st => {
    const item = el('div', 'legend-item');
    const sw = el('span', 'legend-swatch');
    sw.style.background = STATUS_COLORS[st];
    item.appendChild(sw);
    item.appendChild(el('span', null, STATUS_LABELS[st]));
    legend.appendChild(item);
  });
  wrap.appendChild(legend);

  return wrap;
}

function numberInput(value, min, max, onChange) {
  const i = document.createElement('input');
  i.type = 'number'; i.className = 'editable'; i.style.width = '55px';
  i.min = min; i.max = max; i.value = value;
  i.addEventListener('input', () => { onChange(Number(i.value)); markDirty(); });
  return i;
}

/* ---------- package detail sections ---------- */
function renderPackageSection(pkg, idx) {
  const sec = el('div', 'pkg-section');
  const heading = document.createElement('h2');
  if (editing) {
    const codeInp = editableInput(pkg.code, v => pkg.code = v);
    codeInp.style.width = '50px'; codeInp.style.display = 'inline-block';
    const titleInp = editableInput(pkg.title, v => pkg.title = v);
    titleInp.style.width = '60%'; titleInp.style.display = 'inline-block';
    heading.appendChild(codeInp);
    heading.append(' ');
    heading.appendChild(titleInp);
    heading.appendChild(smallBtn('✕ remove section', () => { data.packageDetails.splice(idx, 1); markDirty(); render(); }, true));
  } else {
    heading.textContent = pkg.code + ' ' + pkg.title;
  }
  sec.appendChild(heading);

  const table = document.createElement('table');
  table.className = 'pkg-table';
  const thead = document.createElement('tr');
  ['WEEK', 'OUR WORK', 'CLIENT NEEDS TO PROVIDE', 'MILESTONE/REVIEW', editing ? '' : null].filter(x => x !== null).forEach(h => {
    thead.appendChild(el('th', null, h));
  });
  table.appendChild(thead);

  pkg.rows.forEach((row, rIdx) => {
    const tr = document.createElement('tr');
    if (row.week === ('W' + data.currentWeek)) tr.classList.add('current-week-row');
    if (editing) {
      const weekTd = document.createElement('td'); weekTd.className = 'week-col';
      weekTd.appendChild(editableInput(row.week, v => row.week = v));
      const workTd = document.createElement('td');
      workTd.appendChild(editableInput(row.ourWork, v => row.ourWork = v, 'textarea'));
      const clientTd = document.createElement('td');
      clientTd.appendChild(editableInput(row.clientProvides, v => row.clientProvides = v, 'textarea'));
      const msTd = document.createElement('td');
      msTd.appendChild(editableInput(row.milestone, v => row.milestone = v, 'textarea'));
      const actionsTd = document.createElement('td');
      actionsTd.appendChild(smallBtn('✕', () => { pkg.rows.splice(rIdx, 1); markDirty(); render(); }, true));
      tr.append(weekTd, workTd, clientTd, msTd, actionsTd);
    } else {
      const weekTd = el('td', 'week-col', row.week);
      const workTd = el('td', null, row.ourWork);
      const clientTd = el('td', null, row.clientProvides);
      const msTd = el('td', null, row.milestone);
      tr.append(weekTd, workTd, clientTd, msTd);
    }
    table.appendChild(tr);
  });

  sec.appendChild(table);

  if (editing) {
    const addBtn = smallBtn('+ Add week row', () => {
      pkg.rows.push({ week: 'W' + (pkg.rows.length + 1), ourWork: '', clientProvides: '', milestone: '' });
      markDirty(); render();
    });
    addBtn.classList.add('add-row-btn');
    sec.appendChild(addBtn);
  }

  return sec;
}

function esc(s) {
  const d = document.createElement('div');
  d.textContent = s == null ? '' : s;
  return d.innerHTML;
}
