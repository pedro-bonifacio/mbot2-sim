// Block count for ★★★ challenges (decision 0019): the blocks of the program that runs —
// the chain under the start block and enabled function definitions — without the
// start block itself, plain values (numbers, texts, colours, true/false, constants)
// and comments. Loose (disabled) stacks do not count, as they do not run.

const START_TYPE = 'robControls_start';
const NOT_COUNTED = new Set([
  START_TYPE, 'math_number', 'text', 'robColour_picker', 'logic_boolean', 'logic_null',
  'math_constant', 'text_comment',
]);
const isDefinition = (block) => /^(rob)?[Pp]rocedures_def/.test(block.type) && block.isEnabled();

/** Number of counted blocks in a Blockly workspace. */
export function countBlocks(workspace) {
  let n = 0;
  for (const top of workspace.getTopBlocks(false)) {
    if (top.type !== START_TYPE && !isDefinition(top)) continue;
    for (const b of top.getDescendants(false)) {
      if (!b.isShadow() && b.isEnabled() && !NOT_COUNTED.has(b.type)) n++;
    }
  }
  return n;
}
