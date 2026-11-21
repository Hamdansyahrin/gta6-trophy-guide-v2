const byId = id => document.getElementById(id);
const grades = ['platinum', 'gold', 'silver', 'bronze'];
const titleCase = value => value[0].toUpperCase() + value.slice(1);
const params = new URLSearchParams(location.search);
const storageKey = 'vice-afterglow-v1';
const list = byId('trophies');
const detail = byId('detail');
let trophies;
let earned = new Set();
let current;
let grade = grades.includes(params.get('grade')) ? params.get('grade') : 'all';

function save() {
  try {
    localStorage.setItem(storageKey, JSON.stringify({ earned: [...earned], spoilers: byId('spoilers').checked }));
  } catch {
    byId('earned').dataset.storage = 'unavailable';
  }
}

function presentation(trophy) {
  const masked = byId('spoilers').checked && trophy.hidden && !earned.has(trophy.id);
  return {
    masked,
    name: masked ? 'Hidden trophy' : trophy.name,
    description: masked ? 'Details are hidden by your spoiler setting.' : trophy.description,
  };
}

function renderProgress() {
  const percent = Math.round(100 * earned.size / trophies.length);
  byId('dial').style.setProperty('--fill', percent + '%');
  byId('percent').textContent = percent + '%';
  const count = document.createElement('strong');
  count.textContent = earned.size;
  const localNotice = byId('earned').dataset.storage ? ' · session only' : '';
  byId('earned').replaceChildren(count, ' / ' + trophies.length + ' earned' + localNotice);
  byId('grade-progress').innerHTML = grades.map(metal => {
    const group = trophies.filter(t => t.grade === metal);
    const value = group.filter(t => earned.has(t.id)).length;
    return `<div class="grade-meter ${metal}"><label for="meter-${metal}">${titleCase(metal)} <span>${value}/${group.length}</span></label><progress id="meter-${metal}" value="${value}" max="${group.length}"></progress></div>`;
  }).join('');
}

function makeRow(trophy) {
  const { masked, name, description } = presentation(trophy);
  const row = document.createElement('article');
  row.className = 'trophy ' + trophy.grade;
  row.dataset.id = trophy.id;
  row.innerHTML = `
    <div class="badge"><svg aria-hidden="true"><use href="#${masked ? 'lock' : 'cup'}"/></svg></div>
    <button class="open-guide" type="button" aria-haspopup="dialog">
      <span class="tagline"></span><strong></strong><span class="row-description"></span>
    </button>
    <div class="row-actions"><input type="checkbox"><span aria-hidden="true">›</span></div>`;
  row.querySelector('.tagline').textContent = titleCase(trophy.grade)
    + (masked ? ' / Secret' : ' / ' + titleCase(trophy.kind))
    + (trophy.missable && !masked ? ' / ⚠ Missable' : '');
  row.querySelector('strong').textContent = name;
  row.querySelector('.row-description').textContent = description;
  row.querySelector('button').addEventListener('click', () => openGuide(trophy));
  const checkbox = row.querySelector('input');
  checkbox.setAttribute('aria-label', 'Earned: ' + name + (masked ? ' ' + trophy.id : ''));
  checkbox.checked = earned.has(trophy.id);
  checkbox.addEventListener('change', () => {
    setEarned(trophy, checkbox.checked);
    (list.querySelector(`[data-id="${trophy.id}"] input`) || byId('status')).focus({ preventScroll: true });
  });
  return row;
}

function renderList() {
  const kind = byId('kind').value;
  const status = byId('status').value;
  const query = byId('query').value.trim().toLowerCase();
  const visible = trophies.filter(t => {
    const { masked, name, description } = presentation(t);
    return (grade === 'all' || t.grade === grade)
      && (kind === 'all' || (!masked && t.kind === kind))
      && (status === 'all' || earned.has(t.id) === (status === 'earned'))
      && (!query || (name + ' ' + description).toLowerCase().includes(query));
  });
  byId('result-count').textContent = visible.length + ' / ' + trophies.length + ' TROPHIES';
  if (visible.length) {
    list.replaceChildren(...visible.map(makeRow));
  } else {
    const empty = document.createElement('p');
    empty.className = 'empty';
    empty.textContent = 'No trophies match. Try clearing your search or changing the filters.';
    list.replaceChildren(empty);
  }
}

