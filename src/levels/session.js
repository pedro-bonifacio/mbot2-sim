import { LEVELS, getLevel } from './catalogue.js';
import { prepareLevel, testSeeds } from './level.js';
import { rasterise } from './raster.js';
import { createReferee } from './referee.js';
import { runLevel } from './runLevel.js';
import { getStars, addStar } from './progress.js';
import { setMapData } from '../sim/map.js';
import { respawnRobot } from '../sim/robot.js';
import { resizeCanvas, resetCamera, resetSim, setZoneOverlay } from '../sim/canvas.js';
import { setRunObserver, endRun } from '../runtime/runLoop.js';
import { RunState, getRunState } from '../runtime/runState.js';

// The level being played in the browser (no DOM: src/ui/levelPanel.js shows it).
// Loads a variant onto the canvas, judges each run with the referee (through the
// run loop's observer, at the same ticks as the headless runner), and runs the
// ★★ check: the student's program on every test variant, headlessly.
// Stars are saved per level in progress.js (this browser only, decision 0002).

const state = {
  level: null,        // level object (catalogue.js)
  seedIndex: 0,
  prepared: null,
  referee: null,
  lastVerdict: null,  // verdict of the latest run on this variant
  allVariants: null,  // { passed, results: [{ seed, verdict }] } of the latest ★★ check
};
const listeners = new Set();
const emit = () => listeners.forEach((fn) => fn(getLevelState()));

export function onLevelChange(fn) { listeners.add(fn); }
/** Re-announces the current state (e.g. after a progress file was imported). */
export function refreshLevelState() { emit(); }
export function listLevels() { return LEVELS; }

export function getLevelState() {
  const { level, seedIndex, prepared, lastVerdict, allVariants } = state;
  if (!level) return { level: null };
  return {
    level, prepared, lastVerdict, allVariants,
    variant: seedIndex + 1, variants: testSeeds(level).length,
    stars: getStars(level.id),
  };
}

const running = () => [RunState.RUNNING, RunState.PAUSED_ASYNC].includes(getRunState());

/** Shows a level (variant `seedIndex` of its test seeds) on the canvas. */
export function loadLevel(id, seedIndex = 0) {
  const level = getLevel(id);
  if (!level) throw new Error(`No level "${id}"`);
  const seeds = testSeeds(level);
  state.level = level;
  state.seedIndex = ((seedIndex % seeds.length) + seeds.length) % seeds.length;
  state.prepared = prepareLevel(level, seeds[state.seedIndex]);
  state.referee = null;
  state.lastVerdict = null;
  if (state.allVariants && state.allVariants.id !== id) state.allVariants = null;

  const { imageData, widthPx, heightPx } = rasterise(state.prepared);
  const oc = document.createElement('canvas');
  oc.width = widthPx;
  oc.height = heightPx;
  oc.getContext('2d').putImageData(new ImageData(imageData, widthPx, heightPx), 0, 0);
  const p = state.prepared;
  const mapInfo = { width: p.size.w, height: p.size.h, spawnX: p.spawn.x, spawnY: p.spawn.y,
    spawnHeading: p.spawn.theta, imageData, offscreenCanvas: oc };
  setMapData(mapInfo);
  resizeCanvas(mapInfo);
  respawnRobot(mapInfo);
  resetSim();
  resetCamera();
  setZoneOverlay(Object.values(p.zones));
  setRunObserver(observer);
  emit();
}

/** Next test variant of the current level. */
export function nextVariant() {
  if (state.level && !running()) loadLevel(state.level.id, state.seedIndex + 1);
}

/** Leaves level mode (free map selection). */
export function clearLevel() {
  state.level = null;
  state.prepared = null;
  state.referee = null;
  setZoneOverlay(null);
  setRunObserver(null);
  emit();
}

const observer = {
  // The program's random numbers follow the variant, as in the headless ★★ check.
  seed: () => state.prepared.seed,
  onStart() {
    state.referee = createReferee(state.prepared);
    state.lastVerdict = null;
    state.allVariants = null;   // the panel shows this run's result from now on
    emit();
  },
  onTick({ timeS, ended }) {
    if (!state.referee || state.lastVerdict) return;
    const v = state.referee.tick({ timeS, ended });
    if (!v) return;
    state.lastVerdict = v;
    if (running()) endRun();
    if (v.passed) markStar('one');
    emit();
  },
};

function markStar(which) { addStar(state.level.id, which); }

/**
 * ★★ check: runs `code` (the student's generated program) on every test variant,
 * headlessly and fast, then puts the current variant back on screen.
 */
export function checkAllVariants(code) {
  if (!state.level || running()) return null;
  const { level, seedIndex } = state;
  const results = testSeeds(level).map((seed) => {
    const r = runLevel({ level, code, seed });
    return { seed, verdict: r.verdict || { passed: false, reason: r.status, goals: [] } };
  });
  const passed = results.every((r) => r.verdict.passed);
  loadLevel(level.id, seedIndex);   // restore map, robot and display
  state.allVariants = { id: level.id, passed, results };
  if (passed) markStar('two');
  emit();
  return state.allVariants;
}
