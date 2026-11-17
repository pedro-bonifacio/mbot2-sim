import * as Blockly from 'blockly';
import { defineOrBlocks, orSpec, orMsg, initFromSpec, makeField } from './_orFactory.js';
import { FieldClickableLabel } from './_plusMinusMutator.js';

// TOOLBOX_LIST (Listas). Lists in Open Roberta are typed (Array_Number, …).
// Mutation formats reproduce Open Roberta's exactly (see or-mbot2-dynamic.json sources).

const PLAIN_TYPES = ['robLists_length', 'robLists_isEmpty', 'robLists_indexOf'];

function listTypeField(spec, block) {
  const f = spec.inputs.flatMap(i => i.fields).find(x => x.name === 'LIST_TYPE');
  const [field] = makeField({ ...f, value: block.listType_ }, (v) => { block.setListType_(v); return v; });
  return field;
}

// ── create list with … ───────────────────────────────────────────────────────
// <mutation items="N" list_type="Number"/>. N = 0 → "criar lista vazia : [tipo]".
function defineCreateWith() {
  const spec = orSpec('robLists_create_with');
  Blockly.Blocks['robLists_create_with'] = {
    init() {
      this.setColour(spec.colour);
      this.setInputsInline(false);
      this.itemCount_ = 0;
      this.listType_ = 'Number';
      this.updateShape_();
    },
    setListType_(t) {
      this.listType_ = t;
      for (let i = 0; i < this.itemCount_; i++) this.getInput('ADD' + i)?.setCheck(t);
      this.setOutput(true, 'Array_' + t);
    },
    updateShape_() {
      const saved = [];
      for (let i = 0; this.getInput('ADD' + i); i++) saved.push(this.getInputTargetBlock('ADD' + i));
      for (const name of ['EMPTY', 'BUTTONS']) if (this.getInput(name)) this.removeInput(name);
      for (let i = 0; this.getInput('ADD' + i); i++) this.removeInput('ADD' + i);

      if (this.itemCount_ === 0) {
        this.appendDummyInput('EMPTY')
          .appendField(orMsg('LISTS_CREATE_EMPTY_TITLE', 'criar lista vazia'))
          .appendField(':').appendField(listTypeField(spec, this), 'LIST_TYPE');
      } else {
        for (let i = 0; i < this.itemCount_; i++) {
          const inp = this.appendValueInput('ADD' + i).setCheck(this.listType_);
          if (i === 0) {
            inp.appendField(orMsg('LISTS_CREATE_TITLE', 'criar lista com')).appendField(':')
              .appendField(listTypeField(spec, this), 'LIST_TYPE').appendField('←').appendField('0');
          } else {
            inp.setAlign(Blockly.inputs.Align.RIGHT).appendField(String(i));
          }
          const child = saved[i];
          if (child && child.outputConnection) {
            try { inp.connection.connect(child.outputConnection); } catch { /* type mismatch: leave floating */ }
          }
        }
      }
      const buttons = this.appendDummyInput('BUTTONS');
      buttons.appendField(new FieldClickableLabel('+', 'blockly-rob-plus-minus', (b) => b.changeCount_(1)));
      if (this.itemCount_ > 0) {
        buttons.appendField(new FieldClickableLabel('−', 'blockly-rob-plus-minus', (b) => b.changeCount_(-1)));
      }
      this.setOutput(true, 'Array_' + this.listType_);
    },
    changeCount_(delta) {
      const before = Blockly.Xml.domToText(this.mutationToDom());
      this.itemCount_ = Math.max(0, this.itemCount_ + delta);
      this.updateShape_();
      Blockly.Events.fire(new Blockly.Events.BlockChange(
        this, 'mutation', null, before, Blockly.Xml.domToText(this.mutationToDom())));
    },
    mutationToDom() {
      const el = Blockly.utils.xml.createElement('mutation');
      el.setAttribute('items', String(this.itemCount_));
      el.setAttribute('list_type', this.listType_);
      return el;
    },
    domToMutation(el) {
      this.itemCount_ = parseInt(el.getAttribute('items'), 10) || 0;
      this.listType_ = el.getAttribute('list_type') || 'Number';
      this.updateShape_();
    },
    saveExtraState() { return { items: this.itemCount_, list_type: this.listType_ }; },
    loadExtraState(s) {
      this.itemCount_ = (s && s.items) || 0;
      this.listType_ = (s && s.list_type) || 'Number';
      this.updateShape_();
    },
  };
}

// ── create list with item repeated n times ──────────────────────────────────
// <mutation list_type="Number"/>.
function defineRepeat() {
  const spec = orSpec('robLists_repeat');
  Blockly.Blocks['robLists_repeat'] = {
    init() {
      const block = this;
      initFromSpec(this, spec, { LIST_TYPE(v) { block.setListType_(v); return v; } });
      this.listType_ = this.getFieldValue('LIST_TYPE');
    },
    setListType_(t) {
      this.listType_ = t;
      this.getInput('ITEM').setCheck(t);
      this.setOutput(true, 'Array_' + t);
    },
    mutationToDom() {
      const el = Blockly.utils.xml.createElement('mutation');
      el.setAttribute('list_type', this.listType_);
      return el;
    },
    domToMutation(el) { this.setListType_(el.getAttribute('list_type') || 'Number'); },
    saveExtraState() { return { list_type: this.listType_ }; },
    loadExtraState(s) { this.setListType_((s && s.list_type) || 'Number'); },
  };
}

