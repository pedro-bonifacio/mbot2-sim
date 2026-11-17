import * as Blockly from 'blockly';
import { orSpec, orMsg, initFromSpec } from './_orFactory.js';
import { FieldClickableLabel } from './_plusMinusMutator.js';
import {
  GLOBAL_DECL, LOCAL_DECL, VAR_REF_TYPES, appendToStatement, byName, declarations, mainWs,
  findLegalVarName, varNameValidator, isQuiet, newDefaultValueBlock, withMutationEvent,
} from './_varScope.js';

// TOOLBOX_VARIABLE (Variáveis): Open Roberta's typed variables.
//   - robGlobalVariables_declare: "variável item : Número ← 0", inside the start block
//   - robLocalVariables_declare:  "variável x : Número", a function parameter
//   - variables_get / variables_set, typed by the declaration (<mutation datatype>)
// Declarations are added with "+" on the start/function block and removed with
// their own "−". See _varScope.js for scoping and the sync listener.

// ── Declarations ─────────────────────────────────────────────────────────────

function defineDeclaration(type, kind) {
  const spec = orSpec(type);
  const check = kind === 'global' ? 'declarationGlobal' : 'declarationLocal';
  Blockly.Blocks[type] = {
    init() {
      const block = this;
      this.declarationType_ = 'Number';
      initFromSpec(this, spec, {
        VAR: varNameValidator(this),
        TYPE(t) { block.onTypeChange_(t); return t; },
      });
      this.setPreviousStatement(true, check);
      this.setNextStatement(true, check);
      if (kind === 'global') this.getInput('VALUE').setCheck('Number');
      // Open Roberta draws its "−" mutator icon at the left of the block.
      this.inputList[0].insertFieldAt(0, new FieldClickableLabel('−', 'blockly-rob-plus-minus', (b) => b.remove_()));
      this.setDeletable(false);
      this.setMovable(false);
      const name = findLegalVarName(kind === 'global' ? orMsg('VARIABLES_DEFAULT_NAME', 'item') : 'x', this);
      this.nameOld_ = name;
      this.setFieldValue(name, 'VAR');
      this.setTooltip(orMsg(kind === 'global' ? 'VARIABLES_GLOBAL_DECLARE_TOOLTIP' : 'VARIABLES_LOCAL_DECLARE_TOOLTIP'));
    },
    getVarDecl() { return [this.getFieldValue('VAR')]; },
    getType() { return this.declarationType_; },

    onTypeChange_(t) {
      this.declarationType_ = t;
      if (kind !== 'global') return;
      const inp = this.getInput('VALUE');
      inp.setCheck(t);
      // Open Roberta replaces the value with the new type's default (0, "", true, …).
      if (isQuiet() || !this.workspace || this.isInFlyout) return;
      const old = inp.connection.targetBlock();
      if (old) old.dispose(false);
      const value = newDefaultValueBlock(this.workspace, t);
      if (value) {
        inp.connection.connect(value.outputConnection);
        if (value.render) value.render();
      }
    },

    /** "−": remove the declaration and every get/set of it (as Open Roberta does). */
    remove_() {
      const ws = this.workspace;
      const name = this.getFieldValue('VAR');
      Blockly.Events.setGroup(true);
      try {
        const parent = this.getSurroundParent();
        for (const b of ws.getAllBlocks(false)) {
          if (b.isDeadOrDying() || !VAR_REF_TYPES.includes(b.type)) continue;   // children go with their parent
          if (Blockly.Names.equals(b.getFieldValue('VAR'), name)) b.dispose(true);
        }
        this.unplug(true);
        this.dispose(false);
        if (parent && parent.setDeclare_ && !parent.getInputTargetBlock('ST')) {
          withMutationEvent(parent, () => parent.setDeclare_(false));
        }
      } finally {
        Blockly.Events.setGroup(false);
      }
    },

    mutationToDom() {
      const el = Blockly.utils.xml.createElement('mutation');
      el.setAttribute('next', String(!!this.getNextBlock()));
      el.setAttribute('declaration_type', this.declarationType_);
      return el;
    },
    domToMutation(el) {
      this.declarationType_ = el.getAttribute('declaration_type') || 'Number';
      if (kind === 'global') this.getInput('VALUE').setCheck(this.declarationType_);
    },
    saveExtraState() { return { declaration_type: this.declarationType_ }; },
    loadExtraState(s) {
      this.declarationType_ = (s && s.declaration_type) || 'Number';
      if (kind === 'global') this.getInput('VALUE').setCheck(this.declarationType_);
    },
  };
}

