// Simulated clock (decision 0004). Everything in the robot's world that depends on
// time — wait_ms, tone durations, the timer sensor — reads this clock, never the
// wall clock. It advances only when physics advances: the canvas loop in the
// browser, the fixed-tick loop in the headless runner.

let _nowMs = 0;

/** Simulated time in ms. */
export function simNow() { return _nowMs; }

/** Advances simulated time by `dtSeconds` (the physics step just taken). */
export function advanceClock(dtSeconds) { _nowMs += dtSeconds * 1000; }

export function resetClock() { _nowMs = 0; }
