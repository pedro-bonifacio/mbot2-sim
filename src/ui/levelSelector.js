import { listLevels, getLevelState, onLevelChange } from '../levels/session.js';
import { getStars } from '../levels/progress.js';
import { listFreeMaps, openFromSelector, getActiveMapName } from './mapSelector.js';
import { ptMessages as MSG } from '../i18n/pt.js';

// "★ Níveis": a dialog listing every level by world with its ★ / ★★, and the free
// maps. Every level can be opened, in any order (decision 0001: no locks).

const fmt = (s, ...a) => a.reduce((t, v, i) => t.replace(`%${i + 1}`, v), s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

let dialog = null;

export function initLevelSelector() {
  dialog = document.getElementById('level-selector');
  const btn = document.getElementById('btn-levels');
  if (!dialog || !btn) return;
  btn.textContent = MSG.LEVEL_SELECTOR_BUTTON;
  // Tab title names the open level, so several open tabs can be told apart.
  onLevelChange((st) => {
    document.title = st.level ? `${st.level.id} ${st.level.title} · ${MSG.APP_TITLE}` : MSG.APP_TITLE;
  });
  btn.addEventListener('click', openLevelSelector);
  dialog.addEventListener('click', async (e) => {
    if (e.target === dialog) return dialog.close();             // click on the backdrop
    const el = e.target.closest('[data-open], [data-close]');
    if (!el) return;
    if (el.dataset.close !== undefined) return dialog.close();
    const [kind, name] = [el.dataset.open.slice(0, el.dataset.open.indexOf(':')), el.dataset.open.slice(el.dataset.open.indexOf(':') + 1)];
    if (await openFromSelector(kind, name)) dialog.close();
  });
}

export function openLevelSelector() {
  if (!dialog) return;
  dialog.innerHTML = render();
  if (!dialog.open) dialog.showModal();
  dialog.querySelector('.current')?.scrollIntoView({ block: 'nearest' });
}

function render() {
  const active = getActiveMapName();
  const currentId = getLevelState().level?.id;
  const levels = listLevels();
  const byWorld = new Map();
  for (const l of levels) {
    if (!byWorld.has(l.world)) byWorld.set(l.world, []);
    byWorld.get(l.world).push(l);
  }
  const done = levels.filter((l) => getStars(l.id).one).length;

  const worlds = [...byWorld.keys()].sort((a, b) => a - b).map((w) => {
    const cards = byWorld.get(w).map((l) => {
      const st = getStars(l.id);
      const kind = MSG.LEVEL_KIND[l.kind] || '';
      const cls = ['level-card', l.id === currentId ? 'current' : '', st.one ? 'has-star' : '', l.kind ? `kind-${l.kind}` : ''].join(' ');
      return `<button class="${cls}" data-open="level:${esc(l.id)}" title="${esc(l.objective || '')}">
        <span class="card-id">${esc(l.id)}</span>
        <span class="card-stars" aria-label="${st.two ? '2' : st.one ? '1' : '0'} estrelas">${st.one ? '★' : '☆'}${st.two ? '★' : '☆'}</span>
        <span class="card-title">${esc(l.title)}</span>
        ${kind ? `<span class="card-kind">${esc(kind)}</span>` : ''}
      </button>`;
    }).join('');
    const title = MSG.WORLD_TITLES[w] || '';
    return `<section class="world"><h3>${esc(fmt(MSG.LEVEL_SELECTOR_WORLD, w, title))}</h3><div class="cards">${cards}</div></section>`;
  }).join('');

  const maps = listFreeMaps().map((m) => {
    const cur = active === `map:${m.name}` ? ' current' : '';
    return `<button class="map-chip${cur}" data-open="map:${esc(m.name)}">${esc(m.name)}</button>`;
  }).join('');

  return `<div class="selector-head">
      <h2>${MSG.LEVEL_SELECTOR_TITLE}</h2>
      <span class="selector-count">${esc(fmt(MSG.LEVEL_SELECTOR_COUNT, done, levels.length))}</span>
      <button class="selector-close" data-close aria-label="${MSG.LEVEL_SELECTOR_CLOSE}">✕</button>
    </div>
    <p class="selector-hint">${esc(MSG.LEVEL_SELECTOR_HINT)}</p>
    ${worlds}
    <section class="world free"><h3>${esc(MSG.LEVEL_SELECTOR_FREE)}</h3><div class="maps">${maps}</div></section>`;
}
