// Loads a map PNG from a URL, scans for reserved spawn-marker colours,
// and returns everything map.js and robot.js need.
//
// Reserved colours (exact RGB, no tolerance):
//   #00ffff (cyan)   — spawn zone body; centroid = robot start position
//   #ffff00 (yellow) — spawn direction marker; vector from cyan→yellow = heading
//   #ff00ff (magenta) — obstacle (handled in map.js, not here)
//
// Returned dimensions (width, height) and spawn (spawnX, spawnY) are in cm.
// imageData and offscreenCanvas remain at native PNG pixel resolution.
//
// IMPORTANT: createImageBitmap is called with colorSpaceConversion:'none' so
// that the browser returns the exact stored RGB bytes regardless of any embedded
// ICC/sRGB profile.  Without this, Chrome converts tagged sRGB images to the
// display colour space (e.g. Display P3) before getImageData(), causing exact-
// colour comparisons (r===0 && g===255 && b===255) to fail on wide-gamut displays.

import { DISPLAY_SCALE, CANVAS_MAX_WIDTH_PX, CANVAS_MAX_HEIGHT_PX } from './constants.js';

const MIN_W = 100;  // px
const MIN_H = 100;  // px

export async function loadMapFromUrl(url) {
  // Step 1: load the image element (fires img.onload / img.onerror).
  const img = await new Promise((resolve, reject) => {
    const el = new Image();
    el.crossOrigin = 'anonymous';
    el.onload  = () => resolve(el);
    el.onerror = () => reject(new Error(`Failed to load map image: ${url}`));
    el.src = url;
  });

  const w = img.naturalWidth;
  const h = img.naturalHeight;

  if (w < MIN_W || h < MIN_H) {
    throw new Error(`Map too small: ${w}×${h} px (min ${MIN_W}×${MIN_H} px)`);
  }
  if (w > CANVAS_MAX_WIDTH_PX || h > CANVAS_MAX_HEIGHT_PX) {
    throw new Error(`Map too large: ${w}×${h} px (max ${CANVAS_MAX_WIDTH_PX}×${CANVAS_MAX_HEIGHT_PX} px)`);
  }

  // Step 2: rasterise to an offscreen canvas.
  // colorSpaceConversion:'none' bypasses any ICC/sRGB→display colour conversion
  // so getImageData() returns the exact bytes stored in the PNG file.
  const bitmap = await createImageBitmap(img, { colorSpaceConversion: 'none' });

  const oc = document.createElement('canvas');
  oc.width = w;
  oc.height = h;
  const ctx = oc.getContext('2d');
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();

  const imageData = ctx.getImageData(0, 0, w, h).data;

  // Pass 1 — cyan spawn zone centroid (pixel coords)
  let cxSum = 0, cySum = 0, cCount = 0;
  // Pass 2 — yellow direction marker centroid (pixel coords)
  let yxSum = 0, yySum = 0, yCount = 0;

  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const i = (py * w + px) * 4;
      const r = imageData[i], g = imageData[i + 1], b = imageData[i + 2], a = imageData[i + 3];
      if (a === 0) continue;

      if (r === 0 && g === 255 && b === 255) {
        cxSum += px; cySum += py; cCount++;
      } else if (r === 255 && g === 255 && b === 0) {
        yxSum += px; yySum += py; yCount++;
      }
    }
  }

  let spawnXpx, spawnYpx;
  if (cCount === 0) {
    console.warn('[mapLoader] No cyan spawn zone found; defaulting to canvas centre');
    spawnXpx = w / 2;
    spawnYpx = h / 2;
  } else {
    spawnXpx = cxSum / cCount;
    spawnYpx = cySum / cCount;
  }

  let spawnHeading;
  if (yCount === 0) {
    console.warn('[mapLoader] No yellow direction marker found; defaulting to heading 0 (east)');
    spawnHeading = 0;
  } else {
    const ycx = yxSum / yCount;
    const ycy = yySum / yCount;
    // atan2 in canvas coords (y-down): matches robot.theta convention directly
    spawnHeading = Math.atan2(ycy - spawnYpx, ycx - spawnXpx);
  }

  // px → cm for world-space spawn coords
  const spawnX = spawnXpx / DISPLAY_SCALE;
  const spawnY = spawnYpx / DISPLAY_SCALE;

  const wCm = w / DISPLAY_SCALE;
  const hCm = h / DISPLAY_SCALE;

  console.log(
    `[mapLoader] Map size: ${wCm} \xD7 ${hCm} cm (${w} \xD7 ${h} px), ` +
    `spawn (${spawnX.toFixed(1)}, ${spawnY.toFixed(1)}) cm, ` +
    `heading ${(spawnHeading * 180 / Math.PI).toFixed(1)}\xB0`
  );

  return {
    width:  wCm,
    height: hCm,
    spawnX,
    spawnY,
    spawnHeading,
    offscreenCanvas: oc,
    imageData,
  };
}
