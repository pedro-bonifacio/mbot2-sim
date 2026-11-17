import * as Blockly from 'blockly';

// Every program hangs under exactly one Open Roberta start block ("iniciar").
// It can't be deleted; blocks not connected to it are disabled and don't run.

export const START_TYPE = 'robControls_start';

/** Ensures the workspace has one start block. Returns it. */
export function ensureStartBlock(ws) {
  const existing = ws.getBlocksByType(START_TYPE, false);
  for (const extra of existing.slice(1)) extra.dispose(true);
  if (existing.length) return existing[0];
  const block = ws.newBlock(START_TYPE);
  if (block.initSvg) { block.initSvg(); block.render(); }
  block.moveBy(40, 40);
  return block;
}
