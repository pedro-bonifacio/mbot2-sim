#!/usr/bin/env node
// Headless simulator test suite: runs every program in scripts/fixtures/sim-tests.json
// and compares the outcome with its expectations. One line per test.
//
// Usage: node scripts/sim-test.mjs [--verbose] [name filter]

import fs from 'fs';
import path from 'path';

console.log = () => {};   // silence developer logs from the sim
const print = (s) => process.stdout.write(s + '\n');
const { simulate, simulateBrowser, ROOT } = await import('./lib/sim.mjs');

const verbose = process.argv.includes('--verbose');
const filter = process.argv.slice(2).find((a) => !a.startsWith('--'));
const { tests } = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/fixtures/sim-tests.json'), 'utf8'));
const POSE_TOL = { forward: 0.5, right: 0.5, turned: 1 };

// Synthetic animation frames for the browser run loop: a slow laptop, and an uneven
// frame rate (seeded, so the test is repeatable).
let seed = 1;
const jitter = () => 0.008 + ((seed = (seed * 16807) % 2147483647) / 2147483647) * 0.032;
const FRAME_RATES = [['30 fps', () => 1 / 30], ['uneven 8–40 ms frames', jitter]];

let failed = 0;
for (const t of tests.filter((x) => !filter || x.name.includes(filter))) {
  const r = simulate({ program: t.program, map: t.map, maxSeconds: t.maxSeconds ?? 60, keys: t.keys ?? [], seed: t.seed ?? 1 });
  const e = t.expect;
  const problems = [];
  if (e.status && r.status !== e.status) problems.push(`status ${r.status}${r.error ? ' (' + r.error + ')' : ''}, expected ${e.status}`);
  if (e.error && !(r.error || '').includes(e.error)) problems.push(`error "${r.error}", expected "${e.error}"`);
  if (e.warnings !== undefined && r.warnings.length !== e.warnings) problems.push(`${r.warnings.length} warnings, expected ${e.warnings}: ${r.warnings.join(' | ')}`);
  if (e.pose) {
    for (const k of Object.keys(e.pose)) {
      const diff = k === 'turned' ? ((r.pose[k] - e.pose[k] + 540) % 360) - 180 : r.pose[k] - e.pose[k];
      if (Math.abs(diff) > POSE_TOL[k]) problems.push(`pose.${k} ${r.pose[k]}, expected ${e.pose[k]}`);
    }
  }
  if (e.distance !== undefined && Math.abs(r.distance - e.distance) > 0.5) problems.push(`distance ${r.distance}, expected ${e.distance}`);
  for (const k of ['display', 'leds']) {
    if (e[k] && JSON.stringify(r[k]) !== JSON.stringify(e[k])) problems.push(`${k} ${JSON.stringify(r[k])}, expected ${JSON.stringify(e[k])}`);
  }
  // The browser's run loop must give the same result at any frame rate (decision 0004):
  // compare with a headless run stopped at the same simulated time.
  for (const [rate, frameS] of FRAME_RATES) {
    const b = await simulateBrowser({ program: t.program, map: t.map, maxSeconds: t.maxSeconds ?? 60, keys: t.keys ?? [], frameS, seed: t.seed ?? 1 });
    const h = b.status === r.status && b.time === r.time ? r
      : simulate({ program: t.program, map: t.map, maxSeconds: b.time - 1e-9, keys: t.keys ?? [], seed: t.seed ?? 1 });
    const same = (x) => JSON.stringify([x.status, x.pose, x.display]);
    if (same(b) !== same(h)) {
      problems.push(`browser at ${rate}: ${same(b)}, headless ${same(h)}`);
    }
  }
  if (problems.length) failed++;
  print(`${problems.length ? 'FAIL' : 'ok  '} ${t.name}${problems.length ? '\n       ' + problems.join('\n       ') : ''}`);
  if (verbose) print(JSON.stringify({ ...r, code: undefined }));
}
// Every map in the selector must spawn the robot with its whole footprint clear of
// walls, or the first move is a collision.
if (!filter) {
  const { loadMap } = await import('./lib/sim.mjs');
  const { setMapData } = await import(path.join(ROOT, 'src/sim/map.js'));
  const { footprintHitsWall } = await import(path.join(ROOT, 'src/sim/collision.js'));
  const maps = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/maps/catalogue.json'), 'utf8'));
  const warn = console.warn;
  console.warn = () => {};   // mapLoader notes (e.g. no heading marker) aren't failures here
  const blocked = maps.filter((name) => {
    const m = loadMap(name);
    setMapData({ imageData: m.imageData, width: m.width, height: m.height,
      offscreenCanvas: { width: m.widthPx, height: m.heightPx } });
    return footprintHitsWall(m.spawnX, m.spawnY, m.spawnHeading);
  });
  console.warn = warn;
  if (blocked.length) failed++;
  print(`${blocked.length ? 'FAIL' : 'ok  '} every map spawns the robot clear of walls${blocked.length ? '\n       touching: ' + blocked.join(', ') : ''}`);
}
print(`sim tests: ${failed ? failed + ' failed' : 'all passed'}`);
process.exit(failed ? 1 : 0);
