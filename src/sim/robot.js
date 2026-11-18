import { ROBOT_LENGTH_CM } from './constants.js';
// Hard-coded mBot 2 constants from configuration.default.xml
export const ROBOT_CONSTANTS = {
  WHEEL_DIAMETER_CM: 6.5,
  WHEEL_RADIUS_CM: 3.25,
  WHEEL_CIRCUMFERENCE_CM: 20.420352248333657,
  TRACK_WIDTH_CM: 11.5,
  MAX_RPM: 200,
  MIN_RPM: -200,
  CHASSIS_FRONT_OFFSET_CM: 9,
  BODY_RADIUS_CM: 4.5,
  ULTRASONIC_CONE_DEG: 15,
};

export const robot = {
  x: 500,         // cm — overwritten by respawnRobot on map load
  y: 600,         // cm
  theta: -Math.PI / 2,  // rad — facing north; overwritten on map load
  vL: 0,
  vR: 0,
  collided: false,
  totalDistanceCm: 0,
  totalRotationRad: 0,
  motorAngleEM1: 0,   // degrees, signed (left motor)
  motorAngleEM2: 0,   // degrees, signed (right motor, mirrored)
  gyroCumulativeRad: 0,
};

// Dynamic spawn — updated by setSpawn() each time a map is loaded
let _spawnX     = robot.x;
let _spawnY     = robot.y;
let _spawnTheta = robot.theta;

export function setSpawn(x, y, theta) {
  _spawnX     = x;
  _spawnY     = y;
  _spawnTheta = theta;
}

export function getSpawn() {
  return { spawnX: _spawnX, spawnY: _spawnY, spawnHeading: _spawnTheta };
}

/** Probe point of the robot in world cm: its centre, or the middle of its front bumper. */
export function robotProbePoint(probe = 'centre') {
  if (probe !== 'front') return [robot.x, robot.y];
  const h = ROBOT_LENGTH_CM / 2;
  return [robot.x + Math.cos(robot.theta) * h, robot.y + Math.sin(robot.theta) * h];
}

export function resetRobot() {
  robot.x               = _spawnX;
  robot.y               = _spawnY;
  robot.theta           = _spawnTheta;
  robot.vL              = 0;
  robot.vR              = 0;
  robot.collided        = false;
  robot.totalDistanceCm = 0;
  robot.totalRotationRad = 0;
  robot.motorAngleEM1   = 0;
  robot.motorAngleEM2   = 0;
  robot.gyroCumulativeRad = 0;
}

/** Called after a map is loaded to update spawn and immediately reset robot position. */
export function respawnRobot(mapInfo) {
  setSpawn(mapInfo.spawnX, mapInfo.spawnY, mapInfo.spawnHeading);
  resetRobot();
}

export function setWheelSpeeds(vL, vR) {
  robot.vL = clamp(vL, ROBOT_CONSTANTS.MIN_RPM, ROBOT_CONSTANTS.MAX_RPM);
  robot.vR = clamp(vR, ROBOT_CONSTANTS.MIN_RPM, ROBOT_CONSTANTS.MAX_RPM);
}

export function resetMotors() {
  robot.vL = 0;
  robot.vR = 0;
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}
