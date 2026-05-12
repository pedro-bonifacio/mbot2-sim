import { javascriptGenerator, Order } from 'blockly/javascript';

// Codegen for communication blocks.
// CLAUDE.md rule 6: multi-robot comm is out of scope.
// These blocks use a local pub/sub bus (single-robot sim only).

export function registerCommunicationCodegen() {

  // communication_send_message: push a message onto the channel's FIFO queue
  // Inputs: CHANNEL (String), MESSAGE (any)
  javascriptGenerator.forBlock['communication_send_message'] = function (block) {
    const channel = javascriptGenerator.valueToCode(block, 'CHANNEL', Order.NONE) || '""';
    const msg     = javascriptGenerator.valueToCode(block, 'MESSAGE', Order.NONE) || '""';
    return 'robotAPI.send_message(' + channel + ', ' + msg + ');\n';
  };

  // communication_receive_message: pop and return the oldest message on the channel (FIFO)
  // Returns '' if the channel is empty.
  // Input: CHANNEL (String)
  javascriptGenerator.forBlock['communication_receive_message'] = function (block) {
    const channel = javascriptGenerator.valueToCode(block, 'CHANNEL', Order.NONE) || '""';
    return ['robotAPI.receive_message(' + channel + ')', Order.FUNCTION_CALL];
  };
}
