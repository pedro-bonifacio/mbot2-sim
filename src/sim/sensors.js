import { robot, ROBOT_CONSTANTS } from './robot.js';
import { raycast as _raycast, getColorNameAt, getPixelAt, hasMap } from './map.js';
import { isPressed as _isButtonPressed } from '../ui/buttons.js';
import { QUADRGB_FORWARD_OFFSET_CM, QUADRGB_LATERAL_OFFSETS_CM, QUADRGB_LIGHT_THRESHOLD } from './constants.js';

const { CHASSIS_FRONT_OFFSET_CM, ULTRASONIC_CONE_DEG } = ROBOT_CONSTANTS;

// ── Tick cache ─────────────────────────────────────────────────────────────────
// Cleared once per interpreter tick so expensive reads (e.g. ultrasonic raycast)
// are computed at most once per frame, even inside tight loops.

const _tickCache = new Map();
export function resetTickCache() { _tickCache.clear(); }

// ── Offset state (relative readings since last reset or program start) ─────────

let _gyroZOffset   = 0; // robot.gyroCumulativeRad at last gyro Z reset
let _encLOffset    = 0; // robot.motorAngleEM1 at last reset (port L)
let _encROffset    = 0; // robot.motorAngleEM2 at last reset (port R)
const _timerStart  = [0, 0, 0, 0, 0]; // performance.now() at last reset, slots 1-5

/** Reset all sensor state at program start. Sets offsets relative to current robot state. */
export function resetSensors() {
  _gyroZOffset   = robot.gyroCumulativeRad;
  _encLOffset    = robot.motorAngleEM1;
  _encROffset    = robot.motorAngleEM2;
  _timerStart.fill(performance.now());
  _tickCache.clear();
}

// ── Ultrasonic ─────────────────────────────────────────────────────────────────

// 3-ray cone with 15° total aperture approximates the CyberPi ultrasonic
// emitter cone. Real hardware aperture is ~15° per datasheet. Returns
// minimum hit distance across the cone — matches typical ultrasonic
// behaviour (closest reflector wins). Corners narrower than the cone
// can still be missed; this is faithful to real hardware limitations.

// mBot 2 ultrasonic2 range is 3–300 cm; out of range reads the maximum.
const ULTRASONIC_MAX_CM = 300;

function _computeUltrasonicCone() {
  if (_tickCache.has('ultrasonic_cone')) return _tickCache.get('ultrasonic_cone');
  // Origin: sensor face at chassis front, not the kinematic centre.
  const ox = robot.x + Math.cos(robot.theta) * CHASSIS_FRONT_OFFSET_CM;
  const oy = robot.y + Math.sin(robot.theta) * CHASSIS_FRONT_OFFSET_CM;
  const halfRad = (ULTRASONIC_CONE_DEG / 2) * (Math.PI / 180); // 7.5° in radians
  const angles = [robot.theta - halfRad, robot.theta, robot.theta + halfRad];
  const dists = angles.map(a => hasMap() ? _raycast(ox, oy, a, ULTRASONIC_MAX_CM) : ULTRASONIC_MAX_CM);
  const result = { ox, oy, angles, dists, min: Math.min(...dists) };
  _tickCache.set('ultrasonic_cone', result);
  return result;
}

export function sensorUltrasonic() {
  return _computeUltrasonicCone().min;
}

/** Returns cone ray data for canvas debug rendering. Cached per tick. */
export function getUltrasonicConeRays() {
  return _computeUltrasonicCone();
}

// ── QuadRGB ────────────────────────────────────────────────────────────────────
// Four probes in robot-local frame (+x=forward, +y=right).
// World transform: worldX = rx + localX*cos(θ) - localY*sin(θ)
//                  worldY = ry + localX*sin(θ) + localY*cos(θ)

function _getProbeWorldPos(probeIndex) {
  const localX = QUADRGB_FORWARD_OFFSET_CM;
  const localY = QUADRGB_LATERAL_OFFSETS_CM[probeIndex - 1]; // negative = left
  const cos = Math.cos(robot.theta);
  const sin = Math.sin(robot.theta);
  return {
    x: robot.x + localX * cos - localY * sin,
    y: robot.y + localX * sin + localY * cos,
  };
}

