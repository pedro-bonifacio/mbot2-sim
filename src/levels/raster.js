import { DISPLAY_SCALE } from '../sim/constants.js';
import { FLOOR_COLOURS } from './level.js';

// Paints a prepared level's map (src/levels/level.js) into RGBA pixels at
// DISPLAY_SCALE px per cm — the same layout a map PNG decodes to — so map.js,
// the sensors and collision use it unchanged. Pure: runs in the browser, the
// headless runner, and the preview/mat scripts. Items paint in file order (later
// on top). A pixel belongs to a shape when its centre does.

/** → { imageData: Uint8ClampedArray (RGBA), widthPx, heightPx } */
export function rasterise(prepared, scale = DISPLAY_SCALE) {
  const widthPx = Math.round(prepared.size.w * scale);
  const heightPx = Math.round(prepared.size.h * scale);
  const data = new Uint8ClampedArray(widthPx * heightPx * 4);
  const floor = FLOOR_COLOURS.white;
  for (let i = 0; i < data.length; i += 4) {
    data[i] = floor[0]; data[i + 1] = floor[1]; data[i + 2] = floor[2]; data[i + 3] = 255;
  }

  const put = (px, py, rgb) => {
    const i = (py * widthPx + px) * 4;
    data[i] = rgb[0]; data[i + 1] = rgb[1]; data[i + 2] = rgb[2]; data[i + 3] = 255;
  };
  // Visits the pixels whose centres fall in the cm box [x0, x1] × [y0, y1].
  const scan = (x0, y0, x1, y1, inside, rgb) => {
    const px0 = Math.max(0, Math.floor(x0 * scale)), px1 = Math.min(widthPx - 1, Math.ceil(x1 * scale));
    const py0 = Math.max(0, Math.floor(y0 * scale)), py1 = Math.min(heightPx - 1, Math.ceil(y1 * scale));
    for (let py = py0; py <= py1; py++) {
      const y = (py + 0.5) / scale;
      for (let px = px0; px <= px1; px++) {
        if (inside((px + 0.5) / scale, y)) put(px, py, rgb);
      }
    }
  };

  for (const it of prepared.items) {
    if (it.type === 'rect') {
      const cx = it.x + it.w / 2, cy = it.y + it.h / 2;
      const a = (it.angle || 0) * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
      const ext = (Math.abs(it.w * c) + Math.abs(it.h * s)) / 2, eyt = (Math.abs(it.w * s) + Math.abs(it.h * c)) / 2;
      scan(cx - ext, cy - eyt, cx + ext, cy + eyt, (x, y) => {
        const dx = x - cx, dy = y - cy;            // into the rectangle's own frame
        const u = dx * c + dy * s, v = -dx * s + dy * c;
        return Math.abs(u) <= it.w / 2 && Math.abs(v) <= it.h / 2;
      }, it.rgb);
    } else if (it.type === 'circle') {
      scan(it.cx - it.r, it.cy - it.r, it.cx + it.r, it.cy + it.r,
        (x, y) => (x - it.cx) ** 2 + (y - it.cy) ** 2 <= it.r ** 2, it.rgb);
    } else if (it.type === 'line') {
      const hw = it.width / 2;
      for (let k = 0; k + 1 < it.points.length; k++) {
        const [ax, ay] = it.points[k], [bx, by] = it.points[k + 1];
        const len2 = (bx - ax) ** 2 + (by - ay) ** 2;
        scan(Math.min(ax, bx) - hw, Math.min(ay, by) - hw, Math.max(ax, bx) + hw, Math.max(ay, by) + hw, (x, y) => {
          const t = len2 ? Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / len2)) : 0;
          return (x - ax - t * (bx - ax)) ** 2 + (y - ay - t * (by - ay)) ** 2 <= hw * hw;   // round joins and caps
        }, it.rgb);
      }
    } else if (it.type === 'arc') {
      const hw = it.width / 2, R = it.r + hw;
      const from = it.from * Math.PI / 180, span = ((it.to - it.from) % 360 + 360) % 360 || 360;
      scan(it.cx - R, it.cy - R, it.cx + R, it.cy + R, (x, y) => {
        const d = Math.hypot(x - it.cx, y - it.cy);
        if (Math.abs(d - it.r) > hw) return false;
        // Angle clockwise from east (screen y-down), like spawn headings.
        const ang = ((Math.atan2(y - it.cy, x - it.cx) - from) * 180 / Math.PI % 360 + 360) % 360;
        return ang <= span;
      }, it.rgb);
    }
  }
  return { imageData: data, widthPx, heightPx };
}

/** A prepared level as the map object runHeadless and map.js expect (cm + pixels). */
export function levelMap(prepared) {
  const { imageData, widthPx, heightPx } = rasterise(prepared);
  return {
    width: prepared.size.w, height: prepared.size.h,
    spawnX: prepared.spawn.x, spawnY: prepared.spawn.y, spawnHeading: prepared.spawn.theta,
    imageData, widthPx, heightPx,
  };
}
