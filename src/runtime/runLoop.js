import { generateCode } from '../codegen/index.js';
import { createInterpreter, destroyInterpreter, isInterpreterPaused } from './interpreter.js';
import { tickProgram } from './programTick.js';
import { RunState, getRunState, setRunState, asyncTicket } from './runState.js';
import { appendConsoleMessage, clear as clearConsole } from '../ui/console.js';
import { resetMotors } from '../sim/robot.js';
import { resetSensors, getQuadRGBProbeData } from '../sim/sensors.js';
import { robotAPI } from '../sim/robotAPI.js';

let _rafId = null;

export function run(workspace) {
  if (getRunState() === RunState.RUNNING || getRunState() === RunState.PAUSED_ASYNC) return;

  clearConsole();

  const jsCode = generateCode(workspace);
  console.log('--- Generated JS ---\n' + jsCode + '\n--- End Generated JS ---');

  try {
    createInterpreter(jsCode);
  } catch (err) {
    console.error('[runLoop] Interpreter init error:', err);
    appendConsoleMessage('Erro ao iniciar o programa: ' + err.message, 'error');
    setRunState(RunState.ERRORED);
    return;
  }

  resetSensors();
  robotAPI._resetMessageBus();
  setRunState(RunState.RUNNING);
  _rafId = requestAnimationFrame(_tick);
}

export function stop() {
  const state = getRunState();
  if (state === RunState.IDLE || state === RunState.STOPPED) return;

  if (_rafId !== null) {
    cancelAnimationFrame(_rafId);
    _rafId = null;
  }
  destroyInterpreter();

  // Clear any pending async ticket and zero motors
  asyncTicket.pending = false;
  asyncTicket.resolveCondition = null;
  asyncTicket.callback = null;
  resetMotors();

  setRunState(RunState.STOPPED);
  appendConsoleMessage('Programa interrompido.', 'warn');
}

function _tick() {
  _rafId = null;

  if (getRunState() !== RunState.RUNNING && getRunState() !== RunState.PAUSED_ASYNC) return;

  const result = tickProgram();

  // Populate DevTools-accessible simState with current probe samples each tick
  if (!window.simState) window.simState = {};
  window.simState.quadRGBProbes = getQuadRGBProbeData();

  switch (result.status) {
    case 'collision':
      setRunState(RunState.STOPPED);
      appendConsoleMessage('Colisão detectada.', 'error');
      return;
    case 'finished':
      setRunState(RunState.IDLE);
      appendConsoleMessage('Programa terminado.', 'info');
      return;
    case 'error':
      console.error('[runLoop] Runtime error:', result.error);
      appendConsoleMessage('Erro de execução: ' + result.error.message, 'error');
      setRunState(RunState.ERRORED);
      return;
    case 'internal':
      console.error('[runLoop]', result.error.message);
      appendConsoleMessage('Erro interno: operação assíncrona sem retorno.', 'error');
      setRunState(RunState.ERRORED);
      return;
    default: {
      // Still running: physics continue in the canvas loop while paused on a robot call.
      const next = isInterpreterPaused() ? RunState.PAUSED_ASYNC : RunState.RUNNING;
      if (getRunState() !== next) setRunState(next);
      _rafId = requestAnimationFrame(_tick);
    }
  }
}

// Called by Phase 4-1+ async handlers to resume after a robot call completes.
export function resumeFromAsync() {
  if (getRunState() !== RunState.PAUSED_ASYNC) return;
  setRunState(RunState.RUNNING);
  if (_rafId === null) {
    _rafId = requestAnimationFrame(_tick);
  }
}