function _sampleProbe(probeIndex) {
  const { x, y } = _getProbeWorldPos(probeIndex);
  const p = getPixelAt(x, y) || { r: 255, g: 255, b: 255 };
  return { r: p.r, g: p.g, b: p.b, brightness: (p.r + p.g + p.b) / 3 };
}

function _computeQuadRGBProbes() {
  if (_tickCache.has('quadrgb_probes')) return _tickCache.get('quadrgb_probes');
  const probes = [1, 2, 3, 4].map(_sampleProbe);
  _tickCache.set('quadrgb_probes', probes);
  return probes;
}

/** Returns all four probe samples [{r,g,b,brightness}]. Cached per tick. Used by canvas + runLoop. */
export function getQuadRGBProbeData() {
  return _computeQuadRGBProbes();
}

/** Returns world-space {x, y} cm for each of the 4 probes. Used by canvas for dot rendering. */
export function getQuadRGBWorldPositions() {
  return [1, 2, 3, 4].map(_getProbeWorldPos);
}

// Open Roberta / CyberPi probe names, left to right: L2, L1, R1, R2.
// Probe index (1..4) follows QUADRGB_LATERAL_OFFSETS_CM (left..right).
// ⚠ Verify on the real robot (docs/VERIFY_ON_ROBOT.md).
export const QUADRGB_PROBE_INDEX = { L2: 1, L1: 2, R1: 3, R2: 4 };

// The real quad RGB sensor classifies into these 8 colours only (the _colors table
// in Open Roberta's generated MicroPython). There is no orange: an orange floor
// reads as the nearest of the 8.
const SENSOR_COLOURS = [
  { hex: '#cc0000', r: 204, g:   0, b:   0 }, // red
  { hex: '#ffff00', r: 255, g: 255, b:   0 }, // yellow
  { hex: '#33cc00', r:  51, g: 204, b:   0 }, // green
  { hex: '#33ffff', r:  51, g: 255, b: 255 }, // cyan
  { hex: '#3366ff', r:  51, g: 102, b: 255 }, // blue
  { hex: '#cc33cc', r: 204, g:  51, b: 204 }, // purple
  { hex: '#ffffff', r: 255, g: 255, b: 255 }, // white
  { hex: '#000000', r:   0, g:   0, b:   0 }, // black
];

function _nearestSensorColour(p) {
  let best = SENSOR_COLOURS[0], bestD = Infinity;
  for (const c of SENSOR_COLOURS) {
    const d = (p.r - c.r) ** 2 + (p.g - c.g) ** 2 + (p.b - c.b) ** 2;
    if (d < bestD) { bestD = d; best = c; }
  }
  return best.hex;
}

/** robSensors_quadrgb_getSample: mode COLOUR | LIGHT | AMBIENTLIGHT | RGB, slot L1/L2/R1/R2. */
export function sensorQuadRGB(mode, slot) {
  const idx = QUADRGB_PROBE_INDEX[String(slot)] || 1;
  const p = _computeQuadRGBProbes()[idx - 1];
  if (mode === 'LIGHT') return Math.round((p.brightness / 255) * 100);   // get_gray: reflected
  if (mode === 'AMBIENTLIGHT') return Math.round((p.brightness / 255) * 100); // get_light (approx.)
  if (mode === 'RGB') return [p.r, p.g, p.b];
  // Reserved spawn-marker colours read as white floor (CLAUDE.md §9).
  const pos = _getProbeWorldPos(idx);
  if (getColorNameAt(pos.x, pos.y) === 'white') return '#ffffff';
  return _nearestSensorColour(p);
}

/**
 * robSensors_line_getSample → mbuild.quad_rgb_sensor.get_line_sta("all"): 0..15.
 * Bit = 1 when the probe is over a dark line. Bit order: L2 = bit 3 … R2 = bit 0.
 * ⚠ Bit order and polarity to verify on the real robot (docs/VERIFY_ON_ROBOT.md).
 */
export function sensorLineStatus() {
  const probes = _computeQuadRGBProbes();
  let v = 0;
  for (let i = 0; i < 4; i++) {
    if (probes[i].brightness <= QUADRGB_LIGHT_THRESHOLD) v |= 1 << (3 - i);
  }
  return v;
}

