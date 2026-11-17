#!/usr/bin/env node
// Checks the sim's blocks against the live Open Roberta Lab catalogue (decision 0011).
//
// For every block in Open Roberta's mBot 2 toolboxes (beginner + expert):
//   1. load Open Roberta's own toolbox XML for it into the sim's block definitions,
//   2. compare shape: inputs, checks, fields, dropdown options, defaults, labels,
//      connections, colour,
//   3. compare serialisation: the field values and <mutation> attributes the sim
//      writes vs. the XML Open Roberta writes (this is what export depends on).
// Sensor mode variants and the generic sensor block's variants are checked too.
//
// Usage:  node scripts/or-fidelity-check.mjs [--json]
// Exit code 1 if any non-excepted problem remains.

import * as Blockly from 'blockly';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LIVE = path.join(ROOT, 'reference_openroberta/live');
const cat = JSON.parse(fs.readFileSync(path.join(LIVE, 'or-mbot2-catalogue.json'), 'utf8'));
const dyn = JSON.parse(fs.readFileSync(path.join(LIVE, 'or-mbot2-dynamic.json'), 'utf8'));

const { registerAllBlocks } = await import(path.join(ROOT, 'src/blockly/index.js'));
const { OR } = await import(path.join(ROOT, 'src/blockly/generated/orSpecs.js'));
registerAllBlocks();

// Intentional differences, each with a reason. Keyed "type: problem-prefix".
const EXCEPTIONS = [
  ['robControls_for', 'inputs differ',
    'OR\'s PT translation lists the TO input twice (renders an empty socket); the sim keeps one TO.'],
  ['robControls_for', 'labels differ',
    'Follows from the duplicate TO input above.'],
  ['robControls_forEach', 'serialised field VAR',
    'Loop variable default is Open Roberta\'s findLegalName("item"): the first free name. The catalogue was extracted with item…item3 already taken.'],
];
const isExcepted = (type, problem) =>
  EXCEPTIONS.some(([t, prefix]) => (t === type || t === '*') && problem.startsWith(prefix));

const ws = new Blockly.Workspace();
const IGNORE_LABEL_FIELDS = new Set(['SENSORTITLE', 'UNIT', 'TITLE_FOREVER', 'RPM', 'SPACE', 'GET', 'WITH']);

