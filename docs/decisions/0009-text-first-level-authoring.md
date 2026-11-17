# 0009 — Text-first, self-verifying level authoring

- **Status:** Accepted
- **Date:** 2026-11-17
- **Area:** levels

## Context

~95 practice levels plus evaluation levels must be authored by both the teacher and an
LLM assistant. The current pipeline is unfriendly to both:

- Maps are **binary PNGs**: an LLM can't read or diff them, and editing them means a
  paint program and exact reserved RGB values.
- `scripts/generate-maps.js` hand-writes PNG bytes and pixel loops, so it is low-level.
- Nothing checks that a level is **solvable**, or that a wrong-but-tempting solution
  **fails**. The only way to know is to play it.

## Proposal

**One human-readable text file per level holds everything**, and a check command
proves the level works.

1. **Format:** YAML (comments, multi-line PT-PT text, no quoting noise), validated by a
   JSON Schema (VS Code autocomplete for the teacher; machine-checkable for the LLM).
   Converted to JSON at build time by a Vite plugin, like the map catalogue.
2. **Maps as primitives, in cm**, rendered at load time (no PNG needed):
   `wall`, `box`, `line` (polyline with width), `arc`, `patch` (coloured rect/circle),
   `spawn`. Colours by palette name (`black`, `red`, …), never hex. Positions may use
   variant parameters (`x: wallX`). Hand-drawn PNGs stay supported as a `background`.
3. **Every level ships with tests:**
   - `solution`: a reference program that must earn ★★ on all variant seeds.
   - `antiSolutions`: tempting-but-wrong programs (e.g. hard-coded distance) that must
     **fail** at least one seed. This proves the variants actually enforce the concept.
   Programs are written in a compact text form (the ES5 `robotAPI` calls the codegen
   produces), not Blockly XML, so they stay readable and diffable.
4. **`npm run levels:check`** validates the schema, runs solutions and anti-solutions
   headlessly, and writes a **preview PNG per level** (map + zones + solution path).
   An LLM can open the preview to check the layout visually; the teacher can skim them all.
5. **`npm run levels:mat <id>`** exports the printable mat (real scale, tiled A4/A3,
   with variant position marks).
6. **`docs/LEVEL_AUTHORING.md`**: one guide for both audiences, with an annotated
   example per world, a design checklist, and common mistakes. Optionally a Claude Code
   skill `/new-level` that follows the guide and won't finish until `levels:check` passes.
7. **Dev preview:** `?level=<id>&dev` hot-reloads the level as the YAML is edited.

## Consequences

- The teacher can author levels in a text editor or by asking an LLM, and both paths
  are checked the same way.
- Levels get reviewed and diffed in git like code.
- The same primitives render the sim map, the preview, and the printable mat, so the
  three always match.
- Needs the deterministic headless runner ([0004](0004-deterministic-simulation.md))
  before tests can run.
- Reference solutions in text form don't prove the solution can be built from the
  allowed blocks; the author must keep to block-expressible calls (checked by a lint
  of allowed `robotAPI` functions per toolbox).

## Alternatives considered

- **Keep PNG maps + JSON metadata** — opaque to LLMs, and mats can drift from metadata.
- **Visual level editor** — nice later, but it must write the same YAML. Text stays the
  source of truth.
- **JS modules instead of YAML** — more powerful (loops, helpers), but harder for
  non-programmers to edit safely. YAML + a few named generators covers the need.
