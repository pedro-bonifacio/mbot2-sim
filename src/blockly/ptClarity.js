// Clearer PT-PT wording where Open Roberta's translation confuses students (half
// English, Brazilian forms, garbled order, units in the middle). Display text only:
// block types, field values, argument order, serialisation and the Open Roberta export
// are unchanged (decision 0014). or:check applies the same tables to Open Roberta's
// side, so it still checks everything else.
//
// Conventions: sensors read "ler <grandeza> (<unidade>) do <sensor>"; sensor names
// "ultrassom", "sensor de cor" (quad RGB), "CyberPi" (light), "motor" (encoder);
// units in parentheses; PT-PT forms ("premido", "devolve", "faz", "Ação").

// ── Dropdown options: "<type>.<FIELD>" (one block) or "<FIELD>" (every block) → value → text
export const DROPDOWN_TEXT = {
  // "ler …" inside "esperar até" (robSensors_getSample)
  SENSORTYPE: {
    KEY_PRESSED:          'botão premido?',
    ULTRASONIC_DISTANCE:  'distância (cm) do ultrassom',
    SOUND_SOUND:          'som (%) do microfone',
    JOYSTICK_PRESSED:     'joystick premido?',
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
  // Driving: "mover para a frente" (the block's own "para" label is dropped)
  DIRECTION: { FOREWARD: 'para a frente', BACKWARD: 'para trás', BACKWARDS: 'para trás' },
  // Ports and "all"
  SENSORPORT: { R: 'R (direito)', L: 'L (esquerdo)' },
  MOTORPORT:  { R: 'R (direito)', L: 'L (esquerdo)' },
  SLOT: { ALL: 'todos' },
  LED:  { LEDALL: 'todos' },
  'robSensors_joystickKeys_getSample.SLOT': { UP: 'cima', DOWN: 'baixo', CENTER: 'centro' },
  // Sensor modes
  'robSensors_quadrgb_getSample.MODE': { LIGHT: 'luz refletida' },
  'robSensors_line_getSample.MODE': { LINE: 'linha' },
  'robSensors_sound_getSample.MODE': { SOUND: 'som' },
  'robSensors_gyro_getSample.MODE': { ANGLE: 'ângulo' },
  'robSensors_timer_getSample.MODE': { VALUE: 'tempo' },
  'robSensors_light_getSample.MODE': { VALUE: 'luz' },
  'robSensors_accelerometer_getSample.MODE': { VALUE: 'aceleração' },
  'robSensors_encoder_getSample.MODE': { DEGREE: 'ângulo', ROTATION: 'rotações' },
  'robActions_motor_on_for.MOTORROTATION': { ROTATIONS: 'rotações', DEGREE: 'graus' },
  // Notes
  'mbedActions_play_note.DURATION': { 2000: 'semibreve', 1000: 'mínima', 500: 'semínima', 250: 'colcheia', 125: 'semicolcheia' },
  // Data types
  TYPE: { String: 'Texto', Array_Number: 'Lista de números', Array_Boolean: 'Lista de booleanos', Array_String: 'Lista de textos', Array_Colour: 'Lista de cores' },
  LIST_TYPE: { String: 'Texto' },
  // Control
  'controls_flow_statements.FLOW': { CONTINUE: 'passar à próxima volta' },
  // Maths
  'math_single.OP': { ROOT: 'raiz quadrada', SQUARE: 'quadrado', ABS: 'valor absoluto' },
  'math_trig.OP': { SIN: 'sen', TAN: 'tg', ASIN: 'arcsen', ACOS: 'arccos', ATAN: 'arctg' },
  'math_constant.CONSTANT': { SQRT2: '√2', SQRT1_2: '√½' },
  'math_number_property.PROPERTY': { ODD: 'ímpar' },
  'math_on_list.OP': { MIN: 'mínimo da', MAX: 'máximo da', AVERAGE: 'média da', MEDIAN: 'mediana da',
    STD_DEV: 'desvio padrão da', RANDOM: 'item aleatório da' },
  // Lists
  WHERE:  { FROM_START: 'n.º', FROM_END: 'n.º a contar do fim' },
  WHERE1: { FROM_START: 'de n.º', FROM_END: 'de n.º a contar do fim', FIRST: 'do primeiro' },
  WHERE2: { FROM_START: 'até n.º', FROM_END: 'até n.º a contar do fim', LAST: 'até ao último' },
};

// ── Labels: by text on every block, then per block type (wins) ───────────────
export const LABEL_TEXT = {
  'speed RPM': 'velocidade (RPM)',
  'distância em cm': 'distância (cm)',
  'mostrar texto in new row': 'mostrar texto numa nova linha',
  'som Hz': 'frequência (Hz)',
  'duração ms': 'duração (ms)',
  'note': 'nota',
  'definir volume %': 'definir volume (%)',
  'turn RGB LED on': 'ligar LED',
  'turn RGB LED off': 'desligar LED',
  'Cor': 'cor',
  'definir brightness': 'definir brilho (%)',
  'RGB LEDs': 'dos LEDs',
  'brightness': 'brilho (%)',
  'quad rgb sensor': 'do sensor de cor',
  'sensor ultra-sónico': 'do ultrassom',
  'sensor ultra-sónico 2 ': 'do ultrassom',
  'microphone': 'do microfone',
  ' recording microphone': 'gravação do microfone',
  'accelerometer': 'do acelerómetro',
  'pressionado?': 'premido?',
  'set display brush': 'definir cor do ecrã',
  'show on Serial Monitor': 'mostrar no monitor série',
  'tocar record': 'tocar gravação',
  // units of sensor blocks (UNIT changes with the mode)
  'cm': '(cm)', '%': '(%)', '°': '(°)', 'ms': '(ms)', 'g': '(g)',
  // other blocks
  'espera ms': 'espera (ms)',
  'para cada item': 'para cada',
  'repita': 'repete',
  'teste': 'se',
  'se verdadeiro': 'então',
  'se falso': 'senão',
  'restringe': 'limita',
  'inferior': 'entre',
  'superior': 'e',
  'fração aleatória': 'número aleatório entre 0 e 1',
  'cast': 'converter',
  'to String': 'em texto',
  'to Char': 'em letra',
  'to Number': 'em número',
  'at index': 'na posição',
  'encontre a': 'encontra a',
  'obtem sublista': 'obtém sublista',
  'pinte com': 'cor com',
  'a enviar mensagem': 'enviar mensagem',
  'a receber mensagem': 'receber mensagem',
  'channel': 'canal',
  'message': 'mensagem',
  'return': 'devolve',
  'retorna': 'devolve',
  'entradas': 'parâmetros',
  'permitir declarações': 'permitir instruções',
  'nome da entrada:': 'nome do parâmetro:',
};

const LOOP_DO = { 'então': 'faz' };
const getSampleTitle = (text, to) => ({ [text]: to });
export const LABEL_BY_TYPE = {
  robActions_motorDiff_on_for: { 'para': '' },
  robActions_motorDiff_on: { 'para': '' },
  // the curve blocks: "velocidade da roda esquerda (RPM) [n]"
  robActions_motorDiff_curve_for: { 'para': '', 'speed RPM': '', 'esquerda': 'velocidade da roda esquerda (RPM)', 'direita': 'velocidade da roda direita (RPM)' },
  robActions_motorDiff_curve: { 'para': '', 'speed RPM': '', 'esquerda': 'velocidade da roda esquerda (RPM)', 'direita': 'velocidade da roda direita (RPM)' },
  robActions_motorDiff_turn_for: { 'ângulo': 'ângulo (°)' },
  robSensors_gyro_getSample: getSampleTitle('giroscópio', 'do giroscópio'),
  robSensors_timer_getSample: getSampleTitle('temporizador', 'do temporizador'),
  robSensors_encoder_getSample: getSampleTitle('encoder', 'do motor'),
  robSensors_encoder_reset: { 'encoder': 'motor' },
  robSensors_light_getSample: getSampleTitle('sensor de linha', 'do CyberPi'),
  controls_repeat_ext: LOOP_DO,
  robControls_loopForever: LOOP_DO,
  controls_whileUntil: LOOP_DO,
  robControls_for: { ...LOOP_DO, 'em': 'com passo' },
  robControls_forEach: LOOP_DO,
  robControls_start: { '  ': '' },
};

// ── Messages (OR.msg: texts built in code, tooltips) ─────────────────────────
export const MSG_TEXT = {
  CONTROLS_REPEAT_INPUT_DO: 'faz',   // "esperar até … faz" / loops; the ifs keep CONTROLS_IF_MSG_THEN "então"
  WAIT_OR: 'ou espera até',
  LISTS_GET_INDEX_FROM_START: 'n.º',
  LISTS_GET_INDEX_FROM_END: 'n.º a contar do fim',
  VARIABLES_GET_TOOLTIP: 'Devolve o valor desta variável.',
  PROCEDURES_DEFNORETURN_TOOLTIP: 'Cria uma função que não devolve nada.',
  PROCEDURES_DEFRETURN_TOOLTIP: 'Cria uma função que devolve um valor.',
  PROCEDURES_CALLRETURN_TOOLTIP: 'Executa a função "%1" e usa o valor devolvido.',
  PROCEDURES_IFRETURN_TOOLTIP: 'Se a condição for verdadeira, devolve o segundo valor.',
};

// ── Tooltips (Open Roberta's mBot 2 blocks have none) ─────────────────────────
// The speed limit is said wherever a speed is typed; robotAPI warns at run time too.
const RPM = 'Velocidade das rodas em RPM (rotações por minuto), de −200 a 200; 200 RPM ≈ 68 cm/s.';
export const TOOLTIP_BY_TYPE = {
  robActions_motorDiff_on_for:   `Anda a direito uma distância (cm) e pára. ${RPM}`,
  robActions_motorDiff_on:       `Põe o robô a andar até outro bloco o parar ou mudar. ${RPM}`,
  robActions_motorDiff_turn_for: `Roda o robô no lugar um ângulo (°) e pára. ${RPM}`,
  robActions_motorDiff_turn:     `Põe o robô a rodar no lugar até outro bloco o parar. ${RPM}`,
  robActions_motorDiff_curve_for: `Anda em curva uma distância (cm), cada roda à sua velocidade, e pára. ${RPM}`,
  robActions_motorDiff_curve:    `Anda em curva, cada roda à sua velocidade, até outro bloco o parar. ${RPM}`,
  robActions_motor_on:           `Liga um motor (R = direito, L = esquerdo). ${RPM}`,
  robActions_motor_on_for:       `Roda um motor (R = direito, L = esquerdo) um número de voltas ou graus e pára. ${RPM}`,
};

// ── Toolbox category names ───────────────────────────────────────────────────
export const CATEGORY_TEXT = { TOOLBOX_ACTION: 'Ação' };

/** The option list with clearer text where DROPDOWN_TEXT has one. */
export function clarifyOptions(type, fieldName, options) {
  const a = DROPDOWN_TEXT[`${type}.${fieldName}`] || {};
  const b = DROPDOWN_TEXT[fieldName] || {};
  return options.map(([text, value]) => [a[value] ?? b[value] ?? text, value]);
}

/** A label's clearer text ('' hides it: the renderer skips blank labels). */
export function clarifyLabel(type, text) {
  if (typeof text !== 'string') return text;
  const own = LABEL_BY_TYPE[type];
  if (own && own[text] !== undefined) return own[text];
  return LABEL_TEXT[text] ?? text;
}

/** A block type's PT-PT tooltip, or undefined. */
export function clarifyTooltip(type) { return TOOLTIP_BY_TYPE[type]; }

export function clarifyMsg(key, text) {
  return MSG_TEXT[key] ?? text;
}

export function clarifyCategory(key, text) {
  return CATEGORY_TEXT[key] ?? text;
}
