// ★★★ challenges (decision 0019): a level's optional `challenge` — at most `maxBlocks`
// blocks (src/blockly/blockCount.js) and/or every variant done within `maxSeconds`.
// Judged only on a program that already earns ★★ (the ★★ check, or the ★ run of a
// level with one layout). No DOM, no Blockly: the caller passes the block count.

/**
 * → { met, blocks, slowestS, slowVariant, tooManyBlocks, tooSlow }
 * `blocks`: the program's block count; `timesS`: each variant's pass time, in seed order.
 */
export function judgeChallenge(challenge, { blocks, timesS }) {
  const slowestS = Math.max(...timesS);
  const slowVariant = timesS.indexOf(slowestS) + 1;
  const tooManyBlocks = challenge.maxBlocks != null && blocks > challenge.maxBlocks;
  const tooSlow = challenge.maxSeconds != null && slowestS > challenge.maxSeconds;
  return { met: !tooManyBlocks && !tooSlow, blocks, slowestS, slowVariant, tooManyBlocks, tooSlow };
}
