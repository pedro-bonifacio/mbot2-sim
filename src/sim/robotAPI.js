import { appendConsoleMessage } from '../ui/console.js';
import { robot, setWheelSpeeds } from './robot.js';
import { asyncTicket } from '../runtime/runState.js';
import { play_tone as _play_tone, set_volume as _set_volume, get_volume as _get_volume } from './audio.js';
import {
  display_text as _display_text,
  display_set_colour as _display_set_colour,
  display_clear as _display_clear,
  println_display,
} from '../ui/display.js';
import { led_on as _led_on, led_off as _led_off } from './leds.js';
import {
  sensorUltrasonic,
  sensorQuadRGB, sensorLineStatus,
  sensorGyro, sensorGyroReset,
  sensorAccelerometer,
  sensorEncoder, sensorEncoderReset,
  sensorTimer, sensorTimerReset,
  sensorKey, sensorJoystick,
  sensorLight, sensorSound,
} from './sensors.js';

// robotAPI — the only surface generated programs call into (CLAUDE.md §12).
// Names and arguments follow the Open Roberta mBot 2 blocks (decision 0011); the
// behaviour follows the MicroPython Open Roberta generates for the robot
// (reference_openroberta/live/or-mbot2-semantics.json).
//
// Wheel speeds in the sim (robot.vL / robot.vR) are forward-positive RPM per wheel.
// The real right motor (EM2) is mounted mirrored: Open Roberta drives the robot with
// mbot2.drive_speed(left, -right), and a single-motor command on port R (EM2) with a
// positive speed turns the right wheel backwards.

// FIFO message bus: channel → string[]. Resets on each program run (CLAUDE.md §6).
const _messageBus = new Map();

const isBackward = (direction) => String(direction).indexOf('BACKWARD') === 0;
const num = (x) => Number(x) || 0;

/** Sets one motor's speed by Open Roberta port (R = EM2 mirrored, L = EM1). */
function setMotor(port, rpm) {
  if (String(port) === 'L') setWheelSpeeds(rpm, robot.vR);
  else setWheelSpeeds(robot.vL, -rpm);
}

/** Async helper: suspends the program until the condition holds (async ticketing). */
function waitUntil(callback, condition) {
  asyncTicket.pending = true;
  asyncTicket.callback = callback;
  asyncTicket.resolveCondition = condition;
}

/** Drive at (vL, vR) until the robot centre has travelled `distance` cm, then stop. */
function driveDistance(vL, vR, distance, callback) {
  const d = Math.abs(num(distance));
  // Robot: time = distance / centre speed; zero centre speed returns immediately.
  if (d === 0 || vL + vR === 0) {
    setWheelSpeeds(0, 0);
    waitUntil(callback, () => true);
    return;
  }
  setWheelSpeeds(vL, vR);
  const start = robot.totalDistanceCm;
  const sign = vL + vR < 0 ? -1 : 1;
  waitUntil(callback, () => {
    const travelled = robot.totalDistanceCm - start;
    if (travelled < d) return false;
    // Undo the part of the last frame that went past the target.
    const overshoot = travelled - d;
    if (overshoot > 0) {
      robot.x -= sign * Math.cos(robot.theta) * overshoot;
      robot.y -= sign * Math.sin(robot.theta) * overshoot;
      robot.totalDistanceCm -= overshoot;
    }
    setWheelSpeeds(0, 0);
    return true;
  });
}

