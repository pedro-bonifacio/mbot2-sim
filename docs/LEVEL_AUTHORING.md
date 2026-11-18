# Level Authoring

How to make a level, for the teacher and for an LLM assistant alike
([decision 0009](decisions/0009-text-first-level-authoring.md)). The field-by-field
reference is [`LEVEL_FORMAT.md`](LEVEL_FORMAT.md); this guide is the workflow, the
design checklist and the usual mistakes. What levels to make is in
[`CURRICULUM.md`](CURRICULUM.md).

A level is **one YAML file** that holds the map, the goals and its own tests. It is
finished when `npm run levels:check <id>` says `ok`.

## The workflow

1. **Pick the id and the idea.** `WW-NN` from the world's list in CURRICULUM.md. Write down,
   in one sentence, *what the student must learn to pass* (e.g. "stop using the
   ultrasonic sensor, not a fixed distance").
2. **Copy the closest example** to `levels/wWW/WW-NN-<slug>.yaml`:
   - fixed layout, no sensors — [`w01/01-01-primeiros-passos.yaml`](../levels/w01/01-01-primeiros-passos.yaml)
   - a wall that moves (ultrasonic) — [`w04/04-01-parar-antes-da-parede.yaml`](../levels/w04/04-01-parar-antes-da-parede.yaml)
   - a line that moves (colour sensor) + LEDs — [`w05/05-01-parar-na-linha.yaml`](../levels/w05/05-01-parar-na-linha.yaml)
3. **Edit the text:** `title` and `objective` in PT-PT, written to the student ("Anda…",
   "Pára…"); `concepts`, `assumes`, `toolbox`, `kind`.
4. **Draw the map** with `wall`, `box`, `patch`, `line`, `arc` in cm (origin top-left,
   y down). Run `npm run levels:check <id>` and open `levels/_previews/<id>.png`: seed 1,
   the zones in blue, the solution's path in red, the robot at the start (cyan) and the
   end (red).
5. **Add variants** if the concept is a sensor (World 4 on): one parameter per thing
   that moves, used in the map *and* the zones (`x: wallX - 15`). 6–8 seeds.
6. **Write the goals and zones.** Make the zone the *tolerance* you would accept on the
   real mat (for "stop before the wall": 3–15 cm from it).
7. **Write the solution as blocks first**, in the editor on `?level=<id>`: build it, run it,
   check ★ and **Testar todas as variantes** → ★★. Then copy the code into `solution:`:
   the DevTools console prints it on every **Executar** (between `--- Generated JS ---`
   lines), or save the program and run `npm run sim -- program.xml --code`. Copying
   generated code guarantees the solution can be built from blocks.
8. **Write the anti-solutions:** the wrong programs a student will actually try. Each needs
   a `name` and a `why` (PT-PT) and must **fail at least one seed**. If one passes every
   seed, the variants don't enforce the concept: widen the range or add a parameter.
9. **Check:** `npm run levels:check <id> --verbose` prints every seed's verdict and time.
   `npm run check` before committing.
10. **Play it** in the browser (`?level=<id>`; editing the YAML hot-reloads the level) and
    add the program you used to `scripts/fixtures/levels/<id>-<what>.xml` if it is a useful
    test for the teacher.

## Design checklist

- [ ] **One new idea per level.** The objective names it; `assumes` lists what it builds on.
- [ ] **The objective says what, not how.** "Pára antes da parede", not "usa o bloco esperar até".
- [ ] **The wall/line/target really moves** when the concept is a sensor, far enough that a
      fixed distance or time fails (≥ 40 cm of range for distances, ≥ 30° for angles).
- [ ] **Anti-solutions cover the tempting shortcuts:** fixed distance, fixed time, forgetting
      a step (LEDs, display), sensor threshold far too big or too small.
- [ ] **Zones are generous enough for a real robot** (≥ 10 cm wide for stops). Evaluation
      happens on the physical mat ([0008](decisions/0008-evaluation-on-physical-robot.md)),
      so a level that needs millimetre precision in the sim will fail in class.
- [ ] **Only real mBot 2 capabilities** in core and evaluation levels
      ([0003](decisions/0003-core-levels-use-real-robot-capabilities-only.md)).
- [ ] **Floor colours are the sensor's 8** by name; no orange.
- [ ] **Time limit ≈ 2–3× the solution's time** (check with `--verbose`), so slow but correct
      programs pass and stuck ones don't make the student wait.
- [ ] **The robot starts clear of walls** (levels:check fails otherwise): keep the spawn
      centre ≥ 10 cm from any wall. The robot is 17.5 × 13 cm.
- [ ] **Judging rules suit the level** ([0013](decisions/0013-when-a-level-run-is-judged.md)):
      a run passes 2 s after the robot stops with every goal met, and fails 5 s after it
      stops with a goal unmet. A level where the robot must stop and then carry on sets
      `settle: never` (and maybe `stall`), or it passes at the first stop.

## "Find the bug" levels

A level can open with a broken program (`starter:`) for the student to fix: a real
mistake a student made is the best source. Save the program from the sim
(**Ficheiro ▾ → Guardar programa**) and paste the file's text under `starter: |`.
`levels:check` makes sure the starter fails; list the *likely wrong fixes* as
anti-solutions. Example: [`w05/05-14-o-robo-nao-para.yaml`](../levels/w05/05-14-o-robo-nao-para.yaml).

## Picking goals

| The student must… | Goals |
|---|---|
| end up somewhere and stop | `robotStoppedIn: { zone, probe: front }` (front for "before the wall/line", centre for "in the box") |
| pass through somewhere on the way | `reachZone` (latched: once is enough) |
| show something | `displayShows: { text, row? }`, `ledColour: { colour }` |
| not crash | `noCollision` — every run fails on a crash anyway; listing it shows the student the rule |

A level passes only when **all** goals hold at once, so "reach A, then stop in B" is
`reachZone: A` + `robotStoppedIn: B`.

## Common mistakes

| Symptom in levels:check | Cause and fix |
|---|---|
| `the robot starts touching a wall` | spawn too close to a wall or a variant moves a wall onto the robot; move the spawn or limit the parameter's range |
| `solution fails seed N … (collision)` | the sensor threshold is too small for the speed: stop earlier (`< 15`) or drive slower |
| `solution fails seed N … (stalled)` or `(finished)` | the solution stops outside the zone: move the zone or the threshold; check the preview |
| `solution fails seed N … (timeLimit)` | `timeLimit` too short, or a `repeat forever` that keeps the robot moving |
| `anti-solution … passes every seed` | the variants don't move far enough, or the zone is so wide a fixed distance lands in it |
| `calls unknown robotAPI.x` | hand-written code; build it in the editor and copy the generated code |
| `colour "orange" is not one of …` | use one of the 8 sensor colours |
| zone in the wrong place in the preview | zones use the same cm and the same variant parameters as the map; `x` is the left edge, not the centre |

## Asking an LLM for a level

Give it this file, `LEVEL_FORMAT.md`, the world's row in `CURRICULUM.md` and the closest
example level, then ask for one level by id and idea. Tell it the level is done only
when `npm run levels:check <id>` passes, and to look at `levels/_previews/<id>.png`
before finishing. Then play it yourself: the check proves the level is solvable and that
the shortcuts fail, not that it is a good level.
