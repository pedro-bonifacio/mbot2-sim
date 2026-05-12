import { robot, ROBOT_CONSTANTS } from './robot.js';
import { raycast as _raycast, getColorNameAt, getPixelAt, hasMap } from './map.js';
import { isPressed as _isButtonPressed } from '../ui/buttons.js';
import { QUADRGB_FORWARD_OFFSET_CM, QUADRGB_LATERAL_OFFSETS_CM, QUADRGB_LIGHT_THRESHOLD } from './constants.js';

const { WHEEL_CIRCUMFERENCE_CM, TRACK_WIDTH_CM, CHASSIS_FRONT_OFFSET_CM, ULTRASONIC_CONE_DEG } = ROBOT_CONSTANTS;

// ── Tick cache ─────────────────────────────────────────────────────────────────
// Cleared once per interpreter tick so expensive reads (e.g. ultrasonic raycast)
// are computed at most once per frame, even inside tight loops.

const _tickCache = new Map();
export function resetTickCache() { _tickCache.clear(); }

// ── Offset state (relative readings since last reset or program start) ─────────

let _gyroZOffset   = 0; // robot.gyroCumulativeRad at last gyro Z reset
let _encLOffset    = 0; // robot.encoderLeftAbs  at last EM1 reset
let _encROffset    = 0; // robot.encoderRightAbs at last EM2 reset
const _timerStart  = [0, 0]; // performance.now() at last reset for slots 1-2

/** Reset all sensor state at program start. Sets offsets relative to current robot state. */
export function resetSensors() {
  _gyroZOffset   = robot.gyroCumulativeRad;
  _encLOffset    = robot.encoderLeftAbs;
  _encROffset    = robot.encoderRightAbs;
  _timerStart[0] = performance.now();
  _timerStart[1] = performance.now();
  _tickCache.clear();
}

// ── Ultrasonic ─────────────────────────────────────────────────────────────────

// 3-ray cone with 15° total aperture approximates the CyberPi ultrasonic
// emitter cone. Real hardware aperture is ~15° per datasheet. Returns
// minimum hit distance across the cone — matches typical ultrasonic
// behaviour (closest reflector wins). Corners narrower than the cone
// can still be missed; this is faithful to real hardware limitations.

const ULTRASONIC_MAX_CM = 50;

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

/** Returns COLOUR name, LIGHT percentage, or RGB array for a specific probe (1..4). */
export function sensorQuadRGBForProbe(property, probeIndex) {
  const probes = _computeQuadRGBProbes();
  const p = probes[probeIndex - 1] || _sampleProbe(probeIndex);
  if (property === 'LIGHT') return Math.round((p.brightness / 255) * 100);
  if (property === 'RGB')   return [p.r, p.g, p.b];
  // COLOUR: use palette matcher (handles reserved spawn-zone colours → 'white')
  const pos = _getProbeWorldPos(probeIndex);
  return getColorNameAt(pos.x, pos.y) || 'none';
}

export function sensorQuadRGBColour() {
  return sensorQuadRGBForProbe('COLOUR', 1);
}

export function sensorQuadRGBBrightness() {
  return sensorQuadRGBForProbe('LIGHT', 1);
}

export function sensorQuadRGBRGB() {
  return sensorQuadRGBForProbe('RGB', 1);
}

export function sensorQuadRGBLine() {
  // 4-bit bitmask: bit0=probe1(LSB/leftmost) .. bit3=probe4(MSB/rightmost)
  // bit=1 → light surface (off line), bit=0 → dark surface (on line)
  const probes = _computeQuadRGBProbes();
  return probes.reduce((acc, p, i) => acc | ((p.brightness > QUADRGB_LIGHT_THRESHOLD ? 1 : 0) << i), 0);
}

// ── Line sensor (quadRGB re-interpreted as binary line detection) ───────────────

export function sensorLine(mode) {
  const probes = _computeQuadRGBProbes();
  const isDark = (p) => p.brightness <= QUADRGB_LIGHT_THRESHOLD;
  if (mode === 'L')    return isDark(probes[0]) || isDark(probes[1]);
  if (mode === 'R')    return isDark(probes[2]) || isDark(probes[3]);
  if (mode === 'ALL')  return probes.some(isDark);
  if (mode === 'CODE') return sensorQuadRGBLine();
  return false;
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

export function sensorGyro(slot, axis) {
  if (String(axis).toUpperCase() !== 'Z') return 0; // X/Y not meaningful in 2D sim
  if (String(slot) === 'RATE') {
    const vR_cms = (robot.vR / 60) * WHEEL_CIRCUMFERENCE_CM;
    const vL_cms = (robot.vL / 60) * WHEEL_CIRCUMFERENCE_CM;
    return ((vL_cms - vR_cms) / TRACK_WIDTH_CM) * (180 / Math.PI);
  }
  return (robot.gyroCumulativeRad - _gyroZOffset) * (180 / Math.PI);
}

export function sensorGyroReset(axis) {
  const ax = String(axis).toUpperCase();
  if (ax === 'Z' || ax === 'ALL') _gyroZOffset = robot.gyroCumulativeRad;
}

// ── Accelerometer ─────────────────────────────────────────────────────────────
// 2D sim: no acceleration model. Returns 0 for all axes.
// mBot2 lessons typically do not branch on accelerometer readings.

export function sensorAccelerometer(_axis) {
  return 0;
}

// ── Encoder ───────────────────────────────────────────────────────────────────

export function sensorEncoder(port, mode) {
  const rotations = String(port) === 'EM1'
    ? robot.encoderLeftAbs  - _encLOffset
    : robot.encoderRightAbs - _encROffset;
  if (String(mode) === 'ROTATION') return rotations;
  if (String(mode) === 'DEGREE')   return rotations * 360;
  if (String(mode) === 'DISTANCE') return rotations * WHEEL_CIRCUMFERENCE_CM;
  return rotations;
}

export function sensorEncoderReset(port) {
  if (String(port) === 'EM1') _encLOffset = robot.encoderLeftAbs;
  else                        _encROffset = robot.encoderRightAbs;
}

// ── Timer ─────────────────────────────────────────────────────────────────────
// Uses wall-clock time (performance.now()). Consistent with wait_ms async calls.

export function sensorTimer(slot) {
  const idx = Number(slot) - 1;
  if (idx < 0 || idx > 1) return 0;
  return performance.now() - _timerStart[idx];
}

export function sensorTimerReset(slot) {
  const idx = Number(slot) - 1;
  if (idx < 0 || idx > 1) return;
  _timerStart[idx] = performance.now();
}

// ── Key / Joystick ────────────────────────────────────────────────────────────

export function sensorKey(key)       { return _isButtonPressed(String(key)); }
export function sensorJoystick(dir)  { return _isButtonPressed(String(dir)); }

// ── Ambient light ─────────────────────────────────────────────────────────────
// Constant 50% — room brightness not simulated. Expose a UI slider in a later phase.

export function sensorLight() { return 50; }

// ── Sound (microphone) ────────────────────────────────────────────────────────
// Stub: always returns 0. A "make sound" button can be added in a later phase.

export function sensorSound() { return 0; }
