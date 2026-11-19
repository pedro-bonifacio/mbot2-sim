# Roadmap

Living plan. Edit freely; tick items as they ship (and log them in `../CHANGELOG.md`).
The *why* behind items lives in [`decisions/`](decisions/README.md).

Last reviewed: 2026-11-19 (sixth session)

---

## ▶ Where we left off (2026-11-19, sixth session)

**This session** (on `main`, **not pushed yet** — pushing deploys to students):
- **Goal values from variants + event goals** ([0017](decisions/0017-goals-that-follow-the-run.md)):
  text/colour parameters and cases, `when:` on map items/zones, `displayShows` with
  `number ± tolerance` (may use the run's `drivenCm`, `movingS`) or `any`, `tonePlayed`,
  `sequence`, `stayIn`. Value goals don't give the answer away; a failed run says what
  was expected. Format: LEVEL_FORMAT.md.
- **New levels:** all of **World 2** (02-01 … 02-07), 04-05, 05-02, 05-08, 07-01, 07-02.
- **Layout choice:** `layouts:` (hand-drawn alternatives, one per variant) and smooth
  lines through waypoints → line-following levels **05-04, 05-05, 05-12** (Prova P1).
  Sim note: motors change speed instantly, so a follower that only uses the middle
  probes wobbles in place at sharp corners; a real robot may coast round them.
- **Teacher, looks only:** play World 2 and the five others; are the goal wordings clear
  ("Mostrar a palavra certa no ecrã", "Por esta ordem: LEDs a verde → …")? Also the line
  tracks of 05-04/05/12: do the blue checkpoint circles help or distract?
- **Course boards** ([0018](decisions/0018-courses-on-fixed-boards.md)): the teacher builds courses on
  K-line sheets (70 × 100 cm, 1–3 per course). Levels: `map: { board: 1 | 2 | 3 }` — no
  wall at the edge, driving off fails. 05-08 (1 sheet) and 05-12 (2 sheets) moved onto boards.
- Next build steps: generators (maze, box scatter) → ★★★ → keys in tests → pushable boxes.

**State before this session:** everything was on `main` **and pushed**; the site is live at https://mbot2.pbonifacio.dev
(Cloudflare Pages deploys every push to `main`). `npm run check` passes.
Push from this machine over SSH: `git push git@github.com:pedro-bonifacio/mbot2-sim.git main`
(`origin` is HTTPS, which has no login here).
Done this session (details in `CHANGELOG.md → Unreleased`):
- **Class accounts** ([0016](decisions/0016-class-accounts-progress-sync.md), supersedes 0002):
  login + automatic progress sync (Pages Function + D1 in the EU, `server/api.js`); usernames
  `7b-12`, names never leave the teacher's drive. Nothing from outside enters an account (no
  guest merge, no "Abrir progresso" while logged in).
- **Class tool** on the shared drive `/mnt/nas/career/professor-tic/mbot2-turmas/`
  (source `tools/turmas/`, reinstall with `npm run turmas:install`): one folder per class in
  `turmas/`, commands in its `README.md`. Test class `TESTE` exists on the server.
- 04-01 and 05-01 say the front of the robot (yellow ring) counts.
- Teacher, World 1 playthrough up to 01-08: the distance-measuring levels repeat a lot, but
  they stay (faster students skip them; ★★★ could later give them an extra goal).

**Start the next session with:**

