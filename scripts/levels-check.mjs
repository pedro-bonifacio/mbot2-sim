#!/usr/bin/env node
// Checks every level in levels/ (decision 0009). Per level:
//   1. the file matches levels/level.schema.json, its id matches its file name and world;
//   2. every variant seed prepares (expressions, zones, colours) and spawns the robot
//      clear of walls;
//   3. solution and anti-solutions only call robotAPI functions that exist;
//   4. the solution passes on every seed (★★);
//   5. every anti-solution fails on at least one seed (the variants enforce the concept);
//   6. writes levels/_previews/<id>.png: the first variant, its zones (blue), the
//      solution's path (red) and the robot at the start (cyan) and end (red).
//
// Usage: node scripts/levels-check.mjs [--verbose] [--no-preview] [id filter]

import fs from 'fs';
import path from 'path';
import pngjs from 'pngjs';

console.log = () => {};   // silence developer logs from the sim
const print = (s) => process.stdout.write(s + '\n');
const { ROOT } = await import('./lib/sim.mjs');
const { levelFiles, loadLevelFile, LEVELS_DIR } = await import('./lib/levels.mjs');
const imp = (p) => import(path.join(ROOT, p));
const { prepareLevel, testSeeds } = await imp('src/levels/level.js');
const { rasterise, levelMap } = await imp('src/levels/raster.js');
const { runLevel } = await imp('src/levels/runLevel.js');
const { setMapData } = await imp('src/sim/map.js');
const { footprintHitsWall, footprintCorners } = await imp('src/sim/collision.js');
const { robotAPI } = await imp('src/sim/robotAPI.js');

const verbose = process.argv.includes('--verbose');
const preview = !process.argv.includes('--no-preview');
const filter = process.argv.slice(2).find((a) => !a.startsWith('--'));
const PREVIEW_DIR = path.join(LEVELS_DIR, '_previews');
const PREVIEW_SCALE = 4;   // px per cm

const API = new Set(Object.keys(robotAPI).filter((k) => !k.startsWith('_')));
function lint(code) {
  return [...String(code).matchAll(/robotAPI\.([A-Za-z_]\w*)/g)].map((m) => m[1]).filter((n) => !API.has(n));
}

function describe(r) {
  const v = r.verdict;
  if (!v) return `${r.status}${r.error ? ' (' + r.error + ')' : ''}, no verdict`;
  const failed = v.goals.filter((g) => !g.passed).map((g) => g.label);
  return `${v.passed ? 'passed' : 'failed'} at ${v.timeS} s (${v.reason})${failed.length ? ': ' + failed.join('; ') : ''}`;
}

let failedLevels = 0;
const ids = new Map();
for (const file of levelFiles()) {
  const rel = path.relative(ROOT, file);
  const problems = [];
  const notes = [];
  let level;
  try {
    const loaded = loadLevelFile(file);
    level = loaded.level;
    problems.push(...loaded.schemaErrors.map((e) => `schema: ${e}`));
  } catch (e) {
    problems.push(`YAML: ${e.message}`);
  }
  if (filter && !(level && String(level.id).includes(filter))) continue;

  if (level && !problems.length) {
    if (ids.has(level.id)) problems.push(`id ${level.id} also used by ${ids.get(level.id)}`);
    ids.set(level.id, rel);
    if (!path.basename(file).startsWith(level.id + '-')) problems.push(`file name must start with "${level.id}-"`);
    if (Number(level.id.slice(0, 2)) !== level.world) problems.push(`id ${level.id} is not in world ${level.world}`);

    const seeds = testSeeds(level);
    for (const seed of seeds) {
      try {
        const prepared = prepareLevel(level, seed);
        const m = levelMap(prepared);
        setMapData({ imageData: m.imageData, width: m.width, height: m.height, offscreenCanvas: { width: m.widthPx, height: m.heightPx } });
        if (footprintHitsWall(m.spawnX, m.spawnY, m.spawnHeading)) problems.push(`seed ${seed}: the robot starts touching a wall`);
      } catch (e) {
        problems.push(`seed ${seed}: ${e.message}`);
      }
    }

    const programs = [['solution', level.solution], ...(level.antiSolutions || []).map((a) => [`anti-solution "${a.name}"`, a.code])];
    for (const [name, code] of programs) {
      const unknown = lint(code);
      if (unknown.length) problems.push(`${name} calls unknown robotAPI.${unknown.join(', robotAPI.')}`);
    }

    if (!problems.length) {
      for (const seed of seeds) {
        const r = runLevel({ level, code: level.solution, seed });
        if (verbose) notes.push(`solution, seed ${seed} ${JSON.stringify(r.params)}: ${describe(r)}`);
        if (!r.verdict || !r.verdict.passed) problems.push(`solution fails seed ${seed} ${JSON.stringify(r.params)}: ${describe(r)}`);
      }
      for (const anti of level.antiSolutions || []) {
        const results = seeds.map((seed) => runLevel({ level, code: anti.code, seed }));
        const failing = results.filter((r) => !r.verdict || !r.verdict.passed);
        if (verbose) results.forEach((r, i) => notes.push(`"${anti.name}", seed ${seeds[i]}: ${describe(r)}`));
        if (!failing.length) problems.push(`anti-solution "${anti.name}" passes every seed — the variants don't catch it`);
        else notes.push(`anti-solution "${anti.name}" fails ${failing.length}/${seeds.length} seeds`);
      }
      if (preview) writePreview(level, seeds[0]);
    }
  }

  if (problems.length) failedLevels++;
  const head = `${problems.length ? 'FAIL' : 'ok  '} ${level && level.id ? level.id + ' ' + (level.title || '') : rel}`;
  print(head + [...problems.map((p) => '\n       ✗ ' + p), ...(verbose || problems.length ? notes : []).map((n) => '\n         ' + n)].join(''));
}

