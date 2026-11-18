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

/**
 * Keeps only the top-level blocks whose type is in `allowed` (nested child blocks come
 * with their parent), and the dynamic categories named in it (VARIABLE, PROCEDURE).
 * Categories left empty are removed.
 */
function filterToolbox(root, allowed) {
  const prune = (parent) => {
    for (const el of Array.from(parent.children)) {
      if (el.tagName === 'block' && !allowed.has(el.getAttribute('type'))) el.remove();
      else if (el.tagName === 'category') {
        const custom = el.getAttribute('custom');
        if (custom) { if (!allowed.has(custom)) el.remove(); continue; }
        prune(el);
        if (!el.querySelector('block, category[custom]')) el.remove();
      }
    }
  };
  prune(root);
}

/** Open Roberta's toolbox for `level` (beginner | expert), optionally only the `allowed` block types. */
export function orToolbox(level, allowed = null) {
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
  if (allowed) filterToolbox(root, allowed);
  return root;
}