1. **Teacher** (looks and admin only):
   - [ ] World 1 playthrough from 01-09 (01-01 … 01-08 seen, fine).
   - [ ] Looks: "👤 Entrar" box, "☁ Guardado" / "⚠ Sem ligação" in the top bar.
   - [ ] Tell the school's data-protection officer (class + number + programs, no names).
   - [ ] Real class: CSV exported from the school's system into `turmas/<turma>/`, then
         `node turmas.mjs create <turma>`. Delete `TESTE` when done (`node turmas.mjs delete TESTE`).
   - [ ] Still open from before: ring/✓ zones, 📏 Régua, bricks (or cardboard?), block wording
         vetoes (`src/blockly/ptClarity.js`), controller pad on a small laptop, 05-14 starter,
         Open Roberta export on the robot (VERIFY_ON_ROBOT #10), collision and `04-01` looks.
2. **Next build steps — the course** (CURRICULUM.md → "Sim features needed", in order):
   goal values from variants (text/colour/number ± tolerance) and layout choice → **Worlds 2–5**;
   maze generator + box scatter → World 6 and courses P5/P8/P9; event goals (tone, sequence,
   survive); ★★★; keys in tests; pushable boxes (P4).
3. Optional: a `/new-level` skill; one-page teacher sheets for the random courses; a class
   overview page for the teacher (the API has `GET /api/teacher/turmas/<turma>`; `turmas show`
   prints it).
4. Pushing now deploys to the live site: push when a change is ready for students.

**How we test** (decided 2026-11-17: the assistant tests itself; the teacher only checks looks):
- `npm run check` — fidelity, codegen, variables/functions, sim tests.
- `npm run sim -- <program.xml> [--map default.png] [--key A@1.5] [--path 1]` — what a program
  does, as text (pose relative to the spawn: forward/right cm, turned °, + = right).
  New behaviour or a reported bug → add a case to `scripts/fixtures/sim-tests.json`.
- Real editor and browser run loop: `window.__dev` on the dev server (`src/dev/devHooks.js`),
  via page JS evaluation in a background incognito tab. Runs are real time: short programs only.
- Dev server for the teacher (remote via Tailscale): `npx vite --host 100.114.196.108 --open false`
  → http://100.114.196.108:5173/. Start it detached (`nohup setsid … &`) so it outlives the
  2 h limit of background tasks. Login there needs `npm run api:dev` (local API, port 8788).
- Test programs for the teacher: `scripts/fixtures/teste-*.xml` (generated by
  `scripts/fixtures/make-test-programs.py`), on map `default.png`; collision cases in
  `scripts/fixtures/collision/`; level programs in `scripts/fixtures/levels/`.
- Levels: `npm run levels:check [id] [--verbose]` (previews in `levels/_previews/`);
  in the browser `__dev.level(id)`, `__dev.variant()`, `__dev.checkAll()`.

**How we work with Open Roberta Lab:** the assistant drives lab.open-roberta.org in a
background browser tab (mBot 2, PT) to extract block data and to ask the server for the
MicroPython a program compiles to. Keep server requests few; see
[decision 0011](decisions/0011-live-open-roberta-as-fidelity-oracle.md).

**Waiting on decisions:** narrative framing ([0007](decisions/0007-narrative-framing.md)) —
level titles are neutral for now.

---

## Phase A — Foundations (fidelity, determinism, Open Roberta export)

Prerequisite for any evaluated level ([0003](decisions/0003-core-levels-use-real-robot-capabilities-only.md), [0004](decisions/0004-deterministic-simulation.md), [0008](decisions/0008-evaluation-on-physical-robot.md)).

- [x] Live Open Roberta catalogue + semantics extracted; `npm run check` ([0011](decisions/0011-live-open-roberta-as-fidelity-oracle.md))
- [x] **Fidelity sync:** blocks generated from the Open Roberta spec (`or:check`: 0 problems, was 200); codegen + robotAPI follow Open Roberta's generated MicroPython
- [x] Program start block; only connected blocks run, loose stacks disabled (OR behaviour)
- [x] Encoders signed, EM2 mirrored as on the robot
- [x] HUD shows what each quad RGB probe reports (L2 L1 R1 R2)
- [x] Open Open Roberta exports in the sim (**Carregar**) — tested with a real export
- [ ] **Teacher:** run the checks in [`VERIFY_ON_ROBOT.md`](VERIFY_ON_ROBOT.md) with a real mBot 2
- [x] OR-style typed variables (declared on the start block), functions (`robProcedures_*`), lists inside variable declarations (`npm run or:variables`)
- [x] **"Exportar para Open Roberta"**: `<export>`/`<block_set>` wrapper, sibling blocks, `<hide>` tags, embedded mBot 2 configuration, filename `<Nome>_<levelId>.xml`; validated by Open Roberta's server (source generation) — `npm run or:export`; level id is `livre` until the level engine exists
- [ ] Confirm Open Roberta licence before reusing any of its code
- [x] Fixed-timestep physics + single simulated clock (`wait_ms`, timer sensor, tones, time limits): browser and headless run the same 1/60 s ticks (`src/runtime/simTick.js`); sim tests check 30 fps and uneven frames
- [x] Seeded PRNG utility for all randomness (`src/sim/random.js`): random blocks draw from a per-run seed; Executar picks a fresh one (recorded, `__dev.state().seed`), headless defaults to 1 (`--seed`)
- [x] Collision uses the oriented 17.5 × 13 cm footprint (`src/sim/collision.js`): stops at the point of contact, corners count while turning, map edge counts
- [x] Headless runner: program + level + seed → result, no rendering (`runLevel`, used by `levels:check` and ★★; `npm run sim` for program + map + keys — it has no `--level` option yet)

## Phase B — QoL tier 1 (debugging & learning)

- [x] Highlight the currently executing block (outline)
- [x] Speed control ×1 / ×2 / ×4 — ½× and single-step mode not built
- [ ] Live sensor panel: the HUD shows pose, RPM, distance and the 4 quad-RGB colours; ultrasonic, light %, gyro, encoders, timer not yet
- [x] Path trail — ghost of the previous run not built

## Phase C — Level engine & authoring toolchain

Format: [`LEVEL_FORMAT.md`](LEVEL_FORMAT.md); how-to: [`LEVEL_AUTHORING.md`](LEVEL_AUTHORING.md). Decisions: [0001](decisions/0001-self-directed-progression-no-locks.md), [0005](decisions/0005-randomised-level-variants.md), [0006](decisions/0006-level-goals-defined-as-data.md), [0009](decisions/0009-text-first-level-authoring.md).

- [x] YAML level files + JSON Schema + Vite plugin (YAML → JSON, validated, solutions stripped)
- [x] Map primitives renderer (wall, box, line, arc, patch, spawn) in cm, palette names (`src/levels/raster.js`) — PNG `background` dropped (teacher: not needed)
- [x] Referee: goals evaluated each tick (browser and headless at the same ticks); result in the level panel and console, PT-PT
- [x] Zone overlay rendering
- [x] Variants: seeded parameters + ★★ robustness run (**Testar todas as variantes**)
- [ ] Stars — ★/★★ shown, kept in memory only; ★★★ challenges not yet
- [x] Level selector: worlds, ★ status, kind badge (**no locks**) — `src/ui/levelSelector.js`; concepts per level still to show
- [x] Per-level program save slots; progress export/import (file) — `src/levels/progress.js`, `npm run progress:check`
- [x] `npm run levels:check`: schema, solution must pass all seeds, anti-solutions must fail, preview PNG per level
- [-] ~~`npm run levels:mat <id>` printable mats~~ — dropped 2026-11-17: the teacher builds evaluation maps by hand
- [x] `?level=<id>` opens a level; editing its YAML reloads it on the dev server
- [x] `docs/LEVEL_AUTHORING.md` (humans + LLMs)
- [ ] Optional `/new-level` Claude Code skill
- [ ] Migrate existing maps; "Livre" sandbox keeps free map selection

## Phase D — Evaluation levels (first priority content)

[0008](decisions/0008-evaluation-on-physical-robot.md).

- [x] Evaluation set: 4 standard + 7 advanced random courses (CURRICULUM.md → Random courses, 0008 amended)
- [ ] Physical mats printed and tested with the real robot (sim-to-real tolerance)
- [ ] Teacher sheet per level: physical setup, variant positions, explanation questions, rubric

## Phase E — Practice content, first wave

See [`CURRICULUM.md`](CURRICULUM.md).

- [ ] World 1–4 levels (~35), playtested with students — World 1 built 2026-11-18, World 2 and 04-05 on 2026-11-19
- [x] Goal values from variants, event goals (`tonePlayed`, `sequence`, `stayIn`) — [0017](decisions/0017-goals-that-follow-the-run.md)

## Phase F — Content, second wave + QoL tier 2

- [ ] World 5–10 levels
- [x] Resizable split between Blockly and sim; collapsible console (split done)
- [ ] Drag robot to set a test start position (sandbox only)
- [ ] Friendlier PT-PT runtime errors (which block, where)
- [ ] Ambient light + microphone sliders

## Later / Extra track (not evaluated)

- [ ] Send programs straight to the robot via the Open Roberta Lab Windows app (streamline evaluation day)

- [ ] Teacher page that re-runs submitted files in the sim (optional; superseded by physical evaluation)
- [ ] Visual level editor that writes the same YAML
- [ ] Extra-track levels using sim-only features

---

## Open questions

- Narrative framing → [0007](decisions/0007-narrative-framing.md)
- Physical mat size: one shared multi-purpose evaluation mat vs. one mat per level?
