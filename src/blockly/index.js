import * as Blockly from 'blockly';
import { registerRenderer, RENDERER } from './renderer.js';
import * as Pt from 'blockly/msg/pt';
import { ptMessages } from '../i18n/pt.js';
import { orToolbox } from './toolboxes/index.js';
import { registerActionBlocks } from './blocks/action.js';
import { registerSensorBlocks } from './blocks/sensor.js';
import { registerControlBlocks } from './blocks/control.js';
import { registerLogicBlocks } from './blocks/logic.js';
import { registerMathBlocks } from './blocks/math.js';
import { registerTextBlocks } from './blocks/text.js';
import { registerListBlocks } from './blocks/list.js';
import { registerColourBlocks } from './blocks/colour.js';
import { registerCommunicationBlocks } from './blocks/communication.js';
import { registerVariableBlocks } from './blocks/variable.js';
import { registerProcedureBlocks } from './blocks/procedure.js';
import { syncWorkspace } from './blocks/_varScope.js';
import { registerDynamicCategories } from './toolboxes/dynamic.js';
import { ensureStartBlock } from './startBlock.js';

// Apply official Blockly PT locale as base, then overlay our PT-PT overrides
// (context menus, variable dialogs). Block labels come from the Open Roberta spec.
Blockly.setLocale(Pt);
Object.assign(Blockly.Msg, ptMessages);

let workspace = null;

export function registerAllBlocks() {
  registerActionBlocks();
  registerSensorBlocks();
  registerControlBlocks();
  registerLogicBlocks();
  registerMathBlocks();
  registerTextBlocks();
  registerListBlocks();
  registerColourBlocks();
  registerCommunicationBlocks();
  registerVariableBlocks();
  registerProcedureBlocks();
}

export function initBlockly() {
  registerAllBlocks();

  registerRenderer();
  workspace = Blockly.inject('blockly-area', {
    renderer: RENDERER,
    toolbox: orToolbox('beginner'),
    grid: { spacing: 20, length: 3, colour: '#ccc', snap: true },
    zoom: { controls: true, wheel: true, startScale: 1.0 },
    trashcan: true,
  });

  // Open Roberta: blocks not connected to the start block don't run (greyed out).
  workspace.addChangeListener(Blockly.Events.disableOrphans);
  // Open Roberta's typed variables and functions: Variáveis / Funções flyouts, and
  // references kept in sync with their declarations (types, scope, call arguments).
  registerDynamicCategories(workspace);
  workspace.addChangeListener(syncWorkspace);
  ensureStartBlock(workspace);

  console.log('[blockly] mounted — blocks from the live Open Roberta spec');
  return workspace;
}

export function setToolboxMode(mode) {
  if (!workspace) return;
  workspace.updateToolbox(orToolbox(mode === 'expert' ? 'expert' : 'beginner'));
}

export function getWorkspace() {
  return workspace;
}
