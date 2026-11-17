import * as Blockly from 'blockly';
import { getWorkspace } from '../blockly/index.js';
import { RunState, getRunState, onRunStateChange } from '../runtime/runState.js';
import { stop as stopProgram } from '../runtime/runLoop.js';
import { warn as consoleWarn } from './console.js';
import { ensureStartBlock } from '../blockly/startBlock.js';
import { isOpenRobertaXml, openRobertaToBlocklyDom } from '../blockly/orFormat.js';

const STORAGE_KEY = 'mbot2sim:lastProgram:v2';  // v2: Open Roberta block format (decision 0011)
const DEBOUNCE_MS = 500;

let _debounceTimer = null;
let _autoSaveEnabled = true;

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
    try {
      localStorage.setItem(STORAGE_KEY, _serialize(ws));
    } catch (e) {
      console.warn('[programIO] localStorage quota exceeded; skipping auto-save', e);
    }
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

  // Auto-restore last saved program
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      _deserialize(ws, saved);
      ensureStartBlock(ws);
      console.log('[programIO] Workspace restored from localStorage');
    } catch (e) {
      console.error('[programIO] Auto-restore failed; clearing corrupt entry', e);
      localStorage.removeItem(STORAGE_KEY);
    }
  }

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
    const text = evt.target.result;
    try {
      // Parse and validate before touching the workspace. Accepts the sim's own
      // Blockly XML and programs exported from Open Roberta Lab.
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

      try {
        localStorage.setItem(STORAGE_KEY, _serialize(ws));
      } catch (e) {
        console.warn('[programIO] localStorage quota exceeded during load', e);
      }
    } catch (e) {
      console.error('[programIO] Load failed:', e);
      window.alert('Ficheiro inválido ou corrompido.');
    }
  };
  reader.readAsText(file);
}

export function newProgram() {
  const ws = getWorkspace();
  if (!ws) return;
  if (!window.confirm('Apagar programa atual? Isto não pode ser desfeito.')) return;
  ws.clear();
  ensureStartBlock(ws);
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {}
}