function writePreview(level, seed) {
  const prepared = prepareLevel(level, seed);
  const { imageData, widthPx, heightPx } = rasterise(prepared, PREVIEW_SCALE);
  const img = new pngjs.PNG({ width: widthPx, height: heightPx });
  img.data.set(imageData);
  const blend = (xCm, yCm, rgb, a) => {
    const px = Math.floor(xCm * PREVIEW_SCALE), py = Math.floor(yCm * PREVIEW_SCALE);
    if (px < 0 || py < 0 || px >= widthPx || py >= heightPx) return;
    const i = (py * widthPx + px) * 4;
    for (let k = 0; k < 3; k++) img.data[i + k] = Math.round(img.data[i + k] * (1 - a) + rgb[k] * a);
  };
  const step = 1 / PREVIEW_SCALE;
  for (const z of Object.values(prepared.zones)) {
    const [x0, y0, x1, y1] = z.type === 'circle' ? [z.cx - z.r, z.cy - z.r, z.cx + z.r, z.cy + z.r] : [z.x, z.y, z.x + z.w, z.y + z.h];
    for (let y = y0; y < y1; y += step) for (let x = x0; x < x1; x += step) {
      if (z.type === 'circle' && (x - z.cx) ** 2 + (y - z.cy) ** 2 > z.r ** 2) continue;
      blend(x, y, [40, 110, 255], 0.3);
    }
  }
  const outline = (x, y, theta, rgb) => {
    const c = footprintCorners(x, y, theta);
    for (let k = 0; k < 4; k++) {
      const [ax, ay] = c[k], [bx, by] = c[(k + 1) % 4];
      const n = Math.ceil(Math.hypot(bx - ax, by - ay) / step);
      for (let j = 0; j <= n; j++) blend(ax + (bx - ax) * j / n, ay + (by - ay) * j / n, rgb, 1);
    }
  };
  const r = runLevel({ level, code: level.solution, seed, sampleEvery: 0.05 });
  const { x: sx, y: sy, theta: h } = prepared.spawn;
  for (const [, f, rt] of r.path || []) {
    const x = sx + f * Math.cos(h) - rt * Math.sin(h), y = sy + f * Math.sin(h) + rt * Math.cos(h);
    for (const [dx, dy] of [[0, 0], [step, 0], [0, step], [step, step]]) blend(x + dx, y + dy, [230, 30, 30], 1);
  }
  outline(sx, sy, h, [0, 190, 220]);
  outline(r.world.x, r.world.y, r.world.heading * Math.PI / 180, [230, 30, 30]);
  fs.mkdirSync(PREVIEW_DIR, { recursive: true });
  fs.writeFileSync(path.join(PREVIEW_DIR, `${level.id}.png`), pngjs.PNG.sync.write(img));
}

// When a run passes or fails: the referee's rules, on real levels (scripts/fixtures/referee-cases.json).
const { findLevel } = await import('./lib/levels.mjs');
let failedCases = 0;
if (!filter) {
  const { cases } = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/fixtures/referee-cases.json'), 'utf8'));
  for (const c of cases) {
    const level = { ...findLevel(c.level), ...(c.patch || {}) };
    const r = runLevel({ level, code: c.code, seed: c.seed ?? 1 });
    const v = r.verdict;
    const ok = v && v.passed === c.expect.passed && v.reason === c.expect.reason && !(c.expect.beforeS && v.timeS >= c.expect.beforeS);
    if (!ok) failedCases++;
    if (!ok || verbose) print(`${ok ? 'ok  ' : 'FAIL'} referee: ${c.name}${ok ? '' : `\n       ✗ expected ${c.expect.passed ? 'pass' : 'fail'} (${c.expect.reason}), got ${describe(r)}`}`);
  }
  print(`referee cases: ${failedCases ? failedCases + ' failed' : `all ${cases.length} passed`}`);
}

print(`levels check: ${failedLevels ? failedLevels + ' failed' : 'all passed'}${preview ? ` (previews in ${path.relative(ROOT, PREVIEW_DIR)}/)` : ''}`);
process.exit(failedLevels || failedCases ? 1 : 0);
