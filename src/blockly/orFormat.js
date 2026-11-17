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
// Open Roberta-only markup (<hide>, intask=…). Blockly expects <next> chains.

const BLOCKLY_NS = 'https://developers.google.com/blockly/xml';

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

function normaliseBlock(doc, block) {
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
