import { defineOrBlocks } from './_orFactory.js';

// TOOLBOX_ACTION (Ação): move, drive, display, sound, light.
// Definitions come from the live Open Roberta spec (decision 0011).
export const ACTION_TYPES = [
  // Mover (single motors)
  'robActions_motor_on', 'robActions_motor_on_for', 'robActions_motor_stop',
  // Atuar (differential drive)
  'robActions_motorDiff_on_for', 'robActions_motorDiff_on', 'robActions_motorDiff_stop',
  'robActions_motorDiff_turn_for', 'robActions_motorDiff_turn',
  'robActions_motorDiff_curve_for', 'robActions_motorDiff_curve',
  // Ecrã
  'robActions_display_text', 'robActions_println', 'robActions_display_set_colour',
  'robActions_display_clear', 'robActions_serial_print',
  // Sons
  'mbedActions_play_tone', 'robActions_play_setVolume', 'robActions_play_getVolume',
  'mbedActions_play_note', 'robActions_play_recording',
  // Luzes
  'actions_rgbLed_hidden_on_mbot2', 'actions_rgbLed_hidden_off_mbot2', 'robActions_led_setBrightness',
  'robActions_ultrasonic2_led', 'robActions_quadRGB_led_on', 'robActions_quadRGB_led_off',
];

export function registerActionBlocks() {
  defineOrBlocks(ACTION_TYPES);
}
