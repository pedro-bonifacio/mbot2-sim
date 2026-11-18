import { robot } from './robot.js';
import { PX_PER_CM } from './world.js';

// The ruler ("📏 Régua"): while it is on, dragging on the robot view measures a
// distance in cm instead of panning. A drag that starts on the robot measures from its
// centre (the yellow ring) and also gives the turn to face the end point, e.g.
// "65 cm · 90° à direita": the two numbers the drive and turn blocks need.
// Display only: the measurement never touches the simulation.

const SNAP_CM = 9;   // a press this close to the robot's centre starts from the centre

let on = false;
let line = null;      // { x0, y0, x1, y1, fromRobot, theta } in world cm
let dragging = false;
const listeners = new Set();

export function isRulerOn() { return on; }
export function onRulerChange(fn) { listeners.add(fn); }

export function setRuler(value) {
  on = !!value;
  if (!on) { line = null; dragging = false; }
  for (const fn of listeners) fn(on);
}

export function rulerDown(xCm, yCm) {
  const fromRobot = Math.hypot(xCm - robot.x, yCm - robot.y) <= SNAP_CM;
  const [x0, y0] = fromRobot ? [robot.x, robot.y] : [xCm, yCm];
  line = { x0, y0, x1: x0, y1: y0, fromRobot, theta: robot.theta };
  dragging = true;
}

export function rulerMove(xCm, yCm) {
  if (!dragging || !line) return;
  line.x1 = xCm;
  line.y1 = yCm;
}

export function rulerUp() { dragging = false; }

/** The measurement as PT-PT text, or null. */
export function rulerLabel() {
  if (!line) return null;
  const dx = line.x1 - line.x0, dy = line.y1 - line.y0;
  const d = Math.hypot(dx, dy);
  if (d < 1) return null;
  let text = `${Math.round(d)} cm`;   // whole cm: what the blocks take, and what a mouse drag can hit
  if (line.fromRobot) {
    let turn = (Math.atan2(dy, dx) - line.theta) * 180 / Math.PI;
    turn = ((turn + 540) % 360) - 180;   // (-180, 180]; + = clockwise = right (y points down)
    const deg = Math.round(Math.abs(turn));
    text += deg === 0 ? ' · em frente' : deg === 180 ? ' · 180° (meia-volta)' : ` · ${deg}° à ${turn > 0 ? 'direita' : 'esquerda'}`;
  }
  return text;
}

/**
 * Draws the line (world transform already set by the caller) and returns the screen
 * anchor for the label as world px, or null.
 */
export function drawRulerLine(ctx, scale) {
  if (!line || !rulerLabel()) return null;
  const s = PX_PER_CM;
  const [ax, ay, bx, by] = [line.x0 * s, line.y0 * s, line.x1 * s, line.y1 * s];
  ctx.save();
  ctx.setLineDash([]);
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(17, 24, 39, 0.9)';
  ctx.lineWidth = 3 / scale;
  ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 1.6 / scale;
  ctx.setLineDash([6 / scale, 4 / scale]);
  ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
  ctx.setLineDash([]);
  for (const [x, y] of [[ax, ay], [bx, by]]) {
    ctx.beginPath(); ctx.arc(x, y, 4 / scale, 0, Math.PI * 2);
    ctx.fillStyle = '#f59e0b'; ctx.fill();
    ctx.strokeStyle = '#111'; ctx.lineWidth = 1.2 / scale; ctx.stroke();
  }
  ctx.restore();
  return { x: (ax + bx) / 2, y: (ay + by) / 2 };
}