export const robotAPI = {

  // ── Console / display ─────────────────────────────────────────────────────

  println(text) {
    const s = String(text ?? '');
    console.log('[robot]', s);
    appendConsoleMessage(s, 'info');
    println_display(s);
  },

  // robActions_serial_print → print() on the robot: console only.
  serial_print(text) {
    const s = String(text ?? '');
    console.log('[robot]', s);
    appendConsoleMessage(s, 'info');
  },

  display_text(text, col, row) { _display_text(text, col, row); },
  display_set_colour(hex)      { _display_set_colour(hex); },
  display_clear()              { _display_clear(); },

  // ── Differential drive (RPM) ──────────────────────────────────────────────

  drive(direction, power) {
    const p = isBackward(direction) ? -num(power) : num(power);
    setWheelSpeeds(p, p);
  },

  drive_stop() { setWheelSpeeds(0, 0); },

  // RIGHT → drive_speed(p, p): left forward, right backward.
  turn(direction, power) {
    const p = num(power);
    if (String(direction) === 'LEFT') setWheelSpeeds(-p, p);
    else setWheelSpeeds(p, -p);
  },

  curve(direction, powerL, powerR) {
    const s = isBackward(direction) ? -1 : 1;
    setWheelSpeeds(s * num(powerL), s * num(powerR));
  },

  drive_for(direction, power, distance, callback) {
    const p = isBackward(direction) ? -num(power) : num(power);
    driveDistance(p, p, distance, callback);
  },

  curve_for(direction, powerL, powerR, distance, callback) {
    const s = isBackward(direction) ? -1 : 1;
    driveDistance(s * num(powerL), s * num(powerR), distance, callback);
  },

  // mbot2.turn(angle, speed): RIGHT = positive angle (clockwise).
  turn_for(direction, power, degrees, callback) {
    const p = Math.abs(num(power));
    const target = Math.abs(num(degrees)) * Math.PI / 180;
    const s = String(direction) === 'LEFT' ? -1 : 1;
    if (p === 0 || target === 0) { waitUntil(callback, () => true); return; }
    setWheelSpeeds(s * p, -s * p);
    const start = robot.totalRotationRad;
    waitUntil(callback, () => {
      const turned = robot.totalRotationRad - start;
      if (turned < target) return false;
      const overshoot = turned - target;
      if (overshoot > 0) {
        robot.theta -= s * overshoot;
        if (robot.theta > Math.PI)  robot.theta -= 2 * Math.PI;
        if (robot.theta < -Math.PI) robot.theta += 2 * Math.PI;
        robot.totalRotationRad -= overshoot;
        // gyroCumulativeRad deliberately keeps the overshoot (~1–3°), like real inertia.
      }
      setWheelSpeeds(0, 0);
      return true;
    });
  },

  // ── Single motors (ports R = EM2, L = EM1) ────────────────────────────────

  motor_on(port, power) { setMotor(port, num(power)); },

  motor_stop(port) { setMotor(port, 0); },

  // mbot2.EM_turn(angle, speed, port): turn the motor by an angle, then stop.
  motor_on_for(port, power, value, unit, callback) {
    const target = Math.abs(String(unit) === 'DEGREE' ? num(value) : num(value) * 360);
    if (num(power) === 0 || target === 0) { waitUntil(callback, () => true); return; }
    const dir = Math.sign(num(power)) * (num(value) < 0 ? -1 : 1);
    const isLeft = String(port) === 'L';
    const angle = () => (isLeft ? robot.motorAngleEM1 : robot.motorAngleEM2);
    const start = angle();
    setMotor(port, dir * Math.abs(num(power)));
    waitUntil(callback, () => {
      if (Math.abs(angle() - start) < target) return false;
      setMotor(port, 0);
      return true;
    });
  },

  // ── Timing ────────────────────────────────────────────────────────────────

  wait_ms(ms, callback) {
    const end = performance.now() + Math.max(0, num(ms));
    waitUntil(callback, () => performance.now() >= end);
  },

  // ── Sound ─────────────────────────────────────────────────────────────────

  // cyberpi.audio.play_tone blocks for the tone's duration.
  play_tone(freq, ms, callback) {
    const duration = Math.max(0, num(ms));
    _play_tone(num(freq), duration);
    const end = performance.now() + duration;
    waitUntil(callback, () => performance.now() >= end);
  },

  set_volume(v)    { _set_volume(v); },
  get_volume()     { return _get_volume(); },
  play_recording() { appendConsoleMessage('(gravação: não disponível no simulador)', 'warn'); },
  sound_record()   { appendConsoleMessage('(gravação: não disponível no simulador)', 'warn'); },

  // ── Lights ────────────────────────────────────────────────────────────────

  led_on(slot, colour) { _led_on(slot, colour); },
  led_off(slot)        { _led_off(slot); },
  led_brightness()     { /* LED brightness not rendered in the sim */ },
  ultrasonic_led()     { /* ultrasonic ring LEDs not rendered in the sim */ },
  quadrgb_led_on()     { /* quad RGB fill light not modelled */ },
  quadrgb_led_off()    { /* quad RGB fill light not modelled */ },

  // Colour from RGB components → "#rrggbb" (naoColour_rgb).
  rgb(r, g, b) {
    const h = (x) => Math.max(0, Math.min(255, Math.round(num(x)))).toString(16).padStart(2, '0');
    return '#' + h(r) + h(g) + h(b);
  },

  // ── Sensors ───────────────────────────────────────────────────────────────

  ultrasonic()          { return sensorUltrasonic(); },
  quadrgb(mode, slot)   { return sensorQuadRGB(String(mode), String(slot)); },
  line()                { return sensorLineStatus(); },
  sound()               { return sensorSound(); },
  joystick(slot)        { return sensorJoystick(slot); },
  key(port)             { return sensorKey(port); },
  light()               { return sensorLight(); },
  gyro(axis)            { return sensorGyro(axis); },
  gyro_reset(axis)      { sensorGyroReset(axis); },
  accel(axis)           { return sensorAccelerometer(axis); },
  timer(port)           { return sensorTimer(port); },
  timer_reset(port)     { sensorTimerReset(port); },
  encoder(port, mode)   { return sensorEncoder(port, mode); },
  encoder_reset(port)   { sensorEncoderReset(port); },

  // ── Communication (local loopback, single robot — CLAUDE.md §6) ──────────

  send_message(channel, msg) {
    const ch = String(channel ?? 'default');
    if (!_messageBus.has(ch)) _messageBus.set(ch, []);
    _messageBus.get(ch).push(String(msg ?? ''));
    appendConsoleMessage('[msg→' + ch + '] ' + String(msg ?? ''), 'info');
  },

  receive_message(channel) {
    const queue = _messageBus.get(String(channel ?? 'default'));
    return queue && queue.length ? queue.shift() : '';
  },

  _resetMessageBus() { _messageBus.clear(); },
};

// Async methods: sandbox.js wraps these with createAsyncFunction.
for (const name of ['drive_for', 'curve_for', 'turn_for', 'motor_on_for', 'wait_ms', 'play_tone']) {
  robotAPI[name]._async = true;
}
