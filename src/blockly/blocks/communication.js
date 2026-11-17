import { defineOrBlocks } from './_orFactory.js';

// TOOLBOX_COMMUNICATION (Mensagens). Single-robot sim: local loopback bus (CLAUDE.md §6).
export const COMMUNICATION_TYPES = ['communication_send_message', 'communication_receive_message'];

export function registerCommunicationBlocks() {
  defineOrBlocks(COMMUNICATION_TYPES);
}
