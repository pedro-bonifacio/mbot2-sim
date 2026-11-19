import { robot, robotProbePoint } from '../sim/robot.js';
import { ledState } from '../sim/leds.js';
import { getDisplayState } from '../ui/display.js';
import { lastToneNumber, tonesSince } from '../sim/audio.js';
import { FLOOR_COLOURS } from './level.js';
import { evalNumber, formatNumber } from './expr.js';

// Judges a run against a prepared level's goals (decision 0006). Called once per
// simulation tick, after the physics step, in the browser and the headless runner
// alike, so both reach the same verdict at the same simulated moment.
//
// Goals of four kinds:
//   any time — reachZone, tonePlayed, sequence: latched the first tick they hold;
//   at the end — robotStoppedIn, displayShows, ledColour: judged on the current state;
//   throughout — stayIn: broken the first tick the probe is outside its zone (the run
//     fails at once), and only holds when the time limit arrives (decision 0017);
//   noCollision — shown as a goal; touching a wall fails every level anyway.
// The run PASSES as soon as every goal holds and either the program has ended or the
// robot has stood still for `settle` s (so "repeat forever: if near, stop" programs
// pass without waiting for the time limit), or the time limit arrives with every goal
// holding. It FAILS at once when the robot touches a wall, when the program ends or
// errors without passing, when the robot — having moved — stands still for `stall` s
// with a goal unmet (so a robot stopped in the wrong place fails without waiting for
// the limit), or at the time limit. Levels set `settle` / `stall` (seconds or
// "never"); the defaults are below.

export const SETTLE_S = 2;
export const STALL_S = 5;

const COLOUR_PT = { red: 'vermelho', yellow: 'amarelo', green: 'verde', cyan: 'ciano', blue: 'azul',
  purple: 'roxo', white: 'branco', black: 'preto' };
const hex = (rgb) => '#' + rgb.map((c) => c.toString(16).padStart(2, '0')).join('');

/** Probe point of the robot in world cm: its centre, or the middle of its front bumper. */
export const probePoint = robotProbePoint;

export function inZone(zone, [x, y]) {
  if (zone.type === 'circle') return (x - zone.cx) ** 2 + (y - zone.cy) ** 2 <= zone.r ** 2;
  return x >= zone.x && x <= zone.x + zone.w && y >= zone.y && y <= zone.y + zone.h;
}

const zoneName = (prepared, id) => prepared.zones[id].label || id;
const hz = (f) => `${formatNumber(f)} Hz`;

function stepLabel(step, prepared) {
  switch (step.kind) {
    case 'display': return `«${step.text}» no ecrã`;
    case 'leds': return step.colour === 'off' ? 'LEDs apagados' : `LEDs a ${COLOUR_PT[step.colour]}`;
    case 'tone': return `som de ${hz(step.frequency)}`;
    case 'zone': return `zona «${zoneName(prepared, step.zone)}»`;
    default: return step.kind;
  }
}

/** PT-PT description of a goal, for the result panel. */
export function goalLabel(goal, prepared) {
  if (goal.label) return goal.label;
  const zone = goal.zone && zoneName(prepared, goal.zone);
  switch (goal.type) {
    case 'reachZone': return `Passar o anel amarelo do robô pela zona «${zone}»`;
    case 'robotStoppedIn': return `Parar com o anel amarelo do robô (${goal.probe === 'front' ? 'a frente' : 'o centro'}) dentro da zona «${zone}»`;
    case 'noCollision': return 'Não tocar nas paredes';
    // Values that come from the variant are not given away (the student must sense them).
    case 'displayShows':
      if (goal.any) return 'Escrever alguma coisa no ecrã';
      if (goal.text === undefined) return 'Mostrar o número certo no ecrã';
      return goal.secret ? 'Mostrar a palavra certa no ecrã' : `Mostrar «${goal.text}» no ecrã`;
    case 'ledColour': return goal.secret ? 'Acender os LEDs na cor certa' : `Acender os LEDs a ${COLOUR_PT[goal.colour] || goal.colour}`;
    case 'tonePlayed': return (goal.frequency === undefined ? 'Tocar um som' : `Tocar um som de ${hz(goal.frequency)}`)
      + (goal.duration === undefined ? '' : ` durante ${formatNumber(goal.duration)} ms`);
    case 'sequence': return `Por esta ordem: ${goal.pattern.map((st) => stepLabel(st, prepared)).join(' → ')}${goal.times > 1 ? ` (${goal.times} vezes)` : ''}`;
    case 'stayIn': return `Andar dentro da zona «${zone}» até ao fim do tempo (${formatNumber(prepared.timeLimitS)} s), sem sair`;
    default: return goal.type;
  }
}