// ── get / set ────────────────────────────────────────────────────────────────

/**
 * Dropdown of declared variable names (Open Roberta's FieldVariable). Accepts any
 * name, so references load before their declaration and survive a removed one.
 */
class FieldVarName extends Blockly.FieldDropdown {
  constructor(value) {
    super(function () { return varOptions(this); });
    this.setValue(value);
  }
  doClassValidation_(value) {
    return typeof value === 'string' && value ? value : null;
  }
}

function varOptions(field) {
  const block = field.getSourceBlock && field.getSourceBlock();
  const ws = block && mainWs(block.workspace);
  const names = new Set(ws ? declarations(ws).map((d) => d.name) : []);
  const current = field.getValue();
  if (current) names.add(current);
  if (!names.size) names.add(orMsg('VARIABLES_DEFAULT_NAME', 'item'));
  return [...names].sort(byName).map((n) => [n, n]);
}

const datatypeMutation = {
  setDataType_(t) {
    if (!t || t === this.dataType_) return;
    this.dataType_ = t;
    this.applyDataType_(t);
  },
  mutationToDom() {
    if (!this.dataType_) return null;
    const el = Blockly.utils.xml.createElement('mutation');
    el.setAttribute('datatype', this.dataType_);
    return el;
  },
  domToMutation(el) { this.setDataType_(el.getAttribute('datatype')); },
  saveExtraState() { return this.dataType_ ? { datatype: this.dataType_ } : null; },
  loadExtraState(s) { if (s) this.setDataType_(s.datatype); },
};

function defineGet() {
  const spec = orSpec('variables_get');
  Blockly.Blocks['variables_get'] = {
    ...datatypeMutation,
    init() {
      this.appendDummyInput().appendField(new FieldVarName(orMsg('VARIABLES_DEFAULT_NAME', 'item')), 'VAR');
      this.setOutput(true);
      this.setColour(spec.colour);
      this.setTooltip(orMsg('VARIABLES_GET_TOOLTIP'));
      this.dataType_ = null;
    },
    applyDataType_(t) { this.outputConnection.setCheck(t); },
  };
}

function defineSet() {
  const spec = orSpec('variables_set');
  Blockly.Blocks['variables_set'] = {
    ...datatypeMutation,
    init() {
      // "definir [VAR] para ◇", labels from the Open Roberta spec.
      const inp = this.appendValueInput('VALUE');
      for (const f of spec.inputs[0].fields) {
        if (f.name === 'VAR') inp.appendField(new FieldVarName(orMsg('VARIABLES_DEFAULT_NAME', 'item')), 'VAR');
        else inp.appendField(f.text);
      }
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(spec.colour);
      this.setTooltip(orMsg('VARIABLES_SET_TOOLTIP'));
      this.dataType_ = null;
    },
    applyDataType_(t) { this.getInput('VALUE').setCheck(t); },
  };
}

// ── "+" on the start block: add a global declaration ─────────────────────────
// (The start block itself is defined in control.js; this is its declare behaviour.)

export const startDeclareMixin = {
  setDeclare_(on) {
    if (!!on === !!this.declare_) return;
    this.declare_ = !!on;
    if (on) this.appendStatementInput('ST').setCheck('declarationGlobal');
    else if (this.getInput('ST')) this.removeInput('ST');
  },
  plus_() {
    const ws = this.workspace;
    Blockly.Events.setGroup(true);
    try {
      withMutationEvent(this, () => this.setDeclare_(true));
      const decl = ws.newBlock(GLOBAL_DECL);
      if (decl.initSvg) decl.initSvg();
      const value = newDefaultValueBlock(ws, 'Number');
      decl.getInput('VALUE').connection.connect(value.outputConnection);
      appendToStatement(this, 'ST', decl);
      if (decl.render) decl.render();
    } finally {
      Blockly.Events.setGroup(false);
    }
  },
};

export function registerVariableBlocks() {
  defineDeclaration(GLOBAL_DECL, 'global');
  defineDeclaration(LOCAL_DECL, 'local');
  defineGet();
  defineSet();
}
