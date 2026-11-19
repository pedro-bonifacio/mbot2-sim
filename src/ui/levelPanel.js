import * as Blockly from 'blockly';
import { getWorkspace } from '../blockly/index.js';
import { countBlocks } from '../blockly/blockCount.js';
import { generateRunCode } from '../codegen/index.js';
import { RunState, onRunStateChange } from '../runtime/runState.js';
import { onLevelChange, getLevelState, nextVariant, checkAllVariants, listLevels, setBlockCounter } from '../levels/session.js';
import { openFromSelector } from './mapSelector.js';
import { goalLabel } from '../levels/referee.js';
import { appendConsoleMessage } from './console.js';
import { ptMessages as MSG } from '../i18n/pt.js';

// The level panel above the canvas: title, objective, goals (✓ / ✗ after a run),
// the latest result in words, variant, ★ / ★★ (/ ★★★ with the challenge and the
// program's live block count), and the "other variant" / "test all variants" /
// "next level" buttons. Results also go to the console (history).
// Hidden in free-map mode. All text PT-PT.

const fmt = (s, ...a) => a.reduce((t, v, i) => t.replace(`%${i + 1}`, v), s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

let panel = null;
let isRunning = false;
let blocks = 0;   // the program's block count, for the ★★★ line

const currentBlocks = () => { const ws = getWorkspace(); return ws ? countBlocks(ws) : 0; };

export function initLevelPanel() {
  panel = document.getElementById('level-panel');
  if (!panel) return;
  onLevelChange(render);
  setBlockCounter(currentBlocks);
  const ws = getWorkspace();
  if (ws) {
    ws.addChangeListener((e) => {
      if (e.isUiEvent || e.type === Blockly.Events.FINISHED_LOADING) return;
      const n = currentBlocks();
      if (n === blocks) return;
      blocks = n;
      const st = getLevelState();
      if (st.level && st.level.challenge && st.level.challenge.maxBlocks != null) render(st);
    });
  }
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
  const ch = st.level.challenge;
  const stars = `<span class="stars" title="${esc(ch ? MSG.LEVEL_STARS_TITLE_3 : MSG.LEVEL_STARS_TITLE)}">${st.stars.one ? '★' : '☆'}${st.stars.two ? '★' : '☆'}${ch ? (st.stars.three ? '★' : '☆') : ''}</span>`;
  const challenge = ch ? challengeLine(ch, st) : '';
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
    ${challenge}
    ${result ? `<p class="result ${result.cls}">${esc(result.text)}</p>` : ''}
    <div class="level-actions">${variantRow}
      ${st.variants > 1 ? `<button data-action="all" title="${esc(MSG.LEVEL_CHECK_ALL_TITLE)}" ${isRunning ? 'disabled' : ''}>${MSG.LEVEL_CHECK_ALL}</button>` : ''}
      ${nextBtn}
    </div>`;
  if (v && v !== lastReported) { lastReported = v; reportRun(v, st); }
}

/** The ★★★ challenge in words, and the program's block count when blocks are limited. */
function challengeLine(ch, st) {
  const parts = [];
  if (ch.maxBlocks != null) parts.push(fmt(MSG.LEVEL_CHALLENGE_BLOCKS, ch.maxBlocks));
  if (ch.maxSeconds != null) parts.push(fmt(st.variants > 1 ? MSG.LEVEL_CHALLENGE_TIME_ALL : MSG.LEVEL_CHALLENGE_TIME, ch.maxSeconds));
  const text = fmt(MSG.LEVEL_CHALLENGE, ch.label || parts.join(', '));
  if (ch.maxBlocks != null) blocks = currentBlocks();
  const count = ch.maxBlocks != null ? ` <span class="block-count">${esc(fmt(MSG.LEVEL_CHALLENGE_COUNT, blocks))}</span>` : '';
  return `<p class="challenge${st.stars.three ? ' ok' : ''}">${esc(text)}${count}</p>`;
}

/** The ★★★ result in words (from judgeChallenge), or ''. */
function challengeText(c, st) {
  if (!c) return '';
  if (c.met) return MSG.LEVEL_CHALLENGE_MET;
  const ch = st.level.challenge;
  if (c.tooManyBlocks) return fmt(MSG.LEVEL_CHALLENGE_TOO_MANY, c.blocks, ch.maxBlocks);
  return st.variants > 1
    ? fmt(MSG.LEVEL_CHALLENGE_TOO_SLOW_VARIANT, c.slowVariant, c.slowestS, ch.maxSeconds)
    : fmt(MSG.LEVEL_CHALLENGE_TOO_SLOW, c.slowestS, ch.maxSeconds);
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
  if (all && !st.lastVerdict) {
    return { cls: all.passed ? 'ok' : 'bad', text: [allVariantsText(all), challengeText(all.challenge, st)].filter(Boolean).join(' ') };
  }
  const v = st.lastVerdict;
  if (!v) return null;
  if (st.runChallenge) return { cls: 'ok', text: `${verdictText(v, st)} ${challengeText(st.runChallenge, st)}` };
  if (v.passed && st.variants > 1 && !st.stars.two) return { cls: 'ok', text: `${verdictText(v, st)} ${MSG.LEVEL_TRY_ALL}` };
  return { cls: v.passed ? 'ok' : 'bad', text: verdictText(v, st) };
}

function reportRun(v, st) {
  if (v.passed) {
    appendConsoleMessage(verdictText(v, st), 'info');
    if (st.runChallenge) appendConsoleMessage(challengeText(st.runChallenge, st), st.runChallenge.met ? 'info' : 'warn');
    return;
  }
  appendConsoleMessage(verdictText(v, st), 'error');
  for (const g of v.goals.filter((x) => !x.passed)) appendConsoleMessage(`  ✗ ${g.label}`, 'error');
}

function reportAll(r) {
  appendConsoleMessage(allVariantsText(r), r.passed ? 'info' : 'warn');
  const c = challengeText(r.challenge, getLevelState());
  if (c) appendConsoleMessage(c, r.challenge.met ? 'info' : 'warn');
}