// ── Gyro ───────────────────────────────────────────────────────────────────────
// Integrating semantics matching Open Roberta and real CyberPi cyberpi.mbot2.gyro:
//   • ANGLE mode returns signed cumulative rotation (degrees) since last reset, NOT
//     an absolute compass heading. This matches OR behaviour.
//   • Rotation is integrated from kinematics (gyroCumulativeRad accumulates dTheta
//     each physics step before heading normalisation).
//   • resetSensors() zeros _gyroZOffset to robot.gyroCumulativeRad at program start,
//     so each run begins fresh at 0.
//   • Only Z-axis (yaw) is physically meaningful in a 2D sim; X and Y always return 0.
//   • Sign convention: clockwise (right turn) → positive degrees.
//   • The `slot` parameter exists in the OR block (slots 1-n are user-named bookmarks
//     for a single IMU). All slots return the same physical value; we ignore it.
//   • Slight overshoot (~1-3°) after turn_for is expected: the async ticket resolves
//     the frame after the threshold is crossed, advancing gyroCumulativeRad one more
//     step before wheels stop. totalRotationRad and robot.theta are corrected for the
//     overshoot but gyroCumulativeRad deliberately is not (see turn_for resolveCondition).

export function sensorGyro(axis) {
  if (String(axis).toUpperCase() !== 'Z') return 0; // X/Y not meaningful in 2D sim
  return (robot.gyroCumulativeRad - _gyroZOffset) * (180 / Math.PI);
}

export function sensorGyroReset(axis) {
  const ax = String(axis).toUpperCase();
  if (ax === 'Z' || ax === 'ALL') _gyroZOffset = robot.gyroCumulativeRad;
}

// ── Accelerometer ─────────────────────────────────────────────────────────────
// 2D sim: no acceleration model. Returns 0 for all axes.
// mBot2 lessons typically do not branch on accelerometer readings.

export function sensorAccelerometer(axis) {
  // Flat robot at rest: gravity on Z only (in g). Not used by core levels (decision 0003).
  return String(axis).toUpperCase() === 'Z' ? 1 : 0;
}

// ── Encoder ───────────────────────────────────────────────────────────────
// Ports: R = EM2 (right, mirrored), L = EM1 (left). mbot2.EM_get_angle() in degrees.

export function sensorEncoder(port, mode) {
  const deg = String(port) === 'L'
    ? robot.motorAngleEM1 - _encLOffset
    : robot.motorAngleEM2 - _encROffset;
  return String(mode) === 'ROTATION' ? deg / 360 : deg;
}

export function sensorEncoderReset(port) {
  if (String(port) === 'L') _encLOffset = robot.motorAngleEM1;
  else                      _encROffset = robot.motorAngleEM2;
}

// ── Timer ─────────────────────────────────────────────────────────────────────
// Five timers (Open Roberta slots 1–5), in ms since program start or last reset.
// Uses wall-clock time for now; moves to the simulated clock with decision 0004.

export function sensorTimer(slot) {
  const idx = Number(slot) - 1;
  if (!(idx >= 0 && idx < _timerStart.length)) return 0;
  return performance.now() - _timerStart[idx];
}

export function sensorTimerReset(slot) {
  const idx = Number(slot) - 1;
  if (!(idx >= 0 && idx < _timerStart.length)) return;
  _timerStart[idx] = performance.now();
}

// ── Key / Joystick ────────────────────────────────────────────────────────────
// Keys: A, B. Joystick: UP, DOWN, LEFT, RIGHT, CENTER (= middle press), ANY (any direction).

export function sensorKey(key) { return _isButtonPressed(String(key)); }

export function sensorJoystick(dir) {
  const d = String(dir);
  if (d === 'CENTER') return _isButtonPressed('MIDDLE');
  if (d === 'ANY') return ['UP', 'DOWN', 'LEFT', 'RIGHT'].some(_isButtonPressed);
  return _isButtonPressed(d);
}

// ── Ambient light ─────────────────────────────────────────────────────────────
// Constant 50% — room brightness not simulated. Expose a UI slider in a later phase.

export function sensorLight() { return 50; }

// ── Sound (microphone) ────────────────────────────────────────────────────────
// Stub: always returns 0. A "make sound" button can be added in a later phase.

export function sensorSound() { return 0; }
