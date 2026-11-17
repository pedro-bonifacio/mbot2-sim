# Decision Records

Each file records one decision: the context, the choice, and its consequences.
Records are **append-only once `Accepted`**. A `Proposed` record may be edited freely until it is accepted. To change an accepted decision, write a new record that supersedes
the old one, and mark the old one `Superseded by NNNN`.

Decisions made before this log existed (Open Roberta block fidelity, JavaScript +
JS-Interpreter instead of Python, robot constants, reserved map colours, cm world
units) live in [`../../CLAUDE.md`](../../CLAUDE.md) and
[`../ARCHITECTURE.md`](../ARCHITECTURE.md) and are treated as accepted.

New record: copy [`0000-template.md`](0000-template.md) to the next free number.

## Index

| # | Title | Status | Area |
|---|-------|--------|------|
| [0001](0001-self-directed-progression-no-locks.md) | Self-directed progression: all levels unlocked | Accepted | pedagogy |
| [0002](0002-no-backend.md) | No backend; progress is client-side only | Accepted | infra |
| [0003](0003-core-levels-use-real-robot-capabilities-only.md) | Core (evaluated) levels use only real mBot 2 capabilities | Accepted | levels |
| [0004](0004-deterministic-simulation.md) | Deterministic simulation: fixed timestep + sim clock | Accepted | sim |
| [0005](0005-randomised-level-variants.md) | Levels are validated against randomised variants | Accepted | levels |
| [0006](0006-level-goals-defined-as-data.md) | Goals and zones live in level data, not in map pixels | Accepted | levels |
| [0007](0007-narrative-framing.md) | Narrative framing for levels | Proposed | pedagogy |
| [0008](0008-evaluation-on-physical-robot.md) | Evaluation happens on the physical robot and mat | Accepted | pedagogy |
| [0009](0009-text-first-level-authoring.md) | Text-first, self-verifying level authoring | Accepted | levels |
| [0010](0010-academic-integrity-and-ai.md) | Academic integrity with AI chatbots | Rejected | pedagogy |
| [0011](0011-live-open-roberta-as-fidelity-oracle.md) | The live Open Roberta Lab is the fidelity oracle | Accepted | infra |
| [0012](0012-teacher-owns-guidance-and-sim-to-real.md) | The teacher owns hints and the sim-to-real gap | Accepted | pedagogy |
| [0013](0013-when-a-level-run-is-judged.md) | When a level run passes or fails | Accepted | levels |
