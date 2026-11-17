import { javascriptGenerator, Order } from 'blockly/javascript';

// Codegen for logic/math/text/list/colour blocks that differ from Blockly's stock
// generators. Stock generators (logic_*, math_arithmetic, math_trig, …) are reused
// as-is because Open Roberta uses the same input/field names.
//
// Colours are lowercase "#rrggbb" strings everywhere (picker, RGB block, quad RGB
// sensor), so `colour == colour` comparisons behave like Open Roberta's RGB tuples.

const v = (block, name, order, fallback) => javascriptGenerator.valueToCode(block, name, order) || fallback;

export function registerExprCodegen() {
  const G = javascriptGenerator.forBlock;

  // ── Math ─────────────────────────────────────────────────────────────────
  const stockSingle = G['math_single'];
  G['math_single'] = (b) => {
    if (b.getFieldValue('OP') === 'SQUARE') {
      return [`Math.pow(${v(b, 'NUM', Order.NONE, '0')}, 2)`, Order.FUNCTION_CALL];
    }
    return stockSingle.call(javascriptGenerator, b, javascriptGenerator);
  };

  // robMath_change: VAR is a value socket holding a variable block.
  G['robMath_change'] = (b) => {
    const target = v(b, 'VAR', Order.ATOMIC, null);
    if (!target) return '';
    return `${target} = ${target} + ${v(b, 'DELTA', Order.ADDITION, '0')};\n`;
  };

  G['math_cast_toString'] = (b) => [`String(${v(b, 'VALUE', Order.NONE, '0')})`, Order.FUNCTION_CALL];
  G['math_cast_toChar'] = (b) => [`String.fromCharCode(${v(b, 'VALUE', Order.NONE, '0')})`, Order.FUNCTION_CALL];

  // ── Text ─────────────────────────────────────────────────────────────────
  G['text_comment'] = (b) => '// ' + String(b.getFieldValue('TEXT') || '').replace(/\n/g, '\n// ') + '\n';

  G['robText_join'] = (b) => {
    const parts = [];
    for (let i = 0; b.getInput('ADD' + i); i++) parts.push(`String(${v(b, 'ADD' + i, Order.NONE, "''")})`);
    return [parts.length ? parts.join(' + ') : "''", Order.ADDITION];
  };

  G['robText_append'] = (b) => {
    const target = v(b, 'VAR', Order.ATOMIC, null);
    if (!target) return '';
    return `${target} = String(${target}) + String(${v(b, 'TEXT', Order.NONE, "''")});\n`;
  };

  G['text_cast_string_toNumber'] = (b) => [`Number(${v(b, 'VALUE', Order.NONE, "''")})`, Order.FUNCTION_CALL];
  G['text_cast_char_toNumber'] = (b) =>
    [`String(${v(b, 'VALUE', Order.NONE, "''")}).charCodeAt(${v(b, 'AT', Order.NONE, '0')})`, Order.FUNCTION_CALL];

  // ── Lists (0-based indices, as in Open Roberta) ──────────────────────────
  G['robLists_create_with'] = (b) => {
    const items = [];
    for (let i = 0; b.getInput('ADD' + i); i++) items.push(v(b, 'ADD' + i, Order.NONE, 'null'));
    return ['[' + items.join(', ') + ']', Order.ATOMIC];
  };

  G['robLists_repeat'] = (b) => {
    const item = v(b, 'ITEM', Order.NONE, 'null');
    const num = v(b, 'NUM', Order.NONE, '0');
    return [`(function () { var a = []; for (var i = 0; i < ${num}; i++) a.push(${item}); return a; })()`, Order.FUNCTION_CALL];
  };

  G['robLists_length'] = (b) => [`${v(b, 'VALUE', Order.MEMBER, '[]')}.length`, Order.MEMBER];
  G['robLists_isEmpty'] = (b) => [`(${v(b, 'VALUE', Order.MEMBER, '[]')}.length === 0)`, Order.ATOMIC];
  G['robLists_indexOf'] = (b) => {
    const fn = b.getFieldValue('END') === 'LAST' ? 'lastIndexOf' : 'indexOf';
    return [`${v(b, 'VALUE', Order.MEMBER, '[]')}.${fn}(${v(b, 'FIND', Order.NONE, 'null')})`, Order.FUNCTION_CALL];
  };

  // Index expression for WHERE ∈ FROM_START | FROM_END | FIRST | LAST.
  function indexExpr(list, where, at) {
    switch (where) {
      case 'FIRST': return '0';
      case 'LAST': return `${list}.length - 1`;
      case 'FROM_END': return `${list}.length - 1 - (${at})`;
      default: return at;
    }
  }

  G['robLists_getIndex'] = (b) => {
    const list = v(b, 'VALUE', Order.MEMBER, '[]');
    const at = b.getInput('AT') && b.getInput('AT').connection ? v(b, 'AT', Order.NONE, '0') : '0';
    const idx = indexExpr(list, b.getFieldValue('WHERE'), at);
    const mode = b.getFieldValue('MODE');
    if (mode === 'REMOVE') return `${list}.splice(${idx}, 1);\n`;
    if (mode === 'GET_REMOVE') return [`${list}.splice(${idx}, 1)[0]`, Order.MEMBER];
    return [`${list}[${idx}]`, Order.MEMBER];
  };

  G['robLists_setIndex'] = (b) => {
    const list = v(b, 'LIST', Order.MEMBER, '[]');
    const at = b.getInput('AT') && b.getInput('AT').connection ? v(b, 'AT', Order.NONE, '0') : '0';
    const value = v(b, 'TO', Order.NONE, 'null');
    const where = b.getFieldValue('WHERE');
    if (b.getFieldValue('MODE') === 'INSERT') {
      const idx = where === 'LAST' ? `${list}.length` : indexExpr(list, where, at);
      return `${list}.splice(${idx}, 0, ${value});\n`;
    }
    return `${list}[${indexExpr(list, where, at)}] = ${value};\n`;
  };

  G['robLists_getSublist'] = (b) => {
    const list = v(b, 'LIST', Order.MEMBER, '[]');
    const at1 = b.getInput('AT1').connection ? v(b, 'AT1', Order.NONE, '0') : '0';
    const at2 = b.getInput('AT2').connection ? v(b, 'AT2', Order.NONE, '0') : '0';
    const start = indexExpr(list, b.getFieldValue('WHERE1'), at1);
    const endIdx = indexExpr(list, b.getFieldValue('WHERE2'), at2);
    return [`${list}.slice(${start}, (${endIdx}) + 1)`, Order.FUNCTION_CALL];
  };

  // ── Colour ───────────────────────────────────────────────────────────────
  G['robColour_picker'] = (b) =>
    [JSON.stringify(String(b.getFieldValue('COLOUR') || '#000000').toLowerCase()), Order.ATOMIC];

  G['naoColour_rgb'] = (b) =>
    [`robotAPI.rgb(${v(b, 'RED', Order.NONE, '0')}, ${v(b, 'GREEN', Order.NONE, '0')}, ${v(b, 'BLUE', Order.NONE, '0')})`, Order.FUNCTION_CALL];
}
