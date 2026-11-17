import * as Blockly from 'blockly';
import { orSpec, orMsg, initFromSpec } from './_orFactory.js';
import { FieldClickableLabel } from './_plusMinusMutator.js';
import {
  LOCAL_DECL, appendToStatement, chainUnder, findLegalProcName, procNameValidator,
  setWarning, withMutationEvent,
} from './_varScope.js';

// TOOLBOX_PROCEDURE (Funções): Open Roberta's robProcedures_* blocks.
//   - definitions: "faz algo" (no return) and "faz algo … return [tipo] ◇"
//     "+" adds a typed parameter (robLocalVariables_declare) in the ST input
//   - calls: arguments and return type mirror the definition
//     (<mutation name output_type><arg name type/></mutation>)
//   - "se ◇ retorna ◇": early return, only inside a definition
// Calls are kept in sync with their definition by _varScope.syncWorkspace.

// ── Definitions ──────────────────────────────────────────────────────────────

function defineDefinition(type, withReturn) {
  const spec = orSpec(type);
  Blockly.Blocks[type] = {
    init() {
      const block = this;
      this.declare_ = false;
      this.returnType_ = 'Number';
      initFromSpec(this, spec, {
        NAME: procNameValidator(this),
        TYPE(t) { block.setReturnType_(t); return t; },
      });
      this.inputList[0].insertFieldAt(0, new FieldClickableLabel('+', 'blockly-rob-plus-minus', (b) => b.plus_()));
      const name = findLegalProcName(orMsg('PROCEDURES_DEFNORETURN_PROCEDURE', 'faz algo'), this);
      this.nameOld_ = name;
      this.setFieldValue(name, 'NAME');
      this.setTooltip(orMsg(withReturn ? 'PROCEDURES_DEFRETURN_TOOLTIP' : 'PROCEDURES_DEFNORETURN_TOOLTIP'));
    },
    getProcedureDef() { return [this.getFieldValue('NAME'), this, withReturn]; },

    /** Parameters, in order: { names, types }. */
    getParams_() {
      const decls = this.getInput('ST') ? chainUnder(this, 'ST').filter((b) => b.type === LOCAL_DECL) : [];
      return { names: decls.map((d) => d.getVarDecl()[0]), types: decls.map((d) => d.getType()) };
    },

    setDeclare_(on) {
      if (!!on === !!this.declare_) return;
      this.declare_ = !!on;
      this.setFieldValue(on ? orMsg('PROCEDURES_BEFORE_PARAMS', 'com:') : '', 'WITH');
      if (on) {
        this.appendStatementInput('ST').setCheck('declarationLocal');
        this.moveInputBefore('ST', 'STACK');
      } else if (this.getInput('ST')) {
        this.removeInput('ST');
      }
    },

    setReturnType_(t) {
      if (!withReturn || !t) return;
      this.returnType_ = t;
      this.getInput('RETURN').setCheck(t);
    },

    /** "+": add a parameter. */
    plus_() {
      const ws = this.workspace;
      Blockly.Events.setGroup(true);
      try {
        withMutationEvent(this, () => this.setDeclare_(true));
        const decl = ws.newBlock(LOCAL_DECL);
        if (decl.initSvg) decl.initSvg();
        appendToStatement(this, 'ST', decl);
        if (decl.render) decl.render();
      } finally {
        Blockly.Events.setGroup(false);
      }
    },

    mutationToDom() {
      const el = Blockly.utils.xml.createElement('mutation');
      el.setAttribute('declare', String(!!this.declare_));
      if (withReturn) el.setAttribute('return_type', this.returnType_);
      return el;
    },
    domToMutation(el) {
      this.setDeclare_(el.getAttribute('declare') !== 'false');   // Open Roberta: anything but "false"
      if (withReturn) this.setReturnType_(el.getAttribute('return_type'));
    },
    saveExtraState() { return withReturn ? { declare: this.declare_, return_type: this.returnType_ } : { declare: this.declare_ }; },
    loadExtraState(s) {
      this.setDeclare_(!!(s && s.declare));
      if (withReturn && s) this.setReturnType_(s.return_type);
    },
  };
}

// ── Calls ────────────────────────────────────────────────────────────────────

