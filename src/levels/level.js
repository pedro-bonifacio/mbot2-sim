import { evalNumber, exprNames, interpolate } from './expr.js';
import { createRng } from '../sim/random.js';

// A level file (YAML → plain object, docs/LEVEL_FORMAT.md) plus a variant seed →
// a "prepared" level: every expression evaluated, every position in cm, colours as
// RGB. The rasteriser, the referee and the browser only ever see prepared levels.

export const DEFAULT_SIZE = { w: 200, h: 122.5 };   // cm: the standard 1600 × 980 px arena
// Course boards (decision 0018): K-line sheets of 100 × 70 cm, 1 to 3 per course,
// joined along their long sides. `board: true` = 1 sheet. Other arrangements: `size`.
export const BOARD_SIZES = { 1: { w: 100, h: 70 }, 2: { w: 140, h: 100 }, 3: { w: 210, h: 100 } };
export const DEFAULT_TIME_LIMIT_S = 60;
const BORDER_CM = 1;                                // ≥ 0.625 cm, the minimum wall

// The quad RGB sensor's 8 colours (CLAUDE.md §10) — the only floor colours a level
// may use, by name. Walls and boxes are magenta, reserved for collision.
export const FLOOR_COLOURS = {
  red: [204, 0, 0], yellow: [255, 255, 0], green: [51, 204, 0], cyan: [51, 255, 255],
  blue: [51, 102, 255], purple: [204, 51, 204], white: [255, 255, 255], black: [0, 0, 0],
};
export const WALL_RGB = [255, 0, 255];

export const GOAL_TYPES = ['reachZone', 'robotStoppedIn', 'noCollision', 'displayShows', 'ledColour',
  'tonePlayed', 'sequence', 'stayIn'];
const PROBES = ['centre', 'front'];
const STEP_KINDS = ['display', 'leds', 'tone', 'zone'];
// Values of the run itself that `displayShows: { number }` may use, besides the
// variant parameters (the referee supplies them when it judges).
export const RUN_VALUES = ['drivenCm', 'movingS'];

/**
 * Variant parameter values for `seed`, drawn in declaration order: { name: value }.
 * A `choices` entry may be a number, a text (e.g. a colour name or a word) or a
 * case — an object whose keys all become parameters (and the name the case's index).
 */
