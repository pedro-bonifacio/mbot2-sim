import { prepareLevel } from './level.js';
import { levelMap } from './raster.js';
import { createReferee } from './referee.js';
import { runHeadless, TICK_S } from '../runtime/headless.js';

/**
 * Runs generated (or hand-written ES5) code on one variant of a level, headlessly,
 * and returns runHeadless's result plus the referee's `verdict` (and `params`, the
 * variant's parameter values). The program's random numbers use the same seed.
 */
export function runLevel({ level, code, seed, ...opts }) {
  const prepared = prepareLevel(level, seed);
  const referee = createReferee(prepared);
  const result = runHeadless({
    code, map: levelMap(prepared), seed: prepared.seed, referee,
    maxSeconds: prepared.timeLimitS + 2 * TICK_S, ...opts,
  });
  return { ...result, params: prepared.params, prepared };
}
