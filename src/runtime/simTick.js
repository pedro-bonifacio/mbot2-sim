import { robot } from '../sim/robot.js';
import { step } from '../sim/kinematics.js';
import { advanceClock } from '../sim/clock.js';

// The fixed simulation tick (decision 0004). The browser run loop and the headless
// runner both advance the world only through this, in the same order every tick:
//   1. tickProgram()   — the program reacts to the world as it is now
//   2. physicsTick()   — the robot moves 1/60 s, and simulated time advances
// so a program's trace depends only on the program and the map, never on the
// computer's frame rate.

export const TICK_S = 1 / 60;

/** One physics tick: robot motion, then simulated time. */
export function physicsTick() {
  step(robot, TICK_S);
  advanceClock(TICK_S);
}
