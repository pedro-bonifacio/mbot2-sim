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

let _catalogue   = [];
let _activeMapName = '';  // name of the currently loaded map

export async function initMapSelector() {
  const select = document.getElementById('map-select');
  if (!select) return;

  _catalogue = await getMapCatalogue();

  if (_catalogue.length === 0) {
    console.warn('[mapSelector] No maps found in catalogue; using blank canvas');
    appendConsoleMessage('Atenção: nenhum mapa encontrado em public/maps/.', 'warn');
    return;
  }

  // Populate dropdown: levels first, then free maps. Values: "level:<id>" / "map:<name>".
  select.innerHTML = '';
  const group = (label) => { const g = document.createElement('optgroup'); g.label = label; select.appendChild(g); return g; };
  const levelGroup = group(MSG.LEVEL_MENU_LEVELS);
  for (const level of listLevels()) {
    const opt = document.createElement('option');
    opt.value = `level:${level.id}`;
    opt.textContent = `${level.id} · ${level.title}`;
    levelGroup.appendChild(opt);
  }
  const mapGroup = group(MSG.LEVEL_MENU_MAPS);
  for (const { name } of _catalogue) {
    const opt       = document.createElement('option');
    opt.value       = `map:${name}`;
    opt.textContent = name;
    mapGroup.appendChild(opt);
  }

  // ?level=04-01 opens a level directly; otherwise the first free map.
  const wanted = new URLSearchParams(location.search).get('level');
  if (wanted && listLevels().some((l) => l.id === wanted)) {
    select.value = `level:${wanted}`;
    _selectLevel(wanted);
  } else {
    select.value = `map:${_catalogue[0].name}`;
    await _loadMap(_catalogue[0]);
  }

  select.addEventListener('change', () => {
    const [kind, name] = [select.value.slice(0, select.value.indexOf(':')), select.value.slice(select.value.indexOf(':') + 1)];
    const entry = kind === 'map' ? _catalogue.find(m => m.name === name) : null;
    if (kind === 'map' && !entry) return;

    if (!_stopIfRunning()) {
      select.value = _activeMapName;  // revert dropdown to what is loaded
      return;
    }
    if (kind === 'level') _selectLevel(name);
    else _loadMap(entry);
  });
}

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
 * Opens a level or a free map from the level selector, as the dropdown would
 * (asks before stopping a running program). Returns false if cancelled.
 */
export async function openFromSelector(kind, name) {
  if (!_stopIfRunning()) return false;
  const select = document.getElementById('map-select');
  if (kind === 'level') {
    if (select) select.value = `level:${name}`;
    _selectLevel(name);
  } else {
    const entry = _catalogue.find((m) => m.name === name);
    if (!entry) return false;
    if (select) select.value = `map:${entry.name}`;
    await _loadMap(entry);
  }
  return true;
}

/** The level's toolbox (beginner/expert) when it opens; the student can still switch. */
function _applyLevelToolbox(id) {
  const level = listLevels().find((l) => l.id === id);
  if (!level || !level.toolbox) return;
  setToolboxMode(level.toolbox);
  const sel = document.getElementById('toolbox-mode');
  if (sel) sel.value = level.toolbox;
}

function _selectLevel(id) {
  try {
    loadLevel(id);
    _applyLevelToolbox(id);
    _activeMapName = `level:${id}`;
  } catch (err) {
    console.error('[mapSelector] Failed to load level:', err);
    appendConsoleMessage(`Erro ao carregar o nível ${id}: ${err.message}`, 'error');
  }
}

/** Loads a catalogue map by file name (dev hooks). Resolves when it's on screen. */
export async function loadMapByName(name) {
  const entry = _catalogue.find((m) => m.name === name || m.name === String(name).replace(/\.png$/i, ''));
  if (!entry) throw new Error(`No map "${name}" (have: ${_catalogue.map((m) => m.name).join(', ')})`);
  const select = document.getElementById('map-select');
  if (select) select.value = `map:${entry.name}`;
  await _loadMap(entry);
}

/** Opens a level by id (dev hooks). */
export function loadLevelById(id) {
  const select = document.getElementById('map-select');
  if (select) select.value = `level:${id}`;
  loadLevel(id);
  _activeMapName = `level:${id}`;
}

export function getActiveMapName() { return _activeMapName; }

async function _loadMap(entry) {
  try {
    const mapInfo = await loadMapFromUrl(entry.url);
    clearLevel();
    setMapData(mapInfo);
    resizeCanvas(mapInfo);
    respawnRobot(mapInfo);
    resetCamera();
    _activeMapName = `map:${entry.name}`;
    console.log(`[mapSelector] Loaded "${entry.name}" — ${mapInfo.width}×${mapInfo.height} cm, spawn (${mapInfo.spawnX.toFixed(1)}, ${mapInfo.spawnY.toFixed(1)}), heading ${(mapInfo.spawnHeading * 180 / Math.PI).toFixed(1)}°`);
  } catch (err) {
    console.error('[mapSelector] Failed to load map:', err);
    appendConsoleMessage(`Erro ao carregar o mapa "${entry.name}": ${err.message}`, 'error');
  }
}
