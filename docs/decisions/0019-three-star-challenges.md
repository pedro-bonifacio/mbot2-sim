# 0019 — ★★★ is a per-level challenge on block count or time

- **Status:** Accepted
- **Date:** 2026-11-19
- **Area:** levels

## Context

The curriculum plans a third star: an optional challenge that pushes the strongest
students (CURRICULUM.md → Stars). World 3 (Repetir) needs it most. A square drawn
with four copies of "drive, turn" earns ★ just like one drawn with `repeat 4`, so only a
block limit rewards the loop. Proofs and races (01-10, 05-11, 08-05/06) want a time limit.

## Decision

A level may have a `challenge` with `maxBlocks` and/or `maxSeconds`. ★★★ is given to a
program that earns ★★ and also meets the challenge: in the ★★ check on every variant
(each variant's pass time ≤ `maxSeconds`), or on the passing run of a level with one
layout. The block count covers the program that runs: blocks under the start block and
enabled function definitions. The start block, plain values (numbers, texts, colours,
true/false, constants) and comments do not count, so "≤ 3 blocks" means three statements
the student can see (`src/blockly/blockCount.js`). The panel shows the challenge and the
program's live block count. A higher star implies the lower ones and stars are never
lost (local progress, server `stars.three`, migration 0002).

Each challenge has a `solution` in Blockly XML (Open Roberta export works too). It
never reaches the browser, and `levels:check` requires it to pass every seed and meet
the challenge.

## Consequences

- World 3 levels reward the loop (★★★), and a Prova can carry a speed challenge.
- Block counts are judged in the browser only: the headless ★★ run gets the count from
  the editor. Solutions written as JS cannot be counted, hence the XML solution.
- In World 3, ★ and ★★ do not require a loop. A student who skips World 3 with ★★ on
  its Prova may never have used repeat; the teacher can ask for ★★★ there.
- Deploying needs `wrangler d1 migrations apply mbot2-sim --remote` **before** the push,
  or saving stars fails on the live site.
- Forbidden-block challenges (CURRICULUM.md mentions them) are not built.

## Alternatives considered

- **Count every block, numbers included** — "≤ 3 blocks" for a square would read as
  ≤ 9; students think of statements, not number bubbles.
- **A `maxBlocks` goal (needed for ★)** — would force the loop in World 3, but a goal
  that depends on the editor breaks the rule that goals are judged from the run alone
  (0006, 0013).
