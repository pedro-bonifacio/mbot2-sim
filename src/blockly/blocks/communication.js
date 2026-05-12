import * as Blockly from 'blockly';

export function registerCommunicationBlocks() {

  // ── Send message on local pub/sub bus ──────────────────────────────────
  // CLAUDE.md rule 6: multi-robot comm is out of scope; stub as local event bus.
  // Input names CHANNEL/MESSAGE confirmed in XML (program.toolbox.expert.xml).
  Blockly.Blocks['communication_send_message'] = {
    init() {
      this.appendDummyInput().appendField('enviar mensagem no canal');
      this.appendValueInput('CHANNEL').setCheck('String');
      this.appendDummyInput().appendField('com valor');
      this.appendValueInput('MESSAGE');
      this.setInputsInline(true);
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour('0');
      this.setTooltip('Envia uma mensagem no canal indicado. (Localmente simulado num único robô.)');
      this.setHelpUrl('');
    },
  };

  // ── Receive (read latest) message from channel ─────────────────────────
  // Output null (any type) — channel may carry numbers, strings, or booleans.
  Blockly.Blocks['communication_receive_message'] = {
    init() {
      this.appendValueInput('CHANNEL').appendField('receber mensagem do canal').setCheck('String');
      this.setInputsInline(true);
      this.setOutput(true, null);
      this.setColour('0');
      this.setTooltip('Recebe a última mensagem do canal indicado, ou nada se não houver. Devolve qualquer tipo.');
      this.setHelpUrl('');
    },
  };
}
