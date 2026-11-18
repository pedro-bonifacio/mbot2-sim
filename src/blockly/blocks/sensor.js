import * as Blockly from 'blockly';
import { defineOrBlocks, orSpec, initFromSpec, makeField } from './_orFactory.js';

// TOOLBOX_SENSOR (Sensores). Sensor blocks with a MODE dropdown get Open Roberta's
// <mutation mode="…"/> behaviour from the factory (output type + unit per mode).
export const SENSOR_TYPES = [
  'robSensors_ultrasonic_getSample', 'robSensors_quadrgb_getSample',
  'robSensors_sound_getSample', 'robSensors_sound_record',
  'robSensors_joystickKeys_getSample', 'robSensors_key_getSample',
  'robSensors_light_getSample',
  'robSensors_gyro_getSample', 'robSensors_gyro_reset_axis',
  'robSensors_accelerometer_getSample',
  'robSensors_timer_getSample', 'robSensors_timer_reset',
  'robSensors_encoder_getSample', 'robSensors_encoder_reset',
  'robSensors_line_getSample',
];

// robSensors_getSample — the generic sensor block used inside "espera até".
// Its SENSORTYPE dropdown swaps the port/slot fields and the output type.
// Serialised as <mutation input="SENSORTYPE"/> (Open Roberta format).
function defineGenericGetSample() {
  const spec = orSpec('robSensors_getSample');

  Blockly.Blocks['robSensors_getSample'] = {
    init() {
      const block = this;
      initFromSpec(this, spec, {
        SENSORTYPE(newValue) { block.updateSensorType_(newValue); return newValue; },
      });
      this.sensorType_ = this.getFieldValue('SENSORTYPE');
    },

    updateSensorType_(sensorType) {
      const variant = spec.sensorTypes[sensorType];
      if (!variant || sensorType === this.sensorType_) return;
      this.sensorType_ = sensorType;
      const row = this.getInput('ROW');
      // Drop everything after SENSORTYPE, then append the fields of the new type.
      for (const name of ['SENSORPORT', 'SLOT']) if (this.getField(name)) row.removeField(name);
      const fields = variant.inputs[0].fields;
      const start = fields.findIndex(f => f.name === 'SENSORTYPE') + 1;
      for (const f of fields.slice(start)) {
        const [field, name] = makeField(f, undefined, this.type);
        row.appendField(field, name);
        if (f.t === 'hidden') field.setVisible(false);
      }
      if (this.outputConnection) this.outputConnection.setCheck(variant.output);
    },

    mutationToDom() {
      const el = Blockly.utils.xml.createElement('mutation');
      el.setAttribute('input', this.sensorType_ || this.getFieldValue('SENSORTYPE'));
      return el;
    },
    domToMutation(el) {
      const t = el.getAttribute('input');
      if (t) { this.sensorType_ = null; this.updateSensorType_(t); }
    },
    saveExtraState() { return { input: this.sensorType_ }; },
    loadExtraState(state) {
      if (state && state.input) { this.sensorType_ = null; this.updateSensorType_(state.input); }
    },
  };
}

export function registerSensorBlocks() {
  defineOrBlocks(SENSOR_TYPES);
  defineGenericGetSample();
}
