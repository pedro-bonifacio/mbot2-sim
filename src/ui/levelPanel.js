import { getWorkspace } from '../blockly/index.js';
import { generateCode } from '../codegen/index.js';
import { RunState, onRunStateChange } from '../runtime/runState.js';
import { onLevelChange, getLevelState, nextVariant, checkAllVariants } from '../levels/session.js';
import { goalLabel } from '../levels/referee.js';
import { appendConsoleMessage } from './console.js';
import { ptMessages as MSG } from '../i18n/pt.js';

// The level panel above the canvas: title, objective, goals (✓ / ✗ after a run),
// variant, ★ / ★★, and the "other variant" / "test all variants" buttons.
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
    if (action === 'all') {
      const ws = getWorkspace();
      const r = ws && checkAllVariants(generateCode(ws));
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
  const variantRow = st.variants > 1
    ? `<span class="variant">${fmt(MSG.LEVEL_VARIANT, st.variant, st.variants)}</span>
       <button data-action="next" ${isRunning ? 'disabled' : ''}>${MSG.LEVEL_NEXT_VARIANT}</button>`
    : '';
  panel.innerHTML = `
    <div class="level-head"><strong>${esc(fmt(MSG.LEVEL_HEADING, st.level.id, st.level.title))}</strong> ${stars}</div>
    <p class="objective">${esc(st.level.objective)}</p>
    <ul class="goals">${goals}</ul>
    <div class="level-actions">${variantRow}
      <button data-action="all" title="${esc(MSG.LEVEL_CHECK_ALL_TITLE)}" ${isRunning ? 'disabled' : ''}>${MSG.LEVEL_CHECK_ALL}</button>
    </div>`;
  if (v && v !== lastReported) { lastReported = v; reportRun(v, st); }
}

function labelOf(goal, st) { return goalLabel(goal, st.prepared); }

function reportRun(v, st) {
  if (v.passed) return appendConsoleMessage(fmt(MSG.LEVEL_PASSED, v.timeS), 'info');
  const why = v.reason === 'collision' ? MSG.LEVEL_FAILED_COLLISION
    : v.reason === 'timeLimit' ? fmt(MSG.LEVEL_FAILED_TIME, st.prepared.timeLimitS)
    : v.reason === 'error' ? MSG.LEVEL_FAILED_ERROR : MSG.LEVEL_FAILED;
  appendConsoleMessage(why, 'error');
  for (const g of v.goals.filter((x) => !x.passed)) appendConsoleMessage(`  ✗ ${g.label}`, 'error');
}

function reportAll(r) {
  if (r.passed) return appendConsoleMessage(fmt(MSG.LEVEL_ALL_PASSED, r.results.length), 'info');
  const ok = r.results.filter((x) => x.verdict.passed).length;
  const firstBad = r.results.findIndex((x) => !x.verdict.passed) + 1;
  appendConsoleMessage(fmt(MSG.LEVEL_ALL_FAILED, ok, r.results.length, firstBad), 'warn');
}