function defineCall(type, withOutput) {
  const spec = orSpec(type);
  Blockly.Blocks[type] = {
    init() {
      initFromSpec(this, spec);
      this.procName_ = '';
      this.arguments_ = [];
      this.argumentsTypes_ = [];
      if (withOutput) this.outputType_ = 'Number';
    },
    getProcedureCall() { return this.procName_; },

    setProcName_(name) {
      this.procName_ = name;
      this.setFieldValue(name, 'NAME');
      this.setTooltip(orMsg(withOutput ? 'PROCEDURES_CALLRETURN_TOOLTIP' : 'PROCEDURES_CALLNORETURN_TOOLTIP', '%1').replace('%1', name));
    },
    renameProcedure(oldName, newName) {
      if (Blockly.Names.equals(oldName, this.procName_)) this.setProcName_(newName);
    },

    /** Rebuilds ARGn inputs; connected values follow their parameter by name (else position). */
    setParameters_(names, types) {
      if (names.join('\u0000') === this.arguments_.join('\u0000') &&
          types.join('\u0000') === this.argumentsTypes_.join('\u0000') &&
          names.every((_, i) => this.getInput('ARG' + i))) return;
      const oldNames = this.arguments_;
      const oldBlocks = oldNames.map((_, i) => this.getInput('ARG' + i)?.connection.targetBlock() || null);
      for (let i = 0; this.getInput('ARG' + i); i++) this.removeInput('ARG' + i);
      this.arguments_ = names.slice();
      this.argumentsTypes_ = types.slice();
      const used = new Set();
      names.forEach((name, i) => {
        const inp = this.appendValueInput('ARG' + i).setAlign(Blockly.inputs.Align.RIGHT).appendField(name).setCheck(types[i] || null);
        let j = oldNames.indexOf(name);
        if (j < 0 && i < oldNames.length && !names.includes(oldNames[i])) j = i;   // renamed parameter
        const child = j >= 0 && !used.has(j) ? oldBlocks[j] : null;
        if (child && child.outputConnection) {
          used.add(j);
          try { inp.connection.connect(child.outputConnection); } catch { /* type mismatch: leave it floating */ }
        }
      });
    },
    setOutputType_(t) {
      if (!withOutput || !t || t === this.outputType_) return;
      this.outputType_ = t;
      this.outputConnection.setCheck(t);
    },

    mutationToDom() {
      const el = Blockly.utils.xml.createElement('mutation');
      el.setAttribute('name', this.procName_);
      this.arguments_.forEach((name, i) => {
        const arg = Blockly.utils.xml.createElement('arg');
        arg.setAttribute('name', name);
        arg.setAttribute('type', this.argumentsTypes_[i]);
        el.appendChild(arg);
      });
      if (withOutput) el.setAttribute('output_type', this.outputType_);
      return el;
    },
    domToMutation(el) {
      this.setProcName_(el.getAttribute('name') || '');
      const args = Array.from(el.children).filter((c) => c.nodeName.toLowerCase() === 'arg');
      this.setParameters_(args.map((a) => a.getAttribute('name')), args.map((a) => a.getAttribute('type')));
      if (withOutput) this.setOutputType_(el.getAttribute('output_type'));
    },
    saveExtraState() {
      const s = { name: this.procName_, args: this.arguments_.map((name, i) => ({ name, type: this.argumentsTypes_[i] })) };
      if (withOutput) s.output_type = this.outputType_;
      return s;
    },
    loadExtraState(s) {
      if (!s) return;
      this.setProcName_(s.name || '');
      const args = s.args || [];
      this.setParameters_(args.map((a) => a.name), args.map((a) => a.type));
      if (withOutput) this.setOutputType_(s.output_type);
    },

    customContextMenu(options) {
      const name = this.procName_;
      const ws = this.workspace;
      options.push({
        enabled: true,
        text: orMsg('PROCEDURES_HIGHLIGHT_DEF', 'Highlight function definition'),
        callback() {
          const def = ws.getAllBlocks(false).find((b) => b.getProcedureDef && Blockly.Names.equals(b.getFieldValue('NAME'), name));
          if (def && def.select) def.select();
        },
      });
    },
  };
}

// ── if … return … ───────────────────────────────────────────────────────────
// <mutation value="1|0" return_type="T"/>. Inside a function without return the
// value socket becomes a plain "retorna" label.

function defineIfReturn() {
  const spec = orSpec('robProcedures_ifreturn');
  const returnLabel = spec.inputs.find((i) => i.name === 'VALUE').fields[0].text;
  Blockly.Blocks['robProcedures_ifreturn'] = {
    init() {
      initFromSpec(this, spec);
      this.hasReturnValue_ = true;
      this.returnType_ = null;
      this.setTooltip(orMsg('PROCEDURES_IFRETURN_TOOLTIP'));
    },
    setHasValue_(has) {
      if (has === this.hasReturnValue_) return;
      this.hasReturnValue_ = has;
      this.removeInput('VALUE');
      if (has) this.appendValueInput('VALUE').appendField(returnLabel);
      else this.appendDummyInput('VALUE').appendField(returnLabel);
    },
    /** Called by the sync listener with the enclosing definition (or null). */
    setContext_(def) {
      if (!def) {
        setWarning(this, orMsg('PROCEDURES_IFRETURN_WARNING'));
        return;
      }
      setWarning(this, null);
      const withReturn = def.type === 'robProcedures_defreturn';
      this.setHasValue_(withReturn);
      const t = withReturn ? def.returnType_ : null;
      if (withReturn && t !== this.returnType_) {
        this.returnType_ = t;
        this.getInput('VALUE').setCheck(t);
      }
    },
    mutationToDom() {
      const el = Blockly.utils.xml.createElement('mutation');
      el.setAttribute('value', String(Number(this.hasReturnValue_)));
      if (this.returnType_) el.setAttribute('return_type', this.returnType_);
      return el;
    },
    domToMutation(el) {
      this.setHasValue_(el.getAttribute('value') === '1');
      const t = el.getAttribute('return_type');
      if (t && this.hasReturnValue_) { this.returnType_ = t; this.getInput('VALUE').setCheck(t); }
    },
    saveExtraState() { return { value: this.hasReturnValue_, return_type: this.returnType_ }; },
    loadExtraState(s) {
      if (!s) return;
      this.setHasValue_(!!s.value);
      if (s.return_type && this.hasReturnValue_) { this.returnType_ = s.return_type; this.getInput('VALUE').setCheck(s.return_type); }
    },
  };
}

export function registerProcedureBlocks() {
  defineDefinition('robProcedures_defnoreturn', false);
  defineDefinition('robProcedures_defreturn', true);
  defineCall('robProcedures_callnoreturn', false);
  defineCall('robProcedures_callreturn', true);
  defineIfReturn();
}
