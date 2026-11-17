import { javascriptGenerator, Order } from 'blockly/javascript';

// Codegen for TOOLBOX_ACTION blocks. Semantics follow the MicroPython Open Roberta
// generates for the mBot 2 (reference_openroberta/live/or-mbot2-semantics.json).
// Generated code must be ES5 (CLAUDE.md §7).

const v = (block, name, fallback) => javascriptGenerator.valueToCode(block, name, Order.NONE) || fallback;
const f = (block, name) => JSON.stringify(block.getFieldValue(name));

export function registerActionCodegen() {
  const G = javascriptGenerator.forBlock;

  // ── Drive (differential) — power is RPM ──────────────────────────────────
  // DIRECTION is FOREWARD / BACKWARD(S) (Open Roberta uses both spellings).
  G['robActions_motorDiff_on'] = (b) =>
    `robotAPI.drive(${f(b, 'DIRECTION')}, ${v(b, 'POWER', '0')});\n`;
  G['robActions_motorDiff_on_for'] = (b) =>
    `robotAPI.drive_for(${f(b, 'DIRECTION')}, ${v(b, 'POWER', '0')}, ${v(b, 'DISTANCE', '0')});\n`;
  G['robActions_motorDiff_stop'] = () => `robotAPI.drive_stop();\n`;
  G['robActions_motorDiff_turn'] = (b) =>
    `robotAPI.turn(${f(b, 'DIRECTION')}, ${v(b, 'POWER', '0')});\n`;
  G['robActions_motorDiff_turn_for'] = (b) =>
    `robotAPI.turn_for(${f(b, 'DIRECTION')}, ${v(b, 'POWER', '0')}, ${v(b, 'DEGREE', '0')});\n`;
  G['robActions_motorDiff_curve'] = (b) =>
    `robotAPI.curve(${f(b, 'DIRECTION')}, ${v(b, 'POWER_LEFT', '0')}, ${v(b, 'POWER_RIGHT', '0')});\n`;
  G['robActions_motorDiff_curve_for'] = (b) =>
    `robotAPI.curve_for(${f(b, 'DIRECTION')}, ${v(b, 'POWER_LEFT', '0')}, ${v(b, 'POWER_RIGHT', '0')}, ${v(b, 'DISTANCE', '0')});\n`;

  // ── Single motors — MOTORPORT R (EM2) / L (EM1) ──────────────────────────
  G['robActions_motor_on'] = (b) =>
    `robotAPI.motor_on(${f(b, 'MOTORPORT')}, ${v(b, 'POWER', '0')});\n`;
  G['robActions_motor_on_for'] = (b) =>
    `robotAPI.motor_on_for(${f(b, 'MOTORPORT')}, ${v(b, 'POWER', '0')}, ${v(b, 'VALUE', '0')}, ${f(b, 'MOTORROTATION')});\n`;
  G['robActions_motor_stop'] = (b) => `robotAPI.motor_stop(${f(b, 'MOTORPORT')});\n`;

  // ── Display ──────────────────────────────────────────────────────────────
  G['robActions_display_text'] = (b) =>
    `robotAPI.display_text(${v(b, 'OUT', "''")}, ${v(b, 'COL', '0')}, ${v(b, 'ROW', '0')});\n`;
  G['robActions_println'] = (b) => `robotAPI.println(${v(b, 'OUT', "''")});\n`;
  G['robActions_serial_print'] = (b) => `robotAPI.serial_print(${v(b, 'OUT', "''")});\n`;
  G['robActions_display_set_colour'] = (b) => `robotAPI.display_set_colour(${v(b, 'COLOR', "'#000000'")});\n`;
  G['robActions_display_clear'] = () => `robotAPI.display_clear();\n`;

  // ── Sound ────────────────────────────────────────────────────────────────
  // Tones block for their duration on the robot (cyberpi.audio.play_tone).
  G['mbedActions_play_tone'] = (b) =>
    `robotAPI.play_tone(${v(b, 'FREQUENCE', '0')}, ${v(b, 'DURATION', '0')});\n`;
  // play_note: DURATION is ms, FREQUENCE is Hz (Open Roberta FieldNote value).
  G['mbedActions_play_note'] = (b) =>
    `robotAPI.play_tone(${Number(b.getFieldValue('FREQUENCE')) || 0}, ${Number(b.getFieldValue('DURATION')) || 0});\n`;
  G['robActions_play_setVolume'] = (b) => `robotAPI.set_volume(${v(b, 'VOLUME', '0')});\n`;
  G['robActions_play_getVolume'] = () => [`robotAPI.get_volume()`, Order.FUNCTION_CALL];
  G['robActions_play_recording'] = () => `robotAPI.play_recording();\n`;

  // ── Lights ───────────────────────────────────────────────────────────────
  G['actions_rgbLed_hidden_on_mbot2'] = (b) =>
    `robotAPI.led_on(${f(b, 'SLOT')}, ${v(b, 'COLOUR', "'#ffffff'")});\n`;
  G['actions_rgbLed_hidden_off_mbot2'] = (b) => `robotAPI.led_off(${f(b, 'SLOT')});\n`;
  G['robActions_led_setBrightness'] = (b) => `robotAPI.led_brightness(${v(b, 'BRIGHTNESS', '0')});\n`;
  G['robActions_ultrasonic2_led'] = (b) =>
    `robotAPI.ultrasonic_led(${f(b, 'LED')}, ${v(b, 'BRIGHTNESS', '0')});\n`;
  G['robActions_quadRGB_led_on'] = (b) => `robotAPI.quadrgb_led_on(${v(b, 'COLOR', "'#ffffff'")});\n`;
  G['robActions_quadRGB_led_off'] = () => `robotAPI.quadrgb_led_off();\n`;
}
