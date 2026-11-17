// The student's progress, kept in this browser only (decision 0002): stars per level
// and the program last left in each level (plus the free-map program, slot "livre").
// One localStorage entry; exported and imported as a JSON file because school
// computers are shared and browsers get wiped. Progress is easy to fake, so
// evaluation never trusts it (decision 0008).
//
// No DOM here: programs are opaque Blockly XML strings (src/ui/programIO.js owns them).

export const PROGRESS_KEY = 'mbot2sim:progress:v1';
export const LEGACY_PROGRAM_KEY = 'mbot2sim:lastProgram:v2';   // before per-level programs
export const FREE_SLOT = 'livre';
export const FILE_KIND = 'mbot2sim-progress';
const VERSION = 1;
const SLOT_RE = /^(\d{2}-\d{2}|livre)$/;

let data = null;

function storage() {
  try { return globalThis.localStorage || null; } catch (e) { return null; }
}

function empty() { return { stars: {}, programs: {} }; }

function current() {
  if (data) return data;
  const ls = storage();
  data = empty();
  if (!ls) return data;
  try {
    const raw = ls.getItem(PROGRESS_KEY);
    if (raw) return (data = clean(JSON.parse(raw)));
    const legacy = ls.getItem(LEGACY_PROGRAM_KEY);   // first run after the update
    if (legacy) data.programs[FREE_SLOT] = legacy;
  } catch (e) {
    console.warn('[progress] saved progress unreadable; starting empty', e);
  }
  return data;
}

function persist() {
  const ls = storage();
  if (!ls) return false;
  try {
    ls.setItem(PROGRESS_KEY, JSON.stringify({ version: VERSION, ...data }));
    return true;
  } catch (e) {
    console.warn('[progress] localStorage full or blocked; not saved', e);
    return false;
  }
}

/** Validates and copies { stars, programs } from untrusted JSON; throws on bad data. */
function clean(obj) {
  if (!obj || typeof obj !== 'object') throw new Error('not an object');
  const out = empty();
  for (const [id, s] of Object.entries(obj.stars || {})) {
    if (!SLOT_RE.test(id) || id === FREE_SLOT || !s || typeof s !== 'object') throw new Error(`bad stars entry "${id}"`);
    out.stars[id] = { one: !!(s.one || s.two), two: !!s.two };
  }
  for (const [slot, xml] of Object.entries(obj.programs || {})) {
    if (!SLOT_RE.test(slot) || typeof xml !== 'string' || !xml.trim().startsWith('<xml')) throw new Error(`bad program "${slot}"`);
    out.programs[slot] = xml;
  }
  return out;
}

/** { one, two } for a level id. */
export function getStars(id) {
  const s = current().stars[id];
  return { one: !!(s && s.one), two: !!(s && s.two) };
}

/** Adds stars (never removes them). `which` = 'one' | 'two'. */
export function addStar(id, which) {
  const d = current();
  const s = d.stars[id] || (d.stars[id] = { one: false, two: false });
  if (s[which]) return;
  s[which] = true;
  if (which === 'two') s.one = true;
  persist();
}

/** The saved program (Blockly XML text) for a slot (level id or "livre"), or null. */
export function getProgram(slot) {
  return current().programs[slot] ?? null;
}

/** Saves (or with null, forgets) a slot's program. Returns false if storage failed. */
export function setProgram(slot, xml) {
  const d = current();
  if (xml === null) delete d.programs[slot]; else d.programs[slot] = xml;
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
    const mine = d.stars[id] || (d.stars[id] = { one: false, two: false });
    mine.one = mine.one || s.one;
    mine.two = mine.two || s.two;
  }
  Object.assign(d.programs, incoming.programs);
  persist();
  return { stars: Object.keys(incoming.stars).length, programs: Object.keys(incoming.programs).length };
}

/** Test hook: forget the in-memory copy so the next call re-reads storage. */
export function _reloadProgress() { data = null; }
