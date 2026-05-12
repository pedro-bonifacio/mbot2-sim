import { javascriptGenerator } from 'blockly/javascript';
import './builtin.js';
import './stubs.js';
import { registerActionCodegen } from './action.js';
import { registerSensorCodegen } from './sensor.js';
import { registerControlCodegen } from './control.js';
import { registerExprCodegen } from './expr.js';
import { registerCommunicationCodegen } from './communication.js';

// Override stub entries with real codegen
registerActionCodegen();
registerSensorCodegen();
registerControlCodegen();
registerExprCodegen();
registerCommunicationCodegen();

export function generateCode(workspace) {
  const body = javascriptGenerator.workspaceToCode(workspace);
  return `'use strict';\n${body}`;
}
