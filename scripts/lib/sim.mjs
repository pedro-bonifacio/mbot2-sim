// Node bootstrap for the headless simulator: DOM shims, program/map loading.
// Shared by scripts/sim-run.mjs (CLI) and scripts/sim-test.mjs (test suite).

import * as Blockly from 'blockly';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { JSDOM } from 'jsdom';
import pngjs from 'pngjs';

const { window } = new JSDOM('');
globalThis.DOMParser = window.DOMParser;
globalThis.document = window.document;

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const imp = (p) => import(path.join(ROOT, p));

const { registerAllBlocks } = await imp('src/blockly/index.js');
const { generateCode } = await imp('src/codegen/index.js');
const { isOpenRobertaXml, openRobertaToBlocklyDom } = await imp('src/blockly/orFormat.js');
const { syncBlocks } = await imp('src/blockly/blocks/_varScope.js');
const { parseMapPixels } = await imp('src/sim/mapLoader.js');
const { runHeadless } = await imp('src/runtime/headless.js');
registerAllBlocks();

/** Program file (Open Roberta export or Blockly XML) → { code, warnings }. */
export function loadProgram(file) {
  const text = fs.readFileSync(path.resolve(ROOT, file), 'utf8');
  const ws = new Blockly.Workspace();
  try {
    const dom = isOpenRobertaXml(text) ? openRobertaToBlocklyDom(text) : Blockly.utils.xml.textToDom(text);
    Blockly.Xml.domToWorkspace(dom, ws);
    syncBlocks(ws);
    const warnings = ws.getAllBlocks(false).filter((b) => b.robWarning_).map((b) => `${b.type}: ${b.robWarning_}`);
    return { code: generateCode(ws), warnings };
  } finally {
    ws.dispose();
  }
}

const mapCache = new Map();
/** Map name in public/maps (or a path) → map object for runHeadless. */
export function loadMap(name = 'default.png') {
  if (!mapCache.has(name)) {
    const file = fs.existsSync(path.join(ROOT, 'public/maps', name)) ? path.join(ROOT, 'public/maps', name) : path.resolve(ROOT, name);
    const png = pngjs.PNG.sync.read(fs.readFileSync(file));
    const info = parseMapPixels(new Uint8ClampedArray(png.data.buffer, png.data.byteOffset, png.data.length), png.width, png.height);
    mapCache.set(name, { ...info, widthPx: png.width, heightPx: png.height });
  }
  return mapCache.get(name);
}

/** Loads, generates and runs a program file. */
export function simulate({ program, map = 'default.png', ...opts }) {
  const { code, warnings } = loadProgram(program);
  const result = runHeadless({ code, map: loadMap(map), ...opts });
  return { warnings, ...result, code };
}

/**
 * Runs a program through the browser's own run loop (src/runtime/runLoop.js) with
 * synthetic animation frames: frameS(i) is frame i's length in seconds (capped at
 * 1/30 s, as canvas.js does). Key presses follow simulated time. Used to check that
 * the browser gives the same result as runHeadless at any frame rate and any
 * fast-forward `speed` (decision 0004).
 */
export async function simulateBrowser({ program, map = 'default.png', maxSeconds = 60, keys = [], frameS, seed = 1, speed = 1 }) {
  globalThis.window ??= globalThis;
  globalThis.Image ??= class { set src(v) {} };
  const { runCode, advanceFrame, stop } = await imp('src/runtime/runLoop.js');
  const { getRunState, RunState } = await imp('src/runtime/runState.js');
  const { respawnRobot } = await imp('src/sim/robot.js');
  const { setMapData } = await imp('src/sim/map.js');
  const { simNow, resetClock } = await imp('src/sim/clock.js');
  const { relativePose } = await imp('src/runtime/headless.js');
  const { setConsoleSink } = await imp('src/ui/console.js');
  const { setPressed } = await imp('src/ui/buttons.js');
  const { resetDisplay, getDisplayState } = await imp('src/ui/display.js');
  const { resetLeds } = await imp('src/sim/leds.js');
  const { ptMessages: MSG } = await imp('src/i18n/pt.js');
  const { setSpeed } = await imp('src/runtime/runLoop.js');
  setSpeed(speed);

  const m = loadMap(map);
  setMapData({ imageData: m.imageData, width: m.width, height: m.height,
    offscreenCanvas: { width: m.widthPx, height: m.heightPx } });
  respawnRobot(m);
  resetClock();
  resetDisplay();
  resetLeds();
  let last = null;
  setConsoleSink((text) => { last = text; });
  const devError = console.error;
  console.error = () => {};   // runLoop logs program errors for DevTools
  const active = () => [RunState.RUNNING, RunState.PAUSED_ASYNC].includes(getRunState());
  try {
    runCode(loadProgram(program).code, { seed });
    for (let i = 0; active() && simNow() / 1000 < maxSeconds; i++) {
      const t = simNow() / 1000;
      for (const k of keys) setPressed(k.key, t >= k.at && t < k.at + (k.for ?? 0.2));
      advanceFrame(Math.min(frameS(i), 1 / 30));
    }
    const timedOut = active();
    if (timedOut) stop();
    const status = timedOut ? 'timeout'
      : { [MSG.RUN_FINISHED]: 'finished', [MSG.RUN_COLLISION]: 'collision' }[last] || 'error';
    const display = getDisplayState().text.map((d) => (d.col ? `${d.row}:${d.col} ${d.text}` : `${d.row} ${d.text}`));
    return { status, time: simNow() / 1000, pose: relativePose(m), display };
  } finally {
    setSpeed(1);
    setConsoleSink(null);
    console.error = devError;
    for (const k of keys) setPressed(k.key, false);
  }
}
