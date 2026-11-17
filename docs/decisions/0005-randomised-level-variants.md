# 0005 — Levels are validated against randomised variants

- **Status:** Accepted
- **Date:** 2026-11-17
- **Area:** levels

## Context

With fixed maps, a student can "solve" a sensor level by dead reckoning, e.g. driving
exactly 73 cm instead of driving until the ultrasonic reads < 10 cm. They pass without
learning the concept. The real world never matches the program author's assumptions
exactly, and that is the reason sensors exist.

## Decision

Levels may declare **variant parameters** (wall distance, line shape, colour order,
spawn offset, …). A level has two layers of success:

- **★ Complete:** succeeds on the variant the student is looking at.
- **★★ Robust:** succeeds on every variant in the level's test set (a fixed list of
  seeds, run headlessly at high speed).

Early sequencing levels (World 1–3) have no variants, because dead reckoning *is* the
concept there. From World 4 onwards, sensor levels use variants.

## Consequences

- Requires deterministic simulation ([0004](0004-deterministic-simulation.md)) and a
  seeded map/level generator.
- Maps for variant levels are generated (scripted) rather than hand-painted PNGs.
- Gives students and teacher a clear, objective signal that a solution generalises.

## Alternatives considered

- **Hand-made alternate maps per level** — workable but doesn't scale to ~95 levels.
