import * as Blockly from 'blockly';

export function registerActionBlocks() {
  // ── Drive ──────────────────────────────────────────────────────────────

  Blockly.Blocks['robActions_motorDiff_on'] = {
    init() {
      this.appendDummyInput()
        .appendField('conduzir')
        .appendField(new Blockly.FieldDropdown([
          ['para a frente', 'FOREWARD'],
          ['para trás',     'BACKWARD'],
        ]), 'DIRECTION')
        .appendField('com velocidade');
      this.appendValueInput('POWER').setCheck('Number');
      this.appendDummyInput().appendField('%');
      this.setInputsInline(true);
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour('20');
      this.setTooltip('Conduzir o robô numa direção a uma velocidade.');
      this.setHelpUrl('');
    },
  };

  Blockly.Blocks['robActions_motorDiff_on_for'] = {
    init() {
      this.appendDummyInput()
        .appendField('conduzir')
        .appendField(new Blockly.FieldDropdown([
          ['para a frente', 'FOREWARD'],
          ['para trás',     'BACKWARD'],
        ]), 'DIRECTION')
        .appendField('com velocidade');
      this.appendValueInput('POWER').setCheck('Number');
      this.appendDummyInput().appendField('% por uma distância');
      this.appendValueInput('DISTANCE').setCheck('Number');
      this.appendDummyInput().appendField('cm');
      this.setInputsInline(true);
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour('20');
      this.setTooltip('Conduzir o robô numa direção a uma velocidade por uma distância.');
      this.setHelpUrl('');
    },
  };

  Blockly.Blocks['robActions_motorDiff_stop'] = {
    init() {
      this.appendDummyInput().appendField('parar de conduzir');
      this.setInputsInline(true);
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour('20');
      this.setTooltip('Parar os motores de condução.');
      this.setHelpUrl('');
    },
  };

  Blockly.Blocks['robActions_motorDiff_turn'] = {
    init() {
      this.appendDummyInput()
        .appendField('virar')
        .appendField(new Blockly.FieldDropdown([
          ['à esquerda', 'LEFT'],
          ['à direita',  'RIGHT'],
        ]), 'DIRECTION')
        .appendField('com velocidade');
      this.appendValueInput('POWER').setCheck('Number');
      this.appendDummyInput().appendField('%');
      this.setInputsInline(true);
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour('20');
      this.setTooltip('Virar o robô continuamente a uma velocidade.');
      this.setHelpUrl('');
    },
  };

  Blockly.Blocks['robActions_motorDiff_turn_for'] = {
    init() {
      this.appendDummyInput()
        .appendField('virar')
        .appendField(new Blockly.FieldDropdown([
          ['à esquerda', 'LEFT'],
          ['à direita',  'RIGHT'],
        ]), 'DIRECTION')
        .appendField('com velocidade');
      this.appendValueInput('POWER').setCheck('Number');
      this.appendDummyInput().appendField('% por');
      this.appendValueInput('DEGREE').setCheck('Number');
      this.appendDummyInput().appendField('°');
      this.setInputsInline(true);
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour('20');
      this.setTooltip('Virar o robô numa direção a uma velocidade por um ângulo.');
      this.setHelpUrl('');
    },
  };

  Blockly.Blocks['robActions_motorDiff_curve'] = {
    init() {
      this.appendDummyInput()
        .appendField('conduzir em curva')
        .appendField(new Blockly.FieldDropdown([
          ['para a frente', 'FOREWARD'],
          ['para trás',     'BACKWARD'],
        ]), 'DIRECTION')
        .appendField('velocidade esquerda');
      this.appendValueInput('POWER_LEFT').setCheck('Number');
      this.appendDummyInput().appendField('% velocidade direita');
      this.appendValueInput('POWER_RIGHT').setCheck('Number');
      this.appendDummyInput().appendField('%');
      this.setInputsInline(true);
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour('20');
      this.setTooltip('Conduzir o robô em curva com velocidades independentes para cada motor.');
      this.setHelpUrl('');
    },
  };

  Blockly.Blocks['robActions_motorDiff_curve_for'] = {
    init() {
      this.appendDummyInput()
        .appendField('conduzir em curva')
        .appendField(new Blockly.FieldDropdown([
          ['para a frente', 'FOREWARD'],
          ['para trás',     'BACKWARD'],
        ]), 'DIRECTION')
        .appendField('velocidade esquerda');
      this.appendValueInput('POWER_LEFT').setCheck('Number');
      this.appendDummyInput().appendField('% velocidade direita');
      this.appendValueInput('POWER_RIGHT').setCheck('Number');
      this.appendDummyInput().appendField('% por uma distância');
      this.appendValueInput('DISTANCE').setCheck('Number');
      this.appendDummyInput().appendField('cm');
      this.setInputsInline(true);
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour('20');
      this.setTooltip('Conduzir o robô em curva com velocidades independentes por uma distância.');
      this.setHelpUrl('');
    },
  };

  // ── Single motor ────────────────────────────────────────────────────────

  Blockly.Blocks['robActions_motor_on'] = {
    init() {
      this.appendDummyInput()
        .appendField('motor')
        .appendField(new Blockly.FieldDropdown([
          ['EM1', 'EM1'],
          ['EM2', 'EM2'],
        ]), 'MOTORPORT')
        .appendField('ligar com velocidade');
      this.appendValueInput('POWER').setCheck('Number');
      this.appendDummyInput().appendField('%');
      this.setInputsInline(true);
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour('20');
      this.setTooltip('Ligar um motor a uma velocidade.');
      this.setHelpUrl('');
    },
  };

  // Input is named VALUE (not ROTATIONS) — matches toolbox shadow definition.
  Blockly.Blocks['robActions_motor_on_for'] = {
    init() {
      this.appendDummyInput()
        .appendField('motor')
        .appendField(new Blockly.FieldDropdown([
          ['EM1', 'EM1'],
          ['EM2', 'EM2'],
        ]), 'MOTORPORT')
        .appendField('ligar com velocidade');
      this.appendValueInput('POWER').setCheck('Number');
      this.appendDummyInput().appendField('% por');
      this.appendValueInput('VALUE').setCheck('Number');
      this.appendDummyInput()
        .appendField(new Blockly.FieldDropdown([
          ['rotações', 'ROTATIONS'],
          ['graus',    'DEGREE'],
        ]), 'MOTORROTATION');
      this.setInputsInline(true);
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour('20');
      this.setTooltip('Ligar um motor a uma velocidade por um número de rotações ou graus.');
      this.setHelpUrl('');
    },
  };

  Blockly.Blocks['robActions_motor_stop'] = {
    init() {
      this.appendDummyInput()
        .appendField('motor')
        .appendField(new Blockly.FieldDropdown([
          ['EM1', 'EM1'],
          ['EM2', 'EM2'],
        ]), 'MOTORPORT')
        .appendField('parar');
      this.setInputsInline(true);
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour('20');
      this.setTooltip('Parar um motor.');
      this.setHelpUrl('');
    },
  };

  // ── Display ─────────────────────────────────────────────────────────────

  Blockly.Blocks['robActions_display_text'] = {
    init() {
      this.appendDummyInput().appendField('mostrar texto');
      this.appendValueInput('OUT');
      this.appendDummyInput().appendField('na coluna');
      this.appendValueInput('COL').setCheck('Number');
      this.appendDummyInput().appendField('na linha');
      this.appendValueInput('ROW').setCheck('Number');
      this.setInputsInline(true);
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour('20');
      this.setTooltip('Mostrar texto no ecrã numa posição específica.');
      this.setHelpUrl('');
    },
  };

  Blockly.Blocks['robActions_println'] = {
    init() {
      this.appendDummyInput().appendField('imprimir linha');
      this.appendValueInput('OUT');
      this.setInputsInline(true);
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour('20');
      this.setTooltip('Imprimir uma linha de texto no ecrã.');
      this.setHelpUrl('');
    },
  };

  // Input named COLOR (American spelling) — matches toolbox shadow definition.
  Blockly.Blocks['robActions_display_set_colour'] = {
    init() {
      this.appendDummyInput().appendField('definir cor do ecrã');
      this.appendValueInput('COLOR').setCheck('Colour');
      this.setInputsInline(true);
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour('20');
      this.setTooltip('Definir a cor de fundo do ecrã.');
      this.setHelpUrl('');
    },
  };

  Blockly.Blocks['robActions_display_clear'] = {
    init() {
      this.appendDummyInput().appendField('limpar ecrã');
      this.setInputsInline(true);
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour('20');
      this.setTooltip('Limpar o ecrã.');
      this.setHelpUrl('');
    },
  };

  Blockly.Blocks['robActions_serial_print'] = {
    init() {
      this.appendDummyInput().appendField('enviar para a consola');
      this.appendValueInput('OUT');
      this.setInputsInline(true);
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour('20');
      this.setTooltip('Enviar texto para a consola.');
      this.setHelpUrl('');
    },
  };

  // ── Sound ────────────────────────────────────────────────────────────────

  // Input name is FREQUENCE (not FREQUENCY) — matches toolbox shadow definition.
  Blockly.Blocks['mbedActions_play_tone'] = {
    init() {
      this.appendDummyInput().appendField('reproduzir tom frequência');
      this.appendValueInput('FREQUENCE').setCheck('Number');
      this.appendDummyInput().appendField('Hz duração');
      this.appendValueInput('DURATION').setCheck('Number');
      this.appendDummyInput().appendField('ms');
      this.setInputsInline(true);
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour('20');
      this.setTooltip('Reproduzir um tom a uma frequência durante um tempo.');
      this.setHelpUrl('');
    },
  };

  // ⚠ NOTE and DURATION internal values may need verification against Open Roberta source.
  Blockly.Blocks['mbedActions_play_note'] = {
    init() {
      this.appendDummyInput()
        .appendField('reproduzir nota')
        .appendField(new Blockly.FieldDropdown([
          ['Dó4',   'C4'],
          ['Ré4',   'D4'],
          ['Mi4',   'E4'],
          ['Fá4',   'F4'],
          ['Sol4',  'G4'],
          ['Lá4',   'A4'],
          ['Si4',   'B4'],
          ['Dó5',   'C5'],
          ['Ré5',   'D5'],
          ['Mi5',   'E5'],
          ['Fá5',   'F5'],
          ['Sol5',  'G5'],
          ['Lá5',   'A5'],
          ['Si5',   'B5'],
          ['Dó6',   'C6'],
          ['pausa', 'PAUSE'],
        ]), 'NOTE')
        .appendField('durante')
        .appendField(new Blockly.FieldDropdown([
          ['colcheia (1/8)',  '8'],
          ['semínima (1/4)', '4'],
          ['mínima (1/2)',   '2'],
          ['semibreve (1/1)','1'],
        ]), 'DURATION');
      this.setInputsInline(true);
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour('20');
      this.setTooltip('Reproduzir uma nota musical durante um tempo.');
      this.setHelpUrl('');
    },
  };

  Blockly.Blocks['robActions_play_setVolume'] = {
    init() {
      this.appendDummyInput().appendField('definir volume');
      this.appendValueInput('VOLUME').setCheck('Number');
      this.appendDummyInput().appendField('%');
      this.setInputsInline(true);
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour('20');
      this.setTooltip('Definir o volume do altifalante (0–100).');
      this.setHelpUrl('');
    },
  };

  Blockly.Blocks['robActions_play_getVolume'] = {
    init() {
      this.appendDummyInput().appendField('volume');
      this.setOutput(true, 'Number');
      this.setColour('20');
      this.setTooltip('Obter o volume atual do altifalante.');
      this.setHelpUrl('');
    },
  };

  // ⚠ Recording names are placeholder stubs — extend in Phase 6.
  Blockly.Blocks['robActions_play_recording'] = {
    init() {
      this.appendDummyInput()
        .appendField('reproduzir gravação')
        .appendField(new Blockly.FieldDropdown([
          ['hi',  'hi'],
          ['bye', 'bye'],
          ['yes', 'yes'],
          ['no',  'no'],
        ]), 'FILENAME');
      this.setInputsInline(true);
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour('20');
      this.setTooltip('Reproduzir uma gravação de áudio.');
      this.setHelpUrl('');
    },
  };

  // ── Light ────────────────────────────────────────────────────────────────

  // ⚠ LED dropdown options for mbot2 body LEDs — verify count against hardware spec.
  // Input named COLOUR (British spelling) — matches toolbox shadow definition.
  Blockly.Blocks['actions_rgbLed_hidden_on_mbot2'] = {
    init() {
      this.appendDummyInput()
        .appendField('LED')
        .appendField(new Blockly.FieldDropdown([
          ['todos', 'ALL'],
          ['1',     '1'],
          ['2',     '2'],
          ['3',     '3'],
          ['4',     '4'],
          ['5',     '5'],
        ]), 'LED')
        .appendField('ligar cor');
      this.appendValueInput('COLOUR').setCheck('Colour');
      this.setInputsInline(true);
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour('20');
      this.setTooltip('Ligar um LED RGB do robô com uma cor.');
      this.setHelpUrl('');
    },
  };

  // ⚠ LED dropdown options — same as actions_rgbLed_hidden_on_mbot2.
  Blockly.Blocks['actions_rgbLed_hidden_off_mbot2'] = {
    init() {
      this.appendDummyInput()
        .appendField('LED')
        .appendField(new Blockly.FieldDropdown([
          ['todos', 'ALL'],
          ['1',     '1'],
          ['2',     '2'],
          ['3',     '3'],
          ['4',     '4'],
          ['5',     '5'],
        ]), 'LED')
        .appendField('desligar');
      this.setInputsInline(true);
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour('20');
      this.setTooltip('Desligar um LED RGB do robô.');
      this.setHelpUrl('');
    },
  };

  Blockly.Blocks['robActions_led_setBrightness'] = {
    init() {
      this.appendDummyInput().appendField('definir brilho do LED');
      this.appendValueInput('BRIGHTNESS').setCheck('Number');
      this.appendDummyInput().appendField('%');
      this.setInputsInline(true);
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour('20');
      this.setTooltip('Definir o brilho dos LEDs RGB (0–100).');
      this.setHelpUrl('');
    },
  };

  // Toolbox shadow has single BRIGHTNESS input — simpler than 8-slot spec.
  // ⚠ LED dropdown options for ultrasonic sensor ring — verify count against hardware.
  Blockly.Blocks['robActions_ultrasonic2_led'] = {
    init() {
      this.appendDummyInput()
        .appendField('LED do ultrassónico')
        .appendField(new Blockly.FieldDropdown([
          ['todos', 'ALL'],
          ['1',     '1'],
          ['2',     '2'],
        ]), 'LED')
        .appendField('brilho');
      this.appendValueInput('BRIGHTNESS').setCheck('Number');
      this.appendDummyInput().appendField('%');
      this.setInputsInline(true);
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour('20');
      this.setTooltip('Definir o brilho do LED do sensor ultrassónico.');
      this.setHelpUrl('');
    },
  };

  // Input named COLOR (American spelling) — matches toolbox shadow definition.
  Blockly.Blocks['robActions_quadRGB_led_on'] = {
    init() {
      this.appendDummyInput().appendField('LED do sensor RGB ligar cor');
      this.appendValueInput('COLOR').setCheck('Colour');
      this.setInputsInline(true);
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour('20');
      this.setTooltip('Ligar o LED do sensor Quad RGB com uma cor.');
      this.setHelpUrl('');
    },
  };

  Blockly.Blocks['robActions_quadRGB_led_off'] = {
    init() {
      this.appendDummyInput().appendField('LED do sensor RGB desligar');
      this.setInputsInline(true);
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour('20');
      this.setTooltip('Desligar o LED do sensor Quad RGB.');
      this.setHelpUrl('');
    },
  };
}
