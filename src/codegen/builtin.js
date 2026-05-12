import { javascriptGenerator, Order } from 'blockly/javascript';

// Importing 'blockly/javascript' registers all built-in block generators as a
// side-effect. We then override the ones that wouldn't work inside js-interpreter.

// text_print normally generates window.alert() which doesn't exist in the sandbox.
// Override it to call robotAPI.println() instead.
javascriptGenerator.forBlock['text_print'] = function (block) {
  const arg = javascriptGenerator.valueToCode(block, 'TEXT', javascriptGenerator.ORDER_NONE) || "''";
  return `robotAPI.print(${arg});\n`;
};