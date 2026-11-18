import { resetSim, isPaused, pauseSim, resumeSim, resetCamera } from '../sim/canvas.js';
import { appendConsoleMessage } from './console.js';
import { setToolboxMode, getWorkspace } from '../blockly/index.js';
import { isRulerOn, setRuler, onRulerChange } from '../sim/ruler.js';
import { run as runProgram, stop as stopProgram, setSpeed, getSpeed } from '../runtime/runLoop.js';
import { ptMessages as MSG } from '../i18n/pt.js';
import { RunState, getRunState, onRunStateChange } from '../runtime/runState.js';
import { saveProgram, loadProgramFromFile, newProgram, exportToOpenRoberta, exportProgressFile, importProgressFile } from './programIO.js';
import { loggedInAs } from '../levels/sync.js';

export function initControls() {
  const btnRun    = document.getElementById('btn-run');
  const btnStop   = document.getElementById('btn-stop');
  const btnReset  = document.getElementById('btn-reset');
  const btnCenter = document.getElementById('btn-center');
  const btnSave   = document.getElementById('btn-save');
  const btnLoad   = document.getElementById('btn-load');
  const btnNew    = document.getElementById('btn-new');
  const fileInput = document.getElementById('file-input-load');

  btnRun.addEventListener('click', () => {
    const ws = getWorkspace();
    if (!ws) return;
    resetSim();   // return robot to spawn position before each run
    resumeSim();  // un-pause the physics in case space-bar was held
    runProgram(ws);
  });

  btnStop.addEventListener('click', () => {
    stopProgram();
  });

  btnReset.addEventListener('click', () => {
    stopProgram();
    resetSim();
    resumeSim();
  });

  btnCenter.addEventListener('click', () => {
    resetCamera();
  });

  btnSave.addEventListener('click', () => saveProgram());

  document.getElementById('btn-export-or').addEventListener('click', () => exportToOpenRoberta());

  btnLoad.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (file) {
      loadProgramFromFile(file);
      fileInput.value = '';  // reset so same file can be re-selected
    }
  });

  btnNew.addEventListener('click', () => newProgram());

  initFileMenu();
  initSpeed();

  const progressInput = document.getElementById('file-input-progress');
  document.getElementById('btn-progress-export').addEventListener('click', () => exportProgressFile());
  document.getElementById('btn-progress-import').addEventListener('click', () => {
    if (loggedInAs()) { window.alert(MSG.PROGRESS_IMPORT_ACCOUNT); return; }   // decision 0016
    progressInput.click();
  });
  progressInput.addEventListener('change', () => {
    const file = progressInput.files[0];
    if (file) importProgressFile(file);
    progressInput.value = '';
  });

  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && e.target.tagName !== 'INPUT') {
      const s = getRunState();
      if (s === RunState.RUNNING || s === RunState.PAUSED_ASYNC) return;
      e.preventDefault();
      if (isPaused()) resumeSim(); else pauseSim();
    }
  });

  const toolboxSelect = document.getElementById('toolbox-mode');
  if (toolboxSelect) {
    toolboxSelect.addEventListener('change', (e) => setToolboxMode(e.target.value));
  }

  // Ruler: the button toggles it; Esc turns it off.
  const btnRuler = document.getElementById('btn-ruler');
  if (btnRuler) {
    btnRuler.addEventListener('click', () => setRuler(!isRulerOn()));
    onRulerChange((on) => btnRuler.setAttribute('aria-pressed', String(on)));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && isRulerOn()) setRuler(false); });
  }

  onRunStateChange((state) => {
    const running = state === RunState.RUNNING || state === RunState.PAUSED_ASYNC;
    btnRun.disabled  = running;
    btnStop.disabled = !running;
  });

  btnStop.disabled = true;
  console.log('[controls] initialised');
}

const SPEEDS = [1, 2, 4];
const SPEED_KEY = 'mbot2sim:speed';   // remembered on this computer (a convenience)

/** "×1 / ×2 / ×4": fast-forward. Results never change with speed (decision 0004). */
function initSpeed() {
  const btn = document.getElementById('btn-speed');
  if (!btn) return;
  const show = () => {
    const x = getSpeed();
    btn.textContent = `×${x}`;
    btn.title = MSG.SPEED_TITLE.replace('%1', x);
    btn.classList.toggle('fast', x > 1);
  };
  let saved = 1;
  try { saved = Number(localStorage.getItem(SPEED_KEY)) || 1; } catch (e) {}
  setSpeed(SPEEDS.includes(saved) ? saved : 1);
  show();
  btn.addEventListener('click', () => {
    const next = SPEEDS[(SPEEDS.indexOf(getSpeed()) + 1) % SPEEDS.length];
    setSpeed(next);
    try { localStorage.setItem(SPEED_KEY, String(next)); } catch (e) {}
    show();
  });
}

/** "Ficheiro ▾": opens on click, closes on a choice, Escape or a click elsewhere. */
function initFileMenu() {
  const menu = document.getElementById('file-menu');
  if (!menu) return;
  const btn = menu.querySelector('#btn-file');
  const items = menu.querySelector('.menu-items');
  const setOpen = (open) => {
    items.hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
    if (open) items.querySelector('button')?.focus();
  };
  btn.addEventListener('click', () => setOpen(items.hidden));
  items.addEventListener('click', (e) => { if (e.target.closest('button')) setOpen(false); });
  document.addEventListener('click', (e) => { if (!menu.contains(e.target)) setOpen(false); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !items.hidden) { setOpen(false); btn.focus(); }
  });
}
