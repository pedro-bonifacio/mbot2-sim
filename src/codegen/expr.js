import { javascriptGenerator, Order } from 'blockly/javascript';
import * as Blockly from 'blockly';

// Codegen for math, cast, text, list, and colour blocks.
// All generated code must be ES5-compatible (JS-Interpreter runs ecmaVersion:5).

export function registerExprCodegen() {

  // ── Math ───────────────────────────────────────────────────────────────────

  // robMath_change: increment variable by delta (undefined-safe via || 0)
  // Fields: VAR (FieldVariable); Input: DELTA
  javascriptGenerator.forBlock['robMath_change'] = function (block) {
    const varName = javascriptGenerator.nameDB_.getName(
      block.getFieldValue('VAR'),
      Blockly.Names.NameType.VARIABLE,
    );
    const delta = javascriptGenerator.valueToCode(block, 'DELTA', Order.ADDITION) || '0';
    return varName + ' = (' + varName + ' || 0) + ' + delta + ';\n';
  };

  // ── Casts ──────────────────────────────────────────────────────────────────

  // math_cast_toString: Number → String
  // Input: NUM
  javascriptGenerator.forBlock['math_cast_toString'] = function (block) {
    const num = javascriptGenerator.valueToCode(block, 'NUM', Order.NONE) || '0';
    return ['String(' + num + ')', Order.FUNCTION_CALL];
  };

  // math_cast_toChar: Number → single char via Unicode code point
  // Input: NUM
  javascriptGenerator.forBlock['math_cast_toChar'] = function (block) {
    const num = javascriptGenerator.valueToCode(block, 'NUM', Order.NONE) || '0';
    return ['String.fromCharCode(' + num + ')', Order.FUNCTION_CALL];
  };

  // text_cast_string_toNumber: String → Number
  // Input: TEXT
  javascriptGenerator.forBlock['text_cast_string_toNumber'] = function (block) {
    const text = javascriptGenerator.valueToCode(block, 'TEXT', Order.NONE) || '""';
    return ['Number(' + text + ')', Order.FUNCTION_CALL];
  };

  // text_cast_char_toNumber: first char of string → Unicode code point
  // Input: CHAR
  javascriptGenerator.forBlock['text_cast_char_toNumber'] = function (block) {
    const char_ = javascriptGenerator.valueToCode(block, 'CHAR', Order.NONE) || '""';
    return ['(' + char_ + ').charCodeAt(0)', Order.FUNCTION_CALL];
  };

  // ── Text ───────────────────────────────────────────────────────────────────

  // text_comment: emits a JS comment line; no runtime effect
  // Field: COMMENT
  javascriptGenerator.forBlock['text_comment'] = function (block) {
    const comment = block.getFieldValue('COMMENT') || '';
    const escaped = comment.replace(/\n/g, '\n// ');
    return '// ' + escaped + '\n';
  };

  // robText_join: concatenate ADD0 + ADD1 (block def has exactly 2 slots, dynamically detected)
  // Inputs: ADD0, ADD1
  javascriptGenerator.forBlock['robText_join'] = function (block) {
    const parts = [];
    for (let i = 0; block.getInput('ADD' + i); i++) {
      parts.push(javascriptGenerator.valueToCode(block, 'ADD' + i, Order.ADDITION) || '""');
    }
    if (parts.length === 0) return ['""', Order.ATOMIC];
    return ["('' + " + parts.join(' + ') + ')', Order.ADDITION];
  };

  // robText_append: append text to a variable (appends as string)
  // Input: TEXT; Field: VAR (FieldVariable)
  javascriptGenerator.forBlock['robText_append'] = function (block) {
    const varName = javascriptGenerator.nameDB_.getName(
      block.getFieldValue('VAR'),
      Blockly.Names.NameType.VARIABLE,
    );
    const text = javascriptGenerator.valueToCode(block, 'TEXT', Order.NONE) || '""';
    return varName + " = String(" + varName + " || '') + String(" + text + ');\n';
  };

  // ── Lists ──────────────────────────────────────────────────────────────────

  // Indexing convention: 0-BASED throughout.
  // robLists_indexOf tooltip says "(−1 se não encontrado)" = JS Array.indexOf convention.
  // All list position inputs are therefore 0-based; -1 = not found for indexOf.

  // robLists_create_with: build array from fixed inputs (ADD0, ADD1, ADD2)
  // Inputs dynamically detected; block def has 3 slots.
  javascriptGenerator.forBlock['robLists_create_with'] = function (block) {
    const items = [];
    for (let i = 0; block.getInput('ADD' + i); i++) {
      items.push(javascriptGenerator.valueToCode(block, 'ADD' + i, Order.COMMA) || 'null');
    }
    return ['[' + items.join(', ') + ']', Order.ATOMIC];
  };

  // robLists_repeat: N copies of item.
  // ES5 IIFE instead of Array.prototype.fill (which is ES6).
  // Inputs: ITEM, NUM
  javascriptGenerator.forBlock['robLists_repeat'] = function (block) {
    const item = javascriptGenerator.valueToCode(block, 'ITEM', Order.COMMA) || 'null';
    const num  = javascriptGenerator.valueToCode(block, 'NUM',  Order.NONE)  || '0';
    const code = '(function(){var _a=[],_n=Math.max(0,Math.floor(' + num + '));' +
                 'for(var _i=0;_i<_n;_i++)_a.push(' + item + ');return _a;})()';
    return [code, Order.ATOMIC];
  };

  // robLists_length: array length
  // Input: VALUE
  javascriptGenerator.forBlock['robLists_length'] = function (block) {
    const list = javascriptGenerator.valueToCode(block, 'VALUE', Order.MEMBER) || '[]';
    return [list + '.length', Order.MEMBER];
  };

  // robLists_isEmpty: true when array is empty
  // Input: VALUE
  javascriptGenerator.forBlock['robLists_isEmpty'] = function (block) {
    const list = javascriptGenerator.valueToCode(block, 'VALUE', Order.MEMBER) || '[]';
    return [list + '.length === 0', Order.EQUALITY];
  };

  // robLists_indexOf: first occurrence (0-based), -1 if not found
  // Inputs: VALUE (list), FIND (item)
  javascriptGenerator.forBlock['robLists_indexOf'] = function (block) {
    const list = javascriptGenerator.valueToCode(block, 'VALUE', Order.MEMBER) || '[]';
    const item = javascriptGenerator.valueToCode(block, 'FIND',  Order.NONE)   || 'null';
    return [list + '.indexOf(' + item + ')', Order.FUNCTION_CALL];
  };

  // robLists_getIndex: get item at position (0-based)
  // WHERE codes: FIRST, LAST, FROM_START, FROM_END, RANDOM
  // Field: WHERE; Inputs: VALUE (list), AT (number, 0-based)
  // Note: if VALUE is a complex expression it will be evaluated twice for LAST/FROM_END/RANDOM.
  // In practice VALUE is always a variable, so this is safe.
  javascriptGenerator.forBlock['robLists_getIndex'] = function (block) {
    const where = block.getFieldValue('WHERE');
    const list  = javascriptGenerator.valueToCode(block, 'VALUE', Order.MEMBER) || '[]';
    const at    = javascriptGenerator.valueToCode(block, 'AT',    Order.NONE)   || '0';
    let code;
    switch (where) {
      case 'FIRST':      code = list + '[0]'; break;
      case 'LAST':       code = list + '[' + list + '.length-1]'; break;
      case 'FROM_START': code = list + '[' + at + ']'; break;
      case 'FROM_END':   code = list + '[' + list + '.length-1-(' + at + ')]'; break;
      case 'RANDOM':     code = list + '[Math.floor(Math.random()*' + list + '.length)]'; break;
      default:           code = list + '[' + at + ']';
    }
    return [code, Order.MEMBER];
  };

  // robLists_setIndex: set item at position (0-based). Statement.
  // Field: WHERE; Inputs: VALUE (list), AT (number), TO (new value)
  javascriptGenerator.forBlock['robLists_setIndex'] = function (block) {
    const where = block.getFieldValue('WHERE');
    const list  = javascriptGenerator.valueToCode(block, 'VALUE', Order.MEMBER)     || '[]';
    const at    = javascriptGenerator.valueToCode(block, 'AT',    Order.NONE)        || '0';
    const val   = javascriptGenerator.valueToCode(block, 'TO',    Order.ASSIGNMENT)  || 'null';
    let lhs;
    switch (where) {
      case 'FIRST':      lhs = list + '[0]'; break;
      case 'LAST':       lhs = list + '[' + list + '.length-1]'; break;
      case 'FROM_START': lhs = list + '[' + at + ']'; break;
      case 'FROM_END':   lhs = list + '[' + list + '.length-1-(' + at + ')]'; break;
      case 'RANDOM':     lhs = list + '[Math.floor(Math.random()*' + list + '.length)]'; break;
      default:           lhs = list + '[' + at + ']';
    }
    return lhs + ' = ' + val + ';\n';
  };

  // robLists_getSublist: extract a sublist using slice(start, end).
  // WHERE codes (SUBLIST_WHERE_OPTIONS): FIRST_FROM_START, FROM_START, FROM_END, LAST.
  // Indices 0-based; slice end is exclusive.
  // Fields: WHERE1, WHERE2; Inputs: VALUE (list), AT1, AT2
  javascriptGenerator.forBlock['robLists_getSublist'] = function (block) {
    const where1 = block.getFieldValue('WHERE1');
    const where2 = block.getFieldValue('WHERE2');
    const list   = javascriptGenerator.valueToCode(block, 'VALUE', Order.MEMBER) || '[]';
    const at1    = javascriptGenerator.valueToCode(block, 'AT1',   Order.NONE)   || '0';
    const at2    = javascriptGenerator.valueToCode(block, 'AT2',   Order.NONE)   || '0';

    let start, end;
    // start of slice (inclusive, 0-based)
    switch (where1) {
      case 'FIRST_FROM_START': start = '0'; break;
      case 'FROM_START':       start = at1; break;
      case 'FROM_END':         start = list + '.length-1-(' + at1 + ')'; break;
      case 'LAST':             start = list + '.length-1'; break;
      default:                 start = at1;
    }
    // end of slice (exclusive, 0-based)
    switch (where2) {
      case 'FIRST_FROM_START': end = '1'; break;
      case 'FROM_START':       end = '(' + at2 + ')+1'; break;
      case 'FROM_END':         end = list + '.length-(' + at2 + ')'; break;
      case 'LAST':             end = list + '.length'; break;
      default:                 end = '(' + at2 + ')+1';
    }
    return [list + '.slice(' + start + ',' + end + ')', Order.FUNCTION_CALL];
  };

  // ── Colour ─────────────────────────────────────────────────────────────────

  // robColour_picker: returns the sensor colour name string (matches quadRGB return values)
  // Field: COLOUR stores hex string; we map it to the English name that sensorQuadRGBForProbe returns.
  const HEX_TO_COLOUR_NAME = {
    '#cc0000': 'red',
    '#ff6600': 'orange',
    '#ffff00': 'yellow',
    '#33cc00': 'green',
    '#33ffff': 'cyan',
    '#3366ff': 'blue',
    '#cc33cc': 'purple',
    '#ffffff': 'white',
    '#000000': 'black',
  };
  javascriptGenerator.forBlock['robColour_picker'] = function (block) {
    const hex  = (block.getFieldValue('COLOUR') || '#000000').toLowerCase();
    const name = HEX_TO_COLOUR_NAME[hex] || hex;
    return [JSON.stringify(name), Order.ATOMIC];
  };

  // naoColour_rgb: build #rrggbb from R, G, B components (0-255, clamped)
  // Inputs: RED, GREEN, BLUE
  // ES5 IIFE — no arrow functions, no String.prototype.padStart (ES2017).
  javascriptGenerator.forBlock['naoColour_rgb'] = function (block) {
    const r = javascriptGenerator.valueToCode(block, 'RED',   Order.NONE) || '0';
    const g = javascriptGenerator.valueToCode(block, 'GREEN', Order.NONE) || '0';
    const b = javascriptGenerator.valueToCode(block, 'BLUE',  Order.NONE) || '0';
    const code =
      '(function(){' +
        'function p(v){var s=(Math.max(0,Math.min(255,Math.round(v)))).toString(16);' +
        'return s.length<2?\'0\'+s:s;}' +
        'return \'#\'+p(' + r + ')+p(' + g + ')+p(' + b + ');' +
      '})()';
    return [code, Order.ATOMIC];
  };
}
