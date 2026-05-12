import { javascriptGenerator, Order } from 'blockly/javascript';

export function registerSensorCodegen() {

  // ── Ultrasonic ──────────────────────────────────────────────────────────────

  javascriptGenerator.forBlock['robSensors_ultrasonic_getSample'] = function (_block) {
    return [`robotAPI.ultrasonic()`, Order.FUNCTION_CALL];
  };

  // ── QuadRGB ─────────────────────────────────────────────────────────────────

  // SENSORPORT: which sensor ('1'), SLOT: probe 1..4, MODE: COLOUR|LIGHT|RGB
  javascriptGenerator.forBlock['robSensors_quadrgb_getSample'] = function (block) {
    const mode   = block.getFieldValue('MODE')       || 'COLOUR';
    const sensor = block.getFieldValue('SENSORPORT') || '1';
    const probe  = block.getFieldValue('SLOT')       || '1';
    return [`robotAPI.quadRGB(${JSON.stringify(mode)}, ${JSON.stringify(sensor)}, ${JSON.stringify(probe)})`, Order.FUNCTION_CALL];
  };

  // ── Line sensor ─────────────────────────────────────────────────────────────

  // ⚠ MODE codes (L/R/ALL/CODE) not verified from XML — chosen to match block def.
  javascriptGenerator.forBlock['robSensors_line_getSample'] = function (block) {
    const mode = block.getFieldValue('MODE');
    return [`robotAPI.line(${JSON.stringify(mode)})`, Order.FUNCTION_CALL];
  };

  // ── Sound / Microphone ──────────────────────────────────────────────────────

  javascriptGenerator.forBlock['robSensors_sound_getSample'] = function (_block) {
    return [`robotAPI.sound()`, Order.FUNCTION_CALL];
  };

  // Statement: start/stop sound recording
  javascriptGenerator.forBlock['robSensors_sound_record'] = function (block) {
    const cmd      = block.getFieldValue('CMD');
    const duration = javascriptGenerator.valueToCode(block, 'DURATION', Order.NONE) || '0';
    return `robotAPI.sound_record(${JSON.stringify(cmd)}, ${duration});\n`;
  };

  // ── Joystick / Keys ─────────────────────────────────────────────────────────

  // DIRECTION field: UP | DOWN | LEFT | RIGHT | MIDDLE
  javascriptGenerator.forBlock['robSensors_joystickKeys_getSample'] = function (block) {
    const dir = block.getFieldValue('DIRECTION');
    return [`robotAPI.joystick(${JSON.stringify(dir)})`, Order.FUNCTION_CALL];
  };

  // KEY field: A | B
  javascriptGenerator.forBlock['robSensors_key_getSample'] = function (block) {
    const key = block.getFieldValue('KEY');
    return [`robotAPI.key(${JSON.stringify(key)})`, Order.FUNCTION_CALL];
  };

  // ── Ambient light ───────────────────────────────────────────────────────────

  javascriptGenerator.forBlock['robSensors_light_getSample'] = function (_block) {
    return [`robotAPI.light()`, Order.FUNCTION_CALL];
  };

  // ── Gyroscope ───────────────────────────────────────────────────────────────

  // ⚠ SLOT field verified as ANGLE | RATE in block def (guessed — OR may use MODE).
  // AXIS field: X | Y | Z
  javascriptGenerator.forBlock['robSensors_gyro_getSample'] = function (block) {
    const slot = block.getFieldValue('SLOT'); // ANGLE or RATE
    const axis = block.getFieldValue('AXIS'); // X, Y, Z
    return [`robotAPI.gyro(${JSON.stringify(slot)}, ${JSON.stringify(axis)})`, Order.FUNCTION_CALL];
  };

  // Statement: reset gyro accumulator for an axis
  // AXIS field: ALL | X | Y | Z
  javascriptGenerator.forBlock['robSensors_gyro_reset_axis'] = function (block) {
    const axis = block.getFieldValue('AXIS');
    return `robotAPI.gyro_reset(${JSON.stringify(axis)});\n`;
  };

  // ── Accelerometer ───────────────────────────────────────────────────────────

  // AXIS field: X | Y | Z
  javascriptGenerator.forBlock['robSensors_accelerometer_getSample'] = function (block) {
    const axis = block.getFieldValue('AXIS');
    return [`robotAPI.accel(${JSON.stringify(axis)})`, Order.FUNCTION_CALL];
  };

  // ── Timer ───────────────────────────────────────────────────────────────────

  // SENSORPORT field: '1' | '2'
  javascriptGenerator.forBlock['robSensors_timer_getSample'] = function (block) {
    const slot = block.getFieldValue('SENSORPORT');
    return [`robotAPI.timer(${JSON.stringify(slot)})`, Order.FUNCTION_CALL];
  };

  // Statement: reset timer slot
  javascriptGenerator.forBlock['robSensors_timer_reset'] = function (block) {
    const slot = block.getFieldValue('SENSORPORT');
    return `robotAPI.timer_reset(${JSON.stringify(slot)});\n`;
  };

  // ── Encoder ─────────────────────────────────────────────────────────────────

  // ⚠ MODE codes (ROTATION/DEGREE/DISTANCE) not verified from XML — chosen to match block def.
  // MOTORPORT field: EM1 | EM2
  // MODE field: ROTATION | DEGREE | DISTANCE
  javascriptGenerator.forBlock['robSensors_encoder_getSample'] = function (block) {
    const port = block.getFieldValue('MOTORPORT');
    const mode = block.getFieldValue('MODE');
    return [`robotAPI.encoder(${JSON.stringify(port)}, ${JSON.stringify(mode)})`, Order.FUNCTION_CALL];
  };

  // Statement: zero encoder for a motor port
  javascriptGenerator.forBlock['robSensors_encoder_reset'] = function (block) {
    const port = block.getFieldValue('MOTORPORT');
    return `robotAPI.encoder_reset(${JSON.stringify(port)});\n`;
  };

  // ── Generic dispatcher (robSensors_getSample) ────────────────────────────────
  // Used inside "wait until" blocks. Dispatches on SENSORTYPE + SENSORMODE.

  javascriptGenerator.forBlock['robSensors_getSample'] = function (block) {
    const type = block.getFieldValue('SENSORTYPE');
    const mode = block.getFieldValue('SENSORMODE');
    let code;
    switch (type) {
      case 'ULTRASONIC': code = `robotAPI.ultrasonic()`;                             break;
      case 'QUADRGB':    code = `robotAPI.quadrgb(${JSON.stringify(mode)})`;         break;
      case 'KEY':        code = `robotAPI.key('A')`;                                 break;
      case 'JOYSTICK':   code = `robotAPI.joystick('UP')`;                           break;
      case 'LIGHT':      code = `robotAPI.light()`;                                  break;
      case 'GYRO':       code = `robotAPI.gyro('ANGLE', 'Z')`;                       break;
      case 'ACCEL':      code = `robotAPI.accel('Z')`;                               break;
      case 'TIMER':      code = `robotAPI.timer('1')`;                               break;
      case 'ENCODER':    code = `robotAPI.encoder('EM1', 'DEGREE')`;                 break;
      case 'LINE':       code = `robotAPI.line('CODE')`;                             break;
      case 'SOUND':      code = `robotAPI.sound()`;                                  break;
      default:           code = `0`;                                                  break;
    }
    return [code, Order.FUNCTION_CALL];
  };
}
