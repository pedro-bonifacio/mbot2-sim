import { evalNumber } from './expr.js';
import { createRng } from '../sim/random.js';

// A level file (YAML → plain object, docs/LEVEL_FORMAT.md) plus a variant seed →
// a "prepared" level: every expression evaluated, every position in cm, colours as
// RGB. The rasteriser, the referee and the browser only ever see prepared levels.

export const DEFAULT_SIZE = { w: 200, h: 122.5 };   // cm: the standard 1600 × 980 px arena
export const DEFAULT_TIME_LIMIT_S = 60;
const BORDER_CM = 1;                                // ≥ 0.625 cm, the minimum wall

// The quad RGB sensor's 8 colours (CLAUDE.md §10) — the only floor colours a level
// may use, by name. Walls and boxes are magenta, reserved for collision.
export const FLOOR_COLOURS = {
  red: [204, 0, 0], yellow: [255, 255, 0], green: [51, 204, 0], cyan: [51, 255, 255],
  blue: [51, 102, 255], purple: [204, 51, 204], white: [255, 255, 255], black: [0, 0, 0],
};
export const WALL_RGB = [255, 0, 255];

export const GOAL_TYPES = ['reachZone', 'robotStoppedIn', 'noCollision', 'displayShows', 'ledColour'];
const PROBES = ['centre', 'front'];

/** Variant parameter values for `seed`: { name: number }, drawn in declaration order. */
export function variantParams(level, seed) {
  const defs = (level.variants && level.variants.params) || {};
  const rng = createRng(seed);
  const params = {};
  for (const [name, def] of Object.entries(defs)) {
    if (Array.isArray(def.choices)) {
      params[name] = def.choices[Math.floor(rng() * def.choices.length)];
    } else {
      const step = def.step ?? 1;
      const n = Math.floor((def.max - def.min) / step + 1e-9) + 1;
      params[name] = round(def.min + Math.floor(rng() * n) * step);
    }
  }
  return params;
}

/** The seeds a level is tested on (★★). Levels without variants have one: 1. */
export function testSeeds(level) {
  return (level.variants && level.variants.seeds) || [1];
}

const round = (x) => Math.round(x * 1e6) / 1e6;

/** Prepares `level` for variant `seed`. Throws with a readable message on bad data. */
export function prepareLevel(level, seed = testSeeds(level)[0]) {
  const params = variantParams(level, seed);
  const where = (path) => (e) => { throw new Error(`${level.id}: ${path}: ${e.message}`); };
  const num = (v, path) => { try { return evalNumber(v, params); } catch (e) { return where(path)(e); } };
  const colour = (name, path) => {
    if (!FLOOR_COLOURS[name]) throw new Error(`${level.id}: ${path}: colour "${name}" is not one of ${Object.keys(FLOOR_COLOURS).join(', ')}`);
    return FLOOR_COLOURS[name];
  };

  const map = level.map || {};
  const size = { w: num(map.size?.w ?? DEFAULT_SIZE.w, 'map.size.w'), h: num(map.size?.h ?? DEFAULT_SIZE.h, 'map.size.h') };
  const items = [];
  if (map.border !== false) {
    const b = BORDER_CM;
    for (const [x, y, w, h] of [[0, 0, size.w, b], [0, size.h - b, size.w, b], [0, 0, b, size.h], [size.w - b, 0, b, size.h]]) {
      items.push({ type: 'rect', x, y, w, h, angle: 0, rgb: WALL_RGB, wall: true });
    }
  }
  (map.items || []).forEach((entry, i) => {
    const [kind, d] = Object.entries(entry)[0];
    const p = `map.items[${i}].${kind}`;
    const shape = (o) => (o.r !== undefined
      ? { type: 'circle', cx: num(o.cx, `${p}.cx`), cy: num(o.cy, `${p}.cy`), r: num(o.r, `${p}.r`) }
      : { type: 'rect', x: num(o.x, `${p}.x`), y: num(o.y, `${p}.y`), w: num(o.w, `${p}.w`), h: num(o.h, `${p}.h`), angle: num(o.angle ?? 0, `${p}.angle`) });
    if (kind === 'wall' || kind === 'box') items.push({ ...shape(d), rgb: WALL_RGB, wall: true });
    else if (kind === 'patch') items.push({ ...shape(d), rgb: colour(d.colour, `${p}.colour`) });
    else if (kind === 'line') {
      items.push({ type: 'line', width: num(d.width ?? 2, `${p}.width`), rgb: colour(d.colour ?? 'black', `${p}.colour`),
        points: d.points.map((pt, j) => [num(pt[0], `${p}.points[${j}][0]`), num(pt[1], `${p}.points[${j}][1]`)]) });
    } else if (kind === 'arc') {
      items.push({ type: 'arc', cx: num(d.cx, `${p}.cx`), cy: num(d.cy, `${p}.cy`), r: num(d.r, `${p}.r`),
        from: num(d.from ?? 0, `${p}.from`), to: num(d.to ?? 360, `${p}.to`),
        width: num(d.width ?? 2, `${p}.width`), rgb: colour(d.colour ?? 'black', `${p}.colour`) });
    } else throw new Error(`${level.id}: ${p}: unknown map item "${kind}" (wall, box, patch, line, arc)`);
  });

  if (!level.spawn) throw new Error(`${level.id}: spawn is required`);
  const spawn = {
    x: num(level.spawn.x, 'spawn.x'), y: num(level.spawn.y, 'spawn.y'),
    theta: num(level.spawn.heading ?? 0, 'spawn.heading') * Math.PI / 180,
  };

  const zones = {};
  (level.zones || []).forEach((z, i) => {
    const p = `zones[${i}]`;
    if (!z.id) throw new Error(`${level.id}: ${p}: a zone needs an id`);
    zones[z.id] = z.r !== undefined
      ? { id: z.id, label: z.label, type: 'circle', cx: num(z.cx, `${p}.cx`), cy: num(z.cy, `${p}.cy`), r: num(z.r, `${p}.r`) }
      : { id: z.id, label: z.label, type: 'rect', x: num(z.x, `${p}.x`), y: num(z.y, `${p}.y`), w: num(z.w, `${p}.w`), h: num(z.h, `${p}.h`) };
  });

  const goals = (level.goals || []).map((g, i) => {
    const [type, raw] = typeof g === 'string' ? [g, {}] : Object.entries(g)[0];
    const d = raw || {};
    const p = `goals[${i}].${type}`;
    if (!GOAL_TYPES.includes(type)) throw new Error(`${level.id}: ${p}: unknown goal (${GOAL_TYPES.join(', ')})`);
    if ((type === 'reachZone' || type === 'robotStoppedIn')) {
      if (!zones[d.zone]) throw new Error(`${level.id}: ${p}: no zone "${d.zone}"`);
      if (d.probe && !PROBES.includes(d.probe)) throw new Error(`${level.id}: ${p}: probe must be ${PROBES.join(' or ')}`);
    }
    if (type === 'ledColour') colour(d.colour, `${p}.colour`);
    return { type, ...d };
  });
  if (!goals.length) throw new Error(`${level.id}: at least one goal is required`);

  return {
    id: level.id, title: level.title, objective: level.objective, seed, params,
    timeLimitS: num(level.timeLimit ?? DEFAULT_TIME_LIMIT_S, 'timeLimit'),
    size, items, spawn, zones, goals,
  };
}
