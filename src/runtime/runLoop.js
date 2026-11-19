import { generateCode, generateRunCode } from '../codegen/index.js';
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
import { simNow } from '../sim/clock.js';
import { ptMessages as MSG } from '../i18n/pt.js';

// The browser's world clock (decision 0004). Each animation frame the canvas loop
// hands over its (capped) frame time; it is cut into fixed 1/60 s ticks, and each
// tick runs the program tick and then the physics tick, exactly as the headless
// runner does. A slow computer runs the same simulation, just with fewer frames
// drawn; it never changes where the robot goes.

let _accS = 0;   // frame time not yet turned into ticks
let _speed = 1;  // fast-forward: simulated seconds per real second (×1, ×2, ×4)

/**
 * Fast-forward. The (capped) frame time is multiplied before it is cut into ticks,
 * so a faster speed only runs more of the same fixed ticks per frame: the result
 * never changes (decision 0004; checked by sim-test.mjs).
 */
export function setSpeed(x) { _speed = x > 0 ? x : 1; }
export function getSpeed() { return _speed; }
let _runStartMs = 0;
let _observer = null;

/**
 * Run observer — the level referee (src/levels/session.js). Hooks, all optional:
 *   seed()                 program random seed for the next run (else a fresh one)
 *   onStart()              a run starts
 *   onTick({ timeS, ended })  after each tick of a run, at the same points as the
 *                          headless runner calls its referee: after the program tick
 *                          that ends the run (ended = 'finished' | 'collision' |
 *                          'error' | 'internal'), else after the physics tick.
 */
export function setRunObserver(observer) { _observer = observer; }

const isActive = () => getRunState() === RunState.RUNNING || getRunState() === RunState.PAUSED_ASYNC;

/** Wires the run loop to the canvas loop's frames. Call once after initSim(). */
export function initRunLoop() {
  setFrameHook(advanceFrame);
}

/** One animation frame's worth of simulation. Exported for the frame-rate test (sim-test.mjs). */
export function advanceFrame(frameS) {
  _accS += frameS * _speed;
  // The small epsilon keeps a steady 60 fps at exactly one tick per frame despite
  // floating-point drift in the accumulated frame times.
  while (_accS >= TICK_S - 1e-9) {
    _accS -= TICK_S;
    if (!isActive()) { physicsTick(); continue; }
    const r = tickProgram();
    if (r.status !== 'running') {
      _handle(r);
      _observe(r.status);
      physicsTick();
      continue;
    }
    _handle(r);
    physicsTick();
    _observe(null);
  }
  // DevTools: current quad RGB probe samples.
  if (!window.simState) window.simState = {};
  window.simState.quadRGBProbes = getQuadRGBProbeData();
}

function _observe(ended) {
  if (_observer && _observer.onTick) _observer.onTick({ timeS: (simNow() - _runStartMs) / 1000, ended });
}

export function run(workspace) {
  if (isActive()) return;
  const jsCode = generateRunCode(workspace);
  console.log('--- Generated JS ---\n' + generateCode(workspace) + '\n--- End Generated JS ---');
  const seed = _observer && _observer.seed ? _observer.seed() : undefined;
  runCode(jsCode, seed === undefined ? {} : { seed });
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
    appendConsoleMessage(MSG.RUN_START_ERROR.replace('%1', err.message), 'error');
    setRunState(RunState.ERRORED);
    return;
  }

  resetSensors();
  robotAPI._resetRun();
  _runStartMs = simNow();
  setRunState(RunState.RUNNING);   // the next tick starts it
  if (_observer && _observer.onStart) _observer.onStart();
}

/** Ends a run quietly (the level referee has decided): like Parar, without the message. */
export function endRun() {
  if (!isActive()) return;
  destroyInterpreter();
  asyncTicket.pending = false;
  asyncTicket.resolveCondition = null;
  asyncTicket.callback = null;
  resetMotors();
  setRunState(RunState.IDLE);
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
  appendConsoleMessage(MSG.RUN_STOPPED, 'warn');
}

/** Turns a program tick's result into run state and console messages. */
function _handle(result) {
  switch (result.status) {
    case 'collision':
      setRunState(RunState.STOPPED);
      appendConsoleMessage(MSG.RUN_COLLISION, 'error');
      return;
    case 'finished':
      setRunState(RunState.IDLE);
      appendConsoleMessage(MSG.RUN_FINISHED, 'info');
      return;
    case 'error':
      console.error('[runLoop] Runtime error:', result.error);
      appendConsoleMessage(MSG.RUN_ERROR.replace('%1', result.error.message), 'error');
      setRunState(RunState.ERRORED);
      return;
    case 'internal':
      console.error('[runLoop]', result.error.message);
      appendConsoleMessage(MSG.RUN_INTERNAL_ERROR, 'error');
      setRunState(RunState.ERRORED);
      return;
    default: {
      // Still running (stepping, or waiting on a robot call while physics continues).
      const next = isInterpreterPaused() ? RunState.PAUSED_ASYNC : RunState.RUNNING;
      if (getRunState() !== next) setRunState(next);
    }
  }
}
