import { javascriptGenerator, Order } from 'blockly/javascript';
import { globalDeclarations } from './variables.js';

// Codegen for TOOLBOX_CONTROL blocks + the program start block.
// Loop/wait semantics follow the MicroPython Open Roberta generates for the mBot 2.

const v = (block, name, fallback) => javascriptGenerator.valueToCode(block, name, Order.NONE) || fallback;
const stmt = (block, name) => javascriptGenerator.statementToCode(block, name) || '';
const loopVar = (name) => javascriptGenerator.nameDB_.getName(name, 'VARIABLE');

export function registerControlCodegen() {
  const G = javascriptGenerator.forBlock;

  // Start block: global variable declarations; the chain under it is the program.
  G['robControls_start'] = (b) => globalDeclarations(b);

  // if / if-else: same input names as Blockly's controls_if (IFn, DOn, ELSE).
  G['robControls_if'] = G['controls_if'];
  G['robControls_ifElse'] = G['controls_if'];

  G['robControls_loopForever'] = (b) => `while (true) {\n${stmt(b, 'DO')}}\n`;

  // "contar com j de A até B em S" → Python range(A, B, S): B is exclusive.
  G['robControls_for'] = (b) => {
    const name = loopVar(b.getFieldValue('VAR'));
    const from = v(b, 'FROM', '0');
    const to = v(b, 'TO', '0');
    const by = v(b, 'BY', '1');
    const end = javascriptGenerator.nameDB_.getDistinctName(name + '_end', 'VARIABLE');
    const step = javascriptGenerator.nameDB_.getDistinctName(name + '_step', 'VARIABLE');
    return `var ${end} = Math.floor(${to}), ${step} = Math.floor(${by});\n` +
      `for (var ${name} = Math.floor(${from}); ${step} > 0 ? ${name} < ${end} : ${name} > ${end}; ${name} += ${step}) {\n` +
      `${stmt(b, 'DO')}}\n`;
  };

  G['robControls_forEach'] = (b) => {
    const name = loopVar(b.getFieldValue('VAR'));
    const list = v(b, 'LIST', '[]');
    const lv = javascriptGenerator.nameDB_.getDistinctName(name + '_list', 'VARIABLE');
    const iv = javascriptGenerator.nameDB_.getDistinctName(name + '_index', 'VARIABLE');
    return `var ${lv} = ${list};\n` +
      `for (var ${iv} = 0; ${iv} < ${lv}.length; ${iv}++) {\n` +
      `  var ${name} = ${lv}[${iv}];\n${stmt(b, 'DO')}}\n`;
  };

  // ── Waits ────────────────────────────────────────────────────────────────
  G['robControls_wait_time'] = (b) => `robotAPI.wait_ms(${v(b, 'WAIT', '0')});\n`;

  // Busy-wait: the run loop's step budget yields to the sim each frame, so sensor
  // values update between checks (same polling loop as the robot's MicroPython).
  G['robControls_wait'] = (b) => `while (!(${v(b, 'WAIT0', 'false')})) {}\n`;

  // "espera até C0 (faça D0) ou C1 faça D1 …": the first condition to become true
  // runs its own branch.
  G['robControls_wait_for'] = (b) => {
    if (!b.getInput('DO0')) return `while (!(${v(b, 'WAIT0', 'false')})) {}\n`;
    let code = 'while (true) {\n';
    for (let n = 0; b.getInput('WAIT' + n); n++) {
      code += `  if (${v(b, 'WAIT' + n, 'false')}) {\n${javascriptGenerator.prefixLines(stmt(b, 'DO' + n), '  ')}    break;\n  }\n`;
    }
    return code + '}\n';
  };
}
