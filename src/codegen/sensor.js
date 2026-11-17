import { javascriptGenerator, Order } from 'blockly/javascript';

// Codegen for TOOLBOX_SENSOR blocks. Field values are Open Roberta's (ports U, Q,
// R/L, A/B; probes L1, L2, R1, R2; axes X/Y/Z; timers 1–5).
// Semantics: reference_openroberta/live/or-mbot2-semantics.json.

const f = (block, name) => JSON.stringify(block.getFieldValue(name));
const call = (code) => [code, Order.FUNCTION_CALL];

// Shared by the dedicated sensor blocks and the generic robSensors_getSample.
// mode/port/slot are JS string literals.
function sensorCall(kind, mode, port, slot) {
  switch (kind) {
    case 'ULTRASONIC':    return `robotAPI.ultrasonic()`;
    case 'QUADRGB':       return `robotAPI.quadrgb(${mode}, ${slot})`;
    case 'LINE':          return `robotAPI.line()`;
    case 'SOUND':         return `robotAPI.sound()`;
    case 'JOYSTICK':      return `robotAPI.joystick(${slot})`;
    case 'KEY':           return `robotAPI.key(${port})`;
    case 'LIGHT':         return `robotAPI.light()`;
    case 'GYRO':          return `robotAPI.gyro(${slot})`;
    case 'ACCELEROMETER': return `robotAPI.accel(${slot})`;
    case 'TIMER':         return `robotAPI.timer(${port})`;
    case 'ENCODER':       return `robotAPI.encoder(${port}, ${mode})`;
    default: throw new Error('unknown sensor kind ' + kind);
  }
}

export function registerSensorCodegen() {
  const G = javascriptGenerator.forBlock;

  G['robSensors_ultrasonic_getSample'] = () => call(sensorCall('ULTRASONIC'));
  G['robSensors_quadrgb_getSample'] = (b) => call(sensorCall('QUADRGB', f(b, 'MODE'), null, f(b, 'SLOT')));
  G['robSensors_line_getSample'] = () => call(sensorCall('LINE'));
  G['robSensors_sound_getSample'] = () => call(sensorCall('SOUND'));
  G['robSensors_sound_record'] = (b) => `robotAPI.sound_record(${f(b, 'MODE')});\n`;
  G['robSensors_joystickKeys_getSample'] = (b) => call(sensorCall('JOYSTICK', null, null, f(b, 'SLOT')));
  G['robSensors_key_getSample'] = (b) => call(sensorCall('KEY', null, f(b, 'SENSORPORT')));
  G['robSensors_light_getSample'] = () => call(sensorCall('LIGHT'));
  G['robSensors_gyro_getSample'] = (b) => call(sensorCall('GYRO', null, null, f(b, 'SLOT')));
  G['robSensors_gyro_reset_axis'] = (b) => `robotAPI.gyro_reset(${f(b, 'SLOT')});\n`;
  G['robSensors_accelerometer_getSample'] = (b) => call(sensorCall('ACCELEROMETER', null, null, f(b, 'SLOT')));
  G['robSensors_timer_getSample'] = (b) => call(sensorCall('TIMER', null, f(b, 'SENSORPORT')));
  G['robSensors_timer_reset'] = (b) => `robotAPI.timer_reset(${f(b, 'SENSORPORT')});\n`;
  G['robSensors_encoder_getSample'] = (b) => call(sensorCall('ENCODER', f(b, 'MODE'), f(b, 'SENSORPORT')));
  G['robSensors_encoder_reset'] = (b) => `robotAPI.encoder_reset(${f(b, 'SENSORPORT')});\n`;

  // Generic sensor block (inside "espera até"): SENSORTYPE = <KIND>_<MODE>.
  G['robSensors_getSample'] = (b) => {
    const type = b.getFieldValue('SENSORTYPE');
    const [kind, mode] = type.split(/_(.+)/);
    const port = b.getField('SENSORPORT') ? f(b, 'SENSORPORT') : 'null';
    const slot = b.getField('SLOT') ? f(b, 'SLOT') : 'null';
    const k = kind === 'QUADRGB' && mode === 'LINE' ? 'LINE' : kind;
    return call(sensorCall(k, JSON.stringify(mode), port, slot));
  };
}
