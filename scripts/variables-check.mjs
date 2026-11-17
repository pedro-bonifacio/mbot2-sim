#!/usr/bin/env node
// Open Roberta-style typed variables and functions, headless:
//   1. import an Open Roberta program (scripts/fixtures/variables-functions.xml),
//      generate JavaScript, run it in JS-Interpreter and compare the serial output;
//   2. drive the editor operations (+ / − / rename / type change) and check that
//      references, call arguments and flyouts follow.
//
// Usage: node scripts/variables-check.mjs [--verbose]

import * as Blockly from 'blockly';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Interpreter from 'js-interpreter';
import { JSDOM } from 'jsdom';

const { window } = new JSDOM('');
globalThis.DOMParser = window.DOMParser;
globalThis.document = window.document;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { registerAllBlocks } = await import(path.join(ROOT, 'src/blockly/index.js'));
const { generateCode } = await import(path.join(ROOT, 'src/codegen/index.js'));
const { openRobertaToBlocklyDom } = await import(path.join(ROOT, 'src/blockly/orFormat.js'));
const { syncBlocks } = await import(path.join(ROOT, 'src/blockly/blocks/_varScope.js'));
const { variableFlyout, procedureFlyout } = await import(path.join(ROOT, 'src/blockly/toolboxes/dynamic.js'));
registerAllBlocks();

const verbose = process.argv.includes('--verbose');
const failures = [];
const check = (label, cond, detail = '') => { if (!cond) failures.push(`${label}${detail ? ': ' + detail : ''}`); };

function run(code) {
  const out = [];
  const interp = new Interpreter(code, (it, global) => {
    const api = it.nativeToPseudo({});
    it.setProperty(global, 'robotAPI', api);
    it.setProperty(api, 'serial_print', it.createNativeFunction((x) => { out.push(String(it.pseudoToNative(x))); }));
  });
  let steps = 0;
  while (interp.step()) if (++steps > 1e6) throw new Error('program did not finish');
  return out;
}

const flyoutText = (items) => items.map((el) => {
  const f = el.querySelector && el.querySelector('field');
  const m = el.querySelector && el.querySelector('mutation');
  return `${el.getAttribute('type') || 'label'}${f ? ':' + f.textContent : ''}${m && m.getAttribute('name') ? ':' + m.getAttribute('name') : ''}`;
});

// ── 1. Import → generate → run ─────────────────────────────────────────────
{
  const ws = new Blockly.Workspace();
  const text = fs.readFileSync(path.join(ROOT, 'scripts/fixtures/variables-functions.xml'), 'utf8');
  Blockly.Xml.domToWorkspace(openRobertaToBlocklyDom(text), ws);
  syncBlocks(ws);
  const code = generateCode(ws);
  if (verbose) console.log(code);
  try {
    const out = run(code);
    check('fixture output', out.join(',') === '12996,114', out.join(','));
  } catch (e) {
    failures.push('fixture run: ' + e.message);
  }
  const call = ws.getBlocksByType('robProcedures_callreturn', false)[0];
  check('callreturn output type', call.outputConnection.getCheck()?.[0] === 'Number');
  check('callreturn arg connected', !!call.getInputTargetBlock('ARG0'));
  const vars = flyoutText(variableFlyout(ws));
  check('variable flyout', vars.join(' ') ===
    'variables_set:contador variables_get:contador variables_set:lista variables_get:lista ' +
    'variables_set:lado variables_get:lado variables_set:x variables_get:x variables_set:item variables_get:item', vars.join(' '));
  const procs = flyoutText(procedureFlyout(ws));
  check('procedure flyout', procs.join(' ') ===
    'robProcedures_defnoreturn robProcedures_defreturn robProcedures_ifreturn ' +
    'robProcedures_callnoreturn:quadrado robProcedures_callreturn:dobro', procs.join(' '));
  // Round trip through Blockly XML keeps Open Roberta's mutations.
  const xml = Blockly.Xml.domToText(Blockly.Xml.workspaceToDom(ws));
  for (const s of ['declare="true"', 'declaration_type="Array_Number"', 'datatype="Number"',
    'return_type="Number"', '<arg name="x" type="Number"', 'output_type="Number"']) {
    check('serialised ' + s, xml.includes(s));
  }
  ws.dispose();
}

