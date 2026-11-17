import { javascriptGenerator, Order } from 'blockly/javascript';

// Codegen for Open Roberta's typed variables and functions (TOOLBOX_VARIABLE,
// TOOLBOX_PROCEDURE). Names are unique across the workspace (Open Roberta's
// findLegalName), so globals, parameters and loop variables map 1:1 onto JS names;
// nameDB_ only makes them safe identifiers ("faz algo" → faz_algo, no reserved words).
//
//   global declaration  → var x = <value>;   (top of the program, before the chain)
//   function            → function f(a, b) { … return <value>; }   (hoisted definition)
//   local declaration   → a parameter of its function

const v = (block, name, order) => javascriptGenerator.valueToCode(block, name, order);
const varName = (name) => javascriptGenerator.nameDB_.getName(name, 'VARIABLE');
const procName = (name) => javascriptGenerator.nameDB_.getName(name, 'PROCEDURE');

/** Default value of each Open Roberta type, used when a socket is left empty. */
export function defaultLiteral(type) {
  switch (type) {
    case 'Number': return '0';
    case 'Boolean': return 'true';
    case 'String': return "''";
    case 'Colour': return "'#ffffff'";
    default: return type && type.startsWith('Array_') ? '[]' : 'null';
  }
}

/** `var name = value;` for each global declaration in the start block. */
export function globalDeclarations(start) {
  let code = '';
  for (let d = start.getInputTargetBlock('ST'); d; d = d.getNextBlock()) {
    if (d.type !== 'robGlobalVariables_declare') continue;
    const value = v(d, 'VALUE', Order.ASSIGNMENT) || defaultLiteral(d.getType());
    code += `var ${varName(d.getFieldValue('VAR'))} = ${value};\n`;
  }
  return code;
}

export function registerVariableCodegen() {
  const G = javascriptGenerator.forBlock;

  // Declarations are emitted by their owner (start block / function), never inline.
  G['robGlobalVariables_declare'] = () => '';
  G['robLocalVariables_declare'] = () => '';

  G['variables_get'] = (b) => [varName(b.getFieldValue('VAR')), Order.ATOMIC];
  G['variables_set'] = (b) =>
    `${varName(b.getFieldValue('VAR'))} = ${v(b, 'VALUE', Order.ASSIGNMENT) || defaultLiteral(b.dataType_)};\n`;

  // ── Functions ────────────────────────────────────────────────────────────
  const definition = (b) => {
    const name = procName(b.getFieldValue('NAME'));
    const params = b.getParams_().names.map(varName);
    let body = javascriptGenerator.statementToCode(b, 'STACK');
    if (b.type === 'robProcedures_defreturn') {
      body += `${javascriptGenerator.INDENT}return ${v(b, 'RETURN', Order.NONE) || defaultLiteral(b.returnType_)};\n`;
    }
    javascriptGenerator.definitions_['%' + name] = `function ${name}(${params.join(', ')}) {\n${body}}`;
    return null;
  };
  G['robProcedures_defnoreturn'] = definition;
  G['robProcedures_defreturn'] = definition;

  const call = (b) => {
    const args = b.arguments_.map((_, i) => v(b, 'ARG' + i, Order.NONE) || defaultLiteral(b.argumentsTypes_[i]));
    return `${procName(b.getProcedureCall())}(${args.join(', ')})`;
  };
  G['robProcedures_callnoreturn'] = (b) => call(b) + ';\n';
  G['robProcedures_callreturn'] = (b) => [call(b), Order.FUNCTION_CALL];

  G['robProcedures_ifreturn'] = (b) => {
    // Outside a function the block only carries a warning; a bare `return` would
    // make the whole program unparseable.
    let inDef = false;
    for (let p = b.getSurroundParent(); p && !inDef; p = p.getSurroundParent()) inDef = /^robProcedures_def/.test(p.type);
    if (!inDef) return '';
    const cond = v(b, 'CONDITION', Order.NONE) || 'false';
    const ret = b.hasReturnValue_
      ? `return ${v(b, 'VALUE', Order.NONE) || defaultLiteral(b.returnType_)};`
      : 'return;';
    return `if (${cond}) {\n${javascriptGenerator.INDENT}${ret}\n}\n`;
  };
}
