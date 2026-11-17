import * as Blockly from 'blockly';
import { getWorkspace } from '../blockly/index.js';
import { RunState, getRunState, onRunStateChange } from '../runtime/runState.js';
import { stop as stopProgram } from '../runtime/runLoop.js';
import { warn as consoleWarn, appendConsoleMessage } from './console.js';
import { ptMessages as MSG } from '../i18n/pt.js';
import { ensureStartBlock } from '../blockly/startBlock.js';
import { onLevelChange, getLevelState, refreshLevelState } from '../levels/session.js';
import { FREE_SLOT, getProgram, setProgram, exportProgress, importProgress } from '../levels/progress.js';
import {
  isOpenRobertaXml, openRobertaToBlocklyDom, blocklyDomToOpenRoberta, openRobertaFilename,
} from '../blockly/orFormat.js';

// Every level keeps its own program, saved in progress.js (decision 0002); free maps
// share one, slot "livre". Opening a level saves the current program to its slot and
// loads the level's.
const DEBOUNCE_MS = 500;
const NAME_KEY = 'mbot2sim:studentName';   // remembered on this computer only (decision 0002)

let _debounceTimer = null;
let _autoSaveEnabled = true;
let _slot = FREE_SLOT;   // level id of the program in the editor, or "livre"

/** The slot (level id or "livre") of the program in the editor. */
export function currentSlot() { return _slot; }

let _warnedFull = false;
function _store(ws) {
  if (setProgram(_slot, _serialize(ws)) || _warnedFull) return;
  _warnedFull = true;   // once per page: storage full, blocked or private mode
  consoleWarn(MSG.PROGRESS_NOT_SAVED);
}

function _saveNow(ws) {
  clearTimeout(_debounceTimer);
  _store(ws);
}

/** Puts the slot's saved program in the editor (an empty program if none). */
function _showSlot(ws) {
  ws.clear();
  const saved = getProgram(_slot);
  if (saved) {
    try {
      _deserialize(ws, saved);
    } catch (e) {
      console.error(`[programIO] saved program for ${_slot} unreadable; starting empty`, e);
      ws.clear();
    }
  }
  ensureStartBlock(ws);
  ws.clearUndo();
}

function _switchSlot(ws, slot) {
  if (slot === _slot) return;
  _saveNow(ws);
  _slot = slot;
  _showSlot(ws);
}

function _serialize(ws) {
  const dom = Blockly.Xml.workspaceToDom(ws);
  return Blockly.Xml.domToText(dom);
}

function _deserialize(ws, xmlText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'application/xml');
  if (doc.querySelector('parsererror')) throw new Error('XML parse error');
  const root = doc.documentElement;
  if (root.nodeName !== 'xml') throw new Error(`Unexpected root element: ${root.nodeName}`);
  Blockly.Xml.domToWorkspace(root, ws);
}

function _scheduleAutoSave(ws) {
  if (!_autoSaveEnabled) return;
  clearTimeout(_debounceTimer);
  _debounceTimer = setTimeout(() => {
    if (!_autoSaveEnabled) return;
    _store(ws);
  }, DEBOUNCE_MS);
}

function _buildFilename() {
  const d = new Date();
  const p = n => String(n).padStart(2, '0');
  const date = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  const time = `${p(d.getHours())}${p(d.getMinutes())}`;
  return `mbot2-program-${date}-${time}.xml`;
}

export function initProgramIO() {
  const ws = getWorkspace();
  if (!ws) return;

  // Restore the saved program of whatever is open (a level from ?level=, or free maps)
  const st = getLevelState();
  _slot = st.level ? st.level.id : FREE_SLOT;
  _showSlot(ws);
  onLevelChange((s) => _switchSlot(ws, s.level ? s.level.id : FREE_SLOT));

  // Debounced auto-save on every meaningful workspace change
  ws.addChangeListener((e) => {
    if (e.isUiEvent) return;
    _scheduleAutoSave(ws);
  });

  // Pause auto-save while a program is running, resume when it stops
  onRunStateChange((state) => {
    const running = state === RunState.RUNNING || state === RunState.PAUSED_ASYNC;
    _autoSaveEnabled = !running;
    if (running) clearTimeout(_debounceTimer);
  });

  console.log('[programIO] initialised');
}

