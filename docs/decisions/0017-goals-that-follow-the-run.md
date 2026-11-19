# 0017 — Goals that follow the run: values from variants, events, staying in a zone

- **Status:** Accepted
- **Date:** 2026-11-19
- **Area:** levels

## Context

Worlds 2–7 need goals that 0006/0013 did not cover: the right word, colour or number
depends on the variant (04-05 "PERTO/LONGE", 05-02 copy the patch colour, 07-01 count
stripes); some goals are events or orders rather than end states (a tone, a traffic
light, a countdown); P3 "Ficar no ringue" passes only by lasting the whole time. This
extends [0013](0013-when-a-level-run-is-judged.md); its rules stay as they are.

## Decision

- **Values from variants:** a `choices` parameter may hold texts (colour names, words)
  or *cases* (objects whose keys all become parameters). Text fields take `{name}` /
  `{expression}` slots, colour fields a parameter name, map items and zones a `when:`
  expression (comparisons give 1/0). `displayShows: { number, tolerance }` reads the
  first numbers in any display line; the number may use the run's `drivenCm` and
  `movingS`.
- **Value goals do not give the answer away:** their labels say "a palavra / cor / o
  número certo"; after a failed run the label adds "(esperado: …)" for that variant.
- **Event goals** (`tonePlayed`, `sequence`) latch like `reachZone`. In a sequence a
  state step (display, LEDs, zone) counts only when its state **appears** that tick,
  and each kind advances at most one step per tick: so changes without waits between
  them are not a sequence, as on the real robot nobody could see them.
- **`stayIn`** ("survive"): the run **fails at once** when the probe leaves the zone
  (reason `leftZone`); the goal holds only when the time limit arrives and the robot has
  moved. So it never passes early on `settle`, and a robot that stops stalls as usual.

## Consequences

- Unblocks World 2, 03-06, 04-05, 05-02, 05-08, 07-01/02/04/08/10 (CURRICULUM.md).
- A displayed number is accepted anywhere in a line ("Riscas: 3", "96,7 cm"); students
  may label their output.
- A sequence step whose state was already on screen does not count again (red → red).
- Rules checked by `scripts/fixtures/referee-cases.json`.

## Alternatives considered

- **Conditionals in expressions** (`wallX < 60 ? PERTO : LONGE`) — cases do the same
  and keep level files data.
- **Hold times per sequence step** — "appears + one per kind per tick" already rejects
  the no-wait programs; a hold time would add a number to tune on every level.
- **`stayIn` passing on `settle`** — a robot that drives in and stops would pass "stay
  in the ring" without roaming.
