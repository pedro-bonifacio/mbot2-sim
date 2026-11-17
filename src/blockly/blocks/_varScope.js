import * as Blockly from 'blockly';

// Open Roberta's typed-variable model (decision 0011), shared by the variable,
// function, loop and start blocks.
//
// Variables are not Blockly variable models. They are declarations, i.e. blocks
// with getVarDecl()/getType():
//   - global: robGlobalVariables_declare inside the start block's ST input
//   - local:  robLocalVariables_declare inside a function's ST input (= parameter)
//   - loop:   robControls_for / robControls_forEach (the loop variable)
// variables_get/variables_set refer to a declaration by name. Names are unique across
// the whole workspace (case-insensitive, like Open Roberta's findLegalName).
//
// syncWorkspace() is the single change listener that keeps references consistent:
// value types, out-of-scope warnings, function call arguments, return types.

export const START_TYPE = 'robControls_start';
export const GLOBAL_DECL = 'robGlobalVariables_declare';
export const LOCAL_DECL = 'robLocalVariables_declare';
export const DEF_TYPES = ['robProcedures_defnoreturn', 'robProcedures_defreturn'];
export const CALL_TYPES = ['robProcedures_callnoreturn', 'robProcedures_callreturn'];
export const LOOP_TYPES = ['robControls_for', 'robControls_forEach'];
export const VAR_REF_TYPES = ['variables_get', 'variables_set'];

const VAR_NAME_RE = /^[a-zA-Z][a-zA-Z_$0-9]*$/;   // Open Roberta validateName
const PROC_NAME_RE = /^[a-z][a-zA-Z0-9_]*$/;      // Open Roberta Procedures.robRename

