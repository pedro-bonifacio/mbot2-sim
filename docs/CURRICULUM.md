# Curriculum

Living plan for the level content. Structural decisions are in
[`decisions/`](decisions/README.md); the data format is in [`LEVEL_FORMAT.md`](LEVEL_FORMAT.md).

---

## Principles

1. **Self-directed, ageless.** Ages 12–18, no locks, no age or class tracks ([0001](decisions/0001-self-directed-progression-no-locks.md)). The path is a suggestion.
2. **Real robot first.** Core levels only use real mBot 2 capabilities and can run on a printed mat ([0003](decisions/0003-core-levels-use-real-robot-capabilities-only.md)).
3. **Robustness over luck.** From World 4 onward, levels are checked against random variants so hard-coded distances fail ([0005](decisions/0005-randomised-level-variants.md)).
4. **One new idea per level.** Each core level introduces or combines at most one new concept; bonus/challenge levels combine freely.
5. **Clear prerequisites.** Every level states its objective and assumed concepts. Hints and guidance come from the teacher in class ([0012](decisions/0012-teacher-owns-guidance-and-sim-to-real.md)).
6. **Low floor, high ceiling.** ★ is reachable by most students; ★★★ challenges stretch the strongest.

## Stars

| Star | Meaning | Applies |
|------|---------|---------|
| ★ | Goal met on the current run | all levels |
| ★★ | Goal met on every test variant | levels with variants; otherwise awarded with ★ |
| ★★★ | Level-specific challenge (≤ N blocks, time limit, forbidden block…) | optional per level |

## Level kinds within a world

- **Core** (~6 per world) — the suggested path; introduces the world's concepts.
- **Bonus** — practice and variation at the same difficulty.
- **Challenge** — harder combination; marked as such, never required.

## Worlds (draft)

Counts are targets. Contexts depend on [0007](decisions/0007-narrative-framing.md).

| # | World | Concepts | Variants? | Target |
|---|-------|----------|-----------|--------|
| 1 | Primeiros Passos | sequence; drive/turn for distance/angle; units (cm, °, RPM) | no | 10 |
| 2 | Luz, Som e Ecrã | LEDs, tones/notes, display text, wait | no | 7 |
| 3 | Repetir | repeat loops, patterns, block-count challenges | no | 8 |
| 4 | Ultrassom | wait-until, if/else, comparison, unknown distances | yes | 10 |
| 5 | Cores e Linhas | colour sensor, colour codes, line following 1 → 2 → 4 probes, junctions | yes | 12 |
| 6 | Decisões | AND/OR, nesting, wall following, mazes | yes | 10 |
| 7 | Variáveis | counters, encoders, gyro turns, timer, accumulating values | yes | 10 |
| 8 | Controlo | proportional line/wall following, PID, timed races | yes | 8 |
| 9 | Funções e Listas | procedures, waypoint lists, sorting by colour | yes | 8 |
| 10 | Missões | open-ended capstones combining everything | yes | 10+ |

Expert toolbox needed from World 7 (variables) / 9 (procedures). The level declares
which toolbox it opens with; the student can still switch.

## Evaluation levels

Separate from the practice worlds ([0008](decisions/0008-evaluation-on-physical-robot.md)).
Students practise them in the sim and are assessed on the printed mat with the real robot.

| Tier | Count | Max grade | Expected skills |
|------|-------|-----------|-----------------|
| Standard | 3 | 4/5 | Worlds 1–5: sequencing, loops, ultrasonic, colour/line basics |
| Advanced | 2–3 | 5/5 | Worlds 6–8: decisions, variables, proportional control |

Design rules for evaluation levels:

- Physically buildable: printed floor + real objects (boxes) at marked variant positions.
- Teacher sets the variant live; hard-coded solutions must fail ([0005](decisions/0005-randomised-level-variants.md)).
- Each comes with a teacher sheet: setup, variant marks, explanation questions, rubric.

## Per-world level lists

_To be written world by world, starting with Worlds 1–4 (Roadmap Phase E)._
