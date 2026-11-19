// Seeded map generators for level files (docs/LEVEL_FORMAT.md → Generators): a maze
// and a box scatter, drawn anew for every variant seed. Pure: plain numbers in (cm),
// plain shapes out, which level.js turns into map items like hand-written ones.

/**
 * A maze on a grid of `cols` × `rows` cells of `cell` cm, top-left at (x, y).
 * A perfect maze (one path between any two cells: recursive backtracker from
 * `start`), then `loops` extra openings (so the left-hand rule can fail).
 * → { open: Set of "c,r|c,r" passages, centre(c, r) → [x, y], walls(t) → rects }
 */
export function generateMaze({ cols, rows, cell, x = 0, y = 0, start = [0, 0], loops = 0 }, rng) {
  if (!(cols >= 1 && rows >= 1)) throw new Error('maze: cols and rows must be at least 1');
  const key = (a, b) => (a[0] < b[0] || (a[0] === b[0] && a[1] < b[1]) ? `${a}|${b}` : `${b}|${a}`);
  const inside = ([c, r]) => c >= 0 && r >= 0 && c < cols && r < rows;
  const steps = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const open = new Set();
  const seen = new Set([String(start)]);
  const stack = [start];
  while (stack.length) {
    const cur = stack[stack.length - 1];
    const next = steps.map(([dc, dr]) => [cur[0] + dc, cur[1] + dr]).filter((n) => inside(n) && !seen.has(String(n)));
    if (!next.length) { stack.pop(); continue; }
    const n = next[Math.floor(rng() * next.length)];
    open.add(key(cur, n));
    seen.add(String(n));
    stack.push(n);
  }
  // Extra openings: interior walls knocked down at random.
  const closed = [];
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      if (c + 1 < cols && !open.has(key([c, r], [c + 1, r]))) closed.push(key([c, r], [c + 1, r]));
      if (r + 1 < rows && !open.has(key([c, r], [c, r + 1]))) closed.push(key([c, r], [c, r + 1]));
    }
  }
  for (let i = 0; i < loops && closed.length; i++) open.add(closed.splice(Math.floor(rng() * closed.length), 1)[0]);

  const centre = (c, r) => [x + (c + 0.5) * cell, y + (r + 0.5) * cell];
  const passages = [...open].map((k) => k.split('|').map((s) => s.split(',').map(Number)));
  /** Wall rectangles (thickness t) on every closed cell side, outer boundary included. */
  const walls = (t) => {
    const out = [];
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        const x0 = x + c * cell, y0 = y + r * cell;
        if (r === 0) out.push({ x: x0 - t / 2, y: y0 - t / 2, w: cell + t, h: t });
        if (c === 0) out.push({ x: x0 - t / 2, y: y0 - t / 2, w: t, h: cell + t });
        if (c + 1 === cols || !open.has(key([c, r], [c + 1, r]))) out.push({ x: x0 + cell - t / 2, y: y0 - t / 2, w: t, h: cell + t });
        if (r + 1 === rows || !open.has(key([c, r], [c, r + 1]))) out.push({ x: x0 - t / 2, y: y0 + cell - t / 2, w: cell + t, h: t });
      }
    }
    return out;
  };
  return { open, passages, centre, walls };
}

/**
 * `count` rectangles of w × h placed at random inside `area` ({ x, y, w, h }), at
 * least `gap` cm apart from each other (so a robot fits between them), and clear of
 * every `keepClear` rectangle (spawn, finish…).
 * Rejection sampling; throws when they do not fit.
 */
export function scatterRects({ count, w, h, area, gap = 0, keepClear = [] }, rng) {
  const apart = (a, b, g) => a.x + a.w + g <= b.x || b.x + b.w + g <= a.x || a.y + a.h + g <= b.y || b.y + b.h + g <= a.y;
  // Greedy placement can block itself: start the whole set again (up to 50 times).
  let best = 0;
  for (let round = 0; round < 50; round++) {
    const placed = [];
    for (let attempt = 0; attempt < 500 && placed.length < count; attempt++) {
      const r = { x: area.x + rng() * Math.max(0, area.w - w), y: area.y + rng() * Math.max(0, area.h - h), w, h };
      r.x = Math.round(r.x * 2) / 2; r.y = Math.round(r.y * 2) / 2;   // half-cm marks
      if (placed.every((p) => apart(p, r, gap)) && keepClear.every((k) => apart(k, r, 0))) placed.push(r);
    }
    if (placed.length === count) return placed;
    best = Math.max(best, placed.length);
  }
  throw new Error(`scatter: could not place ${count} items of ${w} × ${h} with gap ${gap} (best ${best})`);
}

/** A variant seed and an item's position → an independent, repeatable stream seed. */
export function itemSeed(seed, index) {
  return (Math.imul(seed >>> 0, 2654435761) ^ Math.imul(index + 1, 40503)) >>> 0;
}