const sameName = (a, b) => typeof a === 'string' && typeof b === 'string' && Blockly.Names.equals(a, b);
export const byName = (a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' });

/** The real workspace for a block shown in a flyout. */
export const mainWs = (ws) => (ws && ws.isFlyout && ws.targetWorkspace ? ws.targetWorkspace : ws);

/**
 * True while Blockly is loading XML/JSON (events disabled) or replaying undo/redo.
 * Validators must then accept values as they are and not create or rename blocks.
 */
export const isQuiet = () => !Blockly.Events.isEnabled() || !Blockly.Events.getRecordUndo();

function nextName(name) {
  const m = name.match(/^(.*?)(\d+)$/);
  return m ? m[1] + (parseInt(m[2], 10) + 1) : name + '2';
}

/** Open Roberta Variables.findLegalName: first free name among all declarations. */
export function findLegalVarName(name, block) {
  const ws = block.workspace;
  if (!ws || block.isInFlyout) return name;
  const taken = (n) => ws.getAllBlocks(false).some((b) => b !== block && b.getVarDecl && sameName(b.getVarDecl()[0], n));
  while (taken(name)) name = nextName(name);
  return name;
}

/** Open Roberta Procedures.findLegalName: first free name among function definitions. */
export function findLegalProcName(name, block) {
  const ws = block.workspace;
  if (!ws || block.isInFlyout) return name;
  const taken = (n) => ws.getAllBlocks(false).some((b) => b !== block && b.getProcedureDef && sameName(b.getProcedureDef()[0], n));
  while (taken(name)) name = nextName(name);
  return name;
}

export function renameVarRefs(ws, oldName, newName, root = null) {
  const blocks = root ? root.getDescendants(false) : ws.getAllBlocks(false);
  for (const b of blocks) {
    if (VAR_REF_TYPES.includes(b.type) && sameName(b.getFieldValue('VAR'), oldName)) b.setFieldValue(newName, 'VAR');
  }
}

export function renameCallers(ws, oldName, newName) {
  for (const b of ws.getAllBlocks(false)) {
    if (b.renameProcedure) b.renameProcedure(oldName, newName);
  }
}

/**
 * Validator for a declaring VAR field (declarations, loop variables). Rejects names
 * Open Roberta rejects, makes the name unique and renames every reference.
 * The block keeps the current name in `nameOld_`.
 */
export function varNameValidator(block) {
  return function (value) {
    const clean = String(value).replace(/[\s\xa0]+/g, '');
    if (!VAR_NAME_RE.test(clean)) return null;
    if (isQuiet() || !block.workspace || block.isInFlyout) {
      block.nameOld_ = clean;
      return clean;
    }
    const legal = findLegalVarName(clean, block);
    if (block.nameOld_ && legal !== block.nameOld_) renameVarRefs(block.workspace, block.nameOld_, legal);
    block.nameOld_ = legal;
    return legal;
  };
}

/** Validator for a function NAME field (Open Roberta Procedures.robRename). */
export function procNameValidator(block) {
  return function (value) {
    const clean = String(value).replace(/^[\s\xa0]+|[\s\xa0]+$/g, '');
    // Open Roberta's default name ("faz algo") doesn't pass its own rename rule.
    if (isQuiet() || !block.workspace || block.isInFlyout || clean === block.nameOld_) {
      block.nameOld_ = clean;
      return clean;
    }
    if (!PROC_NAME_RE.test(clean)) return null;
    const legal = findLegalProcName(clean, block);
    if (block.nameOld_ !== undefined && legal !== block.nameOld_) renameCallers(block.workspace, block.nameOld_, legal);
    block.nameOld_ = legal;
    return legal;
  };
}

/** Declarations currently in effect: [{ name, type, kind, owner, block }]. */
export function declarations(ws) {
  const out = [];
  for (const b of ws.getAllBlocks(false)) {
    if (!b.getVarDecl) continue;
    let kind = null;
    let owner = null;
    if (b.type === GLOBAL_DECL) {
      const p = b.getSurroundParent();
      if (p && p.type === START_TYPE) { kind = 'global'; owner = p; }
    } else if (b.type === LOCAL_DECL) {
      const p = b.getSurroundParent();
      if (p && DEF_TYPES.includes(p.type)) { kind = 'local'; owner = p; }
    } else if (LOOP_TYPES.includes(b.type)) {
      kind = 'loop';
      owner = b;
    }
    if (kind) out.push({ name: b.getVarDecl()[0], type: b.getType(), kind, owner, block: b });
  }
  return out;
}

/** Declarations chained under a statement input, in order. */
export function chainUnder(block, inputName) {
  const out = [];
  for (let b = block.getInputTargetBlock(inputName); b; b = b.getNextBlock()) out.push(b);
  return out;
}

/** Appends `child` at the end of the stack in statement input `inputName`. */
export function appendToStatement(block, inputName, child) {
  const chain = chainUnder(block, inputName);
  const conn = chain.length ? chain[chain.length - 1].nextConnection : block.getInput(inputName).connection;
  conn.connect(child.previousConnection);
}

function create(ws, type) {
  const b = ws.newBlock(type);
  if (b.initSvg) b.initSvg();
  return b;
}

/** The value block Open Roberta puts into a new global declaration of `type`. */
export function newDefaultValueBlock(ws, type) {
  let b;
  if (type === 'Number') { b = create(ws, 'math_number'); b.setFieldValue('0', 'NUM'); }
  else if (type === 'String') { b = create(ws, 'text'); b.setFieldValue('', 'TEXT'); }
  else if (type === 'Boolean') { b = create(ws, 'logic_boolean'); b.setFieldValue('TRUE', 'BOOL'); }
  else if (type === 'Colour') { b = create(ws, 'robColour_picker'); b.setFieldValue('#FFFFFF', 'COLOUR'); }
  else if (type && type.startsWith('Array_')) {
    // Open Roberta: robLists_create_with.createIt(3, itemType).
    const itemType = type.slice(6);
    b = create(ws, 'robLists_create_with');
    b.itemCount_ = 3;
    b.listType_ = itemType;
    b.updateShape_();
    b.setListType_(itemType);
    for (let i = 0; i < 3; i++) {
      b.getInput('ADD' + i).connection.connect(newDefaultValueBlock(ws, itemType).outputConnection);
    }
  } else {
    return null;
  }
  return b;
}

/** Runs fn and fires one mutation change event for `block` (undo-able). */
export function withMutationEvent(block, fn) {
  const text = () => {
    const dom = block.mutationToDom && block.mutationToDom();
    return dom ? Blockly.Xml.domToText(dom) : '';
  };
  const before = text();
  fn();
  const after = text();
  if (before !== after) {
    Blockly.Events.fire(new (Blockly.Events.get(Blockly.Events.BLOCK_CHANGE))(block, 'mutation', null, before, after));
  }
}

export function setWarning(block, text) {
  const next = text || null;
  if ((block.robWarning_ || null) === next) return;
  block.robWarning_ = next;
  block.setWarningText(next);
}

const msg = (key, fallback) => Blockly.Msg[key] || fallback;

function insideOf(block, owner) {
  for (let p = block.getSurroundParent(); p; p = p.getSurroundParent()) if (p === owner) return true;
  return false;
}

// ── Keeping the workspace consistent ────────────────────────────────────────

/** Gives a pasted/duplicated declaration or function a free name. */
function fixCreatedNames(block) {
  if (block.getProcedureDef && block.workspace && !block.isInFlyout) {
    const name = block.getFieldValue('NAME');
    const legal = findLegalProcName(name, block);
    if (legal !== name) { block.nameOld_ = legal; block.setFieldValue(legal, 'NAME'); }
  }
  if (block.getVarDecl && block.workspace && !block.isInFlyout) {
    const name = block.getVarDecl()[0];
    const legal = findLegalVarName(name, block);
    if (legal !== name) {
      block.nameOld_ = legal;
      block.setFieldValue(legal, 'VAR');
      // References that came along with the copy follow the new name.
      const root = LOOP_TYPES.includes(block.type) ? block : block.getSurroundParent();
      if (root && root.type !== START_TYPE) renameVarRefs(block.workspace, name, legal, root);
    }
  }
}

let syncing = false;

/** Workspace change listener (main workspace only). Idempotent. */
export function syncWorkspace(event) {
  if (event.isUiEvent) return;
  const ws = Blockly.Workspace.getById(event.workspaceId);
  if (!ws || ws.isFlyout || syncing) return;
  syncing = true;
  const prevGroup = Blockly.Events.getGroup();
  if (event.group) Blockly.Events.setGroup(event.group);
  try {
    if (event.type === Blockly.Events.BLOCK_CREATE) {
      for (const id of event.ids || []) {
        const b = ws.getBlockById(id);
        if (b) fixCreatedNames(b);
      }
    }
    syncBlocks(ws, event.type === Blockly.Events.BLOCK_DELETE);
  } finally {
    Blockly.Events.setGroup(prevGroup || false);
    syncing = false;
  }
}

/** Applies declaration types/scopes to every reference. Exported for headless use. */
export function syncBlocks(ws, afterDelete = false) {
  const decls = declarations(ws);
  const all = ws.getAllBlocks(false);

  // Variable references: type follows the declaration; warn when out of scope.
  for (const b of all) {
    if (!VAR_REF_TYPES.includes(b.type)) continue;
    const name = b.getFieldValue('VAR');
    const d = decls.find((x) => sameName(x.name, name));
    let warning = null;
    if (!d) {
      warning = msg('ROB_VARIABLE_NOT_DECLARED', 'Variable not declared.').replace('%1', name);
    } else {
      b.setDataType_(d.type);
      if (d.kind === 'local' && !insideOf(b, d.owner)) {
        warning = msg('ROB_VARIABLE_LOCAL_SCOPE', '%1').replace('%1', name).replace('%2', d.owner.getFieldValue('NAME'));
      } else if (d.kind === 'loop' && !insideOf(b, d.owner)) {
        warning = msg('ROB_VARIABLE_LOOP_SCOPE', '%1').replace('%1', name);
      }
    }
    setWarning(b, warning);
  }

  // Function calls: arguments and return type follow the definition.
  const defs = all.filter((b) => b.getProcedureDef);
  for (const b of all) {
    if (!CALL_TYPES.includes(b.type)) continue;
    const def = defs.find((d) => sameName(d.getFieldValue('NAME'), b.getProcedureCall()));
    if (!def) {
      // Open Roberta removes calls when their definition is deleted.
      if (afterDelete && !b.isDeadOrDying()) b.dispose(true);
      continue;
    }
    const { names, types } = def.getParams_();
    b.setParameters_(names, types);
    if (b.setOutputType_) b.setOutputType_(def.returnType_);
  }

  // "if … return …" adapts to the function it's in.
  for (const b of all) {
    if (b.type !== 'robProcedures_ifreturn' || b.isDeadOrDying()) continue;
    let def = null;
    for (let p = b.getSurroundParent(); p; p = p.getSurroundParent()) if (DEF_TYPES.includes(p.type)) { def = p; break; }
    b.setContext_(def);
  }
}
