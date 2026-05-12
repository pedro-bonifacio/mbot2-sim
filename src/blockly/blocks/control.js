import * as Blockly from 'blockly';
import { loops } from 'blockly/blocks';

// Register robControls_loopForever as a loop type so that controls_flow_statements
// (break/continue) does not show a "must be inside a loop" warning when nested here.
loops.loopTypes.add('robControls_loopForever');

export function registerControlBlocks() {

  // ── Decision ────────────────────────────────────────────────────────────────

  Blockly.Blocks['robControls_if'] = {
    init() {
      this.appendValueInput('IF0').setCheck('Boolean').appendField('se');
      this.appendStatementInput('DO0').appendField('então fazer');
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour('120');
      this.setTooltip('Executar ações se uma condição for verdadeira.');
      this.setHelpUrl('');
    },
  };

  Blockly.Blocks['robControls_ifElse'] = {
    init() {
      this.appendValueInput('IF0').setCheck('Boolean').appendField('se');
      this.appendStatementInput('DO0').appendField('então fazer');
      this.appendStatementInput('ELSE').appendField('senão');
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour('120');
      this.setTooltip('Executar ações se uma condição for verdadeira, senão executar outras.');
      this.setHelpUrl('');
    },
  };

  // ── Loop ────────────────────────────────────────────────────────────────────

  Blockly.Blocks['robControls_loopForever'] = {
    init() {
      this.appendStatementInput('DO').appendField('repetir para sempre fazer');
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour('120');
      this.setTooltip('Repetir as ações indefinidamente.');
      this.setHelpUrl('');
    },
  };

  Blockly.Blocks['robControls_for'] = {
    init() {
      this.appendDummyInput()
        .appendField('contar com')
        .appendField(new Blockly.FieldVariable('i'), 'VAR')
        .appendField('de');
      this.appendValueInput('FROM').setCheck('Number');
      this.appendDummyInput().appendField('até');
      this.appendValueInput('TO').setCheck('Number');
      this.appendDummyInput().appendField('em incrementos de');
      this.appendValueInput('BY').setCheck('Number');
      this.appendStatementInput('DO').appendField('fazer');
      this.setInputsInline(true);
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour('120');
      this.setTooltip('Contar com uma variável de um valor até outro, em incrementos.');
      this.setHelpUrl('');
    },
  };

  Blockly.Blocks['robControls_forEach'] = {
    init() {
      this.appendDummyInput()
        .appendField('para cada item')
        .appendField(new Blockly.FieldVariable('i'), 'VAR')
        .appendField('na lista');
      this.appendValueInput('LIST').setCheck('Array');
      this.appendStatementInput('DO').appendField('fazer');
      this.setInputsInline(true);
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour('120');
      this.setTooltip('Iterar sobre cada item de uma lista.');
      this.setHelpUrl('');
    },
  };

  // ── Wait ────────────────────────────────────────────────────────────────────

  Blockly.Blocks['robControls_wait'] = {
    init() {
      this.appendDummyInput().appendField('esperar');
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour('120');
      this.setTooltip('Ceder o controlo ao simulador por um ciclo.');
      this.setHelpUrl('');
    },
  };

  Blockly.Blocks['robControls_wait_time'] = {
    init() {
      this.appendDummyInput().appendField('esperar');
      this.appendValueInput('WAIT').setCheck('Number');
      this.appendDummyInput().appendField('ms');
      this.setInputsInline(true);
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour('120');
      this.setTooltip('Esperar um determinado número de milissegundos.');
      this.setHelpUrl('');
    },
  };

  Blockly.Blocks['robControls_wait_for'] = {
    init() {
      this.appendDummyInput().appendField('esperar até');
      this.appendValueInput('WAIT0').setCheck('Boolean');
      this.setInputsInline(true);
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour('120');
      this.setTooltip('Esperar até uma condição ser verdadeira.');
      this.setHelpUrl('');
      // TODO Phase 4 / future: mutator support for multi-condition wait_for
    },
  };

  // ── Custom Math ─────────────────────────────────────────────────────────────

  Blockly.Blocks['robMath_change'] = {
    init() {
      this.appendDummyInput()
        .appendField('aumentar')
        .appendField(new Blockly.FieldVariable('i'), 'VAR')
        .appendField('em');
      this.appendValueInput('DELTA').setCheck('Number');
      this.setInputsInline(true);
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour('230');
      this.setTooltip('Incrementar o valor de uma variável.');
      this.setHelpUrl('');
    },
  };

  // ── Custom Text ─────────────────────────────────────────────────────────────

  Blockly.Blocks['robText_join'] = {
    init() {
      this.appendDummyInput().appendField('juntar');
      this.appendValueInput('ADD0');
      this.appendValueInput('ADD1');
      this.setInputsInline(true);
      this.setOutput(true, 'String');
      this.setColour('160');
      this.setTooltip('Juntar dois textos num só.');
      this.setHelpUrl('');
      // TODO Phase 4 / future: mutator support for more than 2 inputs
    },
  };

  Blockly.Blocks['robText_append'] = {
    init() {
      this.appendDummyInput().appendField('acrescentar texto');
      this.appendValueInput('TEXT').setCheck('String');
      this.appendDummyInput()
        .appendField('à variável')
        .appendField(new Blockly.FieldVariable('texto'), 'VAR');
      this.setInputsInline(true);
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour('160');
      this.setTooltip('Acrescentar texto a uma variável de texto.');
      this.setHelpUrl('');
    },
  };

  // ── Comment ─────────────────────────────────────────────────────────────────

  Blockly.Blocks['text_comment'] = {
    init() {
      // FieldMultilineInput is not available in Blockly 11; using FieldTextInput (single-line)
      this.appendDummyInput()
        .appendField('//')
        .appendField(new Blockly.FieldTextInput(''), 'COMMENT');
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour('290');
      this.setTooltip('Comentário — não executado.');
      this.setHelpUrl('');
    },
  };
}
