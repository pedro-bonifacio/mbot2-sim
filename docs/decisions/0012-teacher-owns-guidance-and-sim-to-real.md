# 0012 — The teacher owns hints and the sim-to-real gap

- **Status:** Accepted
- **Date:** 2026-11-17
- **Area:** pedagogy

## Context

Earlier plans had the simulator provide progressive hints per level
([0001](0001-self-directed-progression-no-locks.md)) and ease the sim-to-real gap with
a "realism mode" and generous, calibratable evaluation levels
([0008](0008-evaluation-on-physical-robot.md)). Students have access to the real
robots in class, and the teacher prefers to handle guidance and real-robot issues in
person.

## Decision

- **No hints in the simulator.** Levels state their objective and assumed concepts.
  Guidance comes from the teacher in class.
- **No realism mode** (motor mismatch, sensor noise), and no evaluation-level design
  rules aimed at the sim-to-real gap. The teacher handles it in class, with the robots.
- **Retries are allowed** on the physical mat during evaluation (e.g. after
  recalibrating a threshold). This is the teacher's call, not something the app manages.

## Consequences

- Level format drops the `hints` field.
- Supersedes the hint-related consequence of 0001 and the realism/tolerance consequence
  of 0008. Both records are amended to point here.
- Less to build and write per level.
