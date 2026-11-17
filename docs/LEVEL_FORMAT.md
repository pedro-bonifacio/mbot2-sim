# Level Format (DRAFT)

> **Status: draft.** This spec will change while the level engine (Roadmap Phase C)
> is built. Once it ships, this becomes reference documentation and changes go in the
> same PR as the code.
>
> Per [0009](decisions/0009-text-first-level-authoring.md) (accepted), level files will be
> YAML, and maps become primitives in cm (walls, lines, patches) instead of PNGs. The
> fields below stay the same; only the syntax and the `map` section change.

Decisions: [0005 variants](decisions/0005-randomised-level-variants.md),
[0006 goals as data](decisions/0006-level-goals-defined-as-data.md).

---

## Files

```
public/levels/
  index.json                 world list + level order (suggested path)
  w04-ultrassom/
    04-03-parar-10cm.json    level definition
    04-03-parar-10cm.png     floor map (optional if generated)
```

## Level JSON (sketch)

```jsonc
{
  "id": "04-03",
  "world": 4,
  "kind": "core",                    // core | bonus | challenge
  "title": "Sensor de estacionamento",
  "objective": "Pára o robô com a frente a menos de 10 cm da parede, sem lhe tocar.",
  "briefing": "…",                   // flavour text (PT-PT), see decision 0007
  "concepts": ["ultrassom", "esperar até"],
  "assumes": ["andar", "comparação"],
  "toolbox": "beginner",
  "suggestedBlocks": ["robControls_wait_for", "robSensors_ultrasonic_getSample"],

  "map": { "png": "04-03-parar-10cm.png" },          // or { "generator": "wall-ahead" }
  "spawn": { "x": 30, "y": 61, "headingDeg": 0 },     // cm; overrides PNG markers if given

  "variants": {
    "params": { "wallX": { "min": 80, "max": 170 } },
    "testSeeds": [1, 2, 3, 4, 5, 6, 7, 8]
  },

  "zones": [
    { "id": "alvo", "type": "goal", "shape": "rect", "x": "wallX-10", "y": 50, "w": 10, "h": 23 }
  ],

  "goals": {
    "all": [
      { "type": "robotStoppedIn", "zone": "alvo", "probe": "front" },
      { "type": "noCollision" }
    ],
    "timeLimitS": 30
  },

  "stars": {
    "challenge": { "type": "maxBlocks", "value": 4, "label": "Usa no máximo 4 blocos" }
  },


  "starter": null                    // optional Blockly XML
}
```

## Goal types (initial set)

| Type | Passes when |
|------|-------------|
| `reachZone` | robot (centre or given probe) enters zone at any time |
| `robotStoppedIn` | program ends / robot at rest with point inside zone |
| `checkpointsInOrder` | zones visited in listed order |
| `noCollision` | no wall contact during the run |
| `displayShows` | display text matches (exact or regex) at end |
| `ledColour` | LEDs show given colour at end / at a zone |
| `toneSequence` | tones played match a sequence (frequency ± tolerance) |
| `stayOnLine` | given probe stays on line ≥ X % of path |
| `timeLimit` | succeeds within N simulated seconds |

Expressions such as `"wallX-10"` reference variant parameters. Kept deliberately
minimal: arithmetic on parameters only.
