// The student's progress: stars per level and the program last left in each level
// (plus the free-map program, slot "livre"). One localStorage entry per account
// (decision 0016): the guest entry (not logged in, browser only, as in decision 0002)
// or the cache of a logged-in account, which src/levels/sync.js keeps in step with
// the server. In an account, every change is also listed as pending until the server
// has it, so work done offline or before a tab closes is sent later.
// Also exported and imported as a JSON file, as a backup. Progress is easy to fake, so
// evaluation never trusts it (decision 0008).
//
// No DOM here: programs are opaque Blockly XML strings (src/ui/programIO.js owns them).

export const PROGRESS_KEY = 'mbot2sim:progress:v1';
export const LEGACY_PROGRAM_KEY = 'mbot2sim:lastProgram:v2';   // before per-level programs
export const FREE_SLOT = 'livre';
export const FILE_KIND = 'mbot2sim-progress';
const VERSION = 1;
const SLOT_RE = /^(\d{2}-\d{2}|livre)$/;

let account = null;   // username, or null for the guest entry
let data = null;

function storage() {
  try { return globalThis.localStorage || null; } catch (e) { return null; }
}

const keyFor = (username) => (username ? `${PROGRESS_KEY}:${username}` : PROGRESS_KEY);
function empty() { return { stars: {}, programs: {}, pending: { stars: {}, programs: {} } }; }

function load(username) {
  const ls = storage();
  const d = empty();
  if (!ls) return d;
  try {
    const raw = ls.getItem(keyFor(username));
    if (raw) return clean(JSON.parse(raw), true);
    const legacy = !username && ls.getItem(LEGACY_PROGRAM_KEY);   // first run after that update
    if (legacy) d.programs[FREE_SLOT] = legacy;
  } catch (e) {
    console.warn('[progress] saved progress unreadable; starting empty', e);
  }
  return d;
}

function current() {
  return data || (data = load(account));
}

function persist() {
  const ls = storage();
  if (!ls) return false;
  try {
    ls.setItem(keyFor(account), JSON.stringify({ version: VERSION, ...data }));
    return true;
  } catch (e) {
    console.warn('[progress] localStorage full or blocked; not saved', e);
    return false;
  }
}

/**
 * Validates and copies { stars, programs } from untrusted JSON; throws on bad data.
 * With `withPending`, also the pending lists (own cache only, never from a file).
 */
function clean(obj, withPending = false) {
  if (!obj || typeof obj !== 'object') throw new Error('not an object');
  const out = empty();
  for (const [id, s] of Object.entries(obj.stars || {})) {
    if (!SLOT_RE.test(id) || id === FREE_SLOT || !s || typeof s !== 'object') throw new Error(`bad stars entry "${id}"`);
    out.stars[id] = normStars(s);
  }
  for (const [slot, xml] of Object.entries(obj.programs || {})) {
    if (!SLOT_RE.test(slot) || typeof xml !== 'string' || !xml.trim().startsWith('<xml')) throw new Error(`bad program "${slot}"`);
    out.programs[slot] = xml;
  }
  if (withPending && obj.pending) {
    for (const id of Object.keys(obj.pending.stars || {})) if (out.stars[id]) out.pending.stars[id] = true;
    for (const slot of Object.keys(obj.pending.programs || {})) if (SLOT_RE.test(slot)) out.pending.programs[slot] = true;
  }
  return out;
}

/** { one, two, three } from untrusted input; a higher star implies the lower ones. */
function normStars(s) {
  const three = !!(s && s.three);
  const two = three || !!(s && s.two);
  return { one: two || !!(s && s.one), two, three };
}

/** Adds stars `s` to `mine` (stars are never lost). */
function mergeStars(mine, s) {
  const n = normStars(s);
  mine.one = mine.one || n.one;
  mine.two = mine.two || n.two;
  mine.three = !!mine.three || n.three;
}

function markStars(id) { if (account) current().pending.stars[id] = true; }
function markProgram(slot) { if (account) current().pending.programs[slot] = true; }

// ── accounts (decision 0016) ─────────────────────────────────────────────────

/** Switches to an account's cache (username) or to the guest entry (null). */
export function useAccount(username) {
  account = username || null;
  data = null;
}

/** The account whose progress is in use, or null (guest). */
export function currentAccount() { return account; }

/** Removes this computer's copy of an account's progress (on "Sair"). */
export function forgetAccount(username) {
  const ls = storage();
  try { if (ls && username) ls.removeItem(keyFor(username)); } catch (e) {}
  if (account === username) data = null;
}

