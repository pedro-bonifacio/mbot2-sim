import { resetToneLog } from '../sim/audio.js';
import { createInterpreter, destroyInterpreter } from './interpreter.js';
import { tickProgram } from './programTick.js';
import { asyncTicket } from './runState.js';
import { robot, respawnRobot, resetMotors } from '../sim/robot.js';
import { TICK_S, physicsTick } from './simTick.js';
import { resetSensors } from '../sim/sensors.js';
import { setMapData } from '../sim/map.js';
import { simNow, resetClock } from '../sim/clock.js';
import { robotAPI } from '../sim/robotAPI.js';
import { seedProgramRandom } from '../sim/random.js';
import { ledState, resetLeds } from '../sim/leds.js';
import { resetDisplay, getDisplayState } from '../ui/display.js';
import { setPressed } from '../ui/buttons.js';
import { setConsoleSink, getConsoleSink } from '../ui/console.js';

// Headless run: the same interpreter, robotAPI, sensors and physics as the browser,
// stepped in fixed ticks of simulated time (decision 0004) with no rendering.
// One tick = one program tick + one physics tick (src/runtime/simTick.js), exactly as
// the browser run loop does it.
// Used by scripts/sim-run.mjs and the sim test suite; later by level checks.

export { TICK_S };

const round = (x, n = 1) => Math.round(x * 10 ** n) / 10 ** n;
const deg = (rad) => rad * 180 / Math.PI;
const wrapDeg = (d) => ((d + 540) % 360) - 180;

/** Pose relative to the spawn: cm forward / to the right, degrees turned (+ = right). */
export function relativePose(map, x = robot.x, y = robot.y, theta = robot.theta) {
  const dx = x - map.spawnX;
  const dy = y - map.spawnY;
  const h = map.spawnHeading;
  return {
    forward: round(dx * Math.cos(h) + dy * Math.sin(h)),
    right: round(-dx * Math.sin(h) + dy * Math.cos(h)),
    turned: round(wrapDeg(deg(theta - h))),
  };
}

/**
 * Runs generated JS on a map.
 *   map:  { width, height, spawnX, spawnY, spawnHeading, imageData, widthPx, heightPx }
 *         (mapLoader.parseMapPixels output + PNG pixel size)
 *   keys: [{ key: 'A', at: seconds, for: seconds }]  virtual button presses
 *   sampleEvery: seconds between path samples (0 = no path)
 *   seed: the program's random-number seed (same seed → same run)
 *   referee: a level referee (src/levels/referee.js); its verdict ends the run
 */
export function runHeadless({ code, map, maxSeconds = 60, keys = [], sampleEvery = 0, seed = 1, referee = null }) {
  setMapData({ imageData: map.imageData, width: map.width, height: map.height, openEdge: map.openEdge,
    offscreenCanvas: { width: map.widthPx, height: map.heightPx } });
  respawnRobot(map);
  resetClock();
  resetDisplay();
  resetLeds();
  resetToneLog();
  asyncTicket.pending = false;
  asyncTicket.resolveCondition = null;
  asyncTicket.callback = null;
  for (const k of keys) setPressed(k.key, false);

  const messages = [];
  const previousSink = getConsoleSink();   // the browser's ★★ check runs in a live page
  setConsoleSink((text, level) => messages.push({ t: round(simNow() / 1000, 2), level, text }));

  const path = [];
  let status = 'timeout';
  let error = null;
  try {
    seedProgramRandom(seed);
    createInterpreter(code);
    resetSensors();
    robotAPI._resetRun();
    const maxTicks = Math.ceil(maxSeconds / TICK_S);
    let nextSample = 0;
    for (let i = 0; i < maxTicks; i++) {
      const t = simNow() / 1000;
      for (const k of keys) setPressed(k.key, t >= k.at && t < k.at + (k.for ?? 0.2));
      if (sampleEvery && t >= nextSample) {
        const p = relativePose(map);
        path.push([round(t, 2), p.forward, p.right, p.turned]);
        nextSample += sampleEvery;
      }
      const r = tickProgram();
      if (r.status !== 'running') {
        status = r.status; error = r.error || null;
        if (referee) referee.tick({ timeS: simNow() / 1000, ended: status });
        break;
      }
      physicsTick();
      if (referee && referee.tick({ timeS: simNow() / 1000 })) { status = 'judged'; break; }
    }
  } catch (e) {
    status = 'error';   // e.g. syntax error while creating the interpreter
    error = e;
  } finally {
    if (status === 'timeout' || status === 'judged') destroyInterpreter();
    resetMotors();
    setConsoleSink(previousSink);
    for (const k of keys) setPressed(k.key, false);
  }

  const display = getDisplayState();
  return {
    status,
    error: error ? error.message : undefined,
    seed,
    verdict: referee ? referee.verdict || undefined : undefined,
    time: round(simNow() / 1000, 2),
    pose: relativePose(map),
    world: { x: round(robot.x), y: round(robot.y), heading: round(deg(robot.theta)) },
    distance: round(robot.totalDistanceCm),
    display: display.text.map((d) => (d.col ? `${d.row}:${d.col} ${d.text}` : `${d.row} ${d.text}`)),
    printed: display.printed,
    leds: ledState.map((l) => (l.on ? l.colour : null)),
    messages,
    path: sampleEvery ? path : undefined,
  };
}
