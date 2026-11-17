import { ROBOT_LENGTH_CM, ROBOT_WIDTH_CM } from './constants.js';
import { isObstacle } from './map.js';

// Robot–wall contact using the real mBot 2 footprint: a 17.5 × 13 cm rectangle
// centred on the robot's position and turned with its heading, exactly as the
// sprite is drawn (and as big as the cyan spawn rectangle in maps). Walls are
// magenta pixels and everything outside the map (map.js → isObstacle).

// Perimeter sample spacing. Must stay below the thinnest wall a map may have
// (5 px = 0.625 cm, docs/MAP_AUTHORING.md) so no wall slips between two samples.
const SAMPLE_SPACING_CM = 0.5;

const HALF_L = ROBOT_LENGTH_CM / 2;
const HALF_W = ROBOT_WIDTH_CM / 2;

// Perimeter points in the robot frame (x forward, y right), computed once.
const OUTLINE = (() => {
  const pts = [];
  const edge = (x0, y0, x1, y1) => {
    const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / SAMPLE_SPACING_CM);
    for (let i = 0; i < n; i++) pts.push([x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n]);
  };
  edge(HALF_L, -HALF_W, HALF_L, HALF_W);     // front
  edge(HALF_L, HALF_W, -HALF_L, HALF_W);     // right side
  edge(-HALF_L, HALF_W, -HALF_L, -HALF_W);   // back
  edge(-HALF_L, -HALF_W, HALF_L, -HALF_W);   // left side
  return pts;
})();

/** World-space corners of the footprint at pose (x, y, theta): front-left, front-right, back-right, back-left. */
export function footprintCorners(x, y, theta) {
  const c = Math.cos(theta), s = Math.sin(theta);
  return [[HALF_L, -HALF_W], [HALF_L, HALF_W], [-HALF_L, HALF_W], [-HALF_L, -HALF_W]]
    .map(([fx, fy]) => [x + fx * c - fy * s, y + fx * s + fy * c]);
}

/** True if the footprint at pose (x, y, theta) touches a wall or leaves the map. */
export function footprintHitsWall(x, y, theta) {
  const c = Math.cos(theta), s = Math.sin(theta);
  for (const [fx, fy] of OUTLINE) {
    if (isObstacle(x + fx * c - fy * s, y + fx * s + fy * c)) return true;
  }
  return false;
}
