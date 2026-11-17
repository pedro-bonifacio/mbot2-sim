# Documentation Index

Start here. Every document in `docs/` falls into one of four kinds. Knowing which kind
you are looking at tells you how much to trust it and how to change it.

| Kind | Purpose | How it changes |
|------|---------|----------------|
| **Rules** | Non-negotiable constraints | Only via an accepted decision record |
| **Decisions** | *Why* things are the way they are | Append-only; supersede, never rewrite |
| **Plans** | *What* we intend to do next | Edit freely; tick items off as they ship |
| **Reference** | *How* the system works today | Update in the same PR as the code change |

---

## Rules

- [`../CLAUDE.md`](../CLAUDE.md) — non-negotiable contributor rules (block fidelity, constants, units, ES5, scope).

## Decisions

- [`decisions/`](decisions/README.md) — Architecture/Product Decision Records (ADRs). One file per decision, numbered, with status. **Read the index before proposing anything that might contradict a past decision.**

## Plans

- [`ROADMAP.md`](ROADMAP.md) — phased work plan, QoL backlog, known issues.
- [`CURRICULUM.md`](CURRICULUM.md) — pedagogical principles and the world/level structure.
- [`WORKFLOW.md`](WORKFLOW.md) — classroom workflow, from learning to evaluation on the mat.
- [`VERIFY_ON_ROBOT.md`](VERIFY_ON_ROBOT.md) — sim assumptions only the physical robot can confirm, with test programs.

## Reference

- [`ARCHITECTURE.md`](ARCHITECTURE.md) — pipeline, async ticketing, sensors, coordinate systems.
- [`LEVEL_FORMAT.md`](LEVEL_FORMAT.md) — level data format *(draft until the level engine ships)*.
- [`MAP_AUTHORING.md`](MAP_AUTHORING.md) — painting map PNGs, reserved colours, spawn markers.
- [`CONTRIBUTING.md`](CONTRIBUTING.md) — setup, code style, adding a block.
- [`DEPLOYMENT.md`](DEPLOYMENT.md) — hosting and map-update workflow.
- [`HISTORY.md`](HISTORY.md) — original Phase 0–8 plan (archived, not maintained).

---

## Workflow conventions

1. **Making a decision?** Copy `decisions/0000-template.md` to the next free number, fill it in, add it to the index table in `decisions/README.md`. Status starts as `Proposed`; flip to `Accepted` once agreed.
2. **Changing an accepted decision?** Write a *new* record that supersedes it. Set the old one's status to `Superseded by NNNN`. Never delete or rewrite the reasoning of an old record.
3. **Shipping roadmap work?** Tick the item in `ROADMAP.md` and add a line to `../CHANGELOG.md`.
4. **Language:** docs in English; quoted student-facing strings in PT-PT (see `CLAUDE.md §11`).