/** Numbers in a line of display text ("37", "Dist: 37,5 cm" → [37.5]). */
const numbersIn = (t) => (String(t).match(/-?\d+(?:[.,]\d+)?/g) || []).map((n) => Number(n.replace(',', '.')));

/** Lines on the display: display_text cells (with their row) and, unless a row is asked for, printed lines. */
function displayLines(row) {
  const d = getDisplayState();
  const cells = d.text.filter((c) => row === undefined || c.row === row).map((c) => c.text);
  return row === undefined ? cells.concat(d.printed) : cells;
}
const showsText = (text, row) => displayLines(row).some((t) => String(t).trim() === String(text).trim());
const ledsAre = (colour) => (colour === 'off'
  ? ledState.every((l) => !l.on)
  : ledState.every((l) => l.on && String(l.colour).toLowerCase() === hex(FLOOR_COLOURS[colour])));
const toneMatches = (tone, frequency, tolerance, durationMs) =>
  (frequency === undefined || Math.abs(tone.freq - frequency) <= tolerance)
  && (durationMs === undefined || Math.abs(tone.ms - durationMs) <= 1);
// displayShows { any: true }: some text that is not the toolbox's default "Hallo".
const TOOLBOX_DEFAULT_TEXT = 'Hallo';

export function createReferee(prepared) {
  const latched = new Set();     // indices of "any time" goals already met
  const broken = new Set();      // indices of "throughout" goals already broken
  const seqAt = prepared.goals.map(() => 0);   // sequence goals: next step to see
  const seqWas = prepared.goals.map((g) => (g.steps || []).map(() => false));   // each step's state last tick
  let restSince = null;
  let moved = false;
  let verdict = null;
  let toneSeen = lastToneNumber();
  let newTones = [];
  let now = 0;
  // previous tick, for the run values (the first tick starts from the spawn)
  let last = { x: prepared.spawn.x, y: prepared.spawn.y, timeS: 0 };
  const run = { drivenCm: 0, movingS: 0 };
  const settleS = prepared.settleS ?? SETTLE_S;   // Infinity = "never"
  const stallS = prepared.stallS ?? STALL_S;

  const stateHolds = (st) => (st.kind === 'display' ? showsText(st.text)
    : st.kind === 'leds' ? ledsAre(st.colour)
      : inZone(prepared.zones[st.zone], probePoint(st.probe)));

  // One tick of a sequence. A tone step takes the next matching tone started this
  // tick. A state step (display, LEDs, zone) needs its state to APPEAR this tick
  // (absent the tick before), and each kind advances at most one step per tick —
  // so "3, 2, 1" printed without waits, or a traffic light switched without waits,
  // is not a sequence (only the last state is ever on screen for a tick).
  function advanceSequence(goal, i) {
    const now = goal.steps.map((st) => st.kind !== 'tone' && stateHolds(st));
    const tones = newTones.slice();
    const kindsUsed = new Set();
    while (seqAt[i] < goal.steps.length) {
      const j = seqAt[i];
      const st = goal.steps[j];
      if (st.kind === 'tone') {
        const k = tones.findIndex((t) => toneMatches(t, st.frequency, st.tolerance));
        if (k < 0) break;
        tones.splice(0, k + 1);
      } else {
        if (kindsUsed.has(st.kind) || !now[j] || seqWas[i][j]) break;
        kindsUsed.add(st.kind);
      }
      seqAt[i] += 1;
    }
    seqWas[i] = now;
    return seqAt[i] >= goal.steps.length;
  }

  function expectedNumber(goal) {
    return goal.expected ?? evalNumber(goal.number, { ...goal.params, ...run });
  }

  function holdsNow(goal, i) {
    switch (goal.type) {
      case 'reachZone':
        if (inZone(prepared.zones[goal.zone], probePoint(goal.probe))) latched.add(i);
        return latched.has(i);
      case 'robotStoppedIn':
        return robot.vL === 0 && robot.vR === 0 && inZone(prepared.zones[goal.zone], probePoint(goal.probe));
      case 'noCollision':
        return !robot.collided;
      case 'displayShows': {
        if (goal.any) return displayLines(goal.row).some((t) => String(t).trim() && String(t).trim() !== TOOLBOX_DEFAULT_TEXT);
        if (goal.text !== undefined) return showsText(goal.text, goal.row);
        const want = expectedNumber(goal);
        return displayLines(goal.row).some((t) => numbersIn(t).some((n) => Math.abs(n - want) <= goal.tolerance + 1e-9));
      }
      case 'ledColour': return ledsAre(goal.colour);
      case 'tonePlayed':
        if (newTones.some((t) => toneMatches(t, goal.frequency, goal.tolerance, goal.duration))) latched.add(i);
        return latched.has(i);
      case 'sequence':
        if (!latched.has(i) && advanceSequence(goal, i)) latched.add(i);
        return latched.has(i);
      case 'stayIn':
        if (!inZone(prepared.zones[goal.zone], probePoint(goal.probe))) broken.add(i);
        return !broken.has(i) && moved && now >= prepared.timeLimitS;
      default: return false;
    }
  }

  // After the run, a missed value goal says what was expected on this variant.
  function expectedNote(g) {
    if (g.type === 'displayShows' && g.number !== undefined) {
      return ` (esperado: ${formatNumber(Math.round(expectedNumber(g) * 10) / 10)}${g.tolerance ? ` ± ${formatNumber(g.tolerance)}` : ''})`;
    }
    if (g.secret && g.type === 'displayShows') return ` (esperado: «${g.text}»)`;
    if (g.secret && g.type === 'ledColour') return ` (esperado: ${COLOUR_PT[g.colour]})`;
    return '';
  }

  function decide(passed, timeS, reason, results) {
    verdict = {
      passed, timeS: Math.round(timeS * 100) / 100, reason,
      goals: prepared.goals.map((g, i) => ({ type: g.type,
        label: goalLabel(g, prepared) + (results[i] ? '' : expectedNote(g)), passed: results[i] })),
    };
    return verdict;
  }

  return {
    get verdict() { return verdict; },
    /**
     * One tick. `timeS` = simulated seconds since the run started; `ended` = the
     * program is over ('finished' | 'collision' | 'error'), or null while it runs.
     * Returns the verdict once decided (then always the same), else null.
     */
    tick({ timeS, ended = null }) {
      if (verdict) return verdict;
      const resting = robot.vL === 0 && robot.vR === 0;
      if (!resting) moved = true;
      run.drivenCm += Math.hypot(robot.x - last.x, robot.y - last.y);
      if (!resting) run.movingS += timeS - last.timeS;
      last = { x: robot.x, y: robot.y, timeS };
      now = timeS;
      newTones = tonesSince(toneSeen);
      if (newTones.length) toneSeen = newTones[newTones.length - 1].n;
      const results = prepared.goals.map(holdsNow);
      const all = results.every(Boolean);
      restSince = resting ? (restSince ?? timeS) : null;
      const restedS = resting ? timeS - restSince : 0;

      if (robot.collided || ended === 'collision') return decide(false, timeS, 'collision', results);
      if (broken.size) return decide(false, timeS, 'leftZone', results);
      // A board (decision 0018): driving off it — the robot's centre past the edge — fails.
      if (prepared.board && (robot.x < 0 || robot.y < 0 || robot.x > prepared.size.w || robot.y > prepared.size.h)) {
        return decide(false, timeS, 'offBoard', results);
      }
      if (all && (ended || restedS >= settleS)) return decide(true, timeS, ended ? 'ended' : 'settled', results);
      if (ended) return decide(false, timeS, ended, results);
      if (!all && moved && restedS >= stallS) return decide(false, timeS, 'stalled', results);
      if (timeS >= prepared.timeLimitS) return decide(all, timeS, 'timeLimit', results);
      return null;
    },
  };
}
