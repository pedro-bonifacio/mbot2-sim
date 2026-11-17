import { initBlockly }     from './blockly/index.js';
import { initSim }         from './sim/canvas.js';
import { initRunLoop }     from './runtime/runLoop.js';
import { initControls }    from './ui/controls.js';
import { initConsole }     from './ui/console.js';
import { initDisplay }     from './ui/display.js';
import { initButtons }     from './ui/buttons.js';
import { initMapSelector } from './ui/mapSelector.js';
import { initProgramIO }   from './ui/programIO.js';

document.addEventListener('DOMContentLoaded', async () => {
  initConsole();
  initDisplay();
  initSim();
  initRunLoop();     // the world advances in fixed ticks driven by the canvas frames
  initBlockly();
  initControls();
  initProgramIO();   // auto-restore + auto-save must come after Blockly is mounted
  initButtons();
  await initMapSelector();
  // Dev server only (stripped from builds): window.__dev for automated UI checks.
  if (import.meta.env.DEV) (await import('./dev/devHooks.js')).installDevHooks();
  console.log('[mbot2-sim] Ready.');
});
