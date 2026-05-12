import * as Blockly from 'blockly';
import * as Pt from 'blockly/msg/pt';
import { ptMessages } from '../i18n/pt.js';
import { beginnerToolbox } from './toolboxes/beginner.js';
import { expertToolbox } from './toolboxes/expert.js';
import { registerActionBlocks } from './blocks/action.js';
import { registerSensorBlocks } from './blocks/sensor.js';
import { registerControlBlocks } from './blocks/control.js';
import { registerListBlocks } from './blocks/list.js';
import { registerColourBlocks } from './blocks/colour.js';
import { registerCommunicationBlocks } from './blocks/communication.js';
import { registerUnknownStubs } from './blocks/_unknownStub.js';

// Apply official Blockly PT locale as base, then overlay our PT-PT overrides.
Blockly.setLocale(Pt);
Object.assign(Blockly.Msg, ptMessages);

let workspace = null;

export function initBlockly() {
  registerActionBlocks();
  registerSensorBlocks();
  registerControlBlocks();
  registerListBlocks();
  registerColourBlocks();
  registerCommunicationBlocks();
  registerUnknownStubs();   // must remain LAST — skips any already-defined block

  workspace = Blockly.inject('blockly-area', {
    toolbox: beginnerToolbox,
    grid: { spacing: 20, length: 3, colour: '#ccc', snap: true },
    zoom: { controls: true, wheel: true, startScale: 1.0 },
    trashcan: true,
  });

  console.log('[blockly] mounted — Phase 3B-4 (colour + communication blocks)');
  return workspace;
}

export function setToolboxMode(mode) {
  if (!workspace) return;
  workspace.updateToolbox(mode === 'expert' ? expertToolbox : beginnerToolbox);
}

export function getWorkspace() {
  return workspace;
}
