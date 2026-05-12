# BLOCK_MAPPING.md — Block → JS API → Sim Behavior

Every block from `program.toolbox.beginner.xml` and `program.toolbox.expert.xml`. Source of truth for units = `openrobertambot2context.md`.

Legend: `B` = beginner toolbox, `E` = expert toolbox, `B/E` = both.

---

## ACTION → MOVE

| Block ID | Toolbox | Args (defaults) | JS API call | Sim Behavior |
|---|---|---|---|---|
| `robActions_motor_on` | E | PORT=EM1, POWER=30 | `robotAPI.motor_on(port, power)` | Sets single motor (EM1 or EM2) to `power` RPM, non-blocking |
| `robActions_motor_on_for` | E | PORT=EM1, POWER=30, VALUE=5, ROTATION=ROTATION | `robotAPI.motor_on_for(port, power, value, rotation, cb)` | Single motor at `power` for `value` rotations (or degrees), blocks |
| `robActions_motor_stop` | B/E | PORT=EM1 | `robotAPI.motor_stop(port)` | Single motor (EM1 or EM2) → 0 RPM |

## ACTION → DRIVE

| Block ID | Toolbox | Args (defaults) | JS API call | Sim Behavior |
|---|---|---|---|---|
| `robActions_motorDiff_on_for` | B/E | DIRECTION=FORWARD, POWER=30, DISTANCE=10 cm | `robotAPI.drive_for(direction, power, cm, cb)` | Drive straight `cm` at `power` RPM in `direction`, blocks until done |
| `robActions_motorDiff_on` | B/E | DIRECTION=FORWARD, POWER=30 | `robotAPI.drive(direction, power)` | Drive straight in `direction`, non-blocking |
| `robActions_motorDiff_stop` | B/E | — | `robotAPI.drive_stop()` | Both motors → 0 RPM |
| `robActions_motorDiff_turn_for` | B/E | DIRECTION=LEFT, POWER=30, DEGREE=20 | `robotAPI.turn_for(direction, power, deg, cb)` | Pivot turn `deg` degrees in `direction`, blocks |
| `robActions_motorDiff_turn` | B/E | DIRECTION=LEFT, POWER=30 | `robotAPI.turn(direction, power)` | Pivot turn in `direction`, non-blocking |
| `robActions_motorDiff_curve_for` | B/E | DIRECTION=FORWARD, PL=10, PR=30, DIST=20 cm | `robotAPI.curve_for(direction, pL, pR, cm, cb)` | Differential curve `cm` in `direction`, blocks |
| `robActions_motorDiff_curve` | B/E | DIRECTION=FORWARD, PL=10, PR=30 | `robotAPI.curve(direction, pL, pR)` | Differential curve, non-blocking |

## ACTION → DISPLAY

| Block ID | Toolbox | Args (defaults) | JS API call | Sim Behavior |
|---|---|---|---|---|
| `robActions_display_text` | B/E | OUT="Hallo", COL=0, ROW=0 | `robotAPI.display_text(text, col, row)` | Write to 8×8 text grid on overlay |
| `robActions_println` | B/E | OUT="Hallo" | `robotAPI.println(text)` | Scroll text on display + console |
| `robActions_display_set_colour` | B/E | COLOR=#cc0000 | `robotAPI.display_set_colour(hex)` | Background color |
| `robActions_display_clear` | B/E | — | `robotAPI.display_clear()` | Clear display |
| `robActions_serial_print` | E | OUT="Hallo" | `robotAPI.serial_print(text)` | Console only |

## ACTION → SOUND

| Block ID | Toolbox | Args (defaults) | JS API call | Sim Behavior |
|---|---|---|---|---|
| `mbedActions_play_tone` | B/E | FREQ=300 Hz, DUR=100 ms | `robotAPI.play_tone(hz, ms)` | Web Audio API tone for `ms` ms, synchronous |
| `robActions_play_setVolume` | B/E | VOLUME=50 | `robotAPI.set_volume(v)` | Sets master volume 0–100 |
| `robActions_play_getVolume` | B/E | — | `robotAPI.get_volume()` | Returns volume |
| `mbedActions_play_note` | E | (note dropdown, duration dropdown) | `robotAPI.play_note(note, dur)` | Plays musical note, synchronous |
| `robActions_play_recording` | E | (recording dropdown) | `robotAPI.play_recording(name)` | Stub: logs name, no audio |

## ACTION → LIGHT

| Block ID | Toolbox | Args | JS API call | Sim Behavior |
|---|---|---|---|---|
| `actions_rgbLed_hidden_on_mbot2` | B/E | LED, COLOUR | `robotAPI.led_on(led, colour)` | Robot body LED on |
| `actions_rgbLed_hidden_off_mbot2` | B/E | LED | `robotAPI.led_off(led)` | Robot body LED off |
| `robActions_led_setBrightness` | B/E | BRIGHTNESS=50 | `robotAPI.led_brightness(b)` | 0–100 (stub) |
| `robActions_ultrasonic2_led` | B/E | LED, BRIGHTNESS=50 | `robotAPI.ultrasonic_led(led, b)` | Ultrasonic ring LED (stub) |
| `robActions_quadRGB_led_on` | B/E | COLOR | `robotAPI.quadrgb_led_on(hex)` | Quad-RGB sensor LED (stub) |
| `robActions_quadRGB_led_off` | B/E | — | `robotAPI.quadrgb_led_off()` | Off (stub) |

## SENSOR