// Shared: rebuild an index input (AT/AT1/AT2) as value input (FROM_START/FROM_END)
// or as a dummy (FIRST/LAST), carrying its WHERE dropdown along.
function rebuildAt(block, inputName, whereName, whereField, isAt, insertBefore, prefix = null) {
  if (block.getInput(inputName)) block.removeInput(inputName);
  const inp = isAt
    ? block.appendValueInput(inputName).setCheck('Number')
    : block.appendDummyInput(inputName);
  if (prefix) inp.appendField(prefix);
  const [dd] = makeField(whereField, function (value) {
    const newAt = value === 'FROM_START' || value === 'FROM_END';
    if (newAt !== isAt) {
      const b = this.getSourceBlock();
      rebuildAt(b, inputName, whereName, whereField, newAt, insertBefore, prefix);
      b.setFieldValue(value, whereName);
      return null;
    }
    return undefined;
  });
  inp.appendField(dd, whereName);
  if (insertBefore && block.getInput(insertBefore)) block.moveInputBefore(inputName, insertBefore);
}

function whereSpec(spec, name) {
  return spec.inputs.flatMap(i => i.fields).find(f => f.name === name);
}

// ── get / remove item ────────────────────────────────────────────────────────
// <mutation statement="false" at="true" datatype="Number"/>. MODE=REMOVE turns the
// block into a statement; WHERE FIRST/LAST drops the index socket.
function defineGetIndex() {
  const spec = orSpec('robLists_getIndex');
  const where = whereSpec(spec, 'WHERE');
  Blockly.Blocks['robLists_getIndex'] = {
    init() {
      const block = this;
      const base = { ...spec, inputs: spec.inputs.filter(i => i.name !== 'AT') };
      initFromSpec(this, base, { MODE(v) { block.updateStatement_(v === 'REMOVE'); return v; } });
      this.dataType_ = 'Number';
      rebuildAt(this, 'AT', 'WHERE', where, true, null);
    },
    updateStatement_(isStatement) {
      if (isStatement === !this.outputConnection) return;
      this.unplug(true);
      if (isStatement) {
        this.setOutput(false);
        this.setPreviousStatement(true);
        this.setNextStatement(true);
      } else {
        this.setPreviousStatement(false);
        this.setNextStatement(false);
        this.setOutput(true, this.dataType_);
      }
    },
    mutationToDom() {
      const el = Blockly.utils.xml.createElement('mutation');
      el.setAttribute('statement', String(!this.outputConnection));
      el.setAttribute('at', String(this.getInput('AT').type === Blockly.inputs.inputTypes.VALUE));
      el.setAttribute('datatype', this.dataType_);
      return el;
    },
    domToMutation(el) {
      this.dataType_ = el.getAttribute('datatype') || 'Number';
      if (this.outputConnection) this.setOutput(true, this.dataType_);
      this.updateStatement_(el.getAttribute('statement') === 'true');
      rebuildAt(this, 'AT', 'WHERE', where, el.getAttribute('at') !== 'false', null);
    },
  };
}

// ── set / insert item ────────────────────────────────────────────────────────
// <mutation at="true"/>.
function defineSetIndex() {
  const spec = orSpec('robLists_setIndex');
  const where = whereSpec(spec, 'WHERE');
  Blockly.Blocks['robLists_setIndex'] = {
    init() {
      const base = { ...spec, inputs: spec.inputs.filter(i => i.name !== 'AT') };
      initFromSpec(this, base);
      rebuildAt(this, 'AT', 'WHERE', where, true, 'TO');
    },
    mutationToDom() {
      const el = Blockly.utils.xml.createElement('mutation');
      el.setAttribute('at', String(this.getInput('AT').type === Blockly.inputs.inputTypes.VALUE));
      return el;
    },
    domToMutation(el) { rebuildAt(this, 'AT', 'WHERE', where, el.getAttribute('at') !== 'false', 'TO'); },
  };
}

// ── get sub-list ─────────────────────────────────────────────────────────────
// <mutation at1="true" at2="true"/>.
function defineGetSublist() {
  const spec = orSpec('robLists_getSublist');
  const w1 = whereSpec(spec, 'WHERE1');
  const w2 = whereSpec(spec, 'WHERE2');
  // AT1 carries the "obtem sublista" label; it is passed through every rebuild.
  const at1Label = spec.inputs.find(i => i.name === 'AT1').fields.find(f => f.t === 'label');
  Blockly.Blocks['robLists_getSublist'] = {
    init() {
      const base = { ...spec, inputs: spec.inputs.filter(i => i.name !== 'AT1' && i.name !== 'AT2') };
      initFromSpec(this, base);
      this.setAt_(1, true);
      this.setAt_(2, true);
    },
    setAt_(n, isAt) {
      rebuildAt(this, 'AT' + n, 'WHERE' + n, n === 1 ? w1 : w2, isAt, n === 1 ? 'AT2' : null,
        n === 1 && at1Label ? at1Label.text : null);
    },
    mutationToDom() {
      const el = Blockly.utils.xml.createElement('mutation');
      el.setAttribute('at1', String(this.getInput('AT1').type === Blockly.inputs.inputTypes.VALUE));
      el.setAttribute('at2', String(this.getInput('AT2').type === Blockly.inputs.inputTypes.VALUE));
      return el;
    },
    domToMutation(el) {
      this.setAt_(1, el.getAttribute('at1') === 'true');
      this.setAt_(2, el.getAttribute('at2') === 'true');
    },
  };
}

export function registerListBlocks() {
  defineOrBlocks(PLAIN_TYPES);
  defineCreateWith();
  defineRepeat();
  defineGetIndex();
  defineSetIndex();
  defineGetSublist();
}
