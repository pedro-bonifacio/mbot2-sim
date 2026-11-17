import { generateCode } from '../codegen/index.js';
import { createInterpreter, destroyInterpreter, isInterpreterPaused } from './interpreter.js';
import { tickProgram } from './programTick.js';
import { RunState, getRunState, setRunState, asyncTicket } from './runState.js';
import { appendConsoleMessage, clear as clearConsole } from '../ui/console.js';
import { resetMotors } from '../sim/robot.js';
import { resetSensors, getQuadRGBProbeData } from '../sim/sensors.js';
import { robotAPI } from '../sim/robotAPI.js';
import { seedProgramRandom, freshSeed } from '../sim/random.js';
import { setFrameHook } from '../sim/canvas.js';
import { TICK_S, physicsTick } from './simTick.js';

// The browser's world clock (decision 0004). Each animation frame the canvas loop
// hands over its (capped) frame time; it is cut into fixed 1/60 s ticks, and each
// tick runs the program tick and then the physics tick, exactly as the headless
// runner does. A slow computer runs the same simulation, just with fewer frames
// drawn; it never changes where the robot goes.

let _accS = 0;   // frame time not yet turned into ticks

const isActive = () => getRunState() === RunState.RUNNING || getRunState() === RunState.PAUSED_ASYNC;

/** Wires the run loop to the canvas loop's frames. Call once after initSim(). */
export function initRunLoop() {
  setFrameHook(advanceFrame);
}

/** One animation frame's worth of simulation. Exported for the frame-rate test (sim-test.mjs). */
export function advanceFrame(frameS) {
  _accS += frameS;
  // The small epsilon keeps a steady 60 fps at exactly one tick per frame despite
  // floating-point drift in the accumulated frame times.
  while (_accS >= TICK_S - 1e-9) {
    _accS -= TICK_S;
    if (isActive()) _handle(tickProgram());
    physicsTick();
  }
  // DevTools: current quad RGB probe samples.
  if (!window.simState) window.simState = {};
  window.simState.quadRGBProbes = getQuadRGBProbeData();
}

export function run(workspace) {
  if (isActive()) return;
  const jsCode = generateCode(workspace);
  console.log('--- Generated JS ---\n' + jsCode + '\n--- End Generated JS ---');
  runCode(jsCode);
}

/**
 * Starts generated JavaScript; the next tick runs it. `seed` seeds the program's
 * random numbers: a fresh one by default (each Executar differs, as on the robot);
 * pass the recorded seed to replay a run (programSeed(), __dev.state().seed).
 */
export function runCode(jsCode, { seed = freshSeed() } = {}) {
  if (isActive()) return;
  clearConsole();
  seedProgramRandom(seed);

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
  setRunState(RunState.RUNNING);   // the next tick starts it
}

export function stop() {
  const state = getRunState();
  if (state === RunState.IDLE || state === RunState.STOPPED) return;

  destroyInterpreter();

  // Clear any pending async ticket and zero motors
  asyncTicket.pending = false;
  asyncTicket.resolveCondition = null;
  asyncTicket.callback = null;
  resetMotors();

  setRunState(RunState.STOPPED);
  appendConsoleMessage('Programa interrompido.', 'warn');
}

/** Turns a program tick's result into run state and console messages. */
function _handle(result) {
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
      // Still running (stepping, or waiting on a robot call while physics continues).
      const next = isInterpreterPaused() ? RunState.PAUSED_ASYNC : RunState.RUNNING;
      if (getRunState() !== next) setRunState(next);
    }
  }
}
