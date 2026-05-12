import * as Blockly from 'blockly';

export function registerSensorBlocks() {

  // ── Distance / Vision ──────────────────────────────────────────────────

  Blockly.Blocks['robSensors_ultrasonic_getSample'] = {
    init() {
      this.appendDummyInput()
        .appendField('valor do sensor ultrassónico')
        .appendField(new Blockly.FieldDropdown([
          ['1', '1'],
        ]), 'SENSORPORT')
        .appendField('em cm');
      this.setOutput(true, 'Number');
      this.setColour('200');
      this.setTooltip('Lê a distância em cm do sensor ultrassónico (0–300 cm; 300 = sem eco).');
      this.setHelpUrl('');
    },
  };

  Blockly.Blocks['robSensors_quadrgb_getSample'] = {
    init() {
      this.appendDummyInput()
        .appendField('valor do sensor RGB')
        .appendField(new Blockly.FieldDropdown([
          ['1', '1'],
        ]), 'SENSORPORT')
        .appendField('sonda')
        .appendField(new Blockly.FieldDropdown([
          ['1', '1'],
          ['2', '2'],
          ['3', '3'],
          ['4', '4'],
        ]), 'SLOT')
        .appendField(new Blockly.FieldDropdown([
          ['cor',       'COLOUR'],
          ['claridade', 'LIGHT'],
          ['RGB',       'RGB'],
        ]), 'MODE');
      this.setOutput(true, null);
      this.setColour('200');
      this.setTooltip('Lê uma sonda (1–4) do sensor Quad RGB. Devolve nome da cor (COLOUR), brilho 0–100 (LIGHT) ou lista [R,G,B] (RGB).');
      this.setHelpUrl('');
    },
  };

  // ── Onboard sensors ────────────────────────────────────────────────────

  Blockly.Blocks['robSensors_sound_getSample'] = {
    init() {
      this.appendDummyInput()
        .appendField('valor do microfone em %');
      this.setOutput(true, 'Number');
      this.setColour('200');
      this.setTooltip('Lê o nível de som do microfone integrado (0–100%).');
      this.setHelpUrl('');
    },
  };

  Blockly.Blocks['robSensors_sound_record'] = {
    init() {
      this.appendDummyInput()
        .appendField('gravar som')
        .appendField(new Blockly.FieldDropdown([
          ['iniciar', 'START'],
          ['parar',   'STOP'],
        ]), 'CMD')
        .appendField('durante');
      this.appendValueInput('DURATION').setCheck('Number');
      this.appendDummyInput().appendField('s');
      this.setInputsInline(true);
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour('200');
      this.setTooltip('Iniciar ou parar a gravação de som durante um tempo em segundos.');
      this.setHelpUrl('');
    },
  };

  Blockly.Blocks['robSensors_joystickKeys_getSample'] = {
    init() {
      this.appendDummyInput()
        .appendField('valor do joystick direção')
        .appendField(new Blockly.FieldDropdown([
          ['cima',     'UP'],
          ['baixo',    'DOWN'],
          ['esquerda', 'LEFT'],
          ['direita',  'RIGHT'],
          ['centro',   'MIDDLE'],
        ]), 'DIRECTION');
      this.setOutput(true, 'Boolean');
      this.setColour('200');
      this.setTooltip('Verifica se o joystick está pressionado na direção indicada.');
      this.setHelpUrl('');
    },
  };

  Blockly.Blocks['robSensors_key_getSample'] = {
    init() {
      this.appendDummyInput()
        .appendField('tecla')
        .appendField(new Blockly.FieldDropdown([
          ['A', 'A'],
          ['B', 'B'],
        ]), 'KEY')
        .appendField('pressionada');
      this.setOutput(true, 'Boolean');
      this.setColour('200');
      this.setTooltip('Verifica se o botão A ou B está pressionado.');
      this.setHelpUrl('');
    },
  };

  Blockly.Blocks['robSensors_light_getSample'] = {
    init() {
      this.appendDummyInput()
        .appendField('valor do sensor de luz em %');
      this.setOutput(true, 'Number');
      this.setColour('200');
      this.setTooltip('Lê o sensor de luz integrado (0–100%).');
      this.setHelpUrl('');
    },
  };

  // ⚠ Field name SLOT (measurement type) could not be verified from XML — Open Roberta may use MODE instead.
  Blockly.Blocks['robSensors_gyro_getSample'] = {
    init() {
      this.appendDummyInput()
        .appendField('giroscópio')
        .appendField(new Blockly.FieldDropdown([
          ['ângulo',     'ANGLE'],
          ['velocidade', 'RATE'],
        ]), 'SLOT')
        .appendField(new Blockly.FieldDropdown([
          ['x', 'X'],
          ['y', 'Y'],
          ['z', 'Z'],
        ]), 'AXIS');
      this.setOutput(true, 'Number');
      this.setColour('200');
      this.setTooltip('Lê o giroscópio: ângulo (graus) ou velocidade angular (graus/s) num eixo.');
      this.setHelpUrl('');
    },
  };

  Blockly.Blocks['robSensors_gyro_reset_axis'] = {
    init() {
      this.appendDummyInput()
        .appendField('repor giroscópio')
        .appendField(new Blockly.FieldDropdown([
          ['todos', 'ALL'],
          ['x',     'X'],
          ['y',     'Y'],
          ['z',     'Z'],
        ]), 'AXIS');
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour('200');
      this.setTooltip('Repor o giroscópio no eixo selecionado.');
      this.setHelpUrl('');
    },
  };

  Blockly.Blocks['robSensors_accelerometer_getSample'] = {
    init() {
      this.appendDummyInput()
        .appendField('acelerómetro')
        .appendField(new Blockly.FieldDropdown([
          ['x', 'X'],
          ['y', 'Y'],
          ['z', 'Z'],
        ]), 'AXIS');
      this.setOutput(true, 'Number');
      this.setColour('200');
      this.setTooltip('Lê o acelerómetro num eixo.');
      this.setHelpUrl('');
    },
  };

  // ── Time / Encoder ─────────────────────────────────────────────────────

  Blockly.Blocks['robSensors_timer_getSample'] = {
    init() {
      this.appendDummyInput()
        .appendField('temporizador')
        .appendField(new Blockly.FieldDropdown([
          ['1', '1'],
          ['2', '2'],
        ]), 'SENSORPORT');
      this.setOutput(true, 'Number');
      this.setColour('200');
      this.setTooltip('Lê o tempo decorrido do temporizador em ms.');
      this.setHelpUrl('');
    },
  };

  Blockly.Blocks['robSensors_timer_reset'] = {
    init() {
      this.appendDummyInput()
        .appendField('repor temporizador')
        .appendField(new Blockly.FieldDropdown([
          ['1', '1'],
          ['2', '2'],
        ]), 'SENSORPORT');
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour('200');
      this.setTooltip('Repor o temporizador selecionado para zero.');
      this.setHelpUrl('');
    },
  };

  // ⚠ MODE codes (ROTATION/DEGREE/DISTANCE) could not be verified from XML.
  Blockly.Blocks['robSensors_encoder_getSample'] = {
    init() {
      this.appendDummyInput()
        .appendField('codificador motor')
        .appendField(new Blockly.FieldDropdown([
          ['EM1', 'EM1'],
          ['EM2', 'EM2'],
        ]), 'MOTORPORT')
        .appendField(new Blockly.FieldDropdown([
          ['rotações',  'ROTATION'],
          ['graus',     'DEGREE'],
          ['distância', 'DISTANCE'],
        ]), 'MODE');
      this.setOutput(true, 'Number');
      this.setColour('200');
      this.setTooltip('Lê o codificador do motor: rotações, graus ou distância em cm.');
      this.setHelpUrl('');
    },
  };

  Blockly.Blocks['robSensors_encoder_reset'] = {
    init() {
      this.appendDummyInput()
        .appendField('repor codificador')
        .appendField(new Blockly.FieldDropdown([
          ['EM1', 'EM1'],
          ['EM2', 'EM2'],
        ]), 'MOTORPORT');
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour('200');
      this.setTooltip('Repor o codificador do motor para zero.');
      this.setHelpUrl('');
    },
  };

  // ── Line follower ──────────────────────────────────────────────────────

  // ⚠ MODE codes (L/R/ALL/CODE) could not be verified from XML.
  Blockly.Blocks['robSensors_line_getSample'] = {
    init() {
      this.appendDummyInput()
        .appendField('sensor de linha')
        .appendField(new Blockly.FieldDropdown([
          ['1', '1'],
        ]), 'SENSORPORT')
        .appendField(new Blockly.FieldDropdown([
          ['esquerda', 'L'],
          ['direita',  'R'],
          ['ambos',    'ALL'],
          ['código',   'CODE'],
        ]), 'MODE');
      this.setOutput(true, null);
      this.setColour('200');
      this.setTooltip('Lê o sensor de linha: esquerda/direita/ambos (booleano) ou código numérico.');
      this.setHelpUrl('');
    },
  };

  // ── Generic dispatcher ─────────────────────────────────────────────────

  Blockly.Blocks['robSensors_getSample'] = {
    init() {
      // TODO Phase 4: dynamic field reconstruction based on SENSORTYPE
      this.appendDummyInput()
        .appendField('obter valor de')
        .appendField(new Blockly.FieldDropdown([
          ['ultrassónico', 'ULTRASONIC'],
          ['RGB',          'QUADRGB'],
          ['tecla',        'KEY'],
          ['joystick',     'JOYSTICK'],
          ['luz',          'LIGHT'],
          ['giroscópio',   'GYRO'],
          ['acelerómetro', 'ACCEL'],
          ['temporizador', 'TIMER'],
          ['codificador',  'ENCODER'],
          ['linha',        'LINE'],
          ['som',          'SOUND'],
        ]), 'SENSORTYPE')
        .appendField(new Blockly.FieldDropdown([
          ['valor',      'VALUE'],
          ['cor',        'COLOR'],
          ['linha',      'LINE'],
          ['ângulo',     'ANGLE'],
          ['velocidade', 'RATE'],
          ['estado',     'STA'],
          ['RGB',        'RGB'],
          ['claridade',  'BRIGHTNESS'],
        ]), 'SENSORMODE');
      this.setOutput(true, null);
      this.setColour('200');
      this.setTooltip('Bloco genérico — usar dentro de bloco esperar.');
      this.setHelpUrl('');
    },
  };
}