export function saveProgram() {
  const ws = getWorkspace();
  if (!ws) return;

  if (ws.getAllBlocks(false).length <= 1) {
    if (!window.confirm('O espaço de trabalho está vazio. Guardar mesmo assim?')) return;
  }

  const xml = _serialize(ws);
  const blob = new Blob([xml], { type: 'application/xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = _buildFilename();
  a.click();
  URL.revokeObjectURL(url);
}

function _download(text, filename, type = 'application/xml') {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** The program in Open Roberta's export format (mBot 2 configuration included). */
export function exportOpenRobertaText() {
  const ws = getWorkspace();
  return blocklyDomToOpenRoberta(Blockly.Xml.workspaceToDom(ws));
}

/**
 * "Exportar para Open Roberta": asks for the student's name (remembered locally)
 * and downloads `<Nome>_<levelId>.xml`, ready for "Importar programa" in Open
 * Roberta Lab (decision 0008).
 */
function _askName() {
  let saved = '';
  try { saved = localStorage.getItem(NAME_KEY) || ''; } catch (e) {}
  const name = window.prompt(MSG.PROGRAM_EXPORT_OR_NAME, saved);
  if (name === null) return null;                  // cancelled
  try { localStorage.setItem(NAME_KEY, name.trim()); } catch (e) {}
  return name.trim();
}

export function exportToOpenRoberta(levelId = _slot) {
  const ws = getWorkspace();
  if (!ws) return;
  const name = _askName();
  if (name === null) return;
  const filename = openRobertaFilename(name, levelId);
  _download(exportOpenRobertaText(), filename);
  appendConsoleMessage(MSG.PROGRAM_EXPORT_OR_DONE.replace('%1', filename));
}

export function loadProgramFromFile(file) {
  const ws = getWorkspace();
  if (!ws) return;

  const state = getRunState();
  if (state === RunState.RUNNING || state === RunState.PAUSED_ASYNC) {
    if (!window.confirm('Carregar um ficheiro irá parar o programa atual. Continuar?')) return;
    stopProgram();
  }

  if (ws.getAllBlocks(false).length > 1) {
    if (!window.confirm('Carregar este ficheiro irá substituir o programa atual. Continuar?')) return;
  }

  const reader = new FileReader();
  reader.onload = (evt) => {
    try {
      loadProgramText(evt.target.result);
    } catch (e) {
      console.error('[programIO] Load failed:', e);
      window.alert('Ficheiro inválido ou corrompido.');
    }
  };
  reader.readAsText(file);
}

/**
 * Replaces the workspace with a program (the sim's Blockly XML or an Open Roberta
 * export). No confirmations; throws on invalid input. Used by "Carregar" and the
 * dev hooks.
 */
export function loadProgramText(text) {
  const ws = getWorkspace();
  // Parse and validate before touching the workspace.
  let root;
  if (isOpenRobertaXml(text)) {
    root = openRobertaToBlocklyDom(text);
  } else {
    const doc = new DOMParser().parseFromString(text, 'application/xml');
    if (doc.querySelector('parsererror')) throw new Error('XML parse error');
    if (doc.documentElement.nodeName !== 'xml') throw new Error('Not a Blockly workspace XML');
    root = doc.documentElement;
  }

  const xmlBlockCount = root.querySelectorAll('block').length;
  ws.clear();
  Blockly.Xml.domToWorkspace(root, ws);
  ensureStartBlock(ws);
  const wsBlockCount = ws.getAllBlocks(false).length;

  if (wsBlockCount < xmlBlockCount) {
    const msg = 'Aviso: Alguns blocos do ficheiro não são suportados e foram ignorados.';
    consoleWarn(msg);
    console.warn('[programIO]', msg);
  }

  _saveNow(ws);
}

export function newProgram() {
  const ws = getWorkspace();
  if (!ws) return;
  if (!window.confirm('Apagar programa atual? Isto não pode ser desfeito.')) return;
  ws.clear();
  ensureStartBlock(ws);
  setProgram(_slot, null);
}

/**
 * "Guardar progresso": downloads every level's stars and program as one file
 * (`<Nome>_progresso_<data>.json`), to carry to another computer.
 */
export function exportProgressFile() {
  const ws = getWorkspace();
  if (ws) _saveNow(ws);
  const name = _askName();
  if (name === null) return;
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  const safe = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'aluno';
  const filename = `${safe}_progresso_${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}.json`;
  _download(JSON.stringify(exportProgress(name), null, 1), filename, 'application/json');
  appendConsoleMessage(MSG.PROGRESS_EXPORT_DONE.replace('%1', filename));
}

/** "Abrir progresso": merges a progress file (stars added, its programs replace the saved ones). */
export function importProgressFile(file) {
  const ws = getWorkspace();
  const state = getRunState();
  if (state === RunState.RUNNING || state === RunState.PAUSED_ASYNC) stopProgram();
  if (!window.confirm(MSG.PROGRESS_IMPORT_CONFIRM)) return;
  const reader = new FileReader();
  reader.onload = (evt) => {
    let counts;
    try {
      if (ws) _saveNow(ws);
      counts = importProgress(JSON.parse(evt.target.result));
    } catch (e) {
      console.error('[programIO] progress import failed:', e);
      window.alert(MSG.PROGRESS_IMPORT_ERROR);
      return;
    }
    if (ws) _showSlot(ws);   // the file may hold a newer program for what is open
    refreshLevelState();
    appendConsoleMessage(MSG.PROGRESS_IMPORT_DONE.replace('%1', counts.stars).replace('%2', counts.programs));
  };
  reader.readAsText(file);
}