export function variantParams(level, seed) {
  const defs = (level.variants && level.variants.params) || {};
  const rng = createRng(seed);
  const params = {};
  for (const [name, def] of Object.entries(defs)) {
    if (Array.isArray(def.choices)) {
      const k = Math.floor(rng() * def.choices.length);
      const pick = def.choices[k];
      if (pick && typeof pick === 'object') { params[name] = k; Object.assign(params, pick); }
      else params[name] = pick;
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

/**
 * `line: { smooth: true }`: a curve through every point (centripetal Catmull-Rom),
 * as a polyline of ~1 cm steps — so a track is drawn from a few waypoints.
 */
export function smoothPath(pts, stepCm = 1) {
  if (pts.length < 3) return pts;
  const P = [pts[0], ...pts, pts[pts.length - 1]];
  const out = [pts[0]];
  for (let i = 1; i + 2 < P.length; i++) {
    const [p0, p1, p2, p3] = [P[i - 1], P[i], P[i + 1], P[i + 2]];
    const t = (a, b) => Math.max(1e-6, Math.hypot(b[0] - a[0], b[1] - a[1]) ** 0.5);
    const t1 = t(p0, p1), t2 = t1 + t(p1, p2), t3 = t2 + t(p2, p3);
    const lerp = (a, b, ta, tb, u) => (tb === ta ? a : [0, 1].map((k) => ((tb - u) * a[k] + (u - ta) * b[k]) / (tb - ta)));
    const n = Math.max(1, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / stepCm));
    for (let k = 1; k <= n; k++) {
      const u = t1 + (t2 - t1) * k / n;
      const a1 = lerp(p0, p1, 0, t1, u), a2 = lerp(p1, p2, t1, t2, u), a3 = lerp(p2, p3, t2, t3, u);
      const b1 = lerp(a1, a2, 0, t2, u), b2 = lerp(a2, a3, t1, t3, u);
      out.push(lerp(b1, b2, t1, t2, u).map(round));
    }
  }
  return out;
}

/** Prepares `level` for variant `seed`. Throws with a readable message on bad data. */
export function prepareLevel(level, seed = testSeeds(level)[0]) {
  const params = variantParams(level, seed);
  const where = (path) => (e) => { throw new Error(`${level.id}: ${path}: ${e.message}`); };
  const num = (v, path) => { try { return evalNumber(v, params); } catch (e) { return where(path)(e); } };
  // settle / stall: seconds, "never" (→ Infinity) or absent (→ the referee's default)
  const seconds = (v, path) => (v === undefined ? undefined : v === 'never' ? Infinity : num(v, path));
  // A colour: one of the 8 names, or a parameter holding one (e.g. `colour: c`).
  const colourName = (name, path) => {
    const n = typeof params[name] === 'string' ? params[name] : name;
    if (!FLOOR_COLOURS[n]) throw new Error(`${level.id}: ${path}: colour "${n}" is not one of ${Object.keys(FLOOR_COLOURS).join(', ')}`);
    return n;
  };
  const colour = (name, path) => FLOOR_COLOURS[colourName(name, path)];
  const text = (t, path) => { try { return interpolate(t, params); } catch (e) { return where(path)(e); } };
  const fromVariant = (v) => typeof v === 'string' && (/\{/.test(v) || Object.prototype.hasOwnProperty.call(params, v));
  // `when: <expression>` on a map item or zone: left out of this variant when it is 0.
  const included = (entry, path) => entry.when === undefined || num(entry.when, `${path}.when`) !== 0;

  // Layout choice: a level with `layouts` (named, hand-drawn alternatives) picks one
  // per variant with its text parameter `layout`. The layout's items paint after
  // map.items, its zones join the level's (same id: the layout's wins), its spawn
  // replaces the level's.
  let layout = null;
  if (level.layouts) {
    const name = params.layout;
    if (typeof name !== 'string' || !level.layouts[name]) {
      throw new Error(`${level.id}: variants.params.layout must pick one of the layouts (${Object.keys(level.layouts).join(', ')}), got ${JSON.stringify(name)}`);
    }
    layout = { name, ...level.layouts[name] };
  }

  const map = level.map || {};
  const sheets = map.board === true ? 1 : (map.board || 0);
  if (sheets && !BOARD_SIZES[sheets]) throw new Error(`${level.id}: map.board: true, 1, 2 or 3 (sheets)`);
  const board = sheets > 0;
  const defSize = board ? BOARD_SIZES[sheets] : DEFAULT_SIZE;
  const size = { w: num(map.size?.w ?? defSize.w, 'map.size.w'), h: num(map.size?.h ?? defSize.h, 'map.size.h') };
  const items = [];
  if (map.border ?? !board) {
    const b = BORDER_CM;
    for (const [x, y, w, h] of [[0, 0, size.w, b], [0, size.h - b, size.w, b], [0, 0, b, size.h], [size.w - b, 0, b, size.h]]) {
      items.push({ type: 'rect', x, y, w, h, angle: 0, rgb: WALL_RGB, wall: true, border: true });
    }
  }
  const itemList = [
    ...(map.items || []).map((entry, i) => [entry, `map.items[${i}]`]),
    ...(layout?.items || []).map((entry, i) => [entry, `layouts.${layout.name}.items[${i}]`]),
  ];
  itemList.forEach(([entry, at]) => {
    const [kind, d] = Object.entries(entry).find(([k]) => k !== 'when') || [];
    const p = `${at}.${kind}`;
    if (!included(entry, at)) return;
    const shape = (o) => (o.r !== undefined
      ? { type: 'circle', cx: num(o.cx, `${p}.cx`), cy: num(o.cy, `${p}.cy`), r: num(o.r, `${p}.r`) }
      : { type: 'rect', x: num(o.x, `${p}.x`), y: num(o.y, `${p}.y`), w: num(o.w, `${p}.w`), h: num(o.h, `${p}.h`), angle: num(o.angle ?? 0, `${p}.angle`) });
    if (kind === 'wall' || kind === 'box') items.push({ ...shape(d), rgb: WALL_RGB, wall: true });
    else if (kind === 'patch') items.push({ ...shape(d), rgb: colour(d.colour, `${p}.colour`) });
    else if (kind === 'line') {
      const pts = d.points.map((pt, j) => [num(pt[0], `${p}.points[${j}][0]`), num(pt[1], `${p}.points[${j}][1]`)]);
      items.push({ type: 'line', width: num(d.width ?? 2, `${p}.width`), rgb: colour(d.colour ?? 'black', `${p}.colour`),
        points: d.smooth ? smoothPath(pts) : pts });
    } else if (kind === 'arc') {
      items.push({ type: 'arc', cx: num(d.cx, `${p}.cx`), cy: num(d.cy, `${p}.cy`), r: num(d.r, `${p}.r`),
        from: num(d.from ?? 0, `${p}.from`), to: num(d.to ?? 360, `${p}.to`),
        width: num(d.width ?? 2, `${p}.width`), rgb: colour(d.colour ?? 'black', `${p}.colour`) });
    } else throw new Error(`${level.id}: ${p}: unknown map item "${kind}" (wall, box, patch, line, arc)`);
  });

  const [sp, spAt] = layout?.spawn ? [layout.spawn, `layouts.${layout.name}.spawn`] : [level.spawn, 'spawn'];
  if (!sp) throw new Error(`${level.id}: spawn is required (in the level or in every layout)`);
  const spawn = {
    x: num(sp.x, `${spAt}.x`), y: num(sp.y, `${spAt}.y`),
    theta: num(sp.heading ?? 0, `${spAt}.heading`) * Math.PI / 180,
  };

  const zones = {};
  [
    ...(level.zones || []).map((z, i) => [z, `zones[${i}]`]),
    ...(layout?.zones || []).map((z, i) => [z, `layouts.${layout.name}.zones[${i}]`]),
  ].forEach(([z, p]) => {
    if (!z.id) throw new Error(`${level.id}: ${p}: a zone needs an id`);
    if (!included(z, p)) return;
    zones[z.id] = z.r !== undefined
      ? { id: z.id, label: z.label, type: 'circle', cx: num(z.cx, `${p}.cx`), cy: num(z.cy, `${p}.cy`), r: num(z.r, `${p}.r`) }
      : { id: z.id, label: z.label, type: 'rect', x: num(z.x, `${p}.x`), y: num(z.y, `${p}.y`), w: num(z.w, `${p}.w`), h: num(z.h, `${p}.h`) };
  });

  const goals = (level.goals || []).map((g, i) => {
    const [type, raw] = typeof g === 'string' ? [g, {}] : Object.entries(g)[0];
    const d = raw || {};
    const p = `goals[${i}].${type}`;
    if (!GOAL_TYPES.includes(type)) throw new Error(`${level.id}: ${p}: unknown goal (${GOAL_TYPES.join(', ')})`);
    const zoneRef = (z, probe, path) => {
      if (!zones[z]) throw new Error(`${level.id}: ${path}: no zone "${z}"`);
      if (probe && !PROBES.includes(probe)) throw new Error(`${level.id}: ${path}: probe must be ${PROBES.join(' or ')}`);
    };
    if (type === 'reachZone' || type === 'robotStoppedIn' || type === 'stayIn') zoneRef(d.zone, d.probe, p);
    if (type === 'ledColour') return { type, ...d, colour: colourName(d.colour, `${p}.colour`), secret: fromVariant(d.colour) };
    if (type === 'displayShows') {
      if ([d.text, d.number, d.any].filter((x) => x !== undefined).length !== 1) throw new Error(`${level.id}: ${p}: give one of text, number, any`);
      if (d.any) return { type, ...d };
      if (d.text !== undefined) return { type, ...d, text: text(d.text, `${p}.text`), secret: fromVariant(d.text) };
      // number ± tolerance; may use the run's values, so it is worked out when judged
      const run = Object.fromEntries(RUN_VALUES.map((n) => [n, 0]));
      try { evalNumber(d.number, { ...params, ...run }); } catch (e) { where(`${p}.number`)(e); }
      const usesRun = exprNames(d.number).some((n) => RUN_VALUES.includes(n));
      return { type, ...d, tolerance: num(d.tolerance ?? 0, `${p}.tolerance`), params,
        expected: usesRun ? undefined : num(d.number, `${p}.number`), secret: true };
    }
    if (type === 'tonePlayed') {
      return { type, ...d, frequency: d.frequency === undefined ? undefined : num(d.frequency, `${p}.frequency`),
        duration: d.duration === undefined ? undefined : num(d.duration, `${p}.duration`),
        tolerance: num(d.tolerance ?? 1, `${p}.tolerance`) };
    }
    if (type === 'sequence') {
      const once = (d.steps || []).map((st, j) => {
        const sp = `${p}.steps[${j}]`;
        const kind = STEP_KINDS.find((k) => st && st[k] !== undefined);
        if (!kind) throw new Error(`${level.id}: ${sp}: a step is one of ${STEP_KINDS.join(', ')}`);
        if (kind === 'display') return { kind, text: text(st.display, `${sp}.display`) };
        if (kind === 'leds') return { kind, colour: st.leds === 'off' ? 'off' : colourName(st.leds, `${sp}.leds`) };
        if (kind === 'tone') return { kind, frequency: num(st.tone, `${sp}.tone`), tolerance: num(st.tolerance ?? 1, `${sp}.tolerance`) };
        zoneRef(st.zone, st.probe, sp);
        return { kind, zone: st.zone, probe: st.probe };
      });
      if (!once.length) throw new Error(`${level.id}: ${p}: steps must not be empty`);
      const times = num(d.times ?? 1, `${p}.times`);
      return { type, label: d.label, times, pattern: once, steps: Array.from({ length: times }, () => once).flat() };
    }
    return { type, ...d };
  });
  if (!goals.length) throw new Error(`${level.id}: at least one goal is required`);

  return {
    id: level.id, title: level.title, objective: level.objective, seed, params, layout: layout?.name,
    board, timeLimitS: num(level.timeLimit ?? DEFAULT_TIME_LIMIT_S, 'timeLimit'),
    settleS: seconds(level.settle, 'settle'), stallS: seconds(level.stall, 'stall'),
    size, items, spawn, zones, goals,
  };
}
