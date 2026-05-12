import { javascriptGenerator, Order } from 'blockly/javascript';

// Codegen for all action blocks. Imported after stubs.js so it overrides the TODO stubs.

export function registerActionCodegen() {
  // ── Drive — synchronous ────────────────────────────────────────────────

  // robActions_motorDiff_on: drive in direction at power (RPM) forever
  javascriptGenerator.forBlock['robActions_motorDiff_on'] = function (block) {
    const dir   = block.getFieldValue('DIRECTION');
    const power = javascriptGenerator.valueToCode(block, 'POWER', Order.NONE) || '0';
    return `robotAPI.drive(${JSON.stringify(dir)}, ${power});\n`;
  };

  // robActions_motorDiff_stop: stop both drive motors
  javascriptGenerator.forBlock['robActions_motorDiff_stop'] = function (_block) {
    return `robotAPI.drive_stop();\n`;
  };

  // robActions_motorDiff_turn: pivot in direction at power forever
  javascriptGenerator.forBlock['robActions_motorDiff_turn'] = function (block) {
    const dir   = block.getFieldValue('DIRECTION');
    const power = javascriptGenerator.valueToCode(block, 'POWER', Order.NONE) || '0';
    return `robotAPI.turn(${JSON.stringify(dir)}, ${power});\n`;
  };

  // robActions_motorDiff_curve: drive with independent L/R wheel powers forever
  javascriptGenerator.forBlock['robActions_motorDiff_curve'] = function (block) {
    const dir  = block.getFieldValue('DIRECTION');
    const pL   = javascriptGenerator.valueToCode(block, 'POWER_LEFT',  Order.NONE) || '0';
    const pR   = javascriptGenerator.valueToCode(block, 'POWER_RIGHT', Order.NONE) || '0';
    return `robotAPI.curve(${JSON.stringify(dir)}, ${pL}, ${pR});\n`;
  };

  // robActions_motor_on: single motor on at power
  javascriptGenerator.forBlock['robActions_motor_on'] = function (block) {
    const port  = block.getFieldValue('MOTORPORT');
    const power = javascriptGenerator.valueToCode(block, 'POWER', Order.NONE) || '0';
    return `robotAPI.motor_on(${JSON.stringify(port)}, ${power});\n`;
  };

  // robActions_motor_stop: single motor stop
  javascriptGenerator.forBlock['robActions_motor_stop'] = function (block) {
    const port = block.getFieldValue('MOTORPORT');
    return `robotAPI.motor_stop(${JSON.stringify(port)});\n`;
  };

  // ── Drive — asynchronous ───────────────────────────────────────────────

  // robActions_motorDiff_on_for: drive straight for distance (cm) — ASYNC
  javascriptGenerator.forBlock['robActions_motorDiff_on_for'] = function (block) {
    const dir      = block.getFieldValue('DIRECTION');
    const power    = javascriptGenerator.valueToCode(block, 'POWER',    Order.NONE) || '0';
    const distance = javascriptGenerator.valueToCode(block, 'DISTANCE', Order.NONE) || '0';
    return `robotAPI.drive_for(${JSON.stringify(dir)}, ${power}, ${distance});\n`;
  };

  // robActions_motorDiff_turn_for: pivot for degrees — ASYNC
  javascriptGenerator.forBlock['robActions_motorDiff_turn_for'] = function (block) {
    const dir    = block.getFieldValue('DIRECTION');
    const power  = javascriptGenerator.valueToCode(block, 'POWER',  Order.NONE) || '0';
    const degree = javascriptGenerator.valueToCode(block, 'DEGREE', Order.NONE) || '0';
    return `robotAPI.turn_for(${JSON.stringify(dir)}, ${power}, ${degree});\n`;
  };

  // robActions_motorDiff_curve_for: curve with independent L/R powers for distance — ASYNC
  javascriptGenerator.forBlock['robActions_motorDiff_curve_for'] = function (block) {
    const dir      = block.getFieldValue('DIRECTION');
    const pL       = javascriptGenerator.valueToCode(block, 'POWER_LEFT',  Order.NONE) || '0';
    const pR       = javascriptGenerator.valueToCode(block, 'POWER_RIGHT', Order.NONE) || '0';
    const distance = javascriptGenerator.valueToCode(block, 'DISTANCE',    Order.NONE) || '0';
    return `robotAPI.curve_for(${JSON.stringify(dir)}, ${pL}, ${pR}, ${distance});\n`;
  };

  // robActions_motor_on_for: single motor for rotations/degrees — ASYNC
  javascriptGenerator.forBlock['robActions_motor_on_for'] = function (block) {
    const port     = block.getFieldValue('MOTORPORT');
    const rotation = block.getFieldValue('MOTORROTATION');
    const power    = javascriptGenerator.valueToCode(block, 'POWER', Order.NONE) || '0';
    const value    = javascriptGenerator.valueToCode(block, 'VALUE', Order.NONE) || '0';
    return `robotAPI.motor_on_for(${JSON.stringify(port)}, ${power}, ${value}, ${JSON.stringify(rotation)});\n`;
  };

  // ── Display ────────────────────────────────────────────────────────────

  // robActions_display_text: show text at grid col/row
  javascriptGenerator.forBlock['robActions_display_text'] = function (block) {
    const text = javascriptGenerator.valueToCode(block, 'OUT', Order.NONE) || "''";
    const col  = javascriptGenerator.valueToCode(block, 'COL', Order.NONE) || '0';
    const row  = javascriptGenerator.valueToCode(block, 'ROW', Order.NONE) || '0';
    return `robotAPI.display_text(${text}, ${col}, ${row});\n`;
  };

  // robActions_println: print line to console + display
  javascriptGenerator.forBlock['robActions_println'] = function (block) {
    const text = javascriptGenerator.valueToCode(block, 'OUT', Order.NONE) || "''";
    return `robotAPI.println(${text});\n`;
  };

  // robActions_serial_print: send text to console
  javascriptGenerator.forBlock['robActions_serial_print'] = function (block) {
    const text = javascriptGenerator.valueToCode(block, 'OUT', Order.NONE) || "''";
    return `robotAPI.serial_print(${text});\n`;
  };

  // robActions_display_set_colour: set background colour
  javascriptGenerator.forBlock['robActions_display_set_colour'] = function (block) {
    const colour = javascriptGenerator.valueToCode(block, 'COLOR', Order.NONE) || "'#000000'";
    return `robotAPI.display_set_colour(${colour});\n`;
  };

  // robActions_display_clear: clear the CyberPi screen
  javascriptGenerator.forBlock['robActions_display_clear'] = function (_block) {
    return `robotAPI.display_clear();\n`;
  };

  // ── Sound ──────────────────────────────────────────────────────────────

  // mbedActions_play_tone: play a tone at freq Hz for ms — fire-and-forget
  // ⚠ field name is FREQUENCE (typo in Open Roberta source — preserved for fidelity)
  javascriptGenerator.forBlock['mbedActions_play_tone'] = function (block) {
    const freq = javascriptGenerator.valueToCode(block, 'FREQUENCE', Order.NONE) || '440';
    const dur  = javascriptGenerator.valueToCode(block, 'DURATION',  Order.NONE) || '1000';
    return `robotAPI.play_tone(${freq}, ${dur});\n`;
  };

  // mbedActions_play_note: play a musical note — fields are dropdowns
  javascriptGenerator.forBlock['mbedActions_play_note'] = function (block) {
    const note = block.getFieldValue('NOTE');
    const dur  = block.getFieldValue('DURATION');
    return `robotAPI.play_note(${JSON.stringify(note)}, ${JSON.stringify(dur)});\n`;
  };

  // robActions_play_setVolume: set speaker volume
  javascriptGenerator.forBlock['robActions_play_setVolume'] = function (block) {
    const vol = javascriptGenerator.valueToCode(block, 'VOLUME', Order.NONE) || '50';
    return `robotAPI.set_volume(${vol});\n`;
  };

  // robActions_play_getVolume: returns current volume (expression block)
  javascriptGenerator.forBlock['robActions_play_getVolume'] = function (_block) {
    return [`robotAPI.get_volume()`, Order.FUNCTION_CALL];
  };

  // robActions_play_recording: play a named audio recording (stub)
  javascriptGenerator.forBlock['robActions_play_recording'] = function (block) {
    const name = block.getFieldValue('FILENAME');
    return `robotAPI.play_recording(${JSON.stringify(name)});\n`;
  };

  // ── Light ──────────────────────────────────────────────────────────────

  // actions_rgbLed_hidden_on_mbot2: LED index (field) + colour (value input)
  // ⚠ LED field is a dropdown ('ALL', '1'..'5'); COLOUR input is British spelling
  javascriptGenerator.forBlock['actions_rgbLed_hidden_on_mbot2'] = function (block) {
    const led    = block.getFieldValue('LED');
    const colour = javascriptGenerator.valueToCode(block, 'COLOUR', Order.NONE) || "'#ffffff'";
    return `robotAPI.led_on(${JSON.stringify(led)}, ${colour});\n`;
  };

  // actions_rgbLed_hidden_off_mbot2: LED index (field)
  javascriptGenerator.forBlock['actions_rgbLed_hidden_off_mbot2'] = function (block) {
    const led = block.getFieldValue('LED');
    return `robotAPI.led_off(${JSON.stringify(led)});\n`;
  };

  // robActions_led_setBrightness: LED brightness 0–100
  javascriptGenerator.forBlock['robActions_led_setBrightness'] = function (block) {
    const b = javascriptGenerator.valueToCode(block, 'BRIGHTNESS', Order.NONE) || '100';
    return `robotAPI.led_brightness(${b});\n`;
  };

  // robActions_ultrasonic2_led: ultrasonic sensor ring LED brightness
  // ⚠ LED field values: 'ALL', '1', '2' (ultrasonic has 2 LEDs)
  javascriptGenerator.forBlock['robActions_ultrasonic2_led'] = function (block) {
    const led = block.getFieldValue('LED');
    const b   = javascriptGenerator.valueToCode(block, 'BRIGHTNESS', Order.NONE) || '100';
    return `robotAPI.ultrasonic_led(${JSON.stringify(led)}, ${b});\n`;
  };

  // robActions_quadRGB_led_on: quad RGB sensor's illumination LED
  // ⚠ input name is COLOR (American spelling)
  javascriptGenerator.forBlock['robActions_quadRGB_led_on'] = function (block) {
    const colour = javascriptGenerator.valueToCode(block, 'COLOR', Order.NONE) || "'#ffffff'";
    return `robotAPI.quadrgb_led_on(${colour});\n`;
  };

  // robActions_quadRGB_led_off
  javascriptGenerator.forBlock['robActions_quadRGB_led_off'] = function (_block) {
    return `robotAPI.quadrgb_led_off();\n`;
  };
}
