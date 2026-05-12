import * as Blockly from 'blockly';

// Cast blocks and list blocks share this file.
// Cast colours: math casts use '230' (math blue), text casts use '160' (teal).
// List colour: '260' (purple).

export function registerListBlocks() {

  // ── Cast: Number → String ───────────────────────────────────────────────────

  Blockly.Blocks['math_cast_toString'] = {
    init() {
      this.appendDummyInput().appendField('converter');
      this.appendValueInput('NUM').setCheck('Number');
      this.appendDummyInput().appendField('em texto');
      this.setInputsInline(true);
      this.setOutput(true, 'String');
      this.setColour('230');
      this.setTooltip('Converter um número em texto.');
      this.setHelpUrl('');
    },
  };

  Blockly.Blocks['math_cast_toChar'] = {
    init() {
      this.appendDummyInput().appendField('converter');
      this.appendValueInput('NUM').setCheck('Number');
      this.appendDummyInput().appendField('em caractere');
      this.setInputsInline(true);
      this.setOutput(true, 'String');
      this.setColour('230');
      this.setTooltip('Converter um número no caractere Unicode correspondente.');
      this.setHelpUrl('');
    },
  };

  // ── Cast: String → Number ───────────────────────────────────────────────────

  Blockly.Blocks['text_cast_string_toNumber'] = {
    init() {
      this.appendDummyInput().appendField('converter');
      this.appendValueInput('TEXT').setCheck('String');
      this.appendDummyInput().appendField('em número');
      this.setInputsInline(true);
      this.setOutput(true, 'Number');
      this.setColour('160');
      this.setTooltip('Converter texto em número.');
      this.setHelpUrl('');
    },
  };

  Blockly.Blocks['text_cast_char_toNumber'] = {
    init() {
      this.appendDummyInput().appendField('converter caractere');
      this.appendValueInput('CHAR').setCheck('String');
      this.appendDummyInput().appendField('em número');
      this.setInputsInline(true);
      this.setOutput(true, 'Number');
      this.setColour('160');
      this.setTooltip('Converter um caractere no seu código Unicode numérico.');
      this.setHelpUrl('');
    },
  };

  // ── Lists ───────────────────────────────────────────────────────────────────

  // Fixed 3-slot form; also serves the empty (0-item) toolbox entry because
  // the inputs are simply unconnected in that case.
  Blockly.Blocks['robLists_create_with'] = {
    init() {
      this.appendDummyInput().appendField('criar lista com');
      this.appendValueInput('ADD0');
      this.appendValueInput('ADD1');
      this.appendValueInput('ADD2');
      this.setInputsInline(true);
      this.setOutput(true, 'Array');
      this.setColour('260');
      this.setTooltip('Criar uma lista com os itens fornecidos.');
      this.setHelpUrl('');
      // TODO Phase 4 / future: mutator support for variable number of items
    },
  };

  Blockly.Blocks['robLists_repeat'] = {
    init() {
      this.appendDummyInput().appendField('criar lista com item');
      this.appendValueInput('ITEM');
      this.appendDummyInput().appendField('repetido');
      this.appendValueInput('NUM').setCheck('Number');
      this.appendDummyInput().appendField('vezes');
      this.setInputsInline(true);
      this.setOutput(true, 'Array');
      this.setColour('260');
      this.setTooltip('Criar uma lista com um item repetido um número de vezes.');
      this.setHelpUrl('');
    },
  };

  Blockly.Blocks['robLists_length'] = {
    init() {
      this.appendDummyInput().appendField('comprimento de');
      this.appendValueInput('VALUE').setCheck('Array');
      this.setInputsInline(true);
      this.setOutput(true, 'Number');
      this.setColour('260');
      this.setTooltip('Obter o número de itens numa lista.');
      this.setHelpUrl('');
    },
  };

  Blockly.Blocks['robLists_isEmpty'] = {
    init() {
      this.appendValueInput('VALUE').setCheck('Array');
      this.appendDummyInput().appendField('está vazia');
      this.setInputsInline(true);
      this.setOutput(true, 'Boolean');
      this.setColour('260');
      this.setTooltip('Verificar se uma lista está vazia.');
      this.setHelpUrl('');
    },
  };

  Blockly.Blocks['robLists_indexOf'] = {
    init() {
      this.appendDummyInput().appendField('na lista');
      this.appendValueInput('VALUE').setCheck('Array');
      this.appendDummyInput().appendField('encontrar primeira ocorrência de');
      this.appendValueInput('FIND');
      this.setInputsInline(true);
      this.setOutput(true, 'Number');
      this.setColour('260');
      this.setTooltip('Encontrar a posição de um item numa lista (−1 se não encontrado).');
      this.setHelpUrl('');
    },
  };

  const WHERE_OPTIONS = [
    ['primeiro',   'FIRST'],
    ['último',     'LAST'],
    ['#',          'FROM_START'],
    ['# do fim',   'FROM_END'],
    ['aleatório',  'RANDOM'],
  ];

  Blockly.Blocks['robLists_getIndex'] = {
    init() {
      this.appendDummyInput().appendField('obter');
      this.appendDummyInput()
        .appendField(new Blockly.FieldDropdown(WHERE_OPTIONS), 'WHERE');
      this.appendDummyInput().appendField('da lista');
      this.appendValueInput('VALUE').setCheck('Array');
      this.appendDummyInput().appendField('em');
      this.appendValueInput('AT').setCheck('Number');
      this.setInputsInline(true);
      this.setOutput(true, null);
      this.setColour('260');
      this.setTooltip('Obter um item de uma lista pela posição.');
      this.setHelpUrl('');
    },
  };

  Blockly.Blocks['robLists_setIndex'] = {
    init() {
      this.appendDummyInput().appendField('na lista');
      this.appendValueInput('VALUE').setCheck('Array');
      this.appendDummyInput()
        .appendField('definir')
        .appendField(new Blockly.FieldDropdown(WHERE_OPTIONS), 'WHERE')
        .appendField('em');
      this.appendValueInput('AT').setCheck('Number');
      this.appendDummyInput().appendField('para');
      this.appendValueInput('TO');
      this.setInputsInline(true);
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour('260');
      this.setTooltip('Definir o valor de um item de uma lista pela posição.');
      this.setHelpUrl('');
    },
  };

  const SUBLIST_WHERE_OPTIONS = [
    ['primeiro',   'FIRST_FROM_START'],
    ['#',          'FROM_START'],
    ['# do fim',   'FROM_END'],
    ['último',     'LAST'],
  ];

  Blockly.Blocks['robLists_getSublist'] = {
    init() {
      this.appendDummyInput().appendField('obter sublista de');
      this.appendValueInput('VALUE').setCheck('Array');
      this.appendDummyInput()
        .appendField('de')
        .appendField(new Blockly.FieldDropdown(SUBLIST_WHERE_OPTIONS), 'WHERE1');
      this.appendValueInput('AT1').setCheck('Number');
      this.appendDummyInput()
        .appendField('a')
        .appendField(new Blockly.FieldDropdown(SUBLIST_WHERE_OPTIONS), 'WHERE2');
      this.appendValueInput('AT2').setCheck('Number');
      this.setInputsInline(true);
      this.setOutput(true, 'Array');
      this.setColour('260');
      this.setTooltip('Obter uma sublista de uma lista, entre duas posições.');
      this.setHelpUrl('');
    },
  };
}
