import { javascriptGenerator } from 'blockly/javascript';
import { registerActionCodegen } from './action.js';
import { registerSensorCodegen } from './sensor.js';
import { registerControlCodegen } from './control.js';
import { registerExprCodegen } from './expr.js';
import { registerCommunicationCodegen } from './communication.js';
import { registerVariableCodegen } from './variables.js';

registerActionCodegen();
registerSensorCodegen();
registerControlCodegen();
registerExprCodegen();
registerCommunicationCodegen();
registerVariableCodegen();

// Sandbox globals (src/runtime/sandbox.js) must never be shadowed by user names.
javascriptGenerator.addReservedWords('robotAPI,console,highlightBlock');

const START_TYPE = 'robControls_start';
const isDefinition = (block) => /^(rob)?[Pp]rocedures_def/.test(block.type) && block.isEnabled();

/**
 * Generates the program as ES5 JavaScript. As in Open Roberta, only the chain under
 * the start block runs (plus function definitions); loose blocks are ignored.
 *
 * `highlight: true` puts `highlightBlock('<block id>');` before every statement, so
 * the editor can light up the running block (src/ui/blockHighlight.js). The calls
 * cost interpreter steps, so EVERY run of a student's program uses this form — the
 * browser run, the ★★ check and the sim scripts — to keep them identical (decision
 * 0004). The plain form is for reading (the DevTools console, sim --code, solutions).
 */
export function generateCode(workspace, { highlight = false } = {}) {
  const previous = javascriptGenerator.STATEMENT_PREFIX;
  javascriptGenerator.STATEMENT_PREFIX = highlight ? 'highlightBlock(%1);\n' : null;
  try {
    javascriptGenerator.init(workspace);
    let code = '';
    for (const block of workspace.getTopBlocks(true)) {
      if (block.type !== START_TYPE && !isDefinition(block)) continue;
      const out = javascriptGenerator.blockToCode(block);
      if (typeof out === 'string') code += out;
    }
    return `'use strict';\n${javascriptGenerator.finish(code)}`;
  } finally {
    javascriptGenerator.STATEMENT_PREFIX = previous;
  }
}

/** The program as it runs (with block highlighting): every execution path uses this. */
export const generateRunCode = (workspace) => generateCode(workspace, { highlight: true });
