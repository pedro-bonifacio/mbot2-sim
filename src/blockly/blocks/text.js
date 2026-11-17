import * as Blockly from 'blockly';
import { defineOrBlocks, orSpec, initFromSpec } from './_orFactory.js';
import { makePlusMinusMutator } from './_plusMinusMutator.js';

// TOOLBOX_TEXT (Texto).
export const TEXT_TYPES = [
  'text', 'text_comment', 'robText_append', 'text_cast_string_toNumber', 'text_cast_char_toNumber',
];

// robText_join: ADD0, ADD1 + extra ADDn via +/−. Open Roberta mutation:
// <mutation items="N"/> where N is the total number of inputs (≥ 2).
function defineTextJoin() {
  const spec = orSpec('robText_join');
  Blockly.Blocks['robText_join'] = {
    ...makePlusMinusMutator({
      mutationAttr: 'items',
      firstExtraIndex: 2,
      addExtraArm(block, n) { block.appendValueInput('ADD' + n); },
      extraArmInputs: (n) => ['ADD' + n],
      toAttrs: (count) => ({ items: 2 + count }),
      fromDom: (el) => Math.max(0, (parseInt(el.getAttribute('items'), 10) || 2) - 2),
    }),
    init() {
      initFromSpec(this, spec);
      this.updateShape_();
    },
  };
}

export function registerTextBlocks() {
  defineOrBlocks(TEXT_TYPES);
  defineTextJoin();
}
