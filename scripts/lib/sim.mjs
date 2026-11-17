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