| Block ID | Toolbox | Property | JS API call | Sim Behavior |
|---|---|---|---|---|
| `robSensors_ultrasonic_getSample` | B/E | DISTANCE (cm) | `robotAPI.ultrasonic()` | 3-ray cone raycast → cm to nearest magenta pixel (max 50 cm) |
| `robSensors_quadrgb_getSample` | B/E | SENSORPORT=1, SLOT=1..4, MODE=COLOUR/LIGHT/RGB | `robotAPI.quadRGB(property, sensor, probe)` | Per-probe raw pixel sample; COLOUR=colour name, LIGHT=brightness 0–100 (raw (r+g+b)/3 ÷ 255 × 100), RGB=[r,g,b]. Probe 1=leftmost, 4=rightmost (field `SLOT`). |
| `robSensors_sound_getSample` | E | (loudness) | `robotAPI.sound()` | Returns 0 (stub) |
| `robSensors_sound_record` | E | — | `robotAPI.sound_record(cmd, dur)` | Stub |
| `robSensors_joystickKeys_getSample` | B/E | (direction) | `robotAPI.joystick(direction)` | Reads keyboard arrow keys |
| `robSensors_key_getSample` | B/E | (A/B) | `robotAPI.key(name)` | Reads keyboard A/B |
| `robSensors_light_getSample` | E | — | `robotAPI.light()` | Returns 50 (stub) |
| `robSensors_gyro_getSample` | E | (slot, axis) | `robotAPI.gyro(slot, axis)` | Cumulative rotation in degrees (Z axis only); RATE mode returns deg/s |
| `robSensors_gyro_reset_axis` | E | (axis) | `robotAPI.gyro_reset(axis)` | Resets accumulated angle for axis |
| `robSensors_accelerometer_getSample` | E | (axis) | `robotAPI.accel(axis)` | Returns 0 (2D sim) |
| `robSensors_timer_getSample` | B/E | (slot) | `robotAPI.timer(slot)` | ms since last reset for slot (1 or 2) |
| `robSensors_timer_reset` | B/E | (slot) | `robotAPI.timer_reset(slot)` | Resets timer for slot |
| `robSensors_encoder_getSample` | E | (port, mode) | `robotAPI.encoder(port, mode)` | ROTATION=rotations, DEGREE=degrees, DISTANCE=cm since reset |
| `robSensors_encoder_reset` | E | (port) | `robotAPI.encoder_reset(port)` | Reset encoder for port |
| `robSensors_line_getSample` | E | SENSORPORT=1, MODE=L/R/ALL/CODE | `robotAPI.line(mode)` | Brightness-threshold detection across all 4 probes. L/R/ALL=boolean (true=line detected). CODE=4-bit integer 0–15: bit0=probe1(LSB/left)..bit3=probe4(MSB/right); bit=1→light (off line), bit=0→dark (on line). Threshold: (r+g+b)/3 > 128 = light. Reserved spawn-marker colours (#00ffff, #ffff00) have brightness ≈187–255 → always read as light (no false trigger). |

## CONTROL

| Block ID | Toolbox | JS Codegen |
|---|---|---|
| `robControls_if` | B/E | `if (cond) { ... }` |
| `robControls_ifElse` | B/E | `if (cond) { ... } else { ... }` |
| `robControls_loopForever` | B/E | `while (true) { ...; yield; }` |
| `controls_repeat_ext` | B/E | `for (let i=0; i<N; i++) { ... }` |
| `controls_whileUntil` | B/E | `while (cond) { ... }` / `while (!cond) { ... }` |
| `robControls_for` | E | `for (let i=FROM; i<=TO; i+=BY) { ... }` |
| `robControls_forEach` | E | `for (const x of list) { ... }` |
| `controls_flow_statements` | B/E | `break` / `continue` |
| `robControls_wait` | B/E | busy-poll until condition true, yields every iteration |
| `robControls_wait_time` | B/E | `robotAPI.wait_ms(ms, cb)` — async, blocks interpreter |
| `robControls_wait_for` | E | busy-poll until expression true |

## LOGIC / MATH / TEXT / LIST / COLOUR

Standard Blockly blocks with stock JS codegen, plus:

| Block ID | Notes |
|---|---|
| `robMath_change` | `var += DELTA` |
| `math_cast_toString` | `String(x)` |
| `math_cast_toChar` | `String.fromCharCode(x)` |
| `text_cast_string_toNumber` | `Number(x)` |
| `text_cast_char_toNumber` | `x.charCodeAt(0)` |
| `text_comment` | `// comment` (no runtime effect) |
| `robText_join` | string concat |
| `robText_append` | `var += text` |
| `robColour_picker` | returns hex string |
| `naoColour_rgb` | returns `[r,g,b]` array |
| `robLists_*` | standard list ops |

## VARIABLES / PROCEDURES

Standard Blockly. PT-PT labels via `Blockly.Msg`.

## COMMUNICATION (stub — single-robot sim)

| Block ID | JS API call | Sim Behavior |
|---|---|---|
| `communication_send_message` | `robotAPI.send_message(channel, msg)` | Local pub/sub FIFO, logs to console |
| `communication_receive_message` | `robotAPI.receive_message(channel)` | Returns next message on channel or `''` (empty string) if queue empty |

## EXCLUDED (Out of Scope)

`#ifdef nn` Neural Network category — `robActions_NNstep`, `robActions_set_inputneuron_val`, `robSensors_get_outputneuron_val`, `robActions_set_weight`, `robActions_set_bias`, `robSensors_get_weight`, `robSensors_get_bias`. Do not implement.
