// Logging in and keeping a student's progress in step with the server (decision 0016).
// No DOM: src/ui/accountUI.js draws the login box and the status.
//
// Logged in, progress.js works on the account's local cache and lists what changed;
// this module sends that at most every SYNC_MS and when the page is hidden, and pulls
// the server's copy on login and page load. Unsynced local edits win; stars are only
// ever added. Not logged in, nothing here runs and progress stays in this browser.

import {
  useAccount, forgetAccount, currentAccount, pendingChanges, hasPending, markSynced, applyRemote,
} from './progress.js';

export const SESSION_KEY = 'mbot2sim:session';
const SYNC_MS = 15000;
const API = '/api';

/** 'guest' | 'saved' | 'saving' | 'offline' | 'expired' */
let status = 'guest';
let session = null;          // { username, token, expires }
let timer = null;
let inFlight = null;
const listeners = new Set();
let onRemoteChange = () => {};
let onAccountChange = () => {};
let flushEditor = () => {};

function setStatus(s) {
  if (s === status) return;
  status = s;
  for (const fn of listeners) fn(status);
}

/** Calls fn(status) whenever the sync status changes. */
export function onSyncStatus(fn) { listeners.add(fn); }
export function syncStatus() { return status; }
export function loggedInAs() { return session ? session.username : null; }

/** fn(changedSlots) runs after the server's copy changed local programs. */
export function setRemoteChangeHandler(fn) { onRemoteChange = fn; }
/** fn() runs after login or logout switched to another account's progress. */
export function setAccountChangeHandler(fn) { onAccountChange = fn; }
/** fn() saves the editor's unsaved edits; runs right before the server's copy is applied. */
export function setFlushHandler(fn) { flushEditor = fn; }

function storage() {
  try { return globalThis.localStorage || null; } catch (e) { return null; }
}
function saveSession(s) {
  const ls = storage();
  try { if (ls) { if (s) ls.setItem(SESSION_KEY, JSON.stringify(s)); else ls.removeItem(SESSION_KEY); } } catch (e) {}
}
function readSession() {
  const ls = storage();
  try {
    const s = ls && JSON.parse(ls.getItem(SESSION_KEY) || 'null');
    return s && s.username && s.token ? s : null;
  } catch (e) { return null; }
}

async function api(method, path, body, { keepalive = false } = {}) {
  const headers = { 'content-type': 'application/json' };
  if (session) headers.authorization = `Bearer ${session.token}`;
  const res = await fetch(API + path, { method, headers, body: body && JSON.stringify(body), keepalive });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

function expired() {
  // Mid-lesson: keep working on the account's cache, so nothing in the editor changes
  // and the pending changes go up when the student logs in again.
  session = null;
  saveSession(null);
  stopTimer();
  setStatus('expired');
}

/**
 * Gets the server's copy into the cache. Returns false if offline. `editor` = the
 * editor shows this account's progress (not during a login, when it still shows the
 * previous account's program and must neither be saved here nor reloaded yet).
 */
async function pull({ editor = true } = {}) {
  let r;
  try { r = await api('GET', '/progress'); } catch (e) { setStatus('offline'); return false; }
  if (r.status === 401) { expired(); return false; }
  if (r.status !== 200) { setStatus('offline'); return false; }
  if (editor) flushEditor();   // synchronous with applyRemote: no edit can slip in between
  const changed = applyRemote(r.data);
  if (editor && changed.length) onRemoteChange(changed);
  return true;
}

/** Sends pending changes. Resolves true when the server has everything. */
export function push({ keepalive = false } = {}) {
  if (!session) return Promise.resolve(false);
  if (inFlight) return inFlight;
  if (!hasPending()) { if (status !== 'offline') setStatus('saved'); return Promise.resolve(true); }
  const sent = pendingChanges();
  setStatus('saving');
  inFlight = (async () => {
    try {
      const r = await api('PUT', '/progress', sent, { keepalive });
      if (r.status === 401) { expired(); return false; }
      if (r.status !== 200) { setStatus('offline'); return false; }
      markSynced(sent);
      setStatus(hasPending() ? 'saving' : 'saved');
      return true;
    } catch (e) {
      setStatus('offline');
      return false;
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

function startTimer() {
  stopTimer();
  timer = setInterval(() => { if (hasPending() || status === 'offline') push(); }, SYNC_MS);
}
function stopTimer() { if (timer) clearInterval(timer); timer = null; }

function begin() {
  useAccount(session.username);
  setStatus(hasPending() ? 'saving' : 'saved');
  startTimer();
}

/**
 * On page load, before the editor restores its program: resumes a saved session
 * (synchronously switches to the account's cache, then syncs in the background).
 */
export function initSync() {
  const s = readSession();
  if (s && s.expires > Date.now()) {
    session = s;
    begin();
    pull().then((ok) => ok && push());
  } else if (s) {
    saveSession(null);
    setStatus('expired');
  }
  const flush = () => { if (session && hasPending()) push({ keepalive: true }); };
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });
  window.addEventListener('pagehide', flush);
}

/**
 * Logs in and gets the account's progress from the server. Resolves { ok: true,
 * username } or { ok: false, error: 'wrong_login' | 'too_many_tries' | 'offline' |
 * 'not_configured' }. The caller saves the editor's program first and then calls
 * finishLogin() to show the account's program and save. Progress made without an
 * account is never moved into one (it could be someone else's); it stays in this
 * browser's guest entry.
 */
export async function login(username, password) {
  let r;
  try { r = await api('POST', '/login', { username, password }); } catch (e) { return { ok: false, error: 'offline' }; }
  if (r.status !== 200) {
    const error = r.data.error === 'too_many_tries' || r.data.error === 'not_configured' ? r.data.error
      : r.status === 401 || r.status === 400 ? 'wrong_login' : r.status === 404 ? 'not_configured' : 'offline';
    return { ok: false, error };
  }
  session = { username: r.data.username, token: r.data.token, expires: r.data.expires };
  saveSession(session);
  begin();
  await pull({ editor: false });
  return { ok: true, username: session.username };
}

/** After login: the editor shows the account's program; save. */
export function finishLogin() {
  onAccountChange();
  return push();
}

/**
 * Logs out. Sends pending changes first; with `force`, logs out even if that failed
 * (the unsent changes are lost). Resolves false if unsent changes remain (not forced).
 */
export async function logout({ force = false } = {}) {
  if (!session) return true;
  const sent = await push();
  if (!sent && hasPending() && !force) return false;
  const username = session.username;
  session = null;
  saveSession(null);
  stopTimer();
  forgetAccount(username);
  useAccount(null);
  setStatus('guest');
  onAccountChange();
  return true;
}

/** Test/dev hook: which account progress.js is using. */
export function _account() { return currentAccount(); }
