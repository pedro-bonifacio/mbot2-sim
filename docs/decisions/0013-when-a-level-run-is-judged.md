# 0013 — When a level run passes or fails

- **Status:** Accepted
- **Date:** 2026-11-17
- **Area:** levels

## Context

The referee (`src/levels/referee.js`) checks a level's goals every tick. Many correct
sensor programs never end ("repeat forever: if near, stop"), so "judge when the program
ends" alone would make students wait for the time limit for every ✓. The first version
also let a run pass when the robot crashed while the goals held, unless `noCollision`
was listed, and made a robot stopped in the wrong place wait for the time limit.
Variants (decision 0005) raised a second question: which one the student sees first.

## Decision

- A run **passes** as soon as every goal holds and either the program has ended or the
  robot has stood still for **`settle` s (default 2)**, or when the time limit arrives with
  every goal holding. The verdict is final.
- It **fails** at once when the robot **touches a wall** (every level, `noCollision` or not),
  when the program ends or errors without passing, when the robot — after it has moved
  — stands still for **`stall` s (default 5)** with a goal unmet, or at the time limit.
- A level may set `settle` and `stall` to other seconds or to `never` (e.g. a "stop,
  wait, carry on" level sets `settle: never`).
- The student always sees **variant 1 first**; **Outra variante** cycles through the test
  seeds. Hard-coding a distance can win ★ on variant 1, never ★★; evaluate on ★★.

## Consequences

- Sensor loops get ✓ 2 s after stopping; wrong stops get ✗ 5 s after stopping.
- A robot that pauses `settle` s in the zone and then drives on has already passed;
  levels where that matters set `settle`.
- The whole class sees the same layout first, so pointing at the screen works.
- Rules checked by `scripts/fixtures/referee-cases.json` (run by `npm run levels:check`).

## Alternatives considered

- **Judge only at program end / time limit** — sensor loops would always wait 30–60 s.
- **Longer settle (3–5 s) for every level** — slower ✓ everywhere for a rare case.
- **A random variant first** — discourages hard-coding ★, but every student sees a
  different map and ★★ already catches hard-coding.
