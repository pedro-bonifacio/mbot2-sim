#!/usr/bin/env node
// Generates public/maps/default.png and public/maps/test-track.png programmatically.
// Uses only Node.js built-ins (zlib). Run once and commit the PNGs.
// Usage: node scripts/generate-maps.js
//
// Scale convention: 8 px = 1 cm. Standard canvas = 1600×980 px (200×122.5 cm).
// Spawn rectangle = 140×104 px (17.5×13 cm — exactly the mBot 2 footprint).

import { deflateSync } from 'zlib';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MAPS_DIR = join(__dirname, '../public/maps');
mkdirSync(MAPS_DIR, { recursive: true });

// ── PNG helpers ──────────────────────────────────────────────────────────────

const _crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (const b of buf) c = _crcTable[(c ^ b) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function makePNG(w, h, rgbData) {
  // Build raw scanlines: filter byte 0 (None) + RGB per row
  const raw = Buffer.alloc(h * (1 + w * 3));
  for (let y = 0; y < h; y++) {
    raw[y * (1 + w * 3)] = 0;
    for (let x = 0; x < w; x++) {
      const src = (y * w + x) * 3;
      const dst = y * (1 + w * 3) + 1 + x * 3;
      raw[dst]     = rgbData[src];
      raw[dst + 1] = rgbData[src + 1];
      raw[dst + 2] = rgbData[src + 2];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 2; // 8-bit depth, RGB colour type
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),  // PNG signature
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function canvas(w, h) {
  const data = new Uint8Array(w * h * 3).fill(255); // white

  function pixel(x, y, r, g, b) {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const i = (y * w + x) * 3;
    data[i] = r; data[i + 1] = g; data[i + 2] = b;
  }

  function rect(x0, y0, x1, y1, r, g, b) {
    for (let y = y0; y < y1; y++)
      for (let x = x0; x < x1; x++)
        pixel(x, y, r, g, b);
  }

  return { data, pixel, rect, toBuffer: () => makePNG(w, h, data) };
}

// ── default.png (1600×980) ───────────────────────────────────────────────────
// Canvas: 200×122.5 cm at 8 px/cm.
// Spawn: cyan 140×104 px centred at (800, 840 px) = (100, 105 cm).
// Yellow marker on TOP of cyan → heading = north (−π/2).
{
  const W = 1600, H = 980;
  const c = canvas(W, H);

  // Magenta perimeter border — 5 px thick (= 0.625 cm)
  c.rect(0, 0, W, 5, 255, 0, 255);        // top
  c.rect(0, H - 5, W, H, 255, 0, 255);    // bottom
  c.rect(0, 0, 5, H, 255, 0, 255);        // left
  c.rect(W - 5, 0, W, H, 255, 0, 255);   // right

  // Magenta obstacle block — 80×80 px (= 10×10 cm) off-centre
  c.rect(900, 60, 980, 140, 255, 0, 255);

  // Cyan spawn zone: 140×104 centred at (800, 840) — [730,870) × [788,892)
  // Bottom of cyan at y=892; bottom border starts at y=975 → 83 px clearance > 80 px ✓
  c.rect(730, 788, 870, 892, 0, 255, 255);

  // Yellow direction marker: 16×16 centred at (800, 780), on TOP edge of cyan
  // atan2(780-840, 800-800) = atan2(-60, 0) = −π/2 → heading north ✓
  c.rect(792, 772, 808, 788, 255, 255, 0);

  writeFileSync(join(MAPS_DIR, 'default.png'), c.toBuffer());
  console.log('Generated default.png — 1600×980 px (200×122.5 cm), spawn (100, 105) cm, heading north');
}

// ── test-track.png (1600×980) ─────────────────────────────────────────────────
// Rectangular loop track (15 px wide black lines).
// Spawn: cyan 140×104 px at bottom-left of track, heading east.
{
  const W = 1600, H = 980;
  const c = canvas(W, H);

  // Magenta perimeter border — 5 px thick
  c.rect(0, 0, W, 5, 255, 0, 255);
  c.rect(0, H - 5, W, H, 255, 0, 255);
  c.rect(0, 0, 5, H, 255, 0, 255);
  c.rect(W - 5, 0, W, H, 255, 0, 255);

  // Rectangular loop track — 15 px wide black lines
  // Inner region: [135,1465) × [145,840) — track border follows the inside edge
  c.rect(120, 130, 1480, 145, 0, 0, 0);   // top segment
  c.rect(120, 840, 1480, 855, 0, 0, 0);   // bottom segment
  c.rect(120, 130, 135, 855, 0, 0, 0);    // left segment
  c.rect(1465, 130, 1480, 855, 0, 0, 0);  // right segment

  // Cyan spawn zone: 140×104 centred at (300, 848) — [230,370) × [796,900)
  // Positioned on the bottom track segment. Cyan overwrites the black track pixels
  // in the spawn area; robot immediately drives east off the zone.
  c.rect(230, 796, 370, 900, 0, 255, 255);

  // Yellow marker: 16×16 to the RIGHT of cyan at [370,386) × [840,856)
  // Centroid ≈ (378, 848). atan2(848-848, 378-300) = 0 → heading east ✓
  c.rect(370, 840, 386, 856, 255, 255, 0);

  writeFileSync(join(MAPS_DIR, 'test-track.png'), c.toBuffer());
  console.log('Generated test-track.png — 1600×980 px (200×122.5 cm), spawn (37.5, 106) cm, heading east');
}
