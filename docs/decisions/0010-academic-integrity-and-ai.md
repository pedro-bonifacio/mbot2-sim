# 0010 — Academic integrity with AI chatbots

> **Rejected 2026-11-17.** The teacher will handle this in the assessment itself:
> each student explains their implementation during the physical evaluation
> ([0008](0008-evaluation-on-physical-robot.md)). No anti-cheating features or
> cheating-driven level design will be built. The analysis below is kept for reference.

- **Status:** Rejected
- **Date:** 2026-11-17
- **Area:** pedagogy

## Context

Students can screenshot a level, paste it into a chatbot, and copy the answer. No
technical measure in a client-side app can prevent this: anything visible can be
photographed or retyped, and obfuscation would hurt honest students and accessibility.
The goal is therefore to **make copying not pay off**: design work where the chatbot's
answer isn't enough, and assess understanding rather than the file.

## Proposal

**Design levers (in the sim and on the mat)**

1. **Hidden, varying parameters.** The screenshot never shows the variant values
   ([0005](0005-randomised-level-variants.md)), and on the mat the teacher sets them live.
2. **Calibration from measurement.** Evaluation levels need thresholds the student must
   measure on the *real* robot and mat (line brightness, stopping distance under motor
   lag). A chatbot can't know them; the student must use the sensor readouts.
3. **Personalised evaluation variants.** Evaluation levels derive small parameters from
   the student's name (target distance 12 vs 15 cm, colour order, LED colour to show).
   Identical submissions between students then fail visibly.
4. **Unfamiliar specifics.** Levels mix several small, specific requirements (stop *and*
   display X *and* turn the LEDs Y). These are easy for a student who understands, and
   tedious to describe to a chatbot and translate back into exact Open Roberta blocks.

**Assessment levers (the strongest)**

5. **Live modification during evaluation.** After the run on the mat, the student makes
   a small change on the spot ("now stop at 20 cm", "add a beep at each junction").
   Understanding shows in under a minute; a copied solution doesn't survive it.
6. **Short explanation.** "Why does it need this block?" for one or two blocks.

**Light process signals (not proof)**

7. The exported file includes a small, local-only work log: number of runs, time spent,
   number of saved versions. This is a conversation starter, not evidence; it can be
   edited by a determined student.

**Positive framing**

8. Built-in progressive hints reduce the urge to go to a chatbot. Openly allowing AI as
   a *tutor* ("ask it to explain, not to solve") and grading via 5–6 removes most of the
   incentive to hide it.

## Consequences

- Items 1–3 shape evaluation-level design ([CURRICULUM.md](../CURRICULUM.md)).
- Item 3 needs a "Nome" field at export time (stored locally only, [0002](0002-no-backend.md)).
- Item 7 is optional and low priority.
- No anti-screenshot, anti-copy or obfuscation measures: they don't work and they
  hurt usability.

## Alternatives considered

- **Blocking screenshots / text selection / devtools** — trivially bypassed (phone
  camera); rejected.
- **Hiding the level description** — hurts every student to inconvenience a few.
