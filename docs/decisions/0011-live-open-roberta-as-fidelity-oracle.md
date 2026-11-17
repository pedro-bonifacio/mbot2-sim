# 0011 — The live Open Roberta Lab is the fidelity oracle

- **Status:** Accepted
- **Date:** 2026-11-17
- **Area:** infra

## Context

CLAUDE.md §1–2 require block-level fidelity with Open Roberta, using the toolbox XMLs
in `reference_openroberta/` as source of truth. Those XMLs only list *which* blocks
appear and their default inputs. Field names, dropdown values, hidden fields
(`ACTORPORT`), and port names live in Open Roberta's block definitions, which the repo
never had. The sim's definitions were therefore partly guessed.

The first manual comparison (one program rebuilt by hand in OR Lab) already showed
several mismatches. The first automated check found 200 problems across 86 block
entries. Rebuilding programs by hand to find them is slow and misses most of them.
Exporting programs to Open Roberta for evaluation ([0008](0008-evaluation-on-physical-robot.md))
depends on exact matches.

## Decision

1. **Block definitions** (fields, dropdown options and values, defaults, hidden fields,
   PT labels) come from the catalogue extracted from the live Open Roberta Lab:
   `reference_openroberta/live/or-mbot2-catalogue.json`. The toolbox XMLs remain the
   source for toolbox structure (and match the live toolboxes).
2. `npm run or:check` compares the sim against the catalogue. Fidelity work is done
   when it reports zero problems (or every remaining difference is listed as an
   intentional exception in the script with a reason).
3. Exported programs are validated by Open Roberta's own server: the program must
   generate MicroPython source successfully. For automated suites, use a local
   Open Roberta (Docker), not the public server.
4. Open Roberta Lab is open source (Apache 2.0, to be confirmed before copying any code).
   Reusing their definitions is allowed with attribution. We don't adopt their Blockly
   fork: it's based on an older Blockly and the sim runs Blockly 11.

## Consequences

- Fidelity becomes testable and repeatable, instead of a manual comparison.
- A large one-off sync is needed: blocks, codegen, and robotAPI all use the old
  values (`EM1`/`EM2` vs `R`/`L`, probes `1–4` vs `L1…R2`, `BACKWARD` vs `BACKWARDS`, …).
  Old saved programs need a small migration on load.
- When Open Roberta updates, re-run the extraction and the check.
- CLAUDE.md §2 gains the catalogue as a source of truth for block definitions.

## Alternatives considered

- **Manual rebuild of sample programs in OR Lab** — slow, error-prone, low coverage.
- **Read Open Roberta's GitHub sources** — possible, but block definitions are
  assembled at runtime from robot plugins. The running app already has the final result.

## Amendments

- **2026-11-17:** No programs in the old format exist, so the sync is a clean break.
  The "migrate old saved programs" consequence above is dropped.
