import * as Blockly from 'blockly';

export function registerColourBlocks() {

  // ── Named-colour picker (9-swatch palette) ─────────────────────────────
  // Field COLOUR stores hex strings matching the toolbox presets exactly.
  // XML source: reference_openroberta/program.toolbox.expert.xml (TOOLBOX_COLOUR).
  // Sensor palette order: red, orange, yellow, green, cyan, blue, purple, white, black.
  Blockly.Blocks['robColour_picker'] = {
    init() {
      this.appendDummyInput()
        .appendField(new Blockly.FieldDropdown([
          ['vermelho', '#cc0000'],
          ['laranja',  '#ff6600'],
          ['amarelo',  '#ffff00'],
          ['verde',    '#33cc00'],
          ['ciano',    '#33ffff'],
          ['azul',     '#3366ff'],
          ['magenta',  '#cc33cc'],
          ['branco',   '#FFFFFF'],
          ['preto',    '#000000'],
        ]), 'COLOUR');
      this.setOutput(true, 'Colour');
      this.setColour('20');
      this.setTooltip('Cor predefinida.');
      this.setHelpUrl('');
    },
  };

  // ── RGB colour constructor (expert toolbox only) ────────────────────────
  // Input names RED/GREEN/BLUE from XML: <value name="RED">, etc.
  Blockly.Blocks['naoColour_rgb'] = {
    init() {
      this.appendValueInput('RED').appendField('cor com R').setCheck('Number');
      this.appendValueInput('GREEN').appendField('G').setCheck('Number');
      this.appendValueInput('BLUE').appendField('B').setCheck('Number');
      this.setInputsInline(true);
      this.setOutput(true, 'Colour');
      this.setColour('20');
      this.setTooltip('Construir cor a partir de componentes RGB (0-255).');
      this.setHelpUrl('');
    },
  };
}
