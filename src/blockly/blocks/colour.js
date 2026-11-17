import { defineOrBlocks } from './_orFactory.js';

// TOOLBOX_COLOUR (Cores). robColour_picker uses a colour field (as in Open Roberta);
// the toolbox offers the 9 preset colours as separate picker blocks.
export const COLOUR_TYPES = ['robColour_picker', 'naoColour_rgb'];

export function registerColourBlocks() {
  defineOrBlocks(COLOUR_TYPES);
}
