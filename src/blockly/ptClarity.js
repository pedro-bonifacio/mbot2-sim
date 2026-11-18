// Clearer PT-PT wording for dropdown options whose Open Roberta translation is
// confusing (half English, units in the middle). Display text only: block types, field
// values, serialisation and the Open Roberta export are unchanged (decision 0014).
// Keyed by field name, then option value.

export const DROPDOWN_TEXT = {
  // "ler …" (robSensors_getSample), inside "esperar até"
  SENSORTYPE: {
    KEY_PRESSED:          'botão pressionado?',
    ULTRASONIC_DISTANCE:  'distância (cm) do ultrassom',
    SOUND_SOUND:          'som (%) do microfone',
    JOYSTICK_PRESSED:     'joystick pressionado?',
    LIGHT_VALUE:          'luz (%) do CyberPi',
    GYRO_ANGLE:           'ângulo (°) do giroscópio',
    ACCELEROMETER_VALUE:  'aceleração (g) do acelerómetro',
    TIMER_VALUE:          'tempo (ms) do temporizador',
    QUADRGB_COLOUR:       'cor do sensor de cor',
    QUADRGB_LIGHT:        'luz refletida (%) do sensor de cor',
    QUADRGB_AMBIENTLIGHT: 'luz ambiente (%) do sensor de cor',
    QUADRGB_LINE:         'linha do sensor de cor',
    ENCODER_DEGREE:       'ângulo (°) do motor',
    ENCODER_ROTATION:     'rotações do motor',
  },
};

/** The option list with clearer text where DROPDOWN_TEXT has one for this field. */
export function clarifyOptions(fieldName, options) {
  const table = DROPDOWN_TEXT[fieldName];
  if (!table) return options;
  return options.map(([text, value]) => [table[value] ?? text, value]);
}