/** What the server does not have yet: { stars: {id: {one, two, three}}, programs: {slot: xml | null} }. */
export function pendingChanges() {
  const d = current();
  const out = { stars: {}, programs: {} };
  for (const id of Object.keys(d.pending.stars)) out.stars[id] = { ...d.stars[id] };
  for (const slot of Object.keys(d.pending.programs)) out.programs[slot] = d.programs[slot] ?? null;
  return out;
}

export function hasPending() {
  const p = current().pending;
  return Object.keys(p.stars).length > 0 || Object.keys(p.programs).length > 0;
}

/**
 * The server now has `sent` (from pendingChanges): drops those entries from the
 * pending lists, except programs changed again since they were sent.
 */
export function markSynced(sent) {
  const d = current();
  for (const id of Object.keys(sent.stars || {})) delete d.pending.stars[id];
  for (const [slot, xml] of Object.entries(sent.programs || {})) {
    if ((d.programs[slot] ?? null) === xml) delete d.pending.programs[slot];
  }
  persist();
}

/**
 * Takes the server's progress ({ stars, programs }, program null = deleted): stars are
 * added; programs replace local ones except where local changes are still pending.
 * Returns the slots whose program changed.
 */
export function applyRemote(remote) {
  const d = current();
  const changed = [];
  for (const [id, s] of Object.entries((remote && remote.stars) || {})) {
    if (!SLOT_RE.test(id) || id === FREE_SLOT || !s) continue;
    mergeStars(d.stars[id] || (d.stars[id] = { one: false, two: false, three: false }), s);
  }
  for (const [slot, xml] of Object.entries((remote && remote.programs) || {})) {
    if (!SLOT_RE.test(slot) || d.pending.programs[slot]) continue;
    if (xml !== null && (typeof xml !== 'string' || !xml.trim().startsWith('<xml'))) continue;
    if ((d.programs[slot] ?? null) === xml) continue;
    if (xml === null) delete d.programs[slot]; else d.programs[slot] = xml;
    changed.push(slot);
  }
  persist();
  return changed;
}

// ── stars and programs ───────────────────────────────────────────────────────

/** { one, two, three } for a level id. */
export function getStars(id) {
  return normStars(current().stars[id]);
}

/** Adds a star (never removes one). `which` = 'one' | 'two' | 'three'; each implies the lower ones. */
export function addStar(id, which) {
  const d = current();
  const s = d.stars[id] || (d.stars[id] = { one: false, two: false, three: false });
  if (s[which]) return;
  mergeStars(s, { [which]: true });
  markStars(id);
  persist();
}

/** The saved program (Blockly XML text) for a slot (level id or "livre"), or null. */
export function getProgram(slot) {
  return current().programs[slot] ?? null;
}

/** Saves (or with null, forgets) a slot's program. Returns false if storage failed. */
export function setProgram(slot, xml) {
  const d = current();
  if ((d.programs[slot] ?? null) === xml) return persist();
  if (xml === null) delete d.programs[slot]; else d.programs[slot] = xml;
  markProgram(slot);
  return persist();
}

/** The progress file's content (a plain object; JSON.stringify it). */
export function exportProgress(name = '') {
  const d = current();
  return { kind: FILE_KIND, version: VERSION, name, exported: new Date().toISOString(),
    stars: d.stars, programs: d.programs };
}

/**
 * Merges a progress file into this browser's progress: stars are added (never lost),
 * the file's programs replace the saved ones for the same levels. Throws on a file
 * that is not a progress file. Returns { stars, programs } counts from the file.
 */
export function importProgress(obj) {
  if (!obj || obj.kind !== FILE_KIND) throw new Error('not a progress file');
  if (obj.version > VERSION) throw new Error(`progress file version ${obj.version} is newer than this app`);
  const incoming = clean(obj);
  const d = current();
  for (const [id, s] of Object.entries(incoming.stars)) {
    mergeStars(d.stars[id] || (d.stars[id] = { one: false, two: false, three: false }), s);
    markStars(id);
  }
  for (const [slot, xml] of Object.entries(incoming.programs)) {
    d.programs[slot] = xml;
    markProgram(slot);
  }
  persist();
  return { stars: Object.keys(incoming.stars).length, programs: Object.keys(incoming.programs).length };
}

/** Test hook: forget the in-memory copy so the next call re-reads storage. */
export function _reloadProgress() { data = null; }
