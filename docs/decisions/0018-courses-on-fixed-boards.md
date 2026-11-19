# 0018 — Evaluation courses are built on fixed K-line boards

- **Status:** Accepted
- **Date:** 2026-11-19
- **Area:** pedagogy

## Context

The 2026-11-18 amendment to [0008](0008-evaluation-on-physical-robot.md) had the teacher
build every course at random on the day from tape, paper and boxes. Re-taping each
course for each evaluation is slow. The teacher chose a material:
**K-line foam board (Liderpapel), 70 × 100 cm, 5 mm**.

## Decision

- Each course lives on a board: **one course per side**, black tape stuck on for good,
  and **marks** for where obstacles (boxes, patches) may go. A course uses **1 to 3
  sheets** joined along their long sides: 100 × 70, 140 × 100 or 210 × 100 cm.
- Variety on the day comes from the teacher's choices on a fixed board: which marked
  positions get a box, which start (if several are marked), which direction or board
  side. This supersedes the "built at random, no marked positions" part of the
  2026-11-18 amendment. The courses themselves (CURRICULUM.md → Random courses) stay.
- **In the sim**, a Prova (and any level meant to rehearse a course) uses
  `map: { board: 1 | 2 | 3 }`: that size, **no wall at the edge** (the ultrasonic sees
  nothing beyond it, as on a table), the table drawn round it, and the run fails when
  the robot's centre leaves the board.
- The sim's tracks and layouts are **not copies** of the physical boards. Programs must
  adapt in the sim (variants, generators) so they also work on a board they have not seen.

## Consequences

- The teacher sets up a course in minutes; boards are reusable year to year.
- A fixed line track can, in principle, be driven with a memorised route. Countered by
  several marked starts / both directions, by the sim's ★★ (which only an adaptive
  program gets), and by the explanation in the evaluation ([0008](0008-evaluation-on-physical-robot.md)).
- Courses must fit 100 × 70 cm per sheet: mazes and box courses are small (a robot is
  17.5 × 13 cm). Sim generators produce mazes and box layouts at board size.
- Sheet joints may leave a small step or gap: keep tape lines crossing a joint at right
  angles, and test them with the real robot.

## Alternatives considered

- **Build each course at random on the day** (the 2026-11-18 amendment) — most robust
  against memorising, but too slow to set up for a class.
- **Printed mats** — dropped 2026-11-17 (the teacher builds by hand).
