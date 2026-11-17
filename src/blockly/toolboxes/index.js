import { OR } from '../generated/orSpecs.js';

// Builds the Blockly toolbox straight from Open Roberta's mBot 2 toolbox XML
// (decision 0011), so categories, order, and default child blocks match exactly.
// Category names are Open Roberta's PT translations; colours follow the first
// block in each category.

// Dynamic categories have no blocks in the XML; colour them like their blocks.
const CUSTOM_COLOUR_TYPE = { VARIABLE: 'variables_get', PROCEDURE: 'robProcedures_defnoreturn' };

function firstBlockColour(category) {
  const custom = CUSTOM_COLOUR_TYPE[category.getAttribute('custom')];
  if (custom) return OR.extraTypes[custom].colour;
  const b = category.querySelector('block');
  const spec = b && OR.blocks[b.getAttribute('type')];
  return spec ? spec.colour : null;
}

export function orToolbox(level) {
  const src = new DOMParser().parseFromString(OR.toolboxes[level], 'text/xml');
  const doc = document.implementation.createDocument(null, 'xml', null);
  const root = doc.documentElement;
  for (const child of Array.from(src.documentElement.children)) root.appendChild(doc.importNode(child, true));

  for (const cat of root.querySelectorAll('category')) {
    const key = cat.getAttribute('name');
    cat.setAttribute('name', OR.categoryNames[key] || key);
    cat.removeAttribute('svg');
    const colour = firstBlockColour(cat);
    if (colour) cat.setAttribute('colour', colour);
  }
  return root;
}
