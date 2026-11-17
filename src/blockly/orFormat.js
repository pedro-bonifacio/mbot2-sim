// Conversion between Open Roberta's program files and Blockly XML.
//
// Open Roberta export (what "Exportar programa" downloads):
//   <export xmlns="http://de.fhg.iais.roberta.blockly">
//     <program><block_set robottype="mbot2" …>
//       <instance x y> block block block … </instance>     ← siblings, not <next>
//     </block_set></program>
//     <config><block_set …> robot configuration </block_set></config>
//   </export>
// Statement inputs (<statement name="DO">) also hold sibling blocks, and blocks carry
// Open Roberta-only markup (<hide>, <repetitions>, intask=…). Blockly expects <next> chains.

import { OR } from './generated/orSpecs.js';

const BLOCKLY_NS = 'https://developers.google.com/blockly/xml';
const OR_NS = 'http://de.fhg.iais.roberta.blockly';
const BLOCK_SET_ATTRS = { robottype: 'mbot2', xmlversion: '3.1', description: '', tags: '' };

// Blocks whose inputs Open Roberta wraps in <repetitions> once they carry a mutation
// (seen in every live OR serialisation of these types, never in any other type).
const REPETITION_TYPES = new Set([
  'robControls_if', 'robControls_ifElse', 'robControls_wait_for', 'robControls_wait',
  'robProcedures_defreturn',
]);

const childBlocks = (el) => Array.from(el.children).filter((c) => c.localName === 'block');

/** Turns sibling blocks inside `container` into a single <next> chain (recursively). */
function chainSiblings(doc, container) {
  const blocks = childBlocks(container);
  for (const b of blocks) normaliseBlock(doc, b);
  for (let i = blocks.length - 1; i > 0; i--) {
    const next = doc.createElementNS(BLOCKLY_NS, 'next');
    next.appendChild(blocks[i]);           // moves block i under block i-1
    blocks[i - 1].appendChild(next);
  }
  return blocks[0] || null;
}

// Open Roberta's server rewrites the LED blocks' SLOT "ALL" as "" when it imports a
// program (seen on lab.open-roberta.org, 2026-11-17), and generates
// `cyberpi.led.on(r, g, b, )` for it: every LED. Files that went through Open
// Roberta can therefore carry an empty SLOT.
const EMPTY_SLOT_MEANS_ALL = new Set(['actions_rgbLed_hidden_on_mbot2', 'actions_rgbLed_hidden_off_mbot2']);

function normaliseBlock(doc, block) {
  if (EMPTY_SLOT_MEANS_ALL.has(block.getAttribute('type'))) {
    const slot = Array.from(block.children).find((c) => c.localName === 'field' && c.getAttribute('name') === 'SLOT');
    if (slot && slot.textContent === '') slot.textContent = 'ALL';
  }
  // Open Roberta wraps some inputs in <repetitions> (e.g. robProcedures_defreturn):
  // lift them up to the block, where Blockly expects them.
  for (const rep of Array.from(block.children).filter((c) => c.localName === 'repetitions')) {
    for (const c of Array.from(rep.children)) block.insertBefore(c, rep);
    block.removeChild(rep);
  }
  for (const child of Array.from(block.children)) {
    if (child.localName === 'hide') block.removeChild(child);
    else if (child.localName === 'statement') chainSiblings(doc, child);
    else if (child.localName === 'value') for (const b of childBlocks(child)) normaliseBlock(doc, b);
  }
}

/** True if the text is an Open Roberta program export (or a bare block_set). */
export function isOpenRobertaXml(text) {
  return /<export[\s>]/.test(text) || /<block_set[\s>]/.test(text);
}

/**
 * Converts an Open Roberta export (or program block_set) into a Blockly <xml>
 * document element ready for Blockly.Xml.domToWorkspace.
 */
