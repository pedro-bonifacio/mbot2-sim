import * as Blockly from 'blockly';
import { defineOrBlocks, orSpec, orMsg, initFromSpec } from './_orFactory.js';
import { makePlusMinusMutator } from './_plusMinusMutator.js';

// TOOLBOX_CONTROL (Controlo): decisions, loops, waits — plus the program start block.
// Plain blocks come straight from the Open Roberta spec; dynamic ones (+/− arms,
// typed loops) reproduce Open Roberta's mutation format exactly.

const PLAIN_TYPES = [
  'robControls_loopForever', 'controls_repeat_ext', 'controls_whileUntil',
  'controls_flow_statements', 'robControls_wait', 'robControls_wait_time',
];

// ── if / if-else ──────────────────────────────────────────────────────────────
// Open Roberta mutation: <mutation elseif="n" else="1"/>. Arms: IFn (Boolean) + DOn.

function addElseIfArm(block, n) {
  block.appendValueInput('IF' + n).setCheck('Boolean').appendField(orMsg('CONTROLS_IF_MSG_ELSEIF', 'senão se'));
  block.appendStatementInput('DO' + n).appendField(orMsg('CONTROLS_IF_MSG_THEN', 'então'));
}

function ifMutator(withElse) {
  return makePlusMinusMutator({
    mutationAttr: 'elseif',
    addExtraArm: addElseIfArm,
    extraArmInputs: (n) => ['IF' + n, 'DO' + n],
    hasTrailing: withElse,
    addTrailing: withElse
      ? (block) => block.appendStatementInput('ELSE').appendField(orMsg('CONTROLS_IF_MSG_ELSE', 'senão'))
      : null,
    trailingInputs: withElse ? ['ELSE'] : [],
    toAttrs: (count) => {
      const a = {};
      if (count) a.elseif = count;
      if (withElse) a.else = 1;
      return a;
    },
    fromDom: (el) => parseInt(el.getAttribute('elseif'), 10) || 0,
  });
}

function defineIf(type, withElse) {
  const spec = orSpec(type);
  // Base inputs (IF0, DO0) from the spec; ELSE is rebuilt by the mutator.
  const base = { ...spec, inputs: spec.inputs.filter(i => i.name !== 'ELSE') };
  Blockly.Blocks[type] = {
    ...ifMutator(withElse),
    init() {
      initFromSpec(this, base);
      this.updateShape_();
    },
  };
}

// ── wait until … (or …) ──────────────────────────────────────────────────────
// Open Roberta mutation: <mutation wait="n"/>. With n ≥ 1 every condition gets its own
// statement input: WAIT0 DO0, WAIT1 DO1, … ("espera até … ou …").

function defineWaitFor() {
  const spec = orSpec('robControls_wait_for');
  Blockly.Blocks['robControls_wait_for'] = {
    ...makePlusMinusMutator({
      mutationAttr: 'wait',
      addExtraArm(block, n) {
        if (n === 1 && !block.getInput('DO0')) {
          block.appendStatementInput('DO0').appendField(orMsg('CONTROLS_REPEAT_INPUT_DO', 'faça'));
        }
        block.appendValueInput('WAIT' + n).setCheck('Boolean').appendField(orMsg('WAIT_OR', 'ou'));
        block.appendStatementInput('DO' + n).appendField(orMsg('CONTROLS_REPEAT_INPUT_DO', 'faça'));
      },
      extraArmInputs: (n) => (n === 1 ? ['DO0', 'WAIT1', 'DO1'] : ['WAIT' + n, 'DO' + n]),
    }),
    init() {
      initFromSpec(this, spec);
      this.updateShape_();
    },
  };
}

// ── count with j from … to … by … ────────────────────────────────────────────
// Open Roberta's PT message for this block lists the TO input twice (a translation
// bug that renders an extra empty socket). We keep the single, correct TO input.
// Intentional exception in scripts/or-fidelity-check.mjs.

function defineFor() {
  const spec = orSpec('robControls_for');
  const seen = new Set();
  const inputs = spec.inputs.filter((i) => {
    if (!i.name) return true;
    if (seen.has(i.name)) return false;
    seen.add(i.name);
    return true;
  });
  Blockly.Blocks['robControls_for'] = {
    init() {
      initFromSpec(this, { ...spec, inputs });
    },
  };
}

// ── for each item in list (typed) ────────────────────────────────────────────
// Open Roberta mutation: <mutation list_type="Number"/>; LIST accepts Array_<type>.

function defineForEach() {
  const spec = orSpec('robControls_forEach');
  Blockly.Blocks['robControls_forEach'] = {
    init() {
      const block = this;
      initFromSpec(this, spec, {
        TYPE(newValue) { block.updateType_(newValue); return newValue; },
      });
      // Like Open Roberta, LIST accepts any list type until a type is chosen/loaded.
      this.listType_ = this.getFieldValue('TYPE');
    },
    updateType_(t) {
      this.listType_ = t;
      const inp = this.getInput('LIST');
      if (inp) inp.setCheck('Array_' + t);
    },
    mutationToDom() {
      const el = Blockly.utils.xml.createElement('mutation');
      el.setAttribute('list_type', this.listType_);
      return el;
    },
    domToMutation(el) {
      const t = el.getAttribute('list_type');
      if (t) this.updateType_(t);
    },
    saveExtraState() { return { list_type: this.listType_ }; },
    loadExtraState(s) { if (s && s.list_type) this.updateType_(s.list_type); },
  };
}

// ── Program start ────────────────────────────────────────────────────────────
// Open Roberta: every program hangs under one non-deletable start block
// ("iniciar"). Only blocks connected to it run. Global variable declarations
// (<mutation declare="true"/>) are added together with the variable system.

function defineStart() {
  const spec = orSpec('robControls_start');
  Blockly.Blocks['robControls_start'] = {
    init() {
      initFromSpec(this, spec);
      this.setDeletable(false);
      this.declare_ = false;
    },
    mutationToDom() {
      const el = Blockly.utils.xml.createElement('mutation');
      el.setAttribute('declare', String(!!this.declare_));
      return el;
    },
    domToMutation(el) {
      this.declare_ = el.getAttribute('declare') === 'true';
    },
    saveExtraState() { return { declare: !!this.declare_ }; },
    loadExtraState(s) { this.declare_ = !!(s && s.declare); },
  };
}

export function registerControlBlocks() {
  defineOrBlocks(PLAIN_TYPES);
  defineIf('robControls_if', false);
  defineIf('robControls_ifElse', true);
  defineWaitFor();
  defineFor();
  defineForEach();
  defineStart();
}

