# CLAUDE.md — Non-Negotiable Rules

> These rules are conventions for contributors (human or AI-assisted) working on this codebase. They reflect deliberate design decisions made during the project's initial phases. For architectural rationale, see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

Read this **before every coding session**. Violating any rule below means rework.

---

## 1. Block-Level Fidelity to Open Roberta Lab

- Every block **type ID** must match Open Roberta exactly (e.g., `robActions_motorDiff_on_for`, `robSensors_ultrasonic_getSample`).
- Every block **visual shape, dropdown options, default values, and argument order** must match the XML files in `reference_openroberta/`.
- Block **labels** must match Open Roberta's PT-PT translation (e.g., `conduzir ◇ a velocidade ◇ % distância ◇ cm`). Exception: clearer PT-PT wording (labels, dropdowns, messages) from `src/blockly/ptClarity.js`, display only ([decision 0014](docs/decisions/0014-clearer-pt-wording-display-only.md)).
- The **toolbox structure** (categories, subcategories, order) must match `program.toolbox.beginner.xml` and `program.toolbox.expert.xml`. Exception: a few blocks are moved from beginner to expert only (`MOVED_TO_EXPERT`, [decision 0015](docs/decisions/0015-trimmed-beginner-toolbox.md)).

## 2. Source of Truth

- `reference_openroberta/openrobertambot2context.md` — semantic spec (units, ranges, behaviour)
- `reference_openroberta/program.toolbox.beginner.xml` — beginner toolbox structure
- `reference_openroberta/program.toolbox.expert.xml` — expert toolbox structure
- `reference_openroberta/configuration.default.xml` — robot constants
- `reference_openroberta/configuration.toolbox.xml` — sensor configuration blocks
- `reference_openroberta/live/or-mbot2-catalogue.json` (+ `or-mbot2-dynamic.json`) — **block definitions** (field names, dropdown values, defaults, hidden fields, PT labels, mutations) extracted from the live Open Roberta Lab. Blocks are generated from it (`npm run or:specs`); check with `npm run or:check` ([decision 0011](docs/decisions/0011-live-open-roberta-as-fidelity-oracle.md)).
- `reference_openroberta/live/or-mbot2-semantics.json` — **behaviour**: the MicroPython Open Roberta generates for each block on the real mBot 2. Sim behaviour follows it; open questions live in `docs/VERIFY_ON_ROBOT.md`.

If `openrobertambot2context.md` and an XML file conflict, **the XML wins** (it is the actual UI source).

## 3. Robot Constants (HARD CODED, DO NOT CHANGE)

```js
WHEEL_DIAMETER_CM         = 6.5
WHEEL_RADIUS_CM           = 3.25
WHEEL_CIRCUMFERENCE_CM    = 20.420352248333657
TRACK_WIDTH_CM            = 11.5
MOTOR_PORTS               = ['EM1', 'EM2']  // left=EM1, right=EM2
MAX_RPM                   = 200
MIN_RPM                   = -200
CHASSIS_FRONT_OFFSET_CM   = 9
BODY_RADIUS_CM            = 4.5
ULTRASONIC_CONE_DEG       = 15
```

Source: `src/sim/robot.js → ROBOT_CONSTANTS`.

## 4. Units & Ranges

- **Motor power:** RPM, range −200 to +200 (NOT %, NOT m/s)
- **Distance:** cm
- **Angle/Turn:** degrees
- **Tone frequency:** Hz
- **Tone duration:** ms
- **Display:** 128×128 px, addressable as text grid (0–7 cols × 0–7 rows for `display_text`)
- **Ports (Open Roberta names):** motors/encoders `R` = EM2 (right, mirrored), `L` = EM1; ultrasonic `U`; quad RGB `Q` with probes `L2 L1 R1 R2` (left→right); keys `A`/`B`; timers `1–5`
- **Wait time:** ms
- **Volume:** 0–100
- **LED brightness:** 0–100

## 5. No Python. No Pyodide.

Code generation target is **JavaScript**, executed via **JS-Interpreter**. The pivot away from hardware-compatible Python export is permanent. Do not introduce Python anywhere.

## 6. Excluded From Scope

- **Neural Network blocks** — `robActions_NNstep`, `robActions_set_inputneuron_val`, and related `#ifdef nn` blocks are explicitly excluded. Do not implement them.
- **Multi-robot communication** — `communication_send_message` / `communication_receive_message` must exist (they are in the expert toolbox) but are stubbed as a local pub/sub FIFO bus (single-robot sim). Log to console; do not error.

## 7. Execution Model

