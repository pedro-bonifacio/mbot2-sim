import { getWorkspace } from '../blockly/index.js';
import { setHighlightHook } from '../runtime/sandbox.js';
import { RunState, onRunStateChange } from '../runtime/runState.js';

// Lights up the block that is running. The program reports each statement it starts
// (highlightBlock calls from generateCode({ highlight })); the editor is updated at
// most once per animation frame, with the latest one, so tight loops cost nothing.
// While the robot drives, waits or plays a tone, that block stays lit.

let pending = null;   // latest reported block id
let shown = null;

export function initBlockHighlight() {
  setHighlightHook((id) => { pending = id; });
  onRunStateChange((state) => {
    if (state === RunState.RUNNING || state === RunState.PAUSED_ASYNC) return;
    pending = null;   // finished, stopped, error: clear
  });
  // Blockly's own highlightBlock is a faint emboss; a yellow outline (.rob-running in
  // styles.css) is what students notice.
  const frame = () => {
    if (pending !== shown) {
      const ws = getWorkspace();
      const root = (id) => (id && ws && ws.getBlockById(id)?.getSvgRoot()) || null;
      root(shown)?.classList.remove('rob-running');
      root(pending)?.classList.add('rob-running');   // a deleted block is simply not found
      shown = pending;
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
