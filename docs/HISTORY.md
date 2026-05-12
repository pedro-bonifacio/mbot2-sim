# Development History

> This document records the original 8-phase development plan for mbot2-sim. It is preserved for historical context but is **not** maintained as active planning. The project is complete as of Phase 5; Phases 6–8 were partially completed or absorbed into earlier phases.

---

## Phase 0 — Repo Scaffold

**Goal:** Empty Vite app boots, Blockly renders an empty workspace, sim canvas shows a stationary robot.

**Tasks:**
- `npm create vite@latest mbot2-sim -- --template vanilla`
- Install: `blockly`, `js-interpreter`
- Create folder structure (above)
- `index.html` with two-pane layout: Blockly left, canvas right
- `src/main.js` mounts Blockly + canvas
- Render robot as a circle at map center, no movement

**Acceptance:**
- `npm run dev` starts on port 5173
- Empty Blockly workspace visible
- Canvas shows robot circle
- No console errors

---

## Phase 1 — Canvas + Differential Drive Kinematics

**Goal:** Hard-coded velocity test (no Blockly yet) drives the robot in a circle.

**Tasks:**
- `src/sim/canvas.js` — 60fps RAF loop, clear+redraw
- `src/sim/robot.js` — robot state: `{x, y, theta, vL, vR}` (vL/vR in RPM)
- `src/sim/kinematics.js` — convert (vL, vR) RPM → linear/angular velocity using TRACK_WIDTH_CM and WHEEL_CIRCUMFERENCE_CM, integrate over dt
- Test: hard-set `vL=30, vR=60` and verify robot drives a left curve

**Acceptance:**
- Robot moves smoothly at 60 fps
- Turning radius matches expected differential-drive math
- Pause/Resume/Reset buttons work

---

## Phase 2 — Map Ingestion

**Goal:** User uploads PNG map, it renders under the robot, obstacles are detectable.

**Tasks:**
- `src/sim/map.js` — load PNG via `<input type=file>`, draw to off-screen canvas, expose `getPixelAt(x,y)` and `isObstacle(x,y)`
- Define semantic colors:
  - `#FF00FF` magenta = obstacle (wall)
  - `#000000` black = line (for line-follow)
  - 8-color palette = colored markers for quad-RGB
  - `#FFFFFF` white = free space
- Map cm-to-pixel scale (default: 1 cm = 10 px, configurable)
- Render map below robot

**Acceptance:**
- PNG upload works
- Robot blocked by magenta obstacles (collision halts motion)
- Pixel sampling at robot position returns correct color name

---

## Phase 3 — Blockly Toolboxes (Beginner + Expert)

**Goal:** Both toolboxes render with all blocks from XML, PT-PT labels, correct defaults.

**Tasks:**
- `src/blockly/blocks/*.js` — define every custom block (`robActions_*`, `robSensors_*`, `robControls_*`, `robColour_picker`, `naoColour_rgb`, `communication_*`)
- `src/blockly/toolboxes/beginner.js` and `expert.js` — JSON toolboxes mirroring XML structure exactly
- `src/i18n/pt.js` — all `Blockly.Msg.*` keys for PT-PT
- UI toggle: Beginner ↔ Expert (top bar)

**Acceptance:**
- Every block from both XML files exists and is draggable
- Default values match XML (`30` for power, `5` for time, etc.)
- All labels in PT-PT
- Toggle swaps toolbox without losing workspace contents

---

## Phase 4 — JS Code Generator + JS-Interpreter Runner

**Goal:** Run/Stop buttons execute the workspace via JS-Interpreter; trivial blocks (`println`, `wait_time`, `motor_on`) work.

**Tasks:**
- `src/codegen/` — JS code gen for every block, calling `robotAPI.*`
- `src/runtime/runLoop.js` — wraps JS-Interpreter, drives `step()` from RAF, handles async yielding
- `src/runtime/sandbox.js` — defines `robotAPI` surface exposed to sandbox
- Async pattern: `robotAPI.wait_ms(ms, callback)` — interpreter blocks until callback fires from sim loop
- Run / Stop / Reset buttons

**Acceptance:**
- Drag `robActions_println` → "Olá" → Run → console shows "Olá"
- Drag `wait_time 1000` then `motor_on 30` → robot waits 1s then drives
- Stop button kills execution mid-wait

---

## Phase 5 — Full SDK Coverage + Sample Program Milestone Gate

**Goal:** Every block from beginner + expert toolbox has a working sim implementation.

