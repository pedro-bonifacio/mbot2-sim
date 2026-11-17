import * as Blockly from 'blockly';
import { getWorkspace } from '../blockly/index.js';
import { ptMessages as MSG } from '../i18n/pt.js';

// The draggable divider between the block editor and the robot side. Drag to share
// the width; double-click to go back to the default. The width is remembered on this
// computer. The map canvas scales with its column (canvas.js keeps its resolution).

const KEY = 'mbot2sim:simWidth';
const MIN_SIM = 380, MIN_EDITOR = 380, MAX_SIM = 1000;

const defaultWidth = () => Math.round(Math.min(840, Math.max(MIN_SIM, window.innerWidth * 0.5)));
const clamp = (w) => Math.round(Math.max(MIN_SIM, Math.min(MAX_SIM, w, window.innerWidth - MIN_EDITOR)));

export function initSplitter() {
  const bar = document.getElementById('splitter');
  const sim = document.getElementById('sim-area');
  const editor = document.getElementById('blockly-area');
  if (!bar || !sim || !editor) return;
  bar.title = MSG.SPLITTER_TITLE;

  let wanted = null;   // the student's chosen width, or null = default
  try { wanted = Number(localStorage.getItem(KEY)) || null; } catch (e) {}
  const apply = () => { sim.style.width = `${clamp(wanted ?? defaultWidth())}px`; };
  apply();
  window.addEventListener('resize', apply);

  // Blockly measures its own div: tell it whenever the column changes size.
  new ResizeObserver(() => { const ws = getWorkspace(); if (ws) Blockly.svgResize(ws); }).observe(editor);

  bar.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    try { bar.setPointerCapture(e.pointerId); } catch (err) {}   // keep dragging outside the bar
    bar.classList.add('dragging');
    const move = (ev) => { wanted = clamp(window.innerWidth - ev.clientX - bar.offsetWidth / 2); apply(); };
    const up = () => {
      bar.classList.remove('dragging');
      bar.removeEventListener('pointermove', move);
      bar.removeEventListener('pointerup', up);
      try { localStorage.setItem(KEY, String(wanted)); } catch (err) {}
    };
    bar.addEventListener('pointermove', move);
    bar.addEventListener('pointerup', up);
  });
  bar.addEventListener('dblclick', () => {
    wanted = null;
    try { localStorage.removeItem(KEY); } catch (e) {}
    apply();
  });
}
