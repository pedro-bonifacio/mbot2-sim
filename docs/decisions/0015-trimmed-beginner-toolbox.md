# 0015 — A trimmed beginner toolbox

- **Status:** Accepted
- **Date:** 2026-11-18
- **Area:** blocks

## Context

CLAUDE.md §1 requires the beginner toolbox to match Open Roberta's
`program.toolbox.beginner.xml`. That toolbox already includes blocks that confuse or
distract beginners aged 11+: the curve blocks (a separate speed for each wheel), volume,
LED brightness, the microphone (not simulated: always 0), and the gyro, timer and
encoder blocks that the course only uses from World 7, with the expert toolbox.

A first attempt showed blocks world by world (only the blocks each world had introduced)
and was dropped the same day: it narrowed the solutions students could find on
their own.

## Decision

1. The sim's **Principiante** toolbox is Open Roberta's beginner toolbox minus the blocks
   in `MOVED_TO_EXPERT` (`src/blockly/toolboxes/index.js`). Categories and order are
   otherwise unchanged.
2. Those blocks stay in **Avançado** (Open Roberta's expert toolbox, unchanged), and
   programs that use them still load, run and export to Open Roberta Lab.
3. The generic "ler …" block inside "esperar até" still lists every sensor (a dropdown
   inside an Open Roberta block; see [0014](0014-clearer-pt-wording-display-only.md)).

## Consequences

- Beginner levels must be solvable without the moved blocks (01-06 became "Dar a volta",
  two turns instead of a curve). A level that needs one says `toolbox: expert`.
- In Open Roberta Lab's beginner toolbox a student finds a few more blocks than in the sim.

## Alternatives considered

- **Blocks world by world** — tried and reverted (see Context).
- **Keep Open Roberta's beginner toolbox exactly** — faithful, but more to sift through.
