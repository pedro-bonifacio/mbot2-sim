# 0004 — Deterministic simulation: fixed timestep + sim clock

- **Status:** Accepted
- **Date:** 2026-11-17
- **Area:** sim

## Context

Physics currently integrates with the real time between animation frames (`dt`
capped at 1/30 s), and `wait_ms` / the timer sensor use `performance.now()`. The same
program can therefore end in slightly different places on a fast desktop and a slow
school laptop, or when the tab lags. Automated level checking (★★ variants) and level self-tests
([0009](0009-text-first-level-authoring.md)) both require identical results on every machine.

## Decision

- Physics advances in **fixed ticks** (1/60 s of simulated time). Each animation frame
  runs as many ticks as the speed multiplier and elapsed time allow.
- A single **simulated clock** drives physics, `wait_ms`, the timer sensor, tone
  durations, and level time limits. Nothing in the robot's world reads wall-clock time.
- Interpreter steps are interleaved with physics ticks in a fixed ratio, so a program's
  trace depends only on the program, the level, and the variant seed.
- Randomness comes only from a seeded PRNG.

## Consequences

- Enables speed control (½×–4×), single-step mode, and headless fast-forward for ★★ checks and level tests.
- Revises CLAUDE.md §7–8 (the run loop and render loop must agree on simulated time).
  The step budget and RAF-driven rendering stay the same.
- Small refactor of `canvas.js`, `runLoop.js`, `robotAPI.wait_ms`, `sensors.js` timers.

## Alternatives considered

- **Keep variable dt and grade with tolerances** — rejected: tolerances hide real bugs
  and still fail on edge cases near zone borders.
