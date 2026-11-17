import { stepInterpreter, destroyInterpreter, isInterpreterPaused } from './interpreter.js';
import { asyncTicket } from './runState.js';
import { robot, resetMotors } from '../sim/robot.js';
import { resetTickCache } from '../sim/sensors.js';

// One program tick, shared by the browser run loop (once per animation frame) and
// the headless runner (once per fixed physics tick). UI-free: it reports what
// happened and the caller shows messages / schedules the next tick.
//
// Returns one of:
//   { status: 'running' }   still going (stepped, or waiting on an async robot call)
//   { status: 'finished' }  program ended
//   { status: 'collision' } robot's footprint touched a wall or the map edge; program halted
//   { status: 'error', error }    runtime error in the program
//   { status: 'internal', error } async ticket resolved without a resume callback

export const STEP_BUDGET_PER_FRAME = 1000;

function clearTicket() {
  asyncTicket.pending = false;
  asyncTicket.resolveCondition = null;
  asyncTicket.callback = null;
}

export function tickProgram() {
  // Sensors compute once per tick, not per loop iteration.
  resetTickCache();

  // Wall contact (set by the physics step, src/sim/collision.js) → halt cleanly:
  // an expected obstacle hit, not an error.
  if (robot.collided) {
    resetMotors();
    clearTicket();
    destroyInterpreter();
    return { status: 'collision' };
  }

  // Resume the interpreter once a pending async robot call has completed.
  if (asyncTicket.pending && asyncTicket.resolveCondition && asyncTicket.resolveCondition()) {
    const cb = asyncTicket.callback;
    clearTicket();
    if (!cb) {
      destroyInterpreter();
      resetMotors();
      return { status: 'internal', error: new Error('asyncTicket resolved with null callback') };
    }
    cb();  // js-interpreter resume callback → paused_ = false
  }

  if (isInterpreterPaused()) return { status: 'running' };

  try {
    for (let i = 0; i < STEP_BUDGET_PER_FRAME; i++) {
      if (!stepInterpreter()) {
        resetMotors(); // safety net: zero motors even without an explicit stop block
        destroyInterpreter();
        return { status: 'finished' };
      }
      if (isInterpreterPaused()) break;
    }
  } catch (error) {
    destroyInterpreter();
    return { status: 'error', error };
  }
  return { status: 'running' };
}
