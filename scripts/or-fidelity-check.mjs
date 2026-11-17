#!/usr/bin/env node
// Compares the sim's Blockly blocks and toolboxes against the live Open Roberta Lab
// catalogue (reference_openroberta/live/or-mbot2-catalogue.json, extracted from
// lab.open-roberta.org with the mBot 2 robot and PT language selected).
//
// Usage:  node scripts/or-fidelity-check.mjs [--json]
// Output: a Markdown report on stdout (or JSON with --json). Exit code 1 if mismatches.

import * as Blockly from 'blockly';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CATALOGUE = path.join(ROOT, 'reference_openroberta/live/or-mbot2-catalogue.json');
const cat = JSON.parse(fs.readFileSync(CATALOGUE, 'utf8'));

// ── Load the sim's block definitions headlessly ─────────────────────────────
const reg = [
  ['blockly/blocks/action.js', 'registerActionBlocks'],
  ['blockly/blocks/sensor.js', 'registerSensorBlocks'],
  ['blockly/blocks/control.js', 'registerControlBlocks'],
  ['blockly/blocks/list.js', 'registerListBlocks'],
  ['blockly/blocks/colour.js', 'registerColourBlocks'],
  ['blockly/blocks/communication.js', 'registerCommunicationBlocks'],
];
for (const [f, fn] of reg) (await import(path.join(ROOT, 'src', f)))[fn]();
const { beginnerToolbox } = await import(path.join(ROOT, 'src/blockly/toolboxes/beginner.js'));
const { expertToolbox } = await import(path.join(ROOT, 'src/blockly/toolboxes/expert.js'));

const ws = new Blockly.Workspace();

// Fields that OR hides from the user (ACTORPORT etc.) or uses as labels/units.
const IGNORE_FIELDS = new Set(['SENSORTITLE', 'UNIT']);

function orFields(entry) {
  const out = {};
  for (const inp of entry.shape) for (const f of inp.fields) {
    if (!f.name || IGNORE_FIELDS.has(f.name)) continue;
    out[f.name] = { value: f.value, options: f.options ? f.options.map(o => o[1]) : null, visible: f.visible };
  }
  return out;
}
function orInputs(entry) {
  return entry.shape.filter(i => i.name && i.type !== 5).map(i => i.name);
}

function simDescribe(type) {
  if (!Blockly.Blocks[type]) return null;
  let b;
  try { b = ws.newBlock(type); } catch (e) { return { error: String(e) }; }
  const fields = {};
  const inputs = [];
  for (const inp of b.inputList) {
    if (inp.name && inp.type !== 5) inputs.push(inp.name);
    for (const f of inp.fieldRow) {
      if (!f.name || IGNORE_FIELDS.has(f.name)) continue;
      let options = null;
      if (f instanceof Blockly.FieldDropdown) {
        try { options = f.getOptions(false).map(o => o[1]); } catch { options = null; }
      }
      fields[f.name] = { value: f.getValue(), options };
    }
  }
  b.dispose();
  return { fields, inputs };
}

function simToolboxTypes(tb) {
  const out = [];
  const walk = (node, p) => {
    for (const c of node.contents || []) {
      if (c.kind === 'category') walk(c, p.concat(c.name));
      else if (c.kind === 'block') out.push({ type: c.type, path: p });
    }
  };
  walk(tb, []);
  return out;
}

// ── Compare ──────────────────────────────────────────────────────────────────
const report = { meta: cat.meta, levels: {} };
let problems = 0;

for (const [lvl, simTb] of [['beginner', beginnerToolbox], ['expert', expertToolbox]]) {
  const orBlocks = cat.toolboxes[lvl].blocks;
  const simBlocks = simToolboxTypes(simTb);
  const orTypes = orBlocks.map(b => b.type);
  const simTypes = simBlocks.map(b => b.type);
  const r = {
    missingInSim: [...new Set(orTypes.filter(t => !simTypes.includes(t)))],
    extraInSim: [...new Set(simTypes.filter(t => !orTypes.includes(t)))],
    orderMatches: JSON.stringify(orTypes.filter(t => simTypes.includes(t))) === JSON.stringify(simTypes.filter(t => orTypes.includes(t))),
    blocks: {},
  };
  problems += r.missingInSim.length + r.extraInSim.length + (r.orderMatches ? 0 : 1);

  const seen = new Set();
  for (const e of orBlocks) {
    if (seen.has(e.type)) continue; // first toolbox occurrence is the canonical one
    seen.add(e.type);
    const sim = simDescribe(e.type);
    const issues = [];
    if (!sim) { issues.push('block type not defined in sim'); }
    else if (sim.error) { issues.push('sim failed to create block: ' + sim.error); }
    else {
      const of = orFields(e);
      for (const [name, f] of Object.entries(of)) {
        const s = sim.fields[name];
        if (!s) { issues.push(`missing field ${name}${f.visible ? '' : ' (hidden in OR)'} — OR default "${f.value}"`); continue; }
        if (f.options && s.options) {
          const miss = f.options.filter(o => !s.options.includes(o));
          const extra = s.options.filter(o => !f.options.includes(o));
          if (miss.length || extra.length) issues.push(`field ${name} options differ — OR [${f.options}] vs sim [${s.options}]`);
        } else if (f.options && !s.options) issues.push(`field ${name} is a dropdown in OR [${f.options}] but not in sim`);
        if (f.visible && f.value !== s.value && String(f.value) !== String(s.value)) issues.push(`field ${name} default — OR "${f.value}" vs sim "${s.value}"`);
      }
      for (const name of Object.keys(sim.fields)) if (!of[name]) issues.push(`extra field ${name} in sim (not in OR)`);
      const oi = orInputs(e), si = sim.inputs;
      if (JSON.stringify(oi) !== JSON.stringify(si)) issues.push(`inputs differ — OR [${oi}] vs sim [${si}]`);
    }
    if (issues.length) { r.blocks[e.type] = issues; problems += issues.length; }
  }
  report.levels[lvl] = r;
}

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(report, null, 2));
} else {
  const L = [];
  L.push(`# Open Roberta fidelity report`, ``,
    `Catalogue: ${cat.meta.source} · robot ${cat.meta.robot} · lang ${cat.meta.lang} · extracted ${cat.meta.extractedAt}`, ``);
  for (const [lvl, r] of Object.entries(report.levels)) {
    L.push(`## ${lvl}`, ``);
    L.push(`- Toolbox order matches (shared blocks): ${r.orderMatches ? 'yes' : '**no**'}`);
    L.push(`- In OR but missing from sim toolbox: ${r.missingInSim.length ? r.missingInSim.map(t => '`' + t + '`').join(', ') : 'none'}`);
    L.push(`- In sim toolbox but not in OR: ${r.extraInSim.length ? r.extraInSim.map(t => '`' + t + '`').join(', ') : 'none'}`, ``);
    const entries = Object.entries(r.blocks);
    L.push(`### Block mismatches (${entries.length})`, ``);
    for (const [t, issues] of entries) {
      L.push(`- \`${t}\``);
      for (const i of issues) L.push(`  - ${i}`);
    }
    L.push('');
  }
  L.push(`**Total problems: ${problems}**`);
  console.log(L.join('\n'));
}
process.exit(problems ? 1 : 0);
