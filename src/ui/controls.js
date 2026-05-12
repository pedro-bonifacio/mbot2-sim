import { resetSim, isPaused, pauseSim, resumeSim, resetCamera } from '../sim/canvas.js';
import { appendConsoleMessage } from './console.js';
import { setToolboxMode, getWorkspace } from '../blockly/index.js';
import { run as runProgram, stop as stopProgram } from '../runtime/runLoop.js';
import { RunState, getRunState, onRunStateChange } from '../runtime/runState.js';
import { saveProgram, loadProgramFromFile, newProgram } from './programIO.js';

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

  btnLoad.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (file) {
      loadProgramFromFile(file);
      fileInput.value = '';  // reset so same file can be re-selected
    }
  });

  btnNew.addEventListener('click', () => newProgram());

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

  onRunStateChange((state) => {
    const running = state === RunState.RUNNING || state === RunState.PAUSED_ASYNC;
    btnRun.disabled  = running;
    btnStop.disabled = !running;
  });

  btnStop.disabled = true;
  console.log('[controls] initialised');
}
