#!/usr/bin/env node
// For every block in Open Roberta's mBot 2 toolboxes: put it under a start block
// (expressions wrapped in "serial_print"), generate JavaScript, and parse it with
// JS-Interpreter's ES5 parser. Catches missing generators and non-ES5 output.
//
// Usage: node scripts/codegen-check.mjs [--verbose]

import * as Blockly from 'blockly';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Interpreter from 'js-interpreter';
import { JSDOM } from 'jsdom';

// Browser DOM for modules that use DOMParser/document (jsdom ships with Blockly).
const { window } = new JSDOM('');
globalThis.DOMParser = window.DOMParser;
globalThis.document = window.document;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cat = JSON.parse(fs.readFileSync(path.join(ROOT, 'reference_openroberta/live/or-mbot2-catalogue.json'), 'utf8'));
const { registerAllBlocks } = await import(path.join(ROOT, 'src/blockly/index.js'));
const { generateCode } = await import(path.join(ROOT, 'src/codegen/index.js'));
registerAllBlocks();

const verbose = process.argv.includes('--verbose');
const clean = (xml) => xml.replace(/ xmlns="[^"]*"/g, '');
const failures = [];
const seen = new Set();

for (const lvl of ['beginner', 'expert']) {
  for (const e of cat.toolboxes[lvl].blocks) {
    if (seen.has(e.type)) continue;
    seen.add(e.type);
    const ws = new Blockly.Workspace();
    try {
      const start = ws.newBlock('robControls_start');
      const block = Blockly.Xml.domToBlock(Blockly.utils.xml.textToDom(clean(e.toolboxXml)), ws);
      if (e.type === 'controls_flow_statements') {
        // break/continue are only valid inside a loop.
        const loop = ws.newBlock('robControls_loopForever');
        start.nextConnection.connect(loop.previousConnection);
        loop.getInput('DO').connection.connect(block.previousConnection);
      } else if (block.previousConnection) {
        start.nextConnection.connect(block.previousConnection);
      } else {
        const print = ws.newBlock('robActions_serial_print');
        start.nextConnection.connect(print.previousConnection);
        print.getInput('OUT').connection.connect(block.outputConnection);
      }
      const code = generateCode(ws);
      new Interpreter(code); // throws on syntax errors (ES5 parser)
      new Interpreter(generateCode(ws, { highlight: true }));   // the form that runs
      if (verbose) console.log(`── ${e.type}\n${code}`);
    } catch (err) {
      failures.push(`${e.type}: ${err.message}`);
    } finally {
      ws.dispose();
    }
  }
}

// ── Open Roberta export samples: import → generate → parse ─────────────────
const { openRobertaToBlocklyDom } = await import(path.join(ROOT, 'src/blockly/orFormat.js'));
const samplesDir = path.join(ROOT, 'reference_openroberta/export-samples/openroberta');
const samples = fs.existsSync(samplesDir) ? fs.readdirSync(samplesDir).filter((f) => f.endsWith('.xml')) : [];
for (const file of samples) {
  const text = fs.readFileSync(path.join(samplesDir, file), 'utf8');
  const ws = new Blockly.Workspace();
  try {
    const program = text.match(/<program>([\s\S]*)<\/program>/)[1];
    const expected = (program.match(/<block /g) || []).length;
    Blockly.Xml.domToWorkspace(openRobertaToBlocklyDom(text), ws);
    const got = ws.getAllBlocks(false).length;
    if (got !== expected) throw new Error(`imported ${got} of ${expected} blocks`);
    const code = generateCode(ws);
    new Interpreter(code);
    console.log(`── OR export ${file}: ${got} blocks imported\n${code.trim()}\n`);
  } catch (err) {
    failures.push(`OR export ${file}: ${err.message}`);
  } finally {
    ws.dispose();
  }
}

console.log(`codegen check: ${seen.size} blocks, ${samples.length} Open Roberta exports, ${failures.length} failures`);
for (const f of failures) console.log('  - ' + f);
process.exit(failures.length ? 1 : 0);