export function openRobertaToBlocklyDom(text) {
  const src = new DOMParser().parseFromString(text, 'application/xml');
  if (src.querySelector('parsererror')) throw new Error('XML parse error');
  const root = src.documentElement;
  const program = root.localName === 'export'
    ? Array.from(root.children).find((c) => c.localName === 'program')
    : root;
  const blockSet = program && (program.localName === 'block_set'
    ? program
    : Array.from(program.children).find((c) => c.localName === 'block_set'));
  if (!blockSet) throw new Error('No Open Roberta program found');
  if (blockSet.getAttribute('robottype') && blockSet.getAttribute('robottype') !== 'mbot2') {
    throw new Error(`Program is for robot "${blockSet.getAttribute('robottype')}", not mbot2`);
  }

  const out = document.implementation.createDocument(BLOCKLY_NS, 'xml', null);
  for (const instance of Array.from(blockSet.children).filter((c) => c.localName === 'instance')) {
    const imported = out.importNode(instance, true);
    const first = chainSiblings(out, imported);
    if (!first) continue;
    first.setAttribute('x', instance.getAttribute('x') || '0');
    first.setAttribute('y', instance.getAttribute('y') || '0');
    out.documentElement.appendChild(first);
  }
  return out.documentElement;
}

// ── Sim → Open Roberta ("Exportar para Open Roberta") ──────────────────────

/**
 * The <hide> tag Open Roberta writes for a block, or null. Fixed per type, except
 * for the generic "ler sensor" block: it hides its port only when the sensor type
 * uses one of the robot's built-in ports (_S, _J, _L, _G, _A; not U, Q, A/B).
 */
function hideSpec(type, fields) {
  const spec = (OR.blocks[type] || OR.extraTypes[type] || {}).hide;
  if (spec) return spec;
  if (type === 'robSensors_getSample') {
    const port = fields.find((f) => f.getAttribute('name') === 'SENSORPORT');
    if (port && port.textContent.startsWith('_')) return { name: 'SENSORPORT', value: port.textContent };
  }
  return null;
}
const isDisabled = (block) =>
  block.getAttribute('disabled') === 'true' || !!block.getAttribute('disabled-reasons');

/** Copies a Blockly block element into Open Roberta's markup (recursively). */
function exportBlock(out, src, intask) {
  const type = src.getAttribute('type');
  const block = out.createElementNS(OR_NS, 'block');
  block.setAttribute('type', type);
  if (src.getAttribute('id')) block.setAttribute('id', src.getAttribute('id'));
  block.setAttribute('intask', String(intask));
  for (const a of ['deletable', 'movable', 'editable', 'collapsed']) {
    if (src.hasAttribute(a)) block.setAttribute(a, src.getAttribute(a));
  }

  const kids = Array.from(src.children);
  const mutation = kids.find((c) => c.localName === 'mutation');
  const fields = kids.filter((c) => c.localName === 'field');
  const inputs = kids.filter((c) => c.localName === 'value' || c.localName === 'statement');
  const comment = kids.find((c) => c.localName === 'comment');

  // Order as Open Roberta writes it: mutation, fields, hide, inputs.
  if (mutation) block.appendChild(copyPlain(out, mutation));
  if (comment) block.appendChild(copyPlain(out, comment));
  // The hidden port's field goes last, next to its <hide> (or is dropped when the
  // port exists only as a <hide>).
  const hide = hideSpec(type, fields);
  const isHidden = (f) => hide && f.getAttribute('name') === hide.name;
  for (const f of fields) if (!isHidden(f)) block.appendChild(copyPlain(out, f));
  if (hide && !hide.port) for (const f of fields) if (isHidden(f)) block.appendChild(copyPlain(out, f));
  if (hide) {
    const h = out.createElementNS(OR_NS, 'hide');
    h.setAttribute('name', hide.name);
    h.setAttribute('value', hide.value);
    block.appendChild(h);
  }

  const wrapped = REPETITION_TYPES.has(type) && mutation && mutation.attributes.length > 0;
  const inputParent = wrapped ? block.appendChild(out.createElementNS(OR_NS, 'repetitions')) : block;
  for (const input of inputs) {
    const el = out.createElementNS(OR_NS, input.localName);
    el.setAttribute('name', input.getAttribute('name'));
    for (const b of chainOf(input)) el.appendChild(exportBlock(out, b, intask));
    inputParent.appendChild(el);
  }
  return block;
}

