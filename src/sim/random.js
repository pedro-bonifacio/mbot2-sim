// Seeded randomness (decision 0004: "randomness comes only from a seeded PRNG").
//
// createRng(seed) gives an independent, repeatable stream: the same seed always
// yields the same numbers, on every machine. The student's program draws from its
// own stream (the random blocks → Math.random inside the interpreter, see
// src/runtime/sandbox.js), seeded per run. Level variants will use separate streams
// from createRng(variantSeed), so a program's random numbers never shift a variant.

/** mulberry32: small, fast, good enough for simulation; seed is any 32-bit integer. */
export function createRng(seed) {
  let a = seed >>> 0;
  return function random() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A new seed for a run nobody asked to reproduce (pressing Executar). This is the
 * only place entropy enters the sim; the seed is recorded so the run can be replayed.
 */
export function freshSeed() {
  const c = globalThis.crypto;
  if (c && c.getRandomValues) return c.getRandomValues(new Uint32Array(1))[0];
  return (Date.now() ^ (performance.now() * 1000)) >>> 0;
}

let _programRandom = createRng(1);
let _programSeed = 1;

/** Seeds the program's stream; called at the start of every run. */
export function seedProgramRandom(seed) {
  _programSeed = seed >>> 0;
  _programRandom = createRng(_programSeed);
}

/** The current run's seed. */
export function programSeed() { return _programSeed; }

/** Next number in [0, 1) from the program's stream. */
export function programRandom() { return _programRandom(); }
