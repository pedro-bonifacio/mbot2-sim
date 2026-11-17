#!/usr/bin/env node
// Runs a program in the headless simulator and prints a compact JSON summary:
// status, simulated time, pose relative to the spawn (forward/right cm, turned °,
// + = right), display text, console messages, block warnings.
//
// Usage:
//   node scripts/sim-run.mjs <program.xml> [--map default.png] [--max 60]
//        [--key A@1.5[:0.2]]... [--path 0.5] [--code]
//   npm run sim -- scripts/fixtures/teste-2-funcao.xml --path 1

const args = process.argv.slice(2);
const opt = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : fallback; };
const program = args.find((a, i) => !a.startsWith('--') && (i === 0 || !args[i - 1].startsWith('--') || args[i - 1] === '--code'));
if (!program) {
  console.error('usage: node scripts/sim-run.mjs <program.xml> [--map default.png] [--max 60] [--key A@1.5[:0.2]] [--path 0.5] [--code]');
  process.exit(2);
}
const keys = args.flatMap((a, i) => (a === '--key' ? [args[i + 1]] : [])).map((k) => {
  const [, key, at, dur] = k.match(/^(\w+)@([\d.]+)(?::([\d.]+))?$/) || [];
  if (!key) throw new Error(`bad --key ${k} (expected A@1.5 or A@1.5:0.3)`);
  return { key, at: Number(at), for: dur ? Number(dur) : 0.2 };
});

// Keep the summary clean: developer logs from the sim go to stderr.
console.log = (...a) => process.stderr.write(a.join(' ') + '\n');
const { simulate } = await import('./lib/sim.mjs');
const out = process.stdout.write.bind(process.stdout);

const result = simulate({
  program,
  map: opt('--map', 'default.png'),
  maxSeconds: Number(opt('--max', 60)),
  keys,
  sampleEvery: Number(opt('--path', 0)),
});
if (!args.includes('--code')) delete result.code;
if (result.leds && result.leds.every((l) => l === null)) delete result.leds;
// One top-level key per line: short to read, easy to diff.
const lines = Object.entries(result)
  .filter(([, v]) => v !== undefined && !(Array.isArray(v) && !v.length))
  .map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)}`);
out(`{\n${lines.join(',\n')}\n}\n`);
