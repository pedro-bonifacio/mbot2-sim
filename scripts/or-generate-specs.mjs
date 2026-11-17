#!/usr/bin/env node
// Generates src/blockly/generated/orSpecs.js from the live Open Roberta catalogue
// (decision 0011). The spec drives the sim's block definitions and toolboxes, so the
// blocks match Open Roberta Lab field for field.
//
// Inputs:  reference_openroberta/live/or-mbot2-catalogue.json
//          reference_openroberta/live/or-mbot2-dynamic.json
// Output:  src/blockly/generated/orSpecs.js   (do not edit by hand)
//
// Usage:   npm run or:specs

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LIVE = path.join(ROOT, 'reference_openroberta/live');
const cat = JSON.parse(fs.readFileSync(path.join(LIVE, 'or-mbot2-catalogue.json'), 'utf8'));
const dyn = JSON.parse(fs.readFileSync(path.join(LIVE, 'or-mbot2-dynamic.json'), 'utf8'));

const INPUT_TYPE = { 1: 'value', 3: 'statement', 5: 'dummy' };

// Turn one catalogue "shape" into the compact field/input spec.
function convertShape(shape, entryXml, hide) {
  const serialised = new Set([...entryXml.matchAll(/<field name="([^"]+)"/g)].map(m => m[1]));
  return shape.map(inp => ({
    name: inp.name,
    type: INPUT_TYPE[inp.type],
    check: inp.check,
    fields: inp.fields.map(f => {
      if (!f.name) return { t: 'label', text: f.text };
      if (!f.visible && serialised.has(f.name)) {
        const value = hide && hide.name === f.name ? hide.value : f.value;
        return { t: 'hidden', name: f.name, value };
      }
      if (f.kind === 'dropdown') return { t: 'dropdown', name: f.name, value: f.value, options: f.options };
      if (f.kind === 'text') {
        if (f.name === 'NUM') return { t: 'number', name: f.name, value: f.value };
        if (f.name === 'FREQUENCE') return { t: 'note', name: f.name, value: f.value };
        return { t: 'text', name: f.name, value: f.value };
      }
      if (f.name === 'COLOUR') return { t: 'colour', name: f.name, value: f.value };
      // Named, non-serialised label (UNIT, SENSORTITLE, TITLE_FOREVER, RPM, SPACE).
      return { t: 'namedLabel', name: f.name, text: f.text };
    }),
  }));
}

function mutationOf(xml) {
  // Only the block's own mutation: it must directly follow the opening <block> tag
  // (nested children carry their own mutations further down).
  const m = xml.match(/^<block[^>]*>\s*<mutation([^>]*)>/);
  if (!m) return null;
  const attrs = {};
  for (const a of m[1].matchAll(/([\w_]+)="([^"]*)"/g)) attrs[a[1]] = a[2];
  return attrs;
}

function convertEntry(e) {
  return {
    colour: e.colour,
    output: e.output ? (e.outputCheck || null) : false,
    prev: e.prev,
    next: e.next,
    inline: e.inputsInline === true ? true : (e.inputsInline === false ? false : null),
    inputs: convertShape(e.shape, e.xml, e.hide),
    mutation: mutationOf(e.xml),
    hide: e.hide || null,
  };
}

const blocks = {};
for (const lvl of ['beginner', 'expert']) {
  for (const e of cat.toolboxes[lvl].blocks) {
    if (blocks[e.type]) continue;
    blocks[e.type] = convertEntry(e);
  }
}

// Sensor blocks whose MODE changes output type / unit label.
for (const [type, variants] of Object.entries(dyn.modeVariants)) {
  if (!blocks[type] || !variants.length) continue;
  blocks[type].modes = {};
  for (const v of variants) {
    const unit = v.shape.flatMap(i => i.fields).find(f => f.name === 'UNIT');
    blocks[type].modes[v.mode] = { output: v.outputCheck, unit: unit ? unit.text : '' };
  }
}

// Generic robSensors_getSample (used inside "wait until"): one shape per SENSORTYPE.
{
  const d = dyn.getSampleDefault;
  const spec = convertEntry({ ...d, xml: d.xml });
  spec.sensorTypes = {};
  for (const g of dyn.getSample) {
    spec.sensorTypes[g.sensortype] = {
      output: g.outputCheck,
      inputs: convertShape(g.shape, g.xml, g.hide),
    };
  }
  blocks.robSensors_getSample = spec;
}

// Remove Open Roberta preprocessor sections (#ifdef nn … #end) — excluded (CLAUDE.md §6).
function cleanToolbox(raw) {
  return raw.replace(/#ifdef[\s\S]*?#end/g, '').replace(/\n\s*\n+/g, '\n');
}

// Category names: TOOLBOX_* message keys → PT text. Colour: first block's colour.
const categoryNames = {};
for (const [k, v] of Object.entries(cat.msgPt)) if (k.startsWith('TOOLBOX_')) categoryNames[k] = v;

// PT messages used by dynamic blocks (if/else-if/else, wait-or, list modes …).
const MSG_KEYS = [
  'CONTROLS_IF_MSG_ELSEIF', 'CONTROLS_IF_MSG_ELSE', 'CONTROLS_IF_MSG_THEN', 'CONTROLS_IF_MSG_IF',
  'CONTROLS_REPEAT_INPUT_DO', 'WAIT_OR', 'WAIT_UNTIL',
  'LISTS_CREATE_WITH_INPUT_WITH', 'LISTS_CREATE_EMPTY_TITLE', 'LISTS_CREATE_TITLE',
  'LISTS_GET_INDEX_GET', 'LISTS_GET_INDEX_GET_REMOVE', 'LISTS_GET_INDEX_REMOVE',
  'LISTS_GET_INDEX_FROM_START', 'LISTS_GET_INDEX_FROM_END', 'LISTS_GET_INDEX_FIRST', 'LISTS_GET_INDEX_LAST',
  'LISTS_GET_INDEX_TAIL', 'LISTS_SET_INDEX_INPUT_TO',
  'MATH_IS_DIVISIBLE_BY', 'TEXT_JOIN_TITLE_CREATEWITH',
  'START_PROGRAM', 'START_PROGRAM_DEBUG', 'START_GLOBAL_VARIABLES',
  // Typed variables and functions
  'VARIABLES_DEFAULT_NAME', 'VARIABLES_GLOBAL_DECLARE_TOOLTIP', 'VARIABLES_LOCAL_DECLARE_TOOLTIP',
  'VARIABLES_GET_TOOLTIP', 'VARIABLES_SET_TOOLTIP',
  'PROCEDURES_DEFNORETURN_PROCEDURE', 'PROCEDURES_BEFORE_PARAMS',
  'PROCEDURES_DEFNORETURN_TOOLTIP', 'PROCEDURES_DEFRETURN_TOOLTIP',
  'PROCEDURES_CALLNORETURN_TOOLTIP', 'PROCEDURES_CALLRETURN_TOOLTIP', 'PROCEDURES_HIGHLIGHT_DEF',
  'PROCEDURES_IFRETURN_TOOLTIP', 'PROCEDURES_IFRETURN_WARNING',
];
const msg = {};
for (const k of MSG_KEYS) if (cat.msgPt[k] !== undefined) msg[k] = cat.msgPt[k];

const out = {
  meta: { ...cat.meta, generatedAt: new Date().toISOString() },
  blocks,
  extraTypes: Object.fromEntries(Object.entries(cat.extraTypes).map(([t, e]) => [t, e.error ? { error: e.error } : convertEntry(e)])),
  toolboxes: {
    beginner: cleanToolbox(cat.toolboxes.beginner.raw),
    expert: cleanToolbox(cat.toolboxes.expert.raw),
  },
  categoryNames,
  msg,
  configuration: cat.configuration.default,
};

const dest = path.join(ROOT, 'src/blockly/generated/orSpecs.js');
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.writeFileSync(dest,
  '// GENERATED by scripts/or-generate-specs.mjs from the live Open Roberta catalogue.\n' +
  '// Do not edit by hand — re-extract the catalogue and run `npm run or:specs`.\n' +
  'export const OR = ' + JSON.stringify(out, null, 1) + ';\n');
console.log(`wrote ${path.relative(ROOT, dest)}: ${Object.keys(blocks).length} block specs, ${fs.statSync(dest).size} bytes`);
