import * as Blockly from 'blockly';

// ── Clickable on-block text label (used as +/− buttons) ──────────────────────
// FieldLabel subclass whose `showEditor_` callback fires an onClick handler.
// We render +/− as small text fields rather than icons — zero assets, matches
// the Open Roberta on-block button UX described in
// reference_openroberta/openrobertambot2context.md.
//
// State is NOT serialised on the field; each host block owns `extraCount_` via
// the mutator mixin below.
export class FieldClickableLabel extends Blockly.FieldLabel {
  constructor(text, cssClass, onClick) {
    super(text, cssClass);
    this.onClick_ = onClick;
  }

  // FieldLabel has no editor; hijack the showEditor_ path that
  // Blockly's bindEvents_ triggers on click for EDITABLE fields.
  showEditor_() {
    if (this.onClick_ && this.sourceBlock_ && !this.sourceBlock_.isInFlyout) {
      this.onClick_(this.sourceBlock_);
    }
  }
}
// Force EDITABLE on the prototype so Field.bindEvents_ attaches pointer handlers.
// (Plain FieldLabel.prototype.EDITABLE = false, so clicks are ignored otherwise.)
FieldClickableLabel.prototype.EDITABLE = true;
FieldClickableLabel.prototype.SERIALIZABLE = false;

// ── Generic +/− mutator mixin factory ────────────────────────────────────────
// Returns an object that can be spread onto a block definition to give it
// Open Roberta-style on-block +/− buttons. Each block keeps its own
// `extraCount_` (number of dynamic arms beyond the base inputs added in init()).
//
// The shape rebuild uses a save-and-restore pattern: snapshot every child block
// connected to dynamic or trailing inputs, tear the inputs down, rebuild them
// at the new count, then reconnect the children by name. Children whose home
// input no longer exists (after minus_) stay floating on the workspace —
// matching Blockly's stock controls_if behaviour.
//
// Config:
//   - mutationAttr   {string}   XML <mutation> attribute used for extraCount_.
//   - addExtraArm    {function} (block, n) => void — appends the inputs for
//                               the nth dynamic arm. n is 1-indexed by default.
//   - extraArmInputs {function} (n) => string[] — names of inputs making up
//                               arm n, used to snapshot/restore children.
//   - firstExtraIndex {number}  Optional. First dynamic-arm index. Defaults to 1.
//                               Use 2 for blocks like text_join where two base
//                               inputs (ADD0, ADD1) exist and extras are ADD2+.
//   - hasTrailing    {boolean}  Optional. If true, a trailing input is appended
//                               after the dynamic arms (e.g. ELSE for ifElse).
//   - addTrailing    {function} (block) => void — appends the trailing input(s).
//   - trailingInputs {string[]} Names of trailing inputs (for snapshot/restore).
export function makePlusMinusMutator(config) {
  const {
    mutationAttr,
    addExtraArm,
    extraArmInputs,
    firstExtraIndex = 1,
    hasTrailing = false,
    addTrailing = null,
    trailingInputs = [],
  } = config;

  return {
    extraCount_: 0,

    // ── Serialisation (XML — legacy and current file format) ────────────────
    mutationToDom() {
      const el = Blockly.utils.xml.createElement('mutation');
      if (this.extraCount_) el.setAttribute(mutationAttr, String(this.extraCount_));
      return el;
    },
    domToMutation(xmlEl) {
      this.extraCount_ = parseInt(xmlEl.getAttribute(mutationAttr), 10) || 0;
      this.updateShape_();
    },

    // ── Serialisation (JSON — Blockly 11 state API) ────────────────────────
    saveExtraState() {
      return { extraCount: this.extraCount_ };
    },
    loadExtraState(state) {
      this.extraCount_ = (state && state.extraCount) || 0;
      this.updateShape_();
    },

    // ── Button handlers ─────────────────────────────────────────────────────
    plus_() {
      Blockly.Events.setGroup(true);
      try {
        const oldMutation = Blockly.Xml.domToText(this.mutationToDom());
        this.extraCount_++;
        this.updateShape_();
        const newMutation = Blockly.Xml.domToText(this.mutationToDom());
        Blockly.Events.fire(new Blockly.Events.BlockChange(
          this, 'mutation', null, oldMutation, newMutation));
      } finally {
        Blockly.Events.setGroup(false);
      }
    },
    minus_() {
      if (this.extraCount_ <= 0) return;
      Blockly.Events.setGroup(true);
      try {
        const oldMutation = Blockly.Xml.domToText(this.mutationToDom());
        this.extraCount_--;
        this.updateShape_();
        const newMutation = Blockly.Xml.domToText(this.mutationToDom());
        Blockly.Events.fire(new Blockly.Events.BlockChange(
          this, 'mutation', null, oldMutation, newMutation));
      } finally {
        Blockly.Events.setGroup(false);
      }
    },

    // ── Rebuild dynamic + trailing inputs and the BUTTONS row ──────────────
    updateShape_() {
      // 1. Snapshot children of existing dynamic arms and trailing inputs.
      const saved = {};
      for (let n = firstExtraIndex; ; n++) {
        const names = extraArmInputs(n);
        const present = names.some((name) => this.getInput(name));
        if (!present) break;
        for (const name of names) {
          const inp = this.getInput(name);
          if (inp && inp.connection) saved[name] = inp.connection.targetBlock();
        }
      }
      for (const name of trailingInputs) {
        const inp = this.getInput(name);
        if (inp && inp.connection) saved[name] = inp.connection.targetBlock();
      }

      // 2. Tear down dynamic + trailing + BUTTONS.
      for (let n = firstExtraIndex; ; n++) {
        const names = extraArmInputs(n);
        let anyRemoved = false;
        for (const name of names) {
          if (this.getInput(name)) {
            this.removeInput(name);
            anyRemoved = true;
          }
        }
        if (!anyRemoved) break;
      }
      for (const name of trailingInputs) {
        if (this.getInput(name)) this.removeInput(name);
      }
      if (this.getInput('BUTTONS')) this.removeInput('BUTTONS');

      // 3. Re-add dynamic arms.
      for (let i = 0; i < this.extraCount_; i++) {
        addExtraArm(this, firstExtraIndex + i);
      }

      // 4. Re-add trailing.
      if (hasTrailing && addTrailing) addTrailing(this);

      // 5. Reconnect saved children to the rebuilt inputs by name. A child
      //    block has either outputConnection (value) or previousConnection
      //    (statement) — never both — so the OR picks the right one. If the
      //    type doesn't match the input, connect() throws and we keep the
      //    child floating on the workspace.
      for (const name in saved) {
        const child = saved[name];
        if (!child) continue;
        const input = this.getInput(name);
        if (!input || !input.connection) continue;
        const childConn = child.outputConnection || child.previousConnection;
        if (!childConn) continue;
        try {
          input.connection.connect(childConn);
        } catch (e) {
          console.warn('[plusMinusMutator] could not reconnect child', name, e);
        }
      }

      // 6. +/− buttons row last. "−" only when there is something to remove.
      const buttons = this.appendDummyInput('BUTTONS');
      buttons.appendField(
        new FieldClickableLabel('+', 'blockly-rob-plus-minus',
          (block) => block.plus_()));
      if (this.extraCount_ > 0) {
        buttons.appendField(
          new FieldClickableLabel('−', 'blockly-rob-plus-minus',
            (block) => block.minus_()));
      }
    },
  };
}
