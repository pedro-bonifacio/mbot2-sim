import { getWorkspace } from '../blockly/index.js';
import { generateRunCode } from '../codegen/index.js';
import { RunState, onRunStateChange } from '../runtime/runState.js';
import { onLevelChange, getLevelState, nextVariant, checkAllVariants, listLevels } from '../levels/session.js';
import { openFromSelector } from './mapSelector.js';
import { goalLabel } from '../levels/referee.js';
import { appendConsoleMessage } from './console.js';
import { ptMessages as MSG } from '../i18n/pt.js';

// The level panel above the canvas: title, objective, goals (✓ / ✗ after a run),
// the latest result in words, variant, ★ / ★★, and the "other variant" / "test all
// variants" / "next level" buttons. Results also go to the console (history).
// Hidden in free-map mode. All text PT-PT.

const fmt = (s, ...a) => a.reduce((t, v, i) => t.replace(`%${i + 1}`, v), s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

let panel = null;
let isRunning = false;

export function initLevelPanel() {
  panel = document.getElementById('level-panel');
  if (!panel) return;
  onLevelChange(render);
  onRunStateChange((s) => {
    isRunning = s === RunState.RUNNING || s === RunState.PAUSED_ASYNC;
    render(getLevelState());
  });
  panel.addEventListener('click', (e) => {
    const action = e.target.closest('button')?.dataset.action;
    if (action === 'next') nextVariant();
    if (action === 'next-level') {
      const n = nextLevel(getLevelState().level);
      if (n) openFromSelector('level', n.id);
    }
    if (action === 'all') {
      const ws = getWorkspace();
      const r = ws && checkAllVariants(generateRunCode(ws));
      if (r) reportAll(r);
    }
  });
}

let lastReported = null;
function render(st) {
  if (!panel) return;
  if (!st.level) { panel.hidden = true; return; }
  panel.hidden = false;
  const v = st.lastVerdict;
  const goals = st.prepared.goals.map((g, i) => {
    const res = v && v.goals[i];
    const mark = !res ? '○' : res.passed ? '✓' : '✗';
    const cls = !res ? '' : res.passed ? 'ok' : 'bad';
    return `<li class="${cls}"><span class="mark">${mark}</span> ${esc(res ? res.label : labelOf(g, st))}</li>`;
  }).join('');
  const stars = `<span class="stars" title="★ cumprido · ★★ todas as variantes">${st.stars.one ? '★' : '☆'}${st.stars.two ? '★' : '☆'}</span>`;
  const result = resultLine(st);
  const next = st.stars.one ? nextLevel(st.level) : null;
  const nextBtn = next
    ? `<button data-action="next-level" class="next-level" title="${esc(fmt(MSG.LEVEL_NEXT_TITLE, next.id, next.title))}" ${isRunning ? 'disabled' : ''}>${MSG.LEVEL_NEXT}</button>`
    : '';
  const variantRow = st.variants > 1
    ? `<span class="variant">${fmt(MSG.LEVEL_VARIANT, st.variant, st.variants)}</span>
       <button data-action="next" ${isRunning ? 'disabled' : ''}>${MSG.LEVEL_NEXT_VARIANT}</button>`
    : '';
  panel.innerHTML = `
    <div class="level-head"><strong>${esc(fmt(MSG.LEVEL_HEADING, st.level.id, st.level.title))}</strong> ${stars}</div>
    <p class="objective">${esc(st.level.objective)}</p>
    <ul class="goals">${goals}</ul>
    ${result ? `<p class="result ${result.cls}">${esc(result.text)}</p>` : ''}
    <div class="level-actions">${variantRow}
      ${st.variants > 1 ? `<button data-action="all" title="${esc(MSG.LEVEL_CHECK_ALL_TITLE)}" ${isRunning ? 'disabled' : ''}>${MSG.LEVEL_CHECK_ALL}</button>` : ''}
      ${nextBtn}
    </div>`;
  if (v && v !== lastReported) { lastReported = v; reportRun(v, st); }
}

function labelOf(goal, st) { return goalLabel(goal, st.prepared); }

/** The level after this one in id order (any level can be opened: no locks). */
function nextLevel(level) {
  const all = listLevels();
  const i = all.findIndex((l) => l.id === level.id);
  return i >= 0 && i + 1 < all.length ? all[i + 1] : null;
}

/** A run's verdict in words (PT-PT). */
function verdictText(v, st) {
  if (v.passed) return fmt(st.variants > 1 ? MSG.LEVEL_PASSED : MSG.LEVEL_PASSED_ONLY_LAYOUT, v.timeS);
  return v.reason === 'collision' ? MSG.LEVEL_FAILED_COLLISION
    : v.reason === 'timeLimit' ? fmt(MSG.LEVEL_FAILED_TIME, st.prepared.timeLimitS)
    : v.reason === 'stalled' ? MSG.LEVEL_FAILED_STALLED
    : v.reason === 'leftZone' ? MSG.LEVEL_FAILED_LEFT_ZONE
    : v.reason === 'offBoard' ? MSG.LEVEL_FAILED_OFF_BOARD
    : v.reason === 'error' ? MSG.LEVEL_FAILED_ERROR : MSG.LEVEL_FAILED;
}

function allVariantsText(r) {
  if (r.passed) return fmt(MSG.LEVEL_ALL_PASSED, r.results.length);
  const ok = r.results.filter((x) => x.verdict.passed).length;
  const firstBad = r.results.findIndex((x) => !x.verdict.passed) + 1;
  return fmt(MSG.LEVEL_ALL_FAILED, ok, r.results.length, firstBad);
}

/** The latest result shown under the goals: the ★★ check if it is newer, else the run. */
function resultLine(st) {
  const all = st.allVariants && st.allVariants.id === st.level.id ? st.allVariants : null;
  if (all && !st.lastVerdict) return { cls: all.passed ? 'ok' : 'bad', text: allVariantsText(all) };
  const v = st.lastVerdict;
  if (!v) return null;
  if (v.passed && st.variants > 1 && !st.stars.two) return { cls: 'ok', text: `${verdictText(v, st)} ${MSG.LEVEL_TRY_ALL}` };
  return { cls: v.passed ? 'ok' : 'bad', text: verdictText(v, st) };
}

function reportRun(v, st) {
  if (v.passed) return appendConsoleMessage(verdictText(v, st), 'info');
  appendConsoleMessage(verdictText(v, st), 'error');
  for (const g of v.goals.filter((x) => !x.passed)) appendConsoleMessage(`  ✗ ${g.label}`, 'error');
}

function reportAll(r) {
  appendConsoleMessage(allVariantsText(r), r.passed ? 'info' : 'warn');
}