function setEarned(trophy, checked) {
  if (checked) earned.add(trophy.id);
  else earned.delete(trophy.id);
  save();
  renderProgress();
  renderList();
  if (detail.open) updateGuide();
}

function updateGuide() {
  const { masked, name, description } = presentation(current);
  byId('detail-meta').textContent = titleCase(current.grade) + ' / ' + (masked ? 'Secret' : titleCase(current.kind));
  byId('detail-title').textContent = name;
  byId('detail-description').textContent = description;
  byId('warning').hidden = masked || !current.missable;
  byId('detail-guide').textContent = masked
    ? 'Mark this trophy earned or turn off Hide spoilers to see its guide.'
    : current.guide;
  byId('detail-toggle').textContent = earned.has(current.id) ? 'Mark unearned' : 'Mark earned';
}

function openGuide(trophy) {
  current = trophy;
  updateGuide();
  detail.showModal();
}

function loadProgress() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (Array.isArray(saved?.earned)) {
      const ids = new Set(trophies.map(t => t.id));
      earned = new Set(saved.earned.filter(id => ids.has(id)));
    }
    if (typeof saved?.spoilers === 'boolean') byId('spoilers').checked = saved.spoilers;
  } catch {
    // The tracker still works in memory if storage is blocked or malformed.
  }
}

async function start() {
  const response = await fetch('./data/trophies.json');
  if (!response.ok) throw new Error('Unexpected response ' + response.status);
  const data = await response.json();
  trophies = [...data.trophies].sort((a, b) => Number(a.hidden) - Number(b.hidden) || a.id - b.id);
  loadProgress();
  const tabs = byId('grades');
  for (const value of ['all', ...grades]) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = value;
    button.textContent = titleCase(value);
    button.setAttribute('aria-pressed', String(value === grade));
    button.addEventListener('click', () => {
      grade = value;
      for (const tab of tabs.children) tab.setAttribute('aria-pressed', String(tab === button));
      renderList();
    });
    tabs.append(button);
  }
  byId('query').addEventListener('input', renderList);
  for (const id of ['kind', 'status']) byId(id).addEventListener('change', renderList);
  byId('spoilers').addEventListener('change', () => {
    save();
    renderProgress();
    renderList();
  });
  byId('export-progress').addEventListener('click', () => {
    const backup = {
      app: 'Vice Afterglow',
      version: 1,
      exportedAt: new Date().toISOString(),
      earned: [...earned],
      spoilers: byId('spoilers').checked,
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'vice-afterglow-progress.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    byId('backup-status').textContent = 'Progress exported.';
    document.querySelector('.backup').open = false;
  });
  byId('import-progress').addEventListener('click', () => byId('import-file').click());
  byId('import-file').addEventListener('change', async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const backup = JSON.parse(await file.text());
      if (backup?.version !== 1 || !Array.isArray(backup.earned)) throw new Error('unrecognized backup');
      const validIds = new Set(trophies.map(t => t.id));
      for (const id of backup.earned) if (validIds.has(id)) earned.add(id);
      if (typeof backup.spoilers === 'boolean') byId('spoilers').checked = backup.spoilers;
      save();
      renderProgress();
      renderList();
      byId('backup-status').textContent = 'Imported progress and merged earned trophies.';
    } catch {
      byId('backup-status').textContent = 'That file is not a valid Vice Afterglow progress backup.';
    } finally {
      event.target.value = '';
      document.querySelector('.backup').open = false;
    }
  });
  byId('checkpoint').addEventListener('click', () => openGuide(trophies.find(t => t.missable)));
  byId('detail-toggle').addEventListener('click', () => setEarned(current, !earned.has(current.id)));
  renderProgress();
  renderList();
  const scroll = Number(params.get('scroll'));
  if (Number.isFinite(scroll) && scroll > 0) {
    history.scrollRestoration = 'manual';
    requestAnimationFrame(() => window.scrollTo(0, scroll));
  }
}

start().catch(() => {
  list.textContent = 'The trophy list could not load. Open the guide through the local server and refresh.';
});
