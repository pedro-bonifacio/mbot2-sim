import { defineOrBlocks } from './_orFactory.js';

// TOOLBOX_LOGIC (Lógica). Overrides Blockly's stock logic blocks with Open Roberta's
// definitions (same field names, so Blockly's JavaScript generators still apply).
export const LOGIC_TYPES = [
  'logic_compare', 'logic_operation', 'logic_negate', 'logic_boolean', 'logic_null', 'logic_ternary',
];

export function registerLogicBlocks() {
  defineOrBlocks(LOGIC_TYPES);
}
