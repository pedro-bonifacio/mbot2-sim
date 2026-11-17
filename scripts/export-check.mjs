#!/usr/bin/env node
// "Exportar para Open Roberta", headless:
//   1. a real Open Roberta Lab export, imported into the sim and exported again, must
//      come out identical to the original (program and configuration), ids included;
//   2. every Open Roberta fixture survives import → export → import with the same
//      generated JavaScript, and a second export is identical to the first;
//   3. exports have no shadow blocks, no Blockly-only markup, and every hidden port
//      carries its <hide> tag;
//   4. file names are <Nome>_<levelId>.xml in plain ASCII.
//
// Usage: node scripts/export-check.mjs [--verbose] [--write <dir>]
//   --write <dir>  also save each export there (to validate on Open Roberta's server).

import * as Blockly from 'blockly';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { JSDOM } from 'jsdom';

const { window } = new JSDOM('');
globalThis.DOMParser = window.DOMParser;
globalThis.XMLSerializer = window.XMLSerializer;
globalThis.document = window.document;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { registerAllBlocks } = await import(path.join(ROOT, 'src/blockly/index.js'));
const { generateCode } = await import(path.join(ROOT, 'src/codegen/index.js'));
const { openRobertaToBlocklyDom, blocklyDomToOpenRoberta, openRobertaFilename } =
  await import(path.join(ROOT, 'src/blockly/orFormat.js'));
const { syncBlocks } = await import(path.join(ROOT, 'src/blockly/blocks/_varScope.js'));
const { OR } = await import(path.join(ROOT, 'src/blockly/generated/orSpecs.js'));
registerAllBlocks();

const verbose = process.argv.includes('--verbose');
const writeIdx = process.argv.indexOf('--write');
const writeDir = writeIdx > 0 ? process.argv[writeIdx + 1] : null;
if (writeDir) fs.mkdirSync(writeDir, { recursive: true });

const failures = [];
const check = (label, cond, detail = '') => { if (!cond) failures.push(`${label}${detail ? ': ' + detail : ''}`); };

/** OR text → sim workspace → OR text, plus the JavaScript the sim generates. */
function roundTrip(text) {
  const ws = new Blockly.Workspace();
  Blockly.Xml.domToWorkspace(openRobertaToBlocklyDom(text), ws);
  syncBlocks(ws);
  const code = generateCode(ws);
  const exported = blocklyDomToOpenRoberta(Blockly.Xml.workspaceToDom(ws));
  ws.dispose();
  return { code, exported };
}

/** Canonical text of an XML element: attributes sorted, whitespace between tags dropped. */
function canon(el) {
  const attrs = Array.from(el.attributes).filter((a) => a.name !== 'xmlns')
    .map((a) => `${a.name}="${a.value}"`).sort().join(' ');
  const kids = Array.from(el.childNodes).map((c) =>
    c.nodeType === 1 ? canon(c) : c.nodeType === 3 ? c.nodeValue.trim() : '').join('');
  return `<${el.localName}${attrs ? ' ' + attrs : ''}>${kids}</${el.localName}>`;
}
const parse = (text) => new DOMParser().parseFromString(text, 'application/xml').documentElement;
const part = (root, name) => Array.from(root.children).find((c) => c.localName === name);

/** First differing position of two strings, with context. */
function firstDiff(a, b) {
  let i = 0;
  while (i < a.length && a[i] === b[i]) i++;
  return `at ${i}:\n    original: …${a.slice(Math.max(0, i - 80), i + 80)}\n    exported: …${b.slice(Math.max(0, i - 80), i + 80)}`;
}

function structuralChecks(label, exported) {
  const root = parse(exported);
  check(`${label}: root is <export>`, root.localName === 'export');
  const bs = part(part(root, 'program') || root, 'block_set');
  check(`${label}: program block_set robottype=mbot2`, bs && bs.getAttribute('robottype') === 'mbot2');
  check(`${label}: has <config>`, !!part(root, 'config'));
  check(`${label}: no <shadow>`, root.getElementsByTagName('shadow').length === 0);
  check(`${label}: no <next>`, root.getElementsByTagName('next').length === 0);
  check(`${label}: no <data>/<variables>`,
    root.getElementsByTagName('data').length === 0 && root.getElementsByTagName('variables').length === 0);
  for (const b of Array.from(bs.getElementsByTagName('block'))) {
    const type = b.getAttribute('type');
    const port = Array.from(b.children).find((c) => c.localName === 'field' && c.getAttribute('name') === 'SENSORPORT');
    const hide = (OR.blocks[type] || OR.extraTypes[type] || {}).hide
      || (type === 'robSensors_getSample' && port && port.textContent.startsWith('_')
        ? { name: 'SENSORPORT', value: port.textContent } : null);
    if (!hide) continue;
    const tag = Array.from(b.children).find((c) => c.localName === 'hide');
    check(`${label}: ${type} has <hide ${hide.name}=${hide.value}>`,
      tag && tag.getAttribute('name') === hide.name && tag.getAttribute('value') === hide.value);
  }
}

