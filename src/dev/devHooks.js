import * as Blockly from 'blockly';
import { getWorkspace, setToolboxMode } from '../blockly/index.js';
import { loadProgramText, exportOpenRobertaText } from '../ui/programIO.js';
import { loadMapByName, getActiveMapName } from '../ui/mapSelector.js';
import { RunState, getRunState } from '../runtime/runState.js';
import { robot, getSpawn } from '../sim/robot.js';
import { ledState } from '../sim/leds.js';
import { getDisplayState } from '../ui/display.js';
import { setConsoleSink } from '../ui/console.js';
import { setPressed } from '../ui/buttons.js';
import { relativePose } from '../runtime/headless.js';
import { programSeed } from '../sim/random.js';
import { FieldClickableLabel } from '../blockly/blocks/_plusMinusMutator.js';
import { syncBlocks } from '../blockly/blocks/_varScope.js';

// window.__dev — automated checks of the real editor and run loop, driven from the
// browser console or by the assistant via page JS evaluation. Every function returns
// plain JSON (no screenshots needed). Dev server only: main.js imports this behind
// import.meta.env.DEV, so production builds don't contain it.
//
//   await __dev.load('scripts/fixtures/teste-2-funcao.xml')   program file from the dev server
//   __dev.tree()                     program as indented text: type#id fields, warnings (⚠)
//   __dev.click('ab12', '+')         real pointer click on a block's "+"/"−" (id prefix)
//   __dev.setField('ab12', 'VAR', 'contador')
//   __dev.undo() / __dev.redo()
//   __dev.flyout('Variáveis')        open a toolbox category; list what it offers
//   __dev.fromFlyout('Funções', 3)   create flyout item #3 on the workspace (as a drag would)
//   __dev.connect('ab12', 'cd34', 'next' | 'INPUTNAME')
//   await __dev.run({ timeoutMs, keys: [{ key: 'A', at: 0.5 }] })   press Executar, wait for the end
//   __dev.state()                    run state, pose, display, LEDs, console, errors
//   await __dev.map('default.png')
//   __dev.exportOR()                 the program as "Exportar para Open Roberta" writes it
//
// Everything after load() is cleared by load() / reset(): console capture and errors.

const ws = () => getWorkspace();
const short = (id) => id.slice(0, 4);

const captured = { console: [], errors: [] };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Waits for Blockly's queued change events (and the sync listener), then returns tree(). */
async function settled() {
  await sleep(30);
  return tree();
}

function captureErrors() {
  const origError = console.error.bind(console);
  console.error = (...args) => {
    captured.errors.push(args.map((a) => (a && a.message) || String(a)).join(' '));
    origError(...args);
  };
  window.addEventListener('error', (e) => captured.errors.push('window.onerror: ' + e.message));
  window.addEventListener('unhandledrejection', (e) => captured.errors.push('unhandled: ' + ((e.reason && e.reason.message) || e.reason)));
  setConsoleSink((text, level) => captured.console.push(level === 'info' ? text : `${level}: ${text}`));
}

function reset() {
  captured.console.length = 0;
  captured.errors.length = 0;
}

function block(idPrefix) {
  const matches = ws().getAllBlocks(false).filter((b) => b.id.startsWith(idPrefix));
  if (matches.length !== 1) throw new Error(`${matches.length} blocks match id "${idPrefix}"`);
  return matches[0];
}

// ── Program as text ────────────────────────────────────────────────────────

function fieldsText(b) {
  const out = [];
  for (const input of b.inputList) {
    for (const f of input.fieldRow) {
      if (f instanceof FieldClickableLabel) out.push(`[${f.getText()}]`);   // +/− buttons
      else if (f.name && f.isVisible()) out.push(`${f.name}=${f.getValue()}`);
    }
  }
  return out.join(' ');
}

function blockLine(b) {
  const flags = [];
  if (!b.isEnabled()) flags.push('disabled');
  if (b.robWarning_) flags.push(`⚠ ${b.robWarning_}`);
  const m = b.mutationToDom && b.mutationToDom();
  const attrs = m ? Array.from(m.attributes).map((a) => `${a.name}=${a.value}`) : [];
  const args = m ? Array.from(m.children).filter((c) => c.nodeName.toLowerCase() === 'arg') : [];
  if (args.length) attrs.push('args=' + args.map((a) => `${a.getAttribute('name')}:${a.getAttribute('type')}`).join(','));
  const mut = attrs.join(',');
  return `${b.type}#${short(b.id)} ${fieldsText(b)}${mut ? ` {${mut}}` : ''}${flags.length ? '  ' + flags.join('; ') : ''}`.trimEnd();
}

function describe(b, indent, lines) {
  for (let cur = b; cur; cur = cur.getNextBlock()) {
    lines.push(indent + blockLine(cur));
    for (const input of cur.inputList) {
      const child = input.connection && input.connection.targetBlock();
      if (!child) {
        if (input.type === Blockly.inputs.inputTypes.VALUE) lines.push(`${indent}  ${input.name}= ∅`);
        continue;
      }
      if (input.type === Blockly.inputs.inputTypes.STATEMENT) {
        lines.push(`${indent}  ${input.name}:`);
        describe(child, indent + '    ', lines);
      } else {
        const sub = [];
        describe(child, '', sub);
        lines.push(`${indent}  ${input.name}= ${sub.join(' | ')}`);
      }
    }
  }
}

function tree() {
  const lines = [];
  for (const top of ws().getTopBlocks(true)) describe(top, '', lines);
  return lines.join('\n');
}

