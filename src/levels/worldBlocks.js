// The blocks each world introduces (CURRICULUM.md). A level's toolbox shows the blocks
// of its world and every world before it, filtered from Open Roberta's beginner or
// expert toolbox (the level's `toolbox`). Blocks a level's toolbox doesn't contain are
// simply not shown. The student can still pick the full Principiante / Avançado
// toolbox in the selector (decision 0001: no locks).
//
// Types are Open Roberta block types; VARIABLE and PROCEDURE stand for the dynamic
// Variáveis / Funções categories. Blocks nested inside a toolbox block (the number in
// "conduzir", the sensor inside "esperar até") come with it.

export const WORLD_BLOCKS = {
  1: [   // Primeiros Passos: distances, angles, speed
    'robActions_motorDiff_on_for', 'robActions_motorDiff_turn_for', 'robActions_motorDiff_curve_for',
    'robControls_wait_time',
  ],
  2: [   // Luz, Som e Ecrã
    'robActions_println', 'robActions_display_text', 'robActions_display_clear',
    'mbedActions_play_tone', 'mbedActions_play_note', 'robActions_play_setVolume',
    'actions_rgbLed_hidden_on_mbot2', 'actions_rgbLed_hidden_off_mbot2', 'robActions_led_setBrightness',
  ],
  3: [   // Repetir; waiting for a key
    'controls_repeat_ext', 'robControls_loopForever', 'robControls_wait_for', 'robSensors_key_getSample',
  ],
  4: [   // Ultrassom: drive until…, if/else, comparisons
    'robActions_motorDiff_on', 'robActions_motorDiff_turn', 'robActions_motorDiff_stop',
    'robSensors_ultrasonic_getSample', 'robControls_if', 'robControls_ifElse',
    'logic_compare', 'logic_boolean', 'math_number',
  ],
  5: [   // Cores e Linhas
    'robSensors_quadrgb_getSample', 'robSensors_line_getSample', 'robColour_picker',
    'robActions_motorDiff_curve',
  ],
  6: [   // Decisões
    'logic_operation', 'logic_negate', 'controls_whileUntil',
  ],
  7: [   // Variáveis: counters, encoders, gyro, timers
    'VARIABLE', 'math_arithmetic', 'robMath_change', 'robControls_for',
    'robSensors_encoder_getSample', 'robSensors_encoder_reset',
    'robSensors_gyro_getSample', 'robSensors_gyro_reset_axis',
    'robSensors_timer_getSample', 'robSensors_timer_reset',
    'text', 'robText_join', 'text_comment',
  ],
  8: [   // Controlo: each motor on its own, maths for proportional control
    'robActions_motor_on', 'robActions_motor_on_for', 'robActions_motor_stop',
    'math_single', 'math_round', 'math_constrain', 'math_modulo',
  ],
  9: [   // Funções e Listas
    'PROCEDURE', 'robControls_forEach', 'controls_flow_statements',
    'robLists_create_with', 'robLists_repeat', 'robLists_length', 'robLists_isEmpty',
    'robLists_indexOf', 'robLists_getIndex', 'robLists_setIndex', 'robLists_getSublist',
  ],
};

/** From this world on, levels show the whole toolbox. */
export const FULL_TOOLBOX_FROM_WORLD = 10;

/** Block types for a level of `world` (a Set), or null for the whole toolbox. */
export function blocksForWorld(world) {
  if (!world || world >= FULL_TOOLBOX_FROM_WORLD) return null;
  const out = new Set();
  for (let w = 1; w <= world; w++) for (const t of WORLD_BLOCKS[w] || []) out.add(t);
  return out;
}
