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
    # c:    { choices: [red, green, blue] }  # texts: colour names, words
    # side: { choices: [{ base: 55, word: PERTO }, { base: 125, word: LONGE }] }
    #        a case: every key becomes a parameter (and `side` its index, 0, 1, …)
  seeds: [1, 2, 3, 4, 5, 6, 7, 8]           # the ★★ test set; the student sees seed 1 first

map:
  size: { w: 200, h: 122.5 }   # cm, the default
  border: true                 # 1 cm wall round the arena, the default
  # board: 1                   # instead: a course board (decision 0018), 1–3 sheets:
                               #   100 × 70, 140 × 100, 210 × 100 cm; no wall at the edge,
                               #   the ultrasonic sees nothing beyond it, the robot's centre
                               #   leaving it fails the run (reason offBoard)
  items:                       # painted in order, later on top
    - wall:  { x: wallX, y: 1, w: 4, h: 120.5 }          # magenta: robot collides
    - box:   { x: 50, y: 20, w: 15, h: 15, angle: 30 }   # same as wall (a physical object)
    - patch: { x: 75, y: 51, w: 10, h: 20, colour: green }   # or { cx, cy, r, colour }
    - line:  { points: [[20, 61], [180, 61]], width: 2, colour: black }
    - arc:   { cx: 100, cy: 61, r: 40, from: 0, to: 180, width: 2, colour: black }
    - { when: n >= 3, patch: { x: 80, y: 30, w: 3, h: 60, colour: c } }   # only when n ≥ 3; colour from a parameter

spawn: { x: 30, y: 61.25, heading: 0 }   # optional when every layout has one

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

### Layouts: one of several hand-drawn maps per variant

For tracks that cannot be one shape with moving numbers (line-following courses), list
named `layouts` and pick one with a text parameter called `layout`:

```yaml
variants:
  params:
    layout: { choices: [onda, gancho] }   # each seed picks one (choose seeds that cover all)
  seeds: [7, 1]
layouts:
  onda:
    spawn: { x: 22, y: 61, heading: 0 }   # replaces the level's spawn
    items:                                # painted after map.items
      - line: { smooth: true, points: [[20, 61], [45, 61], [75, 30], [105, 61]] }
    zones:                                # join the level's zones (same id: the layout's wins)
      - { id: fim, cx: 105, cy: 61, r: 10 }
  gancho: { … }
```

Goals refer to zone ids every layout defines (`c1`, `c2`, `fim`). Layout items may use
the other parameters too. `line: { smooth: true }` draws a smooth curve through the
points (a track from a few waypoints); without it, straight segments with sharp corners.
For "follow the line to the end" give checkpoints in a `sequence` and `settle: 0`: the
run passes the moment the last step is seen, even though the follower keeps moving.

### Generators: a new maze or box layout for every variant

```yaml
    - maze: { cols: 4, rows: 3, cell: 30, x: 10, y: 5, style: walls }   # or style: tape
    #   start: [0, 0] where it is grown from; loops: 2 extra openings (default 0 = one
    #   path between any two cells); thickness (walls, 2) / width + colour (tape, 2, black)
    - scatter: { count: 3, w: 12, h: 12, area: { x: 45, y: 42, w: 140, h: 16 }, gap: 45,
        keepClear: [{ x: 0, y: 35, w: 45, h: 30 }] }   # boxes; with colour: patches
```

Both draw from the variant seed (and their place in the list), so every seed is a new
maze or layout and the ★★ check covers several. Mazes have their outer wall; cell `[c, r]`
has its centre at `x + (c + 0.5) * cell`, `y + (r + 0.5) * cell` (put spawn, exit patch
and zones there). `scatter` keeps items `gap` cm apart (the area holds them whole) and
off every `keepClear` rectangle, and fails the level check when they do not fit.

### Coordinates and units

- Centimetres, origin at the top-left corner, **x → right, y → down** (as on screen).
- Rectangles are `x, y` (top-left), `w, h`, and an optional `angle` (degrees clockwise, about the centre).
- Headings and arc angles are **degrees clockwise from east**: `0` →, `90` ↓, `180` ←, `-90` ↑.
- Any number may be an **expression** of variant parameters: `+ - * /`, parentheses,
  parameter names (`wallX - 15`, `(top + bottom) / 2`), and one comparison
  `< <= > >= == !=` giving 1 or 0 (for `when:`). Nothing else.
- `when: <expression>` on a map item or a zone leaves it out of variants where it is 0.
- Text fields (`displayShows.text`, sequence `display`) take slots: `{word}` puts in a
  text parameter, `{n - 1}` a number. Colour fields take a colour name or a parameter
  holding one (`colour: c`).

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
| `displayShows: { text, row? }` | at the end | a display line (`display_text` cell, or a printed line when no `row`) equals `text` |
| `displayShows: { number, tolerance?, row? }` | at the end | a display line holds a number within ± `tolerance` (default 0): "3", "Riscas: 3", "96,7 cm" |
| `displayShows: { any: true }` | at the end | some text other than the block's default «Hallo» |
| `ledColour: { colour }` | at the end | all five LEDs on, in that colour |
| `tonePlayed: { frequency?, tolerance?, duration? }` | any time | a tone was started (± `tolerance` Hz, default 1; `duration` ms ± 1). `{}` = any tone |
| `sequence: { steps, times? }` | any time | the steps happened in this order (`times`: repeated) |
| `stayIn: { zone, probe }` | throughout | the probe never leaves the zone; holds at `timeLimit` if the robot has moved |

`number` may use the variant's parameters and two values of the run: `drivenCm` (cm
the robot's centre travelled) and `movingS` (seconds it was moving). Goals whose value
comes from the variant (a `{slot}` text, a parameter colour, any number) are labelled
"a palavra / cor / o número certo", so the answer is not given away; after a failed
run the label adds "(esperado: …)".

**Sequence steps:** `{ display: text }`, `{ leds: colour | off }` (all five),
`{ tone: Hz, tolerance? }`, `{ zone: id, probe? }`. A tone step takes the next matching
tone. A state step counts when its state **appears** (it was not there the tick
before), and each kind advances at most one step per tick: LEDs switched, or "3, 2, 1"
printed, with no wait in between are not a sequence. Different kinds may change
together (LEDs and display in the same instant).
[Decision 0017](decisions/0017-goals-that-follow-the-run.md).

`probe` is `centre` (default) or `front` (middle of the front bumper). Every goal takes
an optional `label` (PT-PT) to replace the default wording.

**When a run is judged** (`src/levels/referee.js`, every tick, browser and headless alike;
[decision 0013](decisions/0013-when-a-level-run-is-judged.md)):
it **passes** as soon as every goal holds and either the program has ended or the robot
has stood still for `settle` s (default 2 — so "repeat forever: if near, stop" programs
pass without waiting for the limit), or at `timeLimit` with every goal holding. It
**fails** at once when the robot touches a wall (on every level; `noCollision` just shows
it as a goal), when the probe leaves a `stayIn` zone, when the program ends or errors without passing, when the robot — after
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