function load(xml) {
  // <hide> is Open Roberta's own tag for hidden-field values; Blockly ignores it.
  const dom = Blockly.utils.xml.textToDom(xml.replace(/ xmlns="[^"]*"/g, '').replace(/<hide [^>]*><\/hide>|<hide [^>]*\/>/g, ''));
  return Blockly.Xml.domToBlock(dom, ws);
}

function describeSim(block) {
  const inputs = [];
  for (const inp of block.inputList) {
    if (inp.name === 'BUTTONS') continue; // +/− buttons (OR uses mutator icons)
    const fields = [];
    for (const f of inp.fieldRow) {
      const isDrop = f instanceof Blockly.FieldDropdown;
      fields.push({
        name: f.name || null,
        value: f.getValue(),
        text: f.getText(),
        visible: f.isVisible(),
        options: isDrop ? f.getOptions(false).map(o => o[1]) : null,
      });
    }
    inputs.push({ name: inp.name || null, type: inp.type, check: inp.connection ? inp.connection.getCheck() : null, fields });
  }
  return {
    inputs,
    output: block.outputConnection ? (block.outputConnection.getCheck() || null) : false,
    prev: !!block.previousConnection,
    next: !!block.nextConnection,
    colour: block.getColour(),
  };
}

const norm = (c) => (c == null ? null : JSON.stringify([].concat(c).slice().sort()));
const labels = (shape) => shape.flatMap(i => i.fields)
  .filter(f => !f.name || (!IGNORE_LABEL_FIELDS.has(f.name) && f.kind === 'label'))
  .map(f => String(f.text).trim()).filter(Boolean);
const simLabels = (inputs) => inputs.flatMap(i => i.fields)
  .filter(f => !f.name && f.visible)
  .map(f => String(f.text).trim()).filter(Boolean);

function serialisedFields(xml) {
  const top = xml.replace(/ xmlns="[^"]*"/g, '');
  // Only the block's own fields: strip nested <value>/<statement> children first.
  const own = top.replace(/<(value|statement)\b[\s\S]*?<\/\1>/g, '');
  const out = {};
  for (const m of own.matchAll(/<field name="([^"]+)">([^<]*)<\/field>/g)) out[m[1]] = m[2];
  return out;
}
function mutationAttrs(xml) {
  const m = xml.replace(/ xmlns="[^"]*"/g, '').match(/^<block[^>]*>\s*<mutation([^>]*)\/?>/);
  const out = {};
  if (m) for (const a of m[1].matchAll(/([\w_]+)="([^"]*)"/g)) out[a[1]] = a[2];
  return out;
}

function compare(type, orEntry, simBlock) {
  const p = [];
  const sim = describeSim(simBlock);

  // Connections and output type.
  const orOut = orEntry.output ? (orEntry.outputCheck || null) : false;
  if ((orOut === false) !== (sim.output === false)) p.push(`output connection — OR ${orOut === false ? 'none' : 'yes'} vs sim ${sim.output === false ? 'none' : 'yes'}`);
  else if (orOut !== false && norm(orOut) !== norm(sim.output)) p.push(`output type — OR ${JSON.stringify(orOut)} vs sim ${JSON.stringify(sim.output)}`);
  if (orEntry.prev !== sim.prev) p.push(`previous connection — OR ${orEntry.prev} vs sim ${sim.prev}`);
  if (orEntry.next !== sim.next) p.push(`next connection — OR ${orEntry.next} vs sim ${sim.next}`);
  if (orEntry.colour && String(orEntry.colour).toLowerCase() !== String(sim.colour).toLowerCase()) p.push(`colour — OR ${orEntry.colour} vs sim ${sim.colour}`);

  // Inputs (value/statement), in order, with checks.
  const orInputs = orEntry.shape.filter(i => i.name && i.type !== 5);
  const simInputs = sim.inputs.filter(i => i.name && i.type !== Blockly.inputs.inputTypes.DUMMY && i.type !== 5);
  const oi = orInputs.map(i => i.name), si = simInputs.map(i => i.name);
  if (JSON.stringify(oi) !== JSON.stringify(si)) p.push(`inputs differ — OR [${oi}] vs sim [${si}]`);
  else for (let k = 0; k < orInputs.length; k++) {
    if (norm(orInputs[k].check) !== norm(simInputs[k].check)) p.push(`input ${oi[k]} check — OR ${JSON.stringify(orInputs[k].check)} vs sim ${JSON.stringify(simInputs[k].check)}`);
  }

  // Named fields: presence, visibility, dropdown options, defaults.
  const simFields = Object.fromEntries(sim.inputs.flatMap(i => i.fields).filter(f => f.name).map(f => [f.name, f]));
  for (const inp of orEntry.shape) for (const f of inp.fields) {
    if (!f.name || IGNORE_LABEL_FIELDS.has(f.name)) continue;
    const s = simFields[f.name];
    if (!s) { p.push(`missing field ${f.name}`); continue; }
    if (f.visible !== s.visible) p.push(`field ${f.name} visibility — OR ${f.visible} vs sim ${s.visible}`);
    if (f.options) {
      const ov = f.options.map(o => o[1]);
      if (!s.options || JSON.stringify(ov) !== JSON.stringify(s.options)) p.push(`field ${f.name} options — OR [${ov}] vs sim [${s.options}]`);
    }
  }

  // Visible labels, in order.
  const ol = labels(orEntry.shape), sl = simLabels(sim.inputs);
  if (JSON.stringify(ol) !== JSON.stringify(sl)) p.push(`labels differ — OR ${JSON.stringify(ol)} vs sim ${JSON.stringify(sl)}`);

  // Serialisation: own field values + mutation attributes.
  const simXml = Blockly.Xml.domToText(Blockly.Xml.blockToDom(simBlock));
  const of = serialisedFields(orEntry.xml), sf = serialisedFields(simXml);
  for (const [k, val] of Object.entries(of)) {
    if (!(k in sf)) p.push(`serialised field ${k} missing — OR writes "${val}"`);
    else if (String(sf[k]).toLowerCase() !== String(val).toLowerCase()) p.push(`serialised field ${k} — OR "${val}" vs sim "${sf[k]}"`);
  }
  for (const k of Object.keys(sf)) if (!(k in of)) p.push(`serialised field ${k} only in sim`);
  const om = mutationAttrs(orEntry.xml), sm = mutationAttrs(simXml);
  if (JSON.stringify(om) !== JSON.stringify(sm)) p.push(`mutation — OR ${JSON.stringify(om)} vs sim ${JSON.stringify(sm)}`);

  return p;
}

function check(type, orEntry, xml) {
  let block;
  try { block = load(xml); } catch (e) { return [`failed to load OR XML into sim: ${e.message}`]; }
  try { return compare(type, orEntry, block); } finally { block.dispose(); }
}

// ── Run ──────────────────────────────────────────────────────────────────────
const results = []; // { group, type, problems:[{text, excepted}] }
const push = (group, type, problems) => {
  if (!problems.length) return;
  results.push({ group, type, problems: problems.map(text => ({ text, excepted: isExcepted(type, text) })) });
};

if (OR.meta.extractedAt !== cat.meta.extractedAt) {
  push('specs', 'orSpecs.js', [`generated specs are stale (catalogue ${cat.meta.extractedAt}, specs ${OR.meta.extractedAt}) — run npm run or:specs`]);
}

const seen = new Set();
for (const lvl of ['beginner', 'expert']) {
  for (const e of cat.toolboxes[lvl].blocks) {
    if (seen.has(e.type)) continue;
    seen.add(e.type);
    if (!Blockly.Blocks[e.type]) { push('blocks', e.type, ['block type not defined in sim']); continue; }
    // Load the toolbox XML (with default children) but compare against OR's serialisation.
    push('blocks', e.type, check(e.type, e, e.toolboxXml));
  }
}

for (const [type, variants] of Object.entries(dyn.modeVariants)) {
  for (const v of variants) push('sensor modes', `${type} [${v.mode}]`, check(type, v, v.xml));
}
for (const g of dyn.getSample) {
  push('generic sensor', `robSensors_getSample [${g.sensortype}]`, check('robSensors_getSample', g, g.xml));
}

const active = results.flatMap(r => r.problems.filter(p => !p.excepted).map(p => ({ ...r, p })));
const excepted = results.flatMap(r => r.problems.filter(p => p.excepted).map(p => ({ ...r, p })));

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ meta: cat.meta, results }, null, 2));
} else {
  const L = ['# Open Roberta fidelity report', '',
    `Catalogue: ${cat.meta.source} · robot ${cat.meta.robot} · lang ${cat.meta.lang} · extracted ${cat.meta.extractedAt}`, '',
    `Checked ${seen.size} toolbox blocks, ${Object.values(dyn.modeVariants).flat().length} sensor-mode variants, ${dyn.getSample.length} generic-sensor variants.`, '',
    `**Problems: ${active.length}** · intentional exceptions: ${excepted.length}`, ''];
  let group = null;
  for (const r of results) {
    const act = r.problems.filter(p => !p.excepted);
    if (!act.length) continue;
    if (r.group !== group) { group = r.group; L.push(`## ${group}`, ''); }
    L.push(`- \`${r.type}\``);
    for (const p of act) L.push(`  - ${p.text}`);
  }
  if (excepted.length) {
    L.push('', '## Intentional exceptions', '');
    for (const [t, prefix, reason] of EXCEPTIONS) {
      const hits = excepted.filter(x => (t === '*' || x.type.startsWith(t)) && x.p.text.startsWith(prefix));
      if (hits.length) L.push(`- \`${t}\` — ${prefix}: ${reason} (${hits.length})`);
    }
  }
  console.log(L.join('\n'));
}
process.exit(active.length ? 1 : 0);
