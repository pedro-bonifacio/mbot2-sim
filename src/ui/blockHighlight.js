import { getWorkspace } from '../blockly/index.js';
import { setHighlightHook } from '../runtime/sandbox.js';
import { RunState, onRunStateChange } from '../runtime/runState.js';

// Lights up the block that is running. The program reports each statement it starts
// (highlightBlock calls from generateCode({ highlight })). Two rules keep it calm:
//   - the loops / ifs around the running block stay outlined (.rob-active), so a loop
//     looks "on" for as long as its body runs;
//   - the innermost outline (.rob-running) moves at most every HOLD_MS, so a fast loop
//     does not strobe between its blocks. A new block reported after a pause (a drive or
//     wait finishing) shows at once;
//   - a block that encloses the one shown (the loop or if, starting its next pass) does
//     not take the outline back: it is already outlined as active.
// While the robot drives, waits or plays a tone, that block stays lit.

const HOLD_MS = 250;

let pending = null;   // latest reported block id
let shown = null;     // innermost block shown
let shownAt = 0;
let activeIds = [];   // enclosing blocks shown as active

export function initBlockHighlight() {
  setHighlightHook((id) => { pending = id; });
  onRunStateChange((state) => {
    if (state === RunState.RUNNING || state === RunState.PAUSED_ASYNC) return;
    pending = null;   // finished, stopped, error: clear
  });
  // Blockly's own highlightBlock is a faint emboss; a yellow outline (styles.css) is
  // what students notice.
  const frame = (now) => {
    const ws = getWorkspace();
    const block = (id) => (id && ws && ws.getBlockById(id)) || null;   // a deleted block is not found
    if (pending !== shown && (pending === null || (now - shownAt >= HOLD_MS && !encloses(block(pending), block(shown))))) {
      block(shown)?.getSvgRoot()?.classList.remove('rob-running');
      for (const id of activeIds) block(id)?.getSvgRoot()?.classList.remove('rob-active');
      activeIds = [];
      for (let b = block(pending)?.getSurroundParent(); b; b = b.getSurroundParent()) {
        b.getSvgRoot()?.classList.add('rob-active');
        activeIds.push(b.id);
      }
      block(pending)?.getSvgRoot()?.classList.add('rob-running');
      shown = pending;
      shownAt = now;
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

/** True if `outer` is one of the loops / ifs around `inner`. */
function encloses(outer, inner) {
  if (!outer) return false;
  for (let b = inner?.getSurroundParent(); b; b = b.getSurroundParent()) if (b === outer) return true;
  return false;
}
