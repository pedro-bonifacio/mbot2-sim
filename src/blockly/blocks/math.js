import * as Blockly from 'blockly';
import { defineOrBlocks, orSpec, initFromSpec } from './_orFactory.js';

// TOOLBOX_MATH (Matemática).
export const MATH_TYPES = [
  'math_number', 'math_arithmetic', 'math_single', 'math_trig', 'math_constant',
  'robMath_change', 'math_round', 'math_modulo', 'math_constrain',
  'math_random_int', 'math_random_float', 'math_cast_toString', 'math_cast_toChar',
];

// math_number_property: "… é divisível por …" adds a DIVISOR input.
// Open Roberta mutation: <mutation divisor_input="true|false"/>.
function defineNumberProperty() {
  const spec = orSpec('math_number_property');
  Blockly.Blocks['math_number_property'] = {
    init() {
      const block = this;
      initFromSpec(this, spec, {
        PROPERTY(v) { block.updateShape_(v === 'DIVISIBLE_BY'); return v; },
      });
    },
    updateShape_(divisor) {
      const has = !!this.getInput('DIVISOR');
      if (divisor && !has) this.appendValueInput('DIVISOR').setCheck('Number');
      else if (!divisor && has) this.removeInput('DIVISOR');
    },
    mutationToDom() {
      const el = Blockly.utils.xml.createElement('mutation');
      el.setAttribute('divisor_input', String(this.getFieldValue('PROPERTY') === 'DIVISIBLE_BY'));
      return el;
    },
    domToMutation(el) { this.updateShape_(el.getAttribute('divisor_input') === 'true'); },
    saveExtraState() { return { divisor: this.getFieldValue('PROPERTY') === 'DIVISIBLE_BY' }; },
    loadExtraState(s) { this.updateShape_(!!(s && s.divisor)); },
  };
}

// math_on_list: Open Roberta mutation <mutation op="SUM"/>.
function defineOnList() {
  const spec = orSpec('math_on_list');
  Blockly.Blocks['math_on_list'] = {
    init() { initFromSpec(this, spec); },
    mutationToDom() {
      const el = Blockly.utils.xml.createElement('mutation');
      el.setAttribute('op', this.getFieldValue('OP'));
      return el;
    },
    domToMutation() { /* output is always Number for the mBot 2 option set */ },
  };
}

export function registerMathBlocks() {
  defineOrBlocks(MATH_TYPES);
  defineNumberProperty();
  defineOnList();
}