**Tasks:**
- All movement: `motor_on`, `motor_on_for`, `motor_stop`, `motorDiff_on`, `motorDiff_on_for`, `motorDiff_stop`, `motorDiff_turn`, `motorDiff_turn_for`, `motorDiff_curve`, `motorDiff_curve_for`
- Display: `display_text` (text grid), `println` (scrolling), `display_set_colour`, `display_clear`, `serial_print`
- Sound: `play_tone`, `play_setVolume`, `play_getVolume`, `play_note`, `play_recording` (stub)
- Light: RGB LED on/off, brightness, ultrasonic LED, quad-RGB LED
- Sensors: ultrasonic (raycast), quad-RGB (color/brightness/RGB list/line code), sound, joystick keys, controller keys, light, gyro, accelerometer, timer, encoder, line
- Communication: stub pub/sub
- Comment block, type casts, RGB constructor

**Acceptance:** **🚦 MILESTONE GATE 🚦**

The user's sample program runs end-to-end:
1. Wait for controller key A press
2. Play tone 440 Hz / 200 ms
3. Drive 50 cm at 30 RPM
4. Turn 90° at 30 RPM
5. Drive forward until ultrasonic < 10 cm OR quad-RGB sees red
6. EM_stop, display "Done"

---

## Phase 6 — Display Overlay (CyberPi Screen)

**Goal:** A 128×128 px overlay window shows what `display_text`, `println`, `display_set_colour`, `display_clear` produce.

**Tasks:**
- `src/ui/display.js` — separate canvas (scaled up, e.g., 256×256 visible)
- Text grid: 8 cols × 8 rows for `display_text(text, col, row)`
- Scrolling buffer for `println`
- Background color from `display_set_colour`

**Status:** Partially completed. Display module implemented; visual overlay UI omitted.

---

## Phase 7 — Console + Error UX

**Goal:** Student-facing console panel in PT-PT, runtime errors mapped to friendly messages.

**Tasks:**
- `src/ui/console.js` — append-only log panel
- `serial_print` and `println` write here (println also writes to display)
- JS-Interpreter errors → PT-PT messages ("Erro: variável não definida", etc.)
- Sim warnings ("Robô bateu numa parede!") emitted on collision

**Status:** Completed — console panel, PT-PT error/warning messages, collision detection all implemented.

---

## Phase 8 — Polish + UX

**Goal:** Production-ready demo for classroom.

**Tasks planned:**
- Map upload UI with thumbnail
- Map scale input (cm-per-pixel)
- Robot starting position picker (click on map)
- Workspace save/load (localStorage + XML export)
- Speed slider (1× / 2× / 5× sim time)
- Beginner ↔ Expert toggle preserves workspace
- Mobile-friendly viewport (best-effort)

**Status:** Core UX features (save/load, map catalogue, beginner/expert toggle) delivered. Speed slider, map scale input, and position picker were not implemented. Map scale is fixed at 1 px = 1 cm. Dynamic canvas resize was dropped in favour of pan/zoom navigation on a fixed 824×480 canvas.

---

## Lessons learned

**The 8-phase structure worked.** Breaking the project into explicit phases with acceptance criteria prevented scope creep and gave clear checkpoints. Phases 0–5 were strict; Phases 6–8 were treated more as a backlog.

**Block-level fidelity to Open Roberta was the right call.** Matching Open Roberta's exact block type IDs, argument orders, and toolbox structure means students can transfer programs to real hardware with minimal rework. An early idea to generate hardware-compatible Python was dropped early — it would have created a second maintenance surface for every block added.

**The async ticketing pattern was the trickiest design decision.** JS-Interpreter is ES5 and has no native async. The `asyncTicket` shared-state pattern (set a resolve condition, poll it from the RAF loop, fire a callback) was the correct solution but took several iterations to get right — especially the overshoot correction and the two-RAF-loop interaction. See [ARCHITECTURE.md](ARCHITECTURE.md#the-async-ticketing-pattern) for the full explanation.

**The 3-ray ultrasonic cone was a late but important fidelity upgrade.** A single-ray implementation worked for straight-ahead detection but failed at corners. The 3-ray ±7.5° cone matches the CyberPi datasheet aperture and handles most corner and edge cases without being expensive.

**Fixed canvas + pan/zoom worked better than dynamic resize.** Dynamic resize (per-map canvas dimensions) created layout thrashing and camera state confusion. A fixed 824×480 canvas with pan/zoom is simpler to implement, simpler to reason about, and good enough for all current map sizes.
