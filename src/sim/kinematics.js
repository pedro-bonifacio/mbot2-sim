import { ROBOT_CONSTANTS } from './robot.js';
import { footprintHitsWall } from './collision.js';

// Bisection steps when a move ends in a wall: 2^-12 of one step is far below a pixel.
const CONTACT_BISECTIONS = 12;

/**
 * Integrate one timestep of differential-drive kinematics.
 * robot.x and robot.y are in cm. Mutates robot in place.
 *
 * @param {object} robot - {x, y, theta} in cm/rad, vL/vR in RPM
 * @param {number} dt - delta time in seconds
 */
export function step(robot, dt) {
  const { WHEEL_CIRCUMFERENCE_CM, TRACK_WIDTH_CM } = ROBOT_CONSTANTS;

  // RPM → cm/s per wheel
  const vL_cms = (robot.vL / 60) * WHEEL_CIRCUMFERENCE_CM;
  const vR_cms = (robot.vR / 60) * WHEEL_CIRCUMFERENCE_CM;

  // Body-frame velocities
  const vLinear = (vL_cms + vR_cms) / 2;             // cm/s
  const vAngular = (vL_cms - vR_cms) / TRACK_WIDTH_CM; // rad/s — (vL−vR)/L for y-down canvas

  // World-frame deltas (in cm)
  const dx = vLinear * Math.cos(robot.theta) * dt;
  const dy = vLinear * Math.sin(robot.theta) * dt;
  const dTheta = vAngular * dt;

  // Move the whole footprint. If the new pose touches a wall, stop at the last
  // free fraction of the move (the point of contact) and flag the collision; the
  // program tick then halts the run. robot.collided stays set until resetRobot().
  // If the robot already touches a wall (e.g. a map spawns it inside one), it can
  // move freely, so the contact is reported rather than trapping it.
  let f = 1;
  const moving = dx !== 0 || dy !== 0 || dTheta !== 0;
  if (moving && footprintHitsWall(robot.x + dx, robot.y + dy, robot.theta + dTheta)) {
    robot.collided = true;
    if (!footprintHitsWall(robot.x, robot.y, robot.theta)) {
      let lo = 0, hi = 1;
      for (let i = 0; i < CONTACT_BISECTIONS; i++) {
        const mid = (lo + hi) / 2;
        if (footprintHitsWall(robot.x + dx * mid, robot.y + dy * mid, robot.theta + dTheta * mid)) hi = mid;
        else lo = mid;
      }
      f = lo;
    }
  }

  robot.x += dx * f;
  robot.y += dy * f;
  robot.gyroCumulativeRad += dTheta * f; // signed accumulator — never normalised
  robot.theta += dTheta * f;
  if (robot.theta > Math.PI) robot.theta -= 2 * Math.PI;
  if (robot.theta < -Math.PI) robot.theta += 2 * Math.PI;

  robot.totalDistanceCm += Math.abs(vLinear) * dt * f;
  robot.totalRotationRad += Math.abs(dTheta) * f;
  // The wheels keep turning against a wall (they slip), so the encoders count the full step.
  // Signed motor angles in degrees, as read by mbot2.EM_get_angle(). EM2 (right) is
  // mounted mirrored: Open Roberta drives it with drive_speed(l, -r), so it counts
  // down while the robot drives forward.
  robot.motorAngleEM1 += (robot.vL / 60) * 360 * dt;
  robot.motorAngleEM2 -= (robot.vR / 60) * 360 * dt;
}
