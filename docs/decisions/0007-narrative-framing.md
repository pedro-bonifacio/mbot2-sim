# 0007 — Narrative framing for levels

- **Status:** Proposed (open — awaiting decision)
- **Date:** 2026-11-17
- **Area:** pedagogy

## Context

The same levels serve 12-year-olds and 18-year-olds, all unlocked
([0001](0001-self-directed-progression-no-locks.md)). Framing affects motivation, but
what engages a 12-year-old can feel patronising to a 17-year-old. Also, per
[0003](0003-core-levels-use-real-robot-capabilities-only.md), floor mats carry no
decorative art, so any narrative has to live in text and UI, not in the map.

## Options

| | A. Neutral technical | B. Story & characters | C. Engineering briefs (real-world contexts) |
|---|---|---|---|
| Example title | "4.3 — Parar a 10 cm da parede" | "Ajuda o Robi a não bater no muro!" | "4.3 — Sensor de estacionamento" |
| Example briefing | "Pára o robô a 10 cm da parede. A distância muda a cada execução." | Story text with a mascot | "Os carros autónomos param antes dos obstáculos. A parede está a uma distância desconhecida: pára a 10 cm." |
| 12–13 y/o | Dry | Engaging | Engaging (real things they recognise) |
| 17–18 y/o | Fine | Childish | Respectful, links to careers |
| Writing cost (~95 levels, PT-PT) | Lowest | Highest (plot continuity) | Medium (one context per world) |
| Constrains level design | No | Yes (story must fit) | Lightly (context per world) |
| Evaluation clarity | High | Goal can hide behind story | High, if the goal is stated separately |

## Recommendation

**C — engineering briefs**, with two rules:

1. Each **world** has one real-world context (e.g. ultrasonic → parking sensors /
   autonomous cars; line following → warehouse AGVs; mazes → rescue robots;
   PID → racing / industrial control). Individual levels are short "jobs" in that context.
2. Every level shows a **plain objective line** separate from the flavour text, so
   the evaluated goal is never ambiguous ("Objetivo: parar com a frente do robô na zona verde.").

Optional extra: a small "Na vida real" / "No mundo real" note per world, linking to the
real application. It costs little and gives older students a reason to care.

## Decision

_Pending._
