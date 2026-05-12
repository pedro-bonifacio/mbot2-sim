export const RunState = {
  IDLE:         'idle',
  RUNNING:      'running',
  PAUSED_ASYNC: 'paused_async',
  STOPPED:      'stopped',
  ERRORED:      'errored',
};

// Shared async-ticket: one pending async robot call at a time.
// resolveCondition() returns true when the operation is done.
// callback is the js-interpreter resume callback from createAsyncFunction.
export const asyncTicket = {
  pending: false,
  resolveCondition: null,
  callback: null,
};

const _listeners = new Set();
let _current = RunState.IDLE;

export function getRunState() { return _current; }

export function setRunState(next) {
  _current = next;
  for (const fn of _listeners) fn(next);
}

export function onRunStateChange(fn) {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}
