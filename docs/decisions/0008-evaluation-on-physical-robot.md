# 0008 — Evaluation happens on the physical robot and mat

- **Status:** Accepted
- **Date:** 2026-11-17
- **Area:** pedagogy

## Context

Levels feed evaluation, and there is no backend ([0002](0002-no-backend.md)). Progress
in `localStorage` is trivially editable. The teacher wants to evaluate on the real robot.

## Decision

1. **Evaluation set.** A small, dedicated set of *evaluation levels* (separate from the
   practice worlds):
   - **3 standard levels**: completing one well earns at most **4/5**.
   - **2+ advanced levels**: the only route to **5/5**.
   Students choose which to attempt. Each is practised in the sim with the same map and
   variants, then evaluated physically.
2. **Submission.** The student exports a file from the sim in **Open Roberta format**
   (importable straight into Open Roberta Lab, with the mBot 2 configuration included),
   named `<Nome>_<levelId>.xml`, and sends it through the school's usual channel.
3. **Assessment.** The teacher imports each file into Open Roberta Lab, flashes the
   mBot 2, and runs it on the printed mat. The teacher sets the physical variant (e.g.
   moves the box to a marked position), so hard-coded solutions fail as they would in
   the sim's ★★ check.
4. **Explanation.** The student explains their implementation to the teacher during
   the physical evaluation. This is the safeguard against copied or AI-generated solutions
   (see rejected [0010](0010-academic-integrity-and-ai.md)).
5. Sim progress/stars are for the student's self-tracking only and are not graded.

## Consequences

- **"Exportar para Open Roberta" becomes critical-path** (was a "Later" item). Gaps to
  close: OR `<export>`/`<block_set>` wrapper, `robControls_start` block, OR-style
  global variables (the sim uses stock Blockly variables), and embedded robot configuration.
  Must be verified against real exports from OR Lab.
- Evaluation mats must be **printable and physically reproducible**: walls become real
  objects (boxes, books), variant positions are marked on the mat
  ([0003](0003-core-levels-use-real-robot-capabilities-only.md)).
- Sim-to-real gap matters: evaluation levels need tolerance to motor/sensor imperfection
  (generous zones, calibratable thresholds). A sim "realism mode" helps students prepare.
- Re-running files headlessly (teacher grading page) is no longer needed. It is kept as
  an optional idea in the roadmap.

## Alternatives considered

- **Teacher page that re-runs submissions in the sim** — viable, but grading on the real
  robot is the actual course goal and catches sim-to-real problems.
- **Signed completion codes** — forgeable, and they prove a level was finished, not
  that the student understands it.

## Amendments

- **2026-11-17:** No realism mode and no tolerance-driven level design. The teacher handles the sim-to-real gap in class, and retries on the mat are allowed. See [0012](0012-teacher-owns-guidance-and-sim-to-real.md).
