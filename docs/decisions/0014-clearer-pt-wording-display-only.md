# 0014 — Clearer PT-PT wording where Open Roberta's translation confuses students

- **Status:** Accepted
- **Date:** 2026-11-18
- **Area:** blocks

## Context

CLAUDE.md §1 requires block labels to match Open Roberta's PT-PT translation exactly.
Parts of that translation are half English or garbled, worst in the generic "ler …"
sensor dropdown used inside "esperar até": `pressed  botão`, `sound % microphone`,
`value g accelerometer`, `line  quad rgb sensor`. Students aged 11+ stumble on it, and
it is the first sensor block beginners meet.

## Decision

1. The sim may show **clearer PT-PT text** for a block's dropdown options, from one
   table: `src/blockly/ptClarity.js`. Display text only: block types, field values,
   argument order, serialisation and the Open Roberta export do not change, so
   programs still import into Open Roberta Lab unchanged.
2. Everything else in §1 still holds (types, shapes, values, defaults, toolbox order).
   `npm run or:check` compares dropdowns by value, so it still guards all of that.
3. First use: the generic sensor block's `SENSORTYPE` options ("distância (cm) do
   ultrassom", "botão pressionado?", …). Other labels are changed only when a teacher
   reports them as confusing, through the same table.

## Consequences

- A student moving to Open Roberta Lab sees OR's wording on the same block, in the same
  place; the teacher may mention it once.
- Fixed labels (not dropdowns) would need a fidelity-check exception per block; not done yet.

## Alternatives considered

- **Keep OR's text exactly** — faithful, but the confusion lands on the youngest students.
- **Patch the translation upstream in Open Roberta** — right in principle, slow, and out
  of the teacher's hands.
