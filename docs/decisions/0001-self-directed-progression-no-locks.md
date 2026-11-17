# 0001 — Self-directed progression: all levels unlocked

- **Status:** Accepted
- **Date:** 2026-11-17
- **Area:** pedagogy

## Context

The simulator serves students aged 12–18 across several classes and year groups.
The course follows a personalised, self-directed model: students go as far as they want,
regardless of age or class. Locking levels behind earlier ones would force every class
into the same pace, block advanced students, and create management problems between
classes that share computers and the same deployment.

## Decision

Every level is available from the start. Order is **suggested**, never enforced: the
level selector shows a recommended path (world order, core vs. bonus levels) and the
concepts each level assumes. Nothing is gated by age, class, or prior completion.

## Consequences

- No per-class configuration and no unlock state to sync or debug.
- Students can jump ahead. Each level must therefore state its prerequisite concepts
  in the briefing and offer progressive hints, so a student arriving "early" can
  recover on their own.
- Progress indicators (stars, completed marks) are for information and motivation
  only. They never restrict access.

## Alternatives considered

- **Hard locks** — rejected: headaches between classes, contradicts self-direction.
- **Soft gate (★ on the previous level opens the next)** — rejected for the same reasons;
  shared school computers would also leak unlocks between students.

## Amendments

- **2026-11-17:** No hints in the simulator. The teacher gives guidance in class. See [0012](0012-teacher-owns-guidance-and-sim-to-real.md).