- Code generator: **JavaScript** (Blockly's built-in JS generator, customised in `src/codegen/`).
- Runtime: **JS-Interpreter** (`src/runtime/`), with `interpreter.step()` driven by the fixed simulation tick (§8).
- **STEP_BUDGET_PER_FRAME = 1000** — each program tick calls `step()` at most 1000 times to prevent browser hangs from tight user loops.
- Async robot calls (`drive_for`, `turn_for`, `wait_ms`, etc.) use the **async ticketing pattern**: the robotAPI method sets `asyncTicket.pending = true` and a `resolveCondition` closure; the run loop polls the condition each tick and fires the JS-Interpreter resume callback when it returns `true`. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#the-async-ticketing-pattern).
- Stop button = destroy interpreter, clear the async ticket, call `resetMotors()` (ticks keep running; nothing moves).
- Generated code must be valid **ES5**. Do not emit `let`, `const`, arrow functions, template literals, or other ES6+ syntax.

## 8. Sim Loop

- **Fixed tick of 1/60 s simulated time** ([decision 0004](docs/decisions/0004-deterministic-simulation.md)). Each tick = `tickProgram()` then `physicsTick()` (`src/runtime/simTick.js`), in that order, in the browser and the headless runner alike. Never step physics or the clock with a frame's real `dt`.
- One `requestAnimationFrame` loop (`canvas.js`): it hands the frame's time, capped at `1/30 s` to absorb tab-suspend lag, to `runLoop.advanceFrame`, which runs the whole ticks it covers, then draws. A slow computer draws fewer frames (and runs slower than real time below 30 fps); it never changes the result. Fast-forward (×2/×4, `runLoop.setSpeed`) multiplies the capped frame time, so it only runs more whole ticks per frame. `npm run sim:test` checks this at 30 fps, with uneven frames and at ×4.
- Sensor reads are synchronous against current sim state (no I/O latency simulated).

## 9. Reserved Map Colours (DO NOT USE for sensor zones)

Map PNGs use three reserved colours. They are invisible to all sensors and do NOT trigger collision.

| Colour  | Hex       | Meaning |
|---------|-----------|---------|
| Magenta | `#ff00ff` | Obstacle wall — robot collision halt |
| Cyan    | `#00ffff` | Spawn zone body — centroid = robot start position |
| Yellow  | `#ffff00` | Spawn direction marker — vector cyan→yellow = robot heading |

**Collision:** only magenta triggers collision. Cyan and yellow are passable.
**Sensors:** cyan and yellow pixels return `'white'` from `getColorNameAt`. For sensor-detectable cyan lines use `#33ffff`.
**Authoring:** see `docs/MAP_AUTHORING.md` for the full guide.

## 10. Sensor Colour Palette (8 colours — no orange)

The real quad RGB sensor classifies into exactly 8 colours (the `_colors` table in Open Roberta's generated MicroPython): `red #cc0000, yellow #ffff00, green #33cc00, cyan #33ffff, blue #3366ff, purple #cc33cc, white #ffffff, black #000000`. The sim returns the nearest of these 8 (`src/sim/sensors.js → sensorQuadRGB`). **There is no orange**: the toolbox's orange swatch (`#ff6600`) can never equal a sensor reading, so never use orange as a sensor colour in maps or levels.

Colours are lowercase `"#rrggbb"` strings everywhere in generated code (picker, RGB block, sensor), so colour comparisons behave like Open Roberta's RGB tuples.

Map pixel classification for collision/HUD still uses `src/sim/map.js → getColorNameAt` (±40 RGB tolerance).

## 11. UI Language

- **All student-facing UI in PT-PT.** Source: `src/i18n/pt.js`.
- **Code comments + docs in English.**
- Console/error messages shown to students: PT-PT.
- Console/error messages for developers (DevTools): English is fine.

## 12. File Discipline

- One block category per file in `src/blockly/blocks/`.
- One sim concern per file in `src/sim/`.
- Never mix Blockly-side and sim-side code in the same module.
- `src/interpreter/api.js` re-exports `robotAPI` from `src/sim/robotAPI.js` — this is the declared bridge point. The actual injection into the JS-Interpreter sandbox happens in `src/runtime/sandbox.js`.

## 14. World Scale Convention (Phase 6-1)

- **World units are centimetres throughout.** `robot.x`, `robot.y`, sensor return values, drive distances — all in cm.
- **Display scale is 8 px = 1 cm.** `PX_PER_CM = 8` in `src/sim/world.js`, derived from `DISPLAY_SCALE = 8` in `src/sim/constants.js`.
- **Map PNGs are authored at 8 px = 1 cm.** Standard canvas = 1600×980 px (200×122.5 cm). Sensor/collision code converts cm→px (`xCm * DISPLAY_SCALE`) when reading `imageData`.
- **`src/sim/constants.js` is the single source of truth** for all scale and robot footprint constants (`DISPLAY_SCALE`, `ROBOT_LENGTH_CM`, `ROBOT_WIDTH_CM`, `ROBOT_LENGTH_PX`, `ROBOT_WIDTH_PX`, `CANVAS_MAX_WIDTH_PX`, `CANVAS_MAX_HEIGHT_PX`). No magic numbers in canvas/draw/sensor code.
- **Three coordinate spaces:** world (cm), map-px (PNG pixels = cm × DISPLAY_SCALE), screen (display px = world px at zoom 1). See `docs/ARCHITECTURE.md → Coordinate systems`.

## 13. Acceptance Gate (completed — Phase 5)

The following sample program runs end-to-end in the sim:
1. Wait for controller key A press
2. Play tone 440 Hz / 200 ms
3. Drive 50 cm at 30 RPM
4. Turn 90° at 30 RPM
5. Drive forward until ultrasonic < 10 cm OR quad-RGB sees red
6. Stop, display "Done"

## 15. Documentation & Decision Log

- Index of all docs: [docs/README.md](docs/README.md).
- **Before proposing or implementing a design change, read [docs/decisions/README.md](docs/decisions/README.md).** `Accepted` records are binding like the rules above. To change one, write a new record that supersedes it. Never rewrite an old record.
- New decisions: copy `docs/decisions/0000-template.md`, next free number, add to the index.
- Work plan: [docs/ROADMAP.md](docs/ROADMAP.md) — tick items as they ship. Level content: [docs/CURRICULUM.md](docs/CURRICULUM.md).

## 16. Testing

- `npm run check` must pass before every commit (fidelity, codegen, variables/functions, headless sim tests).
- Test it yourself before asking the teacher: `npm run sim -- <program.xml>` for behaviour, `window.__dev` on the dev server for the editor and the browser run loop (no screenshots needed). See `docs/ARCHITECTURE.md → Headless runner and sim tests`.
- New behaviour or a reported bug → add a case to `scripts/fixtures/sim-tests.json`. The teacher's browser checks are for looks only.