/** The blocks of a <next> chain starting inside `container` (a statement or value). */
function chainOf(container) {
  const blocks = [];
  // A shadow block is only a default; Open Roberta's source generation rejects shadows.
  let b = Array.from(container.children).find((c) => c.localName === 'block')
       || Array.from(container.children).find((c) => c.localName === 'shadow');
  while (b) {
    blocks.push(b);
    const next = Array.from(b.children).find((c) => c.localName === 'next');
    b = next && Array.from(next.children).find((c) => c.localName === 'block');
  }
  return blocks;
}

/** Copies an element and its text/child elements into the OR namespace. */
function copyPlain(out, src) {
  const el = out.createElementNS(OR_NS, src.localName);
  for (const a of Array.from(src.attributes)) {
    if (a.name !== 'xmlns') el.setAttribute(a.name, a.value);
  }
  for (const c of Array.from(src.childNodes)) {
    if (c.nodeType === 1) el.appendChild(copyPlain(out, c));
    else if (c.nodeType === 3) el.appendChild(out.createTextNode(c.nodeValue));
  }
  return el;
}

/**
 * Converts the sim's Blockly workspace XML (Blockly.Xml.workspaceToDom) into an
 * Open Roberta program export: `<export>` with the program and the default mBot 2
 * configuration, as "Exportar programa" in Open Roberta Lab writes it. Blocks in
 * disabled (loose) stacks keep their place but are marked intask="false".
 */
export function blocklyDomToOpenRoberta(xmlRoot) {
  const out = document.implementation.createDocument(OR_NS, 'export', null);
  const program = out.documentElement.appendChild(out.createElementNS(OR_NS, 'program'));
  const blockSet = program.appendChild(out.createElementNS(OR_NS, 'block_set'));
  for (const [k, v] of Object.entries(BLOCK_SET_ATTRS)) blockSet.setAttribute(k, v);

  for (const top of Array.from(xmlRoot.children).filter((c) => c.localName === 'block')) {
    const instance = out.createElementNS(OR_NS, 'instance');
    instance.setAttribute('x', String(Math.round(Number(top.getAttribute('x')) || 0)));
    instance.setAttribute('y', String(Math.round(Number(top.getAttribute('y')) || 0)));
    const intask = !isDisabled(top);
    let b = top;
    while (b) {
      instance.appendChild(exportBlock(out, b, intask));
      const next = Array.from(b.children).find((c) => c.localName === 'next');
      b = next && Array.from(next.children).find((c) => c.localName === 'block');
    }
    blockSet.appendChild(instance);
  }

  const config = out.documentElement.appendChild(out.createElementNS(OR_NS, 'config'));
  const confDoc = new DOMParser().parseFromString(OR.configuration, 'application/xml');
  config.appendChild(out.importNode(confDoc.documentElement, true));

  // Byte for byte as Open Roberta writes it: each block_set repeats the
  // namespace (serialisers drop it as redundant), and empty elements are <x></x>
  // (serialisers write <x/>).
  return new XMLSerializer().serializeToString(out)
    .replace(/<(program|config)><block_set (?!xmlns)/g, `<$1><block_set xmlns="${OR_NS}" `)
    .replace(/<([A-Za-z_]+)((?:\s+[^\s=<>\/]+="[^"]*")*)\s*\/>/g, '<$1$2></$1>');
}

/**
 * File name for an export: `<Nome>_<levelId>.xml`, so the teacher can sort the
 * submissions by level (docs/WORKFLOW.md). Open Roberta ignores it ("Importar
 * programa" always names the program NEPOprog); accents and spaces are folded to
 * ASCII so the file travels safely through Teams/Moodle and Windows.
 */
export function openRobertaFilename(name, levelId) {
  const clean = (s) => String(s || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  return `${[clean(name), clean(levelId)].filter(Boolean).join('_') || 'programa'}.xml`;
}
