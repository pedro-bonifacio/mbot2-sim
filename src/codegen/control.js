import { javascriptGenerator, Order } from 'blockly/javascript';

// Codegen for all control-flow and wait blocks.
// Imported after stubs.js so these entries override the TODO stubs.

export function registerControlCodegen() {

  // ── Decision ─────────────────────────────────────────────────────────────────

  // robControls_if: inputs IF0 (Boolean), DO0 (statement) — matches controls_if shape
  javascriptGenerator.forBlock['robControls_if'] = javascriptGenerator.forBlock['controls_if'];

  // robControls_ifElse: inputs IF0, DO0, ELSE — also matches controls_if shape
  javascriptGenerator.forBlock['robControls_ifElse'] = javascriptGenerator.forBlock['controls_if'];

  // ── Loops ─────────────────────────────────────────────────────────────────────

  // robControls_loopForever: body via statement input 'DO', no exit condition
  javascriptGenerator.forBlock['robControls_loopForever'] = function (block) {
    const body = javascriptGenerator.statementToCode(block, 'DO') || '';
    return `while (true) {\n${body}}\n`;
  };

  // robControls_for: fields VAR; inputs FROM, TO, BY, DO — matches controls_for shape
  javascriptGenerator.forBlock['robControls_for'] = javascriptGenerator.forBlock['controls_for'];

  // robControls_forEach: field VAR; inputs LIST, DO — matches controls_forEach shape
  javascriptGenerator.forBlock['robControls_forEach'] = javascriptGenerator.forBlock['controls_forEach'];

  // ── Wait ──────────────────────────────────────────────────────────────────────

  // robControls_wait: yield to sim for one frame (0 ms async pause)
  javascriptGenerator.forBlock['robControls_wait'] = function (_block) {
    return `robotAPI.wait_ms(0);\n`;
  };

  // robControls_wait_time: pause for N ms — async ticket pattern
  javascriptGenerator.forBlock['robControls_wait_time'] = function (block) {
    const ms = javascriptGenerator.valueToCode(block, 'WAIT', Order.NONE) || '0';
    return `robotAPI.wait_ms(${ms});\n`;
  };

  // robControls_wait_for: busy-loop until condition — relies on step-budget yielding
  // The empty-body while spins for up to 1000 steps per frame, then yields; the sim
  // advances one frame, sensors update, and the condition is re-evaluated next frame.
  javascriptGenerator.forBlock['robControls_wait_for'] = function (block) {
    const cond = javascriptGenerator.valueToCode(block, 'WAIT0', Order.NONE) || 'false';
    return `while (!(${cond})) {}\n`;
  };
}
