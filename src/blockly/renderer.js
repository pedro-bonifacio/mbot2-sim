import * as Blockly from 'blockly';

// Blockly's renderer measures every field of an input, visible or not, and puts
// spacing around each one. Open Roberta blocks carry hidden fields (ports such as
// ACTORPORT "_D", MODE "PRESSED") and empty labels (a sensor's UNIT in some modes),
// so their text showed stray gaps: "mover   para", "joystick    acima". This renderer
// is Geras without those: hidden fields and blank labels are left out of the layout,
// and neighbouring labels get a word-sized gap.

const blank = (f) => !f.isVisible() || (f instanceof Blockly.FieldLabel && !f.EDITABLE && String(f.getText()).trim() === '');

class RobRenderInfo extends Blockly.geras.RenderInfo {
  createRows_() {
    super.createRows_();
    for (const row of this.rows) {
      row.elements = row.elements.filter((e) => !(e.field && blank(e.field)));
    }
  }

  // Two plain words in a row ("mover para", "cm do ultrassom") get Geras's wide
  // field gap (10 px); give them the same small gap as text next to a dropdown, so a
  // block reads as one sentence.
  getInRowSpacing_(prev, next) {
    if (prev && next && prev.field && next.field && !prev.field.EDITABLE && !next.field.EDITABLE) return LABEL_GAP;
    return super.getInRowSpacing_(prev, next);
  }
}

const LABEL_GAP = 5;

class RobRenderer extends Blockly.geras.Renderer {
  makeRenderInfo_(block) {
    return new RobRenderInfo(this, block);
  }
}

export const RENDERER = 'rob-geras';
let registered = false;
export function registerRenderer() {
  if (registered) return;
  Blockly.blockRendering.register(RENDERER, RobRenderer);
  registered = true;
}
