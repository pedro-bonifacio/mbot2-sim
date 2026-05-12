// World coordinate system:
// +x = right, +y = down (matches canvas origin top-left)
// theta = 0 means facing +x (east); positive theta = clockwise on screen (y-down)
// 8 canvas pixels = 1 cm (DISPLAY_SCALE = 8); map PNGs are authored at 8 px/cm.
import { DISPLAY_SCALE } from './constants.js';

export const PX_PER_CM = DISPLAY_SCALE;

// Convert world (cm) → screen-pixel space. Camera transform is applied separately by canvas.js.
export function worldToScreen(xCm, yCm) {
  return { xPx: xCm * PX_PER_CM, yPx: yCm * PX_PER_CM };
}

// Convert a raw canvas pixel position → world cm, accounting for camera offset and scale.
export function screenToWorld(xPx, yPx, camera) {
  return {
    xCm: (xPx - camera.offsetX) / (camera.scale * PX_PER_CM),
    yCm: (yPx - camera.offsetY) / (camera.scale * PX_PER_CM),
  };
}
