# Level Format

Reference for level files. Decisions: [0005 variants](decisions/0005-randomised-level-variants.md),
[0006 goals as data](decisions/0006-level-goals-defined-as-data.md),
[0009 text-first authoring](decisions/0009-text-first-level-authoring.md).
The schema is [`levels/level.schema.json`](../levels/level.schema.json) (VS Code
autocompletes YAML against it with the YAML extension); the code is `src/levels/`.

## Files

```
levels/
  level.schema.json
  w01/01-01-primeiros-passos.yaml      one file per level: <id>-<slug>.yaml
  w04/04-01-parar-antes-da-parede.yaml
  _previews/04-01.png                  written by npm run levels:check (git-ignored)
```

The id is `WW-NN` (world, number) and must match the file name and `world`. Every
`.yaml` under `levels/` is a level; folders starting with `_` are ignored.

## A level, annotated

```yaml
id: "04-01"
world: 4
kind: core                 # core | bonus | challenge | evaluation
title: Parar antes da parede
objective: Anda em frente e pára … (PT-PT, shown to the student)
concepts: [ultrassom, esperar até]
assumes: [andar, comparação]
toolbox: beginner          # beginner | expert
timeLimit: 30              # simulated seconds (default 60)
settle: 2                  # optional: pass after standing still this long with every goal met (default 2, or never)
stall: 5                   # optional: fail after standing still this long, having moved, with a goal unmet (default 5, or never)

variants:                  # optional: omit for levels with one fixed layout
  params:
    wallX: { min: 90, max: 170, step: 5 }    # or { choices: [100, 130, 160] }
  seeds: [1, 2, 3, 4, 5, 6, 7, 8]           # the ★★ test set; the student sees seed 1 first

map:
  size: { w: 200, h: 122.5 }   # cm, the default
  border: true                 # 1 cm wall round the arena, the default
  items:                       # painted in order, later on top
    - wall:  { x: wallX, y: 1, w: 4, h: 120.5 }          # magenta: robot collides
    - box:   { x: 50, y: 20, w: 15, h: 15, angle: 30 }   # same as wall (a physical object)
    - patch: { x: 75, y: 51, w: 10, h: 20, colour: green }   # or { cx, cy, r, colour }
    - line:  { points: [[20, 61], [180, 61]], width: 2, colour: black }
    - arc:   { cx: 100, cy: 61, r: 40, from: 0, to: 180, width: 2, colour: black }

spawn: { x: 30, y: 61.25, heading: 0 }

zones:                     # referee-only areas: drawn as a blue overlay, invisible to sensors
  - { id: perto, label: perto da parede, x: wallX - 15, y: 1, w: 12, h: 120.5 }   # or cx, cy, r

goals:
  - robotStoppedIn: { zone: perto, probe: front }
  - noCollision

starter: |                 # optional: the program the level opens with (e.g. a bug to fix);
  <xml …>…</xml>           #   Blockly XML as "Guardar programa" saves it, or an Open Roberta export.
                           #   Must fail at least one seed. "Novo programa" goes back to it.

solution: |                # must pass every seed
  robotAPI.drive("FOREWARD", 30);
  while (!(robotAPI.ultrasonic() < 10)) {}
  robotAPI.drive_stop();

antiSolutions:             # tempting but wrong: each must fail at least one seed
  - name: distância fixa
    why: Só funciona quando a parede calha no sítio certo.
    code: |
      robotAPI.drive_for("FOREWARD", 30, 80);
```

### Coordinates and units

- Centimetres, origin at the top-left corner, **x → right, y → down** (as on screen).
- Rectangles are `x, y` (top-left), `w, h`, and an optional `angle` (degrees clockwise, about the centre).
- Headings and arc angles are **degrees clockwise from east**: `0` →, `90` ↓, `180` ←, `-90` ↑.
- Any number may be an **expression** of variant parameters: `+ - * /`, parentheses,
  parameter names (`wallX - 15`, `(top + bottom) / 2`). Nothing else.

### Colours

Floor colours are the quad RGB sensor's 8, by name: `red yellow green cyan blue
purple white black` (no orange, CLAUDE.md §10). Walls and boxes are always magenta.
Zones are not painted.

## Goals

| Goal | Kind | Passes when |
|------|------|-------------|
| `reachZone: { zone, probe }` | any time | the probe is in the zone at some tick |
| `robotStoppedIn: { zone, probe }` | at the end | motors stopped and the probe in the zone |
| `noCollision` | throughout | the robot never touches a wall (fails the run at once) |
| `displayShows: { text, row? }` | at the end | a display line equals `text` |
| `ledColour: { colour }` | at the end | all five LEDs on, in that colour |

`probe` is `centre` (default) or `front` (middle of the front bumper). Every goal takes
an optional `label` (PT-PT) to replace the default wording.

**When a run is judged** (`src/levels/referee.js`, every tick, browser and headless alike;
[decision 0013](decisions/0013-when-a-level-run-is-judged.md)):
it **passes** as soon as every goal holds and either the program has ended or the robot
has stood still for `settle` s (default 2 — so "repeat forever: if near, stop" programs
pass without waiting for the limit), or at `timeLimit` with every goal holding. It
**fails** at once when the robot touches a wall (on every level; `noCollision` just shows
it as a goal), when the program ends or errors without passing, when the robot — after
it has moved — stands still for `stall` s (default 5) with a goal unmet, or at `timeLimit`.
Set `settle: never` for levels where the robot must stop and then carry on.

The student sees the first seed first; **Outra variante** cycles through the seeds.

## Stars

- ★ — the run passed on the variant on screen.
- ★★ — **Testar todas as variantes**: the program passes on every seed (run headlessly).
  A level with one layout (no `variants`) gives ★★ with the ★, and hides that button.
- ★★★ — optional challenge (not implemented yet).

## Checking levels

`npm run levels:check [id]` (also part of `npm run check`, without previews):

1. schema, id ↔ file name ↔ world;
2. every seed prepares and spawns the robot clear of walls;
3. solution and anti-solutions only call existing `robotAPI` functions;
4. the solution passes every seed; 5. each anti-solution fails at least one;
6. the referee's rules on `scripts/fixtures/referee-cases.json` (whole check only);
7. `levels/_previews/<id>.png`: seed 1, zones (blue), the solution's path (red), the
   robot at start (cyan) and end (red). `--verbose` prints every seed's verdict.

Solutions are the ES5 the code generator writes; build the program in the editor and
copy the code (DevTools console prints it on **Executar**) to be sure it is block-expressible.

## In the browser

Levels appear in **★ Níveis** (by world, with the student's stars, plus the free maps; `?level=04-01` opens one directly). A level opens with its `toolbox`. The
Vite plugin (`vite.config.js`) validates each file and strips `solution` and
`antiSolutions`, so answers never reach the page. Dev hooks: `__dev.level(id)`,
`__dev.variant()`, `__dev.checkAll()`, `__dev.state().level`.
