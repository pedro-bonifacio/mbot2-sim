import { setToolboxMode } from '../blockly/index.js';
import { onLevelChange, getLevelState } from '../levels/session.js';
import { blocksForWorld } from '../levels/worldBlocks.js';

// The toolbox selector: "Deste nível" (only while a level is open: the blocks its world
// has introduced so far, src/levels/worldBlocks.js), "Principiante", "Avançado".
// Opening a level selects "Deste nível"; the student can still pick a full toolbox.

const LEVEL = 'level';
let select = null;
let levelId = null;

/** Shows the toolbox for a selector value. */
export function applyToolbox(value) {
  const { level } = getLevelState();
  if (value === LEVEL && level) setToolboxMode(level.toolbox || 'beginner', blocksForWorld(level.world));
  else setToolboxMode(value === LEVEL ? 'beginner' : value);
  if (select) select.value = value === LEVEL && !level ? 'beginner' : value;
}

export function initToolboxMode() {
  select = document.getElementById('toolbox-mode');
  if (!select) return;
  const levelOption = select.querySelector(`option[value="${LEVEL}"]`);
  select.addEventListener('change', (e) => applyToolbox(e.target.value));

  const sync = ({ level }) => {
    const id = level ? level.id : null;
    if (id === levelId) return;   // session events fire on every run; react to a new level only
    levelId = id;
    if (levelOption) levelOption.hidden = !level;
    if (level) applyToolbox(LEVEL);
    else if (select.value === LEVEL) applyToolbox('beginner');
  };
  onLevelChange(sync);
  sync(getLevelState());
}
