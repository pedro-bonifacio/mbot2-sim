import * as Blockly from 'blockly';
import { declarations, byName, DEF_TYPES } from '../blocks/_varScope.js';

// The two dynamic toolbox categories, built the way Open Roberta builds them
// (Blockly.Variables.flyoutCategory / Blockly.Procedures.flyoutCategory in its fork).
//
// Variáveis: "definir x para" + "x" for every declared variable — globals, then
// function parameters, then loop variables, each group sorted by name. With no
// global or parameter declared, a hint to use "+" on the start block.
//
// Funções: the three definition blocks, then a call for every defined function.

const xml = (tag, attrs = {}, children = []) => {
  const el = Blockly.utils.xml.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  for (const c of children) el.appendChild(c);
  return el;
};

const field = (name, value) => {
  const el = xml('field', { name });
  el.appendChild(Blockly.utils.xml.createTextNode(value));
  return el;
};

export function variableFlyout(ws) {
  const decls = declarations(ws);
  const group = (kind) => decls.filter((d) => d.kind === kind).sort((a, b) => byName(a.name, b.name));
  const globals = group('global');
  const locals = group('local');
  const loops = group('loop');
  const out = [];
  if (!globals.length && !locals.length) {
    for (const line of String(Blockly.Msg.ROB_FLYOUT_VARIABLE_TEXT || '').split('\n')) {
      out.push(xml('label', { text: line }));
    }
  }
  for (const list of [globals, locals, loops]) {
    for (const d of list) {
      const mutation = () => xml('mutation', { datatype: d.type });
      out.push(xml('block', { type: 'variables_set', gap: 8 }, [mutation(), field('VAR', d.name)]));
      out.push(xml('block', { type: 'variables_get', gap: 24 }, [mutation(), field('VAR', d.name)]));
    }
    if (list.length && out.length) out[out.length - 1].setAttribute('gap', 36);
  }
  return out;
}

export function procedureFlyout(ws) {
  const out = [
    xml('block', { type: 'robProcedures_defnoreturn', gap: 16 }),
    xml('block', { type: 'robProcedures_defreturn', gap: 16 }),
    xml('block', { type: 'robProcedures_ifreturn', gap: 24 }),
  ];
  const defs = ws.getAllBlocks(false).filter((b) => DEF_TYPES.includes(b.type))
    .sort((a, b) => byName(a.getFieldValue('NAME'), b.getFieldValue('NAME')));
  for (const withReturn of [false, true]) {
    for (const def of defs.filter((d) => (d.type === 'robProcedures_defreturn') === withReturn)) {
      const { names, types } = def.getParams_();
      const attrs = { name: def.getFieldValue('NAME') };
      if (withReturn) attrs.output_type = def.returnType_;
      const args = names.map((name, i) => xml('arg', { name, type: types[i] }));
      const type = withReturn ? 'robProcedures_callreturn' : 'robProcedures_callnoreturn';
      out.push(xml('block', { type, gap: 16 }, [xml('mutation', attrs, args)]));
    }
  }
  return out;
}

/** Replaces Blockly's stock VARIABLE/PROCEDURE categories on this workspace. */
export function registerDynamicCategories(ws) {
  ws.registerToolboxCategoryCallback('VARIABLE', variableFlyout);
  ws.registerToolboxCategoryCallback('PROCEDURE', procedureFlyout);
}
