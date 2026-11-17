import { javascriptGenerator } from 'blockly/javascript';
import { registerActionCodegen } from './action.js';
import { registerSensorCodegen } from './sensor.js';
import { registerControlCodegen } from './control.js';
import { registerExprCodegen } from './expr.js';
import { registerCommunicationCodegen } from './communication.js';

registerActionCodegen();
registerSensorCodegen();
registerControlCodegen();
registerExprCodegen();
registerCommunicationCodegen();

const START_TYPE = 'robControls_start';
const isDefinition = (block) => /^(rob)?[Pp]rocedures_def/.test(block.type);

/**
 * Generates the program as ES5 JavaScript. As in Open Roberta, only the chain under
 * the start block runs (plus function definitions); loose blocks are ignored.
 */
export function generateCode(workspace) {
  javascriptGenerator.init(workspace);
  let code = '';
  for (const block of workspace.getTopBlocks(true)) {
    if (block.type !== START_TYPE && !isDefinition(block)) continue;
    const out = javascriptGenerator.blockToCode(block);
    if (typeof out === 'string') code += out;
  }
  return `'use strict';\n${javascriptGenerator.finish(code)}`;
}
