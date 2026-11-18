import { robot, robotProbePoint } from '../sim/robot.js';
import { ledState } from '../sim/leds.js';
import { getDisplayState } from '../ui/display.js';
import { FLOOR_COLOURS } from './level.js';

// Judges a run against a prepared level's goals (decision 0006). Called once per
// simulation tick, after the physics step, in the browser and the headless runner
// alike, so both reach the same verdict at the same simulated moment.
//
// Goals of two kinds:
//   any time — reachZone: latched the first tick it holds;
//   at the end — robotStoppedIn, displayShows, ledColour: judged on the current state;
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

/** PT-PT description of a goal, for the result panel. */
export function goalLabel(goal, prepared) {
  if (goal.label) return goal.label;
  const zone = goal.zone && (prepared.zones[goal.zone].label || goal.zone);
  switch (goal.type) {
    case 'reachZone': return `Passar o anel amarelo do robô pela zona «${zone}»`;
    case 'robotStoppedIn': return `Parar com o anel amarelo do robô (${goal.probe === 'front' ? 'a frente' : 'o centro'}) dentro da zona «${zone}»`;
    case 'noCollision': return 'Não tocar nas paredes';
    case 'displayShows': return `Mostrar «${goal.text}» no ecrã`;
    case 'ledColour': return `Acender os LEDs a ${COLOUR_PT[goal.colour] || goal.colour}`;
    default: return goal.type;
  }
}

export function createReferee(prepared) {
  const latched = new Set();     // indices of "any time" goals already met
  let restSince = null;
  let moved = false;
  let verdict = null;
  const settleS = prepared.settleS ?? SETTLE_S;   // Infinity = "never"
  const stallS = prepared.stallS ?? STALL_S;

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
        const lines = getDisplayState().text.filter((d) => goal.row === undefined || d.row === goal.row);
        return lines.some((d) => String(d.text).trim() === String(goal.text).trim());
      }
      case 'ledColour': {
        const want = hex(FLOOR_COLOURS[goal.colour]);
        return ledState.every((l) => l.on && String(l.colour).toLowerCase() === want);
      }
      default: return false;
    }
  }

  function decide(passed, timeS, reason, results) {
    verdict = {
      passed, timeS: Math.round(timeS * 100) / 100, reason,
      goals: prepared.goals.map((g, i) => ({ type: g.type, label: goalLabel(g, prepared), passed: results[i] })),
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
      const results = prepared.goals.map(holdsNow);
      const all = results.every(Boolean);
      const resting = robot.vL === 0 && robot.vR === 0;
      if (!resting) moved = true;
      restSince = resting ? (restSince ?? timeS) : null;
      const restedS = resting ? timeS - restSince : 0;

      if (robot.collided || ended === 'collision') return decide(false, timeS, 'collision', results);
      if (all && (ended || restedS >= settleS)) return decide(true, timeS, ended ? 'ended' : 'settled', results);
      if (ended) return decide(false, timeS, ended, results);
      if (!all && moved && restedS >= stallS) return decide(false, timeS, 'stalled', results);
      if (timeS >= prepared.timeLimitS) return decide(all, timeS, 'timeLimit', results);
      return null;
    },
  };
}