// ── Interaction ────────────────────────────────────────────────────────────

/** Real pointer click on a block's "+"/"−" field (same path as a mouse click). */
async function click(idPrefix, text) {
  const b = block(idPrefix);
  const field = b.inputList.flatMap((i) => i.fieldRow).find((f) => f instanceof FieldClickableLabel && f.getText() === text);
  if (!field) throw new Error(`block ${idPrefix} has no "${text}" button`);
  const target = field.getClickTarget_ ? field.getClickTarget_() : field.getSvgRoot();
  const r = target.getBoundingClientRect();
  const opts = { bubbles: true, cancelable: true, clientX: r.x + r.width / 2, clientY: r.y + r.height / 2,
    pointerId: 1, pointerType: 'mouse', isPrimary: true, button: 0, buttons: 1 };
  target.dispatchEvent(new PointerEvent('pointerdown', opts));
  target.dispatchEvent(new PointerEvent('pointerup', { ...opts, buttons: 0 }));
  document.dispatchEvent(new PointerEvent('pointerup', { ...opts, buttons: 0 }));
  return settled();
}

async function setField(idPrefix, name, value) {
  block(idPrefix).setFieldValue(value, name);
  return settled();
}

async function connect(childPrefix, parentPrefix, where = 'next') {
  const child = block(childPrefix);
  const parent = block(parentPrefix);
  const conn = where === 'next' ? parent.nextConnection : parent.getInput(where)?.connection;
  if (!conn) throw new Error(`block ${parentPrefix} has no "${where}" connection`);
  conn.connect(child.previousConnection || child.outputConnection);
  return settled();
}

function selectCategory(name) {
  const toolbox = ws().getToolbox();
  const item = toolbox.getToolboxItems().find((i) => i.getName && i.getName() === name);
  if (!item) throw new Error(`no toolbox category "${name}"`);
  toolbox.clearSelection();
  toolbox.setSelectedItem(item);
  return toolbox.getFlyout();
}

/** Opens a category and lists its flyout: "#n type fields" or "label: text". */
function flyout(name) {
  const fly = selectCategory(name);
  const items = fly.getContents ? fly.getContents() : [];
  return items.map((it, i) => {
    if (it.type === 'block') return `#${i} ${blockLine(it.block)}`;
    const btn = it.button;
    return `#${i} label: ${btn && btn.getButtonText ? btn.getButtonText() : (btn && btn.text) || ''}`;
  }).join('\n');
}

/** Creates flyout item #n on the workspace, through the flyout (as a drag does). */
async function fromFlyout(name, index) {
  const fly = selectCategory(name);
  const item = fly.getContents()[index];
  if (!item || item.type !== 'block') throw new Error(`flyout "${name}" item #${index} is not a block`);
  const created = fly.createBlock(item.block);
  ws().getToolbox().clearSelection();
  await settled();
  return blockLine(created);
}

// ── Running ────────────────────────────────────────────────────────────────

function state() {
  const display = getDisplayState();
  return {
    run: getRunState(),
    seed: programSeed(),             // replay with: npm run sim -- <program> --seed <seed>
    map: getActiveMapName(),
    pose: relativePose(getSpawn()),
    display: display.text.map((d) => (d.col ? `${d.row}:${d.col} ${d.text}` : `${d.row} ${d.text}`)),
    leds: ledState.some((l) => l.on) ? ledState.map((l) => (l.on ? l.colour : null)) : undefined,
    console: captured.console.slice(),
    errors: captured.errors.slice(),
  };
}


/** Presses Executar (real button) and waits for the program to end (real time). */
async function run({ timeoutMs = 20000, keys = [] } = {}) {
  captured.console.length = 0;
  document.getElementById('btn-run').click();
  const t0 = performance.now();
  const active = () => [RunState.RUNNING, RunState.PAUSED_ASYNC].includes(getRunState());
  while (performance.now() - t0 < timeoutMs) {
    const t = (performance.now() - t0) / 1000;
    for (const k of keys) setPressed(k.key, t >= k.at && t < k.at + (k.for ?? 0.2));
    await sleep(16);
    if (!active() && performance.now() - t0 > 50) break;
  }
  for (const k of keys) setPressed(k.key, false);
  const timedOut = active();
  if (timedOut) document.getElementById('btn-stop').click();
  return { ...state(), timedOut, seconds: Math.round((performance.now() - t0) / 100) / 10 };
}

async function load(path) {
  const res = await fetch('/' + path.replace(/^\//, ''));
  if (!res.ok) throw new Error(`GET ${path}: ${res.status}`);
  loadProgramText(await res.text());
  reset();
  return settled();
}

export function installDevHooks() {
  captureErrors();
  window.__dev = {
    load, tree, click, setField, connect, flyout, fromFlyout, state, run, reset,
    map: loadMapByName,
    mode: (m) => { setToolboxMode(m); document.getElementById('toolbox-mode').value = m; return m; },
    undo: () => { ws().undo(false); return settled(); },
    redo: () => { ws().undo(true); return settled(); },
    block: (id) => blockLine(block(id)),
    xml: () => Blockly.Xml.domToText(Blockly.Xml.workspaceToDom(ws())),
    exportOR: () => exportOpenRobertaText(),
    sync: () => { syncBlocks(ws()); return tree(); },   // run the sync listener's work directly
    get ws() { return ws(); },
  };
  console.log('[dev] window.__dev ready (dev server only)');
}
