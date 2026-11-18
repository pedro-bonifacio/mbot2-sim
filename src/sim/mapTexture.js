import { DISPLAY_SCALE } from './constants.js';

// How walls look on screen. Map PNGs and level maps mark walls in magenta (CLAUDE.md
// §9); students see bricks instead, with a darker rim and a soft shadow on the floor,
// and the same bricks fill everything outside the map. Display only: sensors and
// collision keep reading the original pixels (map.js).
//
// Everything is generated, deterministic, at the map's 8 px = 1 cm scale.

const S = DISPLAY_SCALE;                    // px per cm
const BRICK_W = 6 * S, BRICK_H = 3 * S;     // 6 × 3 cm bricks
const MORTAR = Math.max(1, Math.round(0.3 * S));
const TILE_W = BRICK_W * 8, TILE_H = BRICK_H * 8;   // tile = 8 × 8 bricks, then repeats
const BRICK_RGB = [176, 92, 62];
const MORTAR_RGB = [214, 206, 194];
const RIM_PX = Math.round(0.4 * S);         // darker rim inside the wall edge
const SHADOW_PX = Math.round(0.6 * S);      // shadow on the floor below/right of walls

// Small integer hash → [0, 1)
function hash(a, b) {
  let h = (a * 374761393 + b * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Brick colour at world pixel (x, y) (any integers, also negative). */
function brickAt(x, y) {
  const row = Math.floor(y / BRICK_H);
  const shift = (((row % 2) + 2) % 2) * (BRICK_W / 2);
  const col = Math.floor((x + shift) / BRICK_W);
  const lx = (((x + shift) % BRICK_W) + BRICK_W) % BRICK_W;
  const ly = ((y % BRICK_H) + BRICK_H) % BRICK_H;
  const grain = (hash(x, y) - 0.5) * 14;
  if (lx < MORTAR || ly < MORTAR) return MORTAR_RGB.map((c) => c + grain * 0.5);
  // each brick a slightly different shade; tile repeats every 8 bricks
  const tint = (hash(((col % 8) + 8) % 8, ((row % 8) + 8) % 8) - 0.5) * 34;
  const edge = lx < MORTAR + 2 || ly < MORTAR + 2 ? 10 : 0;   // light top-left brick edge
  return BRICK_RGB.map((c, i) => c + tint + grain + edge - (i === 0 ? 0 : tint * 0.3));
}

let tileCanvas = null;   // (tilePixels is defined below; tile() is only called later)
function tile() {
  if (tileCanvas) return tileCanvas;
  tileCanvas = document.createElement('canvas');
  tileCanvas.width = TILE_W;
  tileCanvas.height = TILE_H;
  const tctx = tileCanvas.getContext('2d');
  const img = tctx.createImageData(TILE_W, TILE_H);
  img.data.set(tilePixels());
  tctx.putImageData(img, 0, 0);
  return tileCanvas;
}

/** A repeating brick pattern for `ctx`, aligned with the map's walls (world px origin). */
export function wallPattern(ctx) {
  return ctx.createPattern(tile(), 'repeat');
}

const isWall = (d, i) => {
  const dr = d[i] - 255, dg = d[i + 1], db = d[i + 2] - 255;
  return dr * dr + dg * dg + db * db <= 40 * 40;   // map.js TOLERANCE around #ff00ff
};

/** Brick pixel at world px (x, y) as [r, g, b] (the tile repeats). */
const tilePixels = (() => {
  let data = null;
  return () => {
    if (data) return data;
    data = new Uint8ClampedArray(TILE_W * TILE_H * 4);
    for (let y = 0; y < TILE_H; y++) for (let x = 0; x < TILE_W; x++) {
      const [r, g, b] = brickAt(x, y);
      const i = (y * TILE_W + x) * 4;
      data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = 255;
    }
    return data;
  };
})();

/**
 * The map's RGBA pixels as students see them: magenta walls as bricks with a darker
 * rim, a soft shadow on the floor next to walls. Pure (no DOM), so scripts can render it.
 */
export function texturePixels(pixels, w, h) {
  const d = new Uint8ClampedArray(pixels);
  const wall = new Uint8Array(w * h);
  for (let p = 0; p < w * h; p++) wall[p] = isWall(pixels, p * 4) ? 1 : 0;
  const wallAt = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 1 : wall[y * w + x]);   // outside = wall
  const t = tilePixels();
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = y * w + x, i = p * 4;
      if (wall[p]) {
        const ti = ((y % TILE_H) * TILE_W + (x % TILE_W)) * 4;
        let rim = 1;   // darker rim where the wall meets the floor
        for (let k = 1; k <= RIM_PX; k++) {
          if (!wallAt(x - k, y) || !wallAt(x + k, y) || !wallAt(x, y - k) || !wallAt(x, y + k)) { rim = 0.62 + 0.3 * (k - 1) / RIM_PX; break; }
        }
        d[i] = t[ti] * rim; d[i + 1] = t[ti + 1] * rim; d[i + 2] = t[ti + 2] * rim; d[i + 3] = 255;
      } else {
        // soft shadow on the floor below / right of a wall (light from the top-left)
        for (let k = 1; k <= SHADOW_PX; k++) {
          if (wallAt(x - k, y) || wallAt(x, y - k) || wallAt(x - k, y - k)) {
            const f = 0.78 + 0.2 * (k - 1) / SHADOW_PX;
            d[i] *= f; d[i + 1] *= f; d[i + 2] *= f;
            break;
          }
        }
      }
    }
  }
  return d;
}

/** The map as students see it, as a canvas (browser). */
export function texturedMap(source, pixels) {
  const out = document.createElement('canvas');
  out.width = source.width;
  out.height = source.height;
  const octx = out.getContext('2d');
  const img = octx.createImageData(out.width, out.height);
  img.data.set(texturePixels(pixels, out.width, out.height));
  octx.putImageData(img, 0, 0);
  return out;
}