// ── 2. Editor operations ────────────────────────────────────────────────────
{
  const ws = new Blockly.Workspace();
  const start = ws.newBlock('robControls_start');
  start.plus_();
  start.plus_();
  const [d1, d2] = ws.getBlocksByType('robGlobalVariables_declare', false);
  check('global names', d1.getFieldValue('VAR') === 'item' && d2.getFieldValue('VAR') === 'item2',
    `${d1.getFieldValue('VAR')}, ${d2.getFieldValue('VAR')}`);
  check('start declare', start.declare_ && start.getInput('ST'));
  check('default value Number', d1.getInputTargetBlock('VALUE')?.type === 'math_number');

  const flyEmpty = flyoutText(variableFlyout(new Blockly.Workspace()));
  check('empty variable flyout shows hint', flyEmpty[0] === 'label', flyEmpty.join(' '));

  // Type change replaces the value with the type's default.
  d2.setFieldValue('Array_Colour', 'TYPE');
  const list = d2.getInputTargetBlock('VALUE');
  check('Array_Colour default', list?.type === 'robLists_create_with' && list.itemCount_ === 3 &&
    list.getInputTargetBlock('ADD0')?.type === 'robColour_picker', list && list.type);

  // References follow renames; types follow the declaration.
  const set = ws.newBlock('variables_set');
  set.setFieldValue('item', 'VAR');
  start.nextConnection.connect(set.previousConnection);
  const get = ws.newBlock('variables_get');
  get.setFieldValue('item', 'VAR');
  set.getInput('VALUE').connection.connect(get.outputConnection);
  syncBlocks(ws);
  check('get typed', get.outputConnection.getCheck()?.[0] === 'Number');
  d1.setFieldValue('contador', 'VAR');
  check('rename follows', set.getFieldValue('VAR') === 'contador' && get.getFieldValue('VAR') === 'contador');
  d2.setFieldValue('contador', 'VAR');
  check('duplicate name made unique', d2.getFieldValue('VAR') === 'contador2', d2.getFieldValue('VAR'));
  d2.setFieldValue('2bad name', 'VAR');
  check('invalid name rejected', d2.getFieldValue('VAR') === 'contador2');

  // Functions: + adds a parameter; calls follow.
  const def = ws.newBlock('robProcedures_defnoreturn');
  def.setFieldValue('anda', 'NAME');
  def.plus_();
  const param = ws.getBlocksByType('robLocalVariables_declare', false)[0];
  check('param name', param.getFieldValue('VAR') === 'x', param.getFieldValue('VAR'));
  check('def shows "com:"', def.getFieldValue('WITH') === 'com:');
  const call = ws.newBlock('robProcedures_callnoreturn');
  call.setProcName_('anda');
  set.nextConnection.connect(call.previousConnection);
  syncBlocks(ws);
  check('call gets ARG0', !!call.getInput('ARG0') && call.arguments_[0] === 'x');
  const n = ws.newBlock('math_number');
  call.getInput('ARG0').connection.connect(n.outputConnection);
  param.setFieldValue('passos', 'VAR');
  syncBlocks(ws);
  check('renamed param keeps value', call.arguments_[0] === 'passos' && call.getInputTargetBlock('ARG0') === n);
  def.setFieldValue('andar', 'NAME');
  check('rename function renames calls', call.getProcedureCall() === 'andar');

  // − removes the declaration and its references.
  d1.remove_();
  check('remove declaration', !ws.getBlockById(d1.id) && !ws.getBlockById(set.id) && !ws.getBlockById(get.id));
  d2.remove_();
  check('last global removes ST', !start.declare_ && !start.getInput('ST'));
  param.remove_();
  check('last param removes ST', !def.declare_ && !def.getInput('ST'));
  syncBlocks(ws);
  check('call loses ARG0', !call.getInput('ARG0'));

  // Deleting a definition removes its calls (Open Roberta behaviour).
  def.dispose(false);
  syncBlocks(ws, true);
  check('call removed with definition', !ws.getBlockById(call.id));

  const code = generateCode(ws);
  try { new Interpreter(code); } catch (e) { failures.push('editor program: ' + e.message); }
  ws.dispose();
}

console.log(`variables check: ${failures.length} failures`);
for (const f of failures) console.log('  - ' + f);
process.exit(failures.length ? 1 : 0);
