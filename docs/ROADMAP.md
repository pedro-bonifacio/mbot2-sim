# Roadmap

Living plan. Edit freely; tick items as they ship (and log them in `../CHANGELOG.md`).
The *why* behind items lives in [`decisions/`](decisions/README.md).

Last reviewed: 2026-11-17

---

## Phase A — Foundations (fidelity, determinism, Open Roberta export)

Prerequisite for any evaluated level ([0003](decisions/0003-core-levels-use-real-robot-capabilities-only.md), [0004](decisions/0004-deterministic-simulation.md), [0008](decisions/0008-evaluation-on-physical-robot.md)).

- [x] Sample programs built in the sim: `reference_openroberta/export-samples/sim/`
- [x] Live Open Roberta catalogue extracted + `npm run or:check` ([0011](decisions/0011-live-open-roberta-as-fidelity-oracle.md))
- [ ] **Fidelity sync:** fix blocks/codegen/robotAPI until `or:check` reports 0 (200 problems on 2026-11-17). Clean break: no saved programs in the old format exist, so no migration
- [ ] Confirm Open Roberta licence before reusing any of its code
- [ ] **"Exportar para Open Roberta"**: OR `<export>`/`<block_set>` wrapper, `robControls_start`, embedded mBot 2 configuration, filename `<Nome>_<levelId>.xml`; round-trip tested by importing into OR Lab
- [ ] OR-style global variables (declared in the start block) instead of stock Blockly variables. Needed for export.
- [ ] Program start block; only connected blocks run, loose stacks disabled (OR behaviour)
- [ ] Fixed-timestep physics + single simulated clock (`wait_ms`, timer sensor, tones, time limits)
- [ ] Seeded PRNG utility for all randomness
- [ ] Collision uses the oriented 17.5 × 13 cm footprint (`kinematics.js` uses a point, `runLoop.js` a 4.5 cm circle)
- [ ] HUD colour readout samples the quad-RGB probes, not the robot centre (`canvas.js`)
- [ ] Encoders signed (decrease when reversing); `kinematics.js` uses `Math.abs`
- [ ] Headless runner: program + level + seed → result, no rendering
- [ ] Verify quad-RGB probe spacing / forward offset against real hardware

## Phase B — QoL tier 1 (debugging & learning)

- [ ] Highlight the currently executing block
- [ ] Speed control ½× / 1× / 2× / 4× and single-step mode
- [ ] Live sensor panel: ultrasonic, 4 × quad-RGB (colour + light %), gyro, encoders, timer
- [ ] Path trail + ghost of the previous run

## Phase C — Level engine & authoring toolchain

Format: [`LEVEL_FORMAT.md`](LEVEL_FORMAT.md). Decisions: [0001](decisions/0001-self-directed-progression-no-locks.md), [0005](decisions/0005-randomised-level-variants.md), [0006](decisions/0006-level-goals-defined-as-data.md), [0009](decisions/0009-text-first-level-authoring.md).

- [ ] YAML level files + JSON Schema + Vite plugin (YAML → JSON)
- [ ] Map primitives renderer (wall, box, line, arc, patch, spawn) in cm, palette names; PNG background still supported
- [ ] Referee: goals evaluated each tick; success/failure overlay in PT-PT
- [ ] Zone overlay rendering
- [ ] Variants: seeded parameters + ★★ robustness run
- [ ] Stars
- [ ] Level selector: worlds, suggested path, concepts, ★ status (**no locks**)
- [ ] Per-level program save slots; progress export/import (file)
- [ ] `npm run levels:check`: schema, solution must pass all seeds, anti-solutions must fail, preview PNG per level
- [ ] `npm run levels:mat <id>`: printable mat at real scale, tiled A4/A3, variant marks
- [ ] `?level=<id>&dev` hot-reload preview
- [ ] `docs/LEVEL_AUTHORING.md` (humans + LLMs); optional `/new-level` Claude Code skill
- [ ] Migrate existing maps; "Livre" sandbox keeps free map selection

## Phase D — Evaluation levels (first priority content)

[0008](decisions/0008-evaluation-on-physical-robot.md).

- [ ] Design 3 standard (max 4/5) + 2–3 advanced (5/5) evaluation levels
- [ ] Physical mats printed and tested with the real robot (sim-to-real tolerance)
- [ ] Teacher sheet per level: physical setup, variant positions, explanation questions, rubric

## Phase E — Practice content, first wave

See [`CURRICULUM.md`](CURRICULUM.md).

- [ ] World 1–4 levels (~35), playtested with students

## Phase F — Content, second wave + QoL tier 2

- [ ] World 5–10 levels
- [ ] Resizable split between Blockly and sim; collapsible console
- [ ] Drag robot to set a test start position (sandbox only)
- [ ] Friendlier PT-PT runtime errors (which block, where)
- [ ] Ambient light + microphone sliders

## Later / Extra track (not evaluated)

- [ ] Send programs straight to the robot via the Open Roberta Lab Windows app (streamline evaluation day)

- [ ] Teacher page that re-runs submitted files in the sim (optional; superseded by physical evaluation)
- [ ] Visual level editor that writes the same YAML
- [ ] Extra-track levels using sim-only features

---

## Open questions

- Narrative framing → [0007](decisions/0007-narrative-framing.md)
- Physical mat size: one shared multi-purpose evaluation mat vs. one mat per level?
