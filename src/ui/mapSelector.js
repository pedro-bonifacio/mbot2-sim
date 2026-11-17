import { getMapCatalogue } from '../sim/mapCatalogue.js';
import { loadMapFromUrl }  from '../sim/mapLoader.js';
import { setMapData }      from '../sim/map.js';
import { respawnRobot }    from '../sim/robot.js';
import { resizeCanvas, resetCamera, resetSim, resumeSim } from '../sim/canvas.js';
import { stop as stopProgram } from '../runtime/runLoop.js';
import { RunState, getRunState } from '../runtime/runState.js';
import { appendConsoleMessage } from './console.js';
import { listLevels, loadLevel, clearLevel } from '../levels/session.js';
import { setToolboxMode } from '../blockly/index.js';
import { ptMessages as MSG } from '../i18n/pt.js';

// What is on the canvas: a level or a free map (chosen in "★ Níveis",
// src/ui/levelSelector.js). Opens ?level=<id>, else whatever was open last time on
// this computer, else the first free map. The top bar names what is open.

const LAST_KEY = 'mbot2sim:lastOpen';   // "level:04-01" / "map:<name>", this browser only

let _catalogue = [];
let _active = '';   // "level:<id>" / "map:<name>"

const fmt = (s, ...a) => a.reduce((t, v, i) => t.replace(`%${i + 1}`, v), s);

export async function initMapSelector() {
  _catalogue = await getMapCatalogue();
  const levels = listLevels();

  const wanted = new URLSearchParams(location.search).get('level');
  let last = '';
  try { last = localStorage.getItem(LAST_KEY) || ''; } catch (e) {}
  const [kind, name] = split(last);

  if (wanted && levels.some((l) => l.id === wanted)) return _selectLevel(wanted);
  if (kind === 'level' && levels.some((l) => l.id === name)) return _selectLevel(name);
  const entry = (kind === 'map' && _catalogue.find((m) => m.name === name)) || _catalogue[0];
  if (entry) return _loadMap(entry);

  console.warn('[mapSelector] No maps found in catalogue; using blank canvas');
  appendConsoleMessage(MSG.MAP_NONE_FOUND, 'warn');
}

const split = (v) => { const i = v.indexOf(':'); return i < 0 ? ['', ''] : [v.slice(0, i), v.slice(i + 1)]; };

/** Asks before stopping a running program; false = the student cancelled. */
function _stopIfRunning() {
  const state = getRunState();
  if (state !== RunState.RUNNING && state !== RunState.PAUSED_ASYNC) return true;
  if (!window.confirm(MSG.MAP_CHANGE_CONFIRM)) return false;
  stopProgram();
  resetSim();
  resumeSim();
  return true;
}

/** The free maps (name, url), for the level selector. */
export function listFreeMaps() { return _catalogue.slice(); }

/**
 * Opens a level or a free map (level selector, "Próximo nível"); asks before
 * stopping a running program. Returns false if cancelled.
 */
export async function openFromSelector(kind, name) {
  if (!_stopIfRunning()) return false;
  if (kind === 'level') return _selectLevel(name);
  const entry = _catalogue.find((m) => m.name === name);
  if (!entry) return false;
  return _loadMap(entry);
}

/** The level's toolbox (beginner/expert) when it opens; the student can still switch. */
function _applyLevelToolbox(id) {
  const level = listLevels().find((l) => l.id === id);
  if (!level || !level.toolbox) return;
  setToolboxMode(level.toolbox);
  const sel = document.getElementById('toolbox-mode');
  if (sel) sel.value = level.toolbox;
}

function _setActive(value, label) {
  _active = value;
  try { localStorage.setItem(LAST_KEY, value); } catch (e) {}
  const el = document.getElementById('current-map');
  if (el) { el.textContent = label; el.title = label; }
}

function _selectLevel(id) {
  try {
    loadLevel(id);
    _applyLevelToolbox(id);
    const level = listLevels().find((l) => l.id === id);
    _setActive(`level:${id}`, fmt(MSG.CURRENT_LEVEL, id, level.title));
    return true;
  } catch (err) {
    console.error('[mapSelector] Failed to load level:', err);
    appendConsoleMessage(fmt(MSG.LEVEL_LOAD_ERROR, id, err.message), 'error');
    return false;
  }
}

/** Loads a catalogue map by file name (dev hooks). Resolves when it's on screen. */
export async function loadMapByName(name) {
  const entry = _catalogue.find((m) => m.name === name || m.name === String(name).replace(/\.png$/i, ''));
  if (!entry) throw new Error(`No map "${name}" (have: ${_catalogue.map((m) => m.name).join(', ')})`);
  await _loadMap(entry);
}

/** Opens a level by id (dev hooks). */
export function loadLevelById(id) { _selectLevel(id); }

export function getActiveMapName() { return _active; }

async function _loadMap(entry) {
  try {
    const mapInfo = await loadMapFromUrl(entry.url);
    clearLevel();
    setMapData(mapInfo);
    resizeCanvas(mapInfo);
    respawnRobot(mapInfo);
    resetCamera();
    _setActive(`map:${entry.name}`, fmt(MSG.CURRENT_MAP, entry.name));
    console.log(`[mapSelector] Loaded "${entry.name}" — ${mapInfo.width}×${mapInfo.height} cm, spawn (${mapInfo.spawnX.toFixed(1)}, ${mapInfo.spawnY.toFixed(1)}), heading ${(mapInfo.spawnHeading * 180 / Math.PI).toFixed(1)}°`);
    return true;
  } catch (err) {
    console.error('[mapSelector] Failed to load map:', err);
    appendConsoleMessage(fmt(MSG.MAP_LOAD_FAILED, entry.name, err.message), 'error');
    return false;
  }
}