// ── 1. A real Open Roberta export comes back unchanged ─────────────────────
{
  const file = 'reference_openroberta/export-samples/openroberta/01-simples.xml';
  const original = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const { exported } = roundTrip(original);
  for (const name of ['program', 'config']) {
    const a = canon(part(parse(original), name));
    const b = canon(part(parse(exported), name));
    check(`01-simples ${name} identical to Open Roberta's export`, a === b, a === b ? '' : firstDiff(a, b));
  }
  // Byte for byte, too (ids, attribute order, empty-element style, namespaces).
  check('01-simples byte-identical to Open Roberta\'s export', exported === original.trim(),
    exported === original.trim() ? '' : firstDiff(original.trim(), exported));
  structuralChecks('01-simples', exported);
  if (writeDir) fs.writeFileSync(path.join(writeDir, '01-simples.xml'), exported);
}

// ── 1b. Every block as Open Roberta serialises it comes back unchanged ─────
// The catalogue stores OR's own XML for every toolbox block; the dynamic file for
// every sensor mode, generic-sensor type and mutation shape.
let orBlockCount = 0;
{
  const samples = new Map();   // canonical-free key → xml
  const collect = (v, where) => {
    if (Array.isArray(v)) v.forEach((x, i) => collect(x, `${where}[${i}]`));
    else if (v && typeof v === 'object') {
      if (typeof v.xml === 'string' && v.xml.startsWith('<block')) samples.set(v.xml, `${where} ${v.type || ''}`);
      for (const [k, x] of Object.entries(v)) if (k !== 'xml') collect(x, `${where}.${k}`);
    }
  };
  const cat = JSON.parse(fs.readFileSync(path.join(ROOT, 'reference_openroberta/live/or-mbot2-catalogue.json'), 'utf8'));
  const dyn = JSON.parse(fs.readFileSync(path.join(ROOT, 'reference_openroberta/live/or-mbot2-dynamic.json'), 'utf8'));
  collect(cat.toolboxes, 'toolbox');
  collect(dyn, 'dynamic');
  for (const [xml, where] of samples) {
    const wrapped = `<export xmlns="http://de.fhg.iais.roberta.blockly"><program><block_set xmlns="http://de.fhg.iais.roberta.blockly" robottype="mbot2" xmlversion="3.1" description="" tags=""><instance x="0" y="0">${xml}</instance></block_set></program></export>`;
    let exported;
    try { ({ exported } = roundTrip(wrapped)); } catch (e) { check(`${where}: round trip`, false, e.message); continue; }
    // The sim keeps colours lowercase (CLAUDE.md §10); Open Roberta compares RGB values.
    const want = canon(parse(xml)).replace(/(<field name="COLOUR">)(#[0-9A-Fa-f]{6})/g, (m, a, c) => a + c.toLowerCase());
    const inst = part(part(part(parse(exported), 'program'), 'block_set'), 'instance');
    const got = inst && inst.children[0] ? canon(inst.children[0]) : '(nothing exported)';
    check(`${where}: identical to Open Roberta's XML`, want === got, want === got ? '' : firstDiff(want, got));
    orBlockCount++;
  }
}

// ── 2. Fixtures: import → export → import keeps behaviour; export is stable ─
const fixtures = fs.readdirSync(path.join(ROOT, 'scripts/fixtures'))
  .filter((f) => f.endsWith('.xml')).map((f) => path.join('scripts/fixtures', f));
for (const file of fixtures) {
  const label = path.basename(file, '.xml');
  const first = roundTrip(fs.readFileSync(path.join(ROOT, file), 'utf8'));
  const second = roundTrip(first.exported);
  check(`${label}: same JavaScript after export → import`, first.code === second.code,
    first.code === second.code ? '' : firstDiff(first.code, second.code));
  check(`${label}: second export identical to first`, first.exported === second.exported,
    first.exported === second.exported ? '' : firstDiff(first.exported, second.exported));
  structuralChecks(label, first.exported);
  if (writeDir) fs.writeFileSync(path.join(writeDir, `${label}.xml`), first.exported);
  if (verbose) console.log(`${label}:\n${first.exported}\n`);
}

// ── 2b. Round trip through Open Roberta's server ───────────────────────────
// scripts/fixtures/from-openroberta/<name>.xml is the program XML Open Roberta's server
// stored after importing the sim's export of <name> (lab.open-roberta.org, 2026-11-17;
// all but the deliberately broken teste-4-erros also passed its source generation).
// It must hold the same program, and behave the same once back in the sim.
const serverDir = path.join(ROOT, 'scripts/fixtures/from-openroberta');
const sourceOf = (name) => name === '01-simples'
  ? 'reference_openroberta/export-samples/openroberta/01-simples.xml'
  : `scripts/fixtures/${name}.xml`;
// What Open Roberta's server adds or rewrites on import, all harmless: a neural-network
// <data> blob on the start block, LED SLOT "ALL" written as "", and no return_type on
// "se … retorna" (OR's client writes it as the sim does; the sim re-derives it from the
// enclosing function).
// Ids are ignored: the hand-written fixtures have none, so Blockly makes new ones each run.
const serverCanon = (el) => canon(el)
  .replace(/ id="[^"]*"/g, '')
  .replace(/<data>[\s\S]*?<\/data>/g, '')
  .replace(/(type="robProcedures_ifreturn"><mutation) return_type="[^"]*"/g, '$1')
  .replace(/(type="actions_rgbLed_hidden_o(?:n|ff)_mbot2"><field name="SLOT">)ALL</g, '$1<');
let serverCount = 0;
for (const f of fs.existsSync(serverDir) ? fs.readdirSync(serverDir).filter((x) => x.endsWith('.xml')) : []) {
  const name = path.basename(f, '.xml');
  const ours = roundTrip(fs.readFileSync(path.join(ROOT, sourceOf(name)), 'utf8'));
  const stored = fs.readFileSync(path.join(serverDir, f), 'utf8');
  const a = serverCanon(part(part(parse(ours.exported), 'program'), 'block_set'));
  const b = serverCanon(parse(stored));
  check(`${name}: Open Roberta's server stored the program we exported`, a === b, a === b ? '' : firstDiff(a, b));
  const back = roundTrip(stored);
  check(`${name}: same JavaScript after sim → Open Roberta → sim`, back.code === ours.code,
    back.code === ours.code ? '' : firstDiff(ours.code, back.code));
  serverCount++;
}

// ── 3. Loose stacks are exported with intask="false" ───────────────────────
{
  const ws = new Blockly.Workspace();
  Blockly.Xml.domToWorkspace(openRobertaToBlocklyDom(
    fs.readFileSync(path.join(ROOT, 'reference_openroberta/export-samples/openroberta/01-simples.xml'), 'utf8')), ws);
  const loose = ws.newBlock('robActions_motorDiff_stop');
  loose.moveBy(600, 600);
  loose.setDisabledReason(true, 'ORPHANED_BLOCK');
  const root = parse(blocklyDomToOpenRoberta(Blockly.Xml.workspaceToDom(ws)));
  const blocks = Array.from(root.getElementsByTagName('block')).filter((b) => b.getAttribute('type') === 'robActions_motorDiff_stop');
  check('loose stack: exported', blocks.length === 2, `found ${blocks.length}`);
  check('loose stack: intask="false"', blocks.some((b) => b.getAttribute('intask') === 'false'));
  check('loose stack: no disabled-reasons attribute', !root.getElementsByTagName('block')[0].hasAttribute('disabled-reasons')
    && blocks.every((b) => !b.hasAttribute('disabled-reasons')));
  ws.dispose();
}

// ── 4. File names ──────────────────────────────────────────────────────────
for (const [name, level, want] of [
  ['João Gonçalves', 'w3-l2', 'Joao_Goncalves_w3_l2.xml'],
  ['  Ana  ', 'livre', 'Ana_livre.xml'],
  ['', 'livre', 'livre.xml'],
  ['', '', 'programa.xml'],
  ['7ºB Rui', 'livre', '7_B_Rui_livre.xml'],
]) {
  const got = openRobertaFilename(name, level);
  check(`filename(${JSON.stringify(name)}, ${level})`, got === want, `got ${got}, want ${want}`);
}

if (failures.length) {
  console.log(`export check: ${failures.length} problem(s)`);
  for (const f of failures) console.log('  ✗ ' + f);
  process.exit(1);
}
console.log(`export check: ok (1 real export, ${orBlockCount} Open Roberta block serialisations, ${fixtures.length} fixtures, ${serverCount} Open Roberta server round trips)`);
