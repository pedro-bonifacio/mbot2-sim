import Interpreter from 'js-interpreter';
import { initInterpreter } from './sandbox.js';

let _interp = null;

export function createInterpreter(jsCode) {
  _interp = new Interpreter(jsCode, initInterpreter);
  return _interp;
}

// Returns true if the program has more steps to run, false when finished.
export function stepInterpreter() {
  if (!_interp) return false;
  return _interp.step();
}

export function destroyInterpreter() {
  _interp = null;
}

// True when interpreter is paused on an async call (Phase 4-1+).
export function isInterpreterPaused() {
  return _interp ? _interp.paused_ : false;
}
