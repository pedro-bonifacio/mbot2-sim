// The progress-sync API (decision 0016), mounted at /api/* by functions/api/[[path]].js.
// Plain fetch-style handler: handle(request, env) → Response, where env has DB (a D1
// database) and the secrets TEACHER_KEY and SESSION_SECRET. scripts/accounts-check.mjs
// runs it in Node against SQLite.
//
// Student:  POST /api/login {username, password} → {token, username, expires}
//           GET  /api/progress                   → {stars, programs}
//           PUT  /api/progress {stars?, programs?} (only what changed) → {ok}
// Teacher (Authorization: Bearer <TEACHER_KEY>):
//           POST   /api/teacher/students {students: [{username, salt, hash}], reset?}
//           GET    /api/teacher/turmas            → [{turma, students, lastSeen}]
//           GET    /api/teacher/turmas/<turma>    → [{username, number, lastSeen, levels, stars}]
//           DELETE /api/teacher/turmas/<turma>

import { checkPassword } from './password.js';

export const TOKEN_HOURS = 12;
const MAX_FAILS = 10;                       // login failures per username…
const FAIL_WINDOW_MS = 15 * 60 * 1000;      // …per 15 minutes
const MAX_XML = 200000;                     // chars per program
const MAX_SLOTS_PER_PUT = 100;

const TURMA_RE = /^[a-z0-9]{1,8}$/;
const USERNAME_RE = /^([a-z0-9]{1,8})-([1-9][0-9]?)$/;
const SLOT_RE = /^(\d{2}-\d{2}|livre)$/;
const LEVEL_RE = /^\d{2}-\d{2}$/;
const B64_RE = /^[A-Za-z0-9+/]+={0,2}$/;

/** "7b-12" → { turma: "7b", number: 12 }, or null. */
export function parseUsername(u) {
  const m = USERNAME_RE.exec(String(u || ''));
  return m ? { turma: m[1], number: Number(m[2]) } : null;
}

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
});
const fail = (status, error) => json({ error }, status);

// ── tokens: base64url(JSON {u, exp}) + "." + base64url(HMAC-SHA256) ──────────────
const enc = new TextEncoder();
const b64url = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64url = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));

async function hmacKey(secret) {
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export async function makeToken(secret, username, now) {
  const exp = now + TOKEN_HOURS * 3600 * 1000;
  const body = b64url(enc.encode(JSON.stringify({ u: username, exp })));
  const sig = b64url(await crypto.subtle.sign('HMAC', await hmacKey(secret), enc.encode(body)));
  return { token: `${body}.${sig}`, expires: exp };
}

async function readToken(secret, token, now) {
  const [body, sig] = String(token || '').split('.');
  if (!body || !sig) return null;
  try {
    const ok = await crypto.subtle.verify('HMAC', await hmacKey(secret), unb64url(sig), enc.encode(body));
    if (!ok) return null;
    const { u, exp } = JSON.parse(new TextDecoder().decode(unb64url(body)));
    return exp > now && parseUsername(u) ? u : null;
  } catch (e) {
    return null;
  }
}

function bearer(request) {
  const h = request.headers.get('authorization') || '';
  return h.startsWith('Bearer ') ? h.slice(7) : '';
}

function sameString(a, b) {   // constant time for equal lengths
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function body(request) {
  try { return await request.json(); } catch (e) { return null; }
}

// ── student routes ─────────────────────────────────────────────────────────────
async function login(request, env, now) {
  const b = await body(request);
  const username = String((b && b.username) || '').trim().toLowerCase();
  const password = String((b && b.password) || '').trim().toLowerCase();
  if (!parseUsername(username) || !password) return fail(400, 'bad_request');
  const row = await env.DB.prepare('SELECT pw_salt, pw_hash, fails, fail_since FROM students WHERE username = ?').bind(username).first();
  if (!row) return fail(401, 'wrong_login');
  const inWindow = now - row.fail_since < FAIL_WINDOW_MS;
  if (inWindow && row.fails >= MAX_FAILS) return fail(429, 'too_many_tries');
  if (!(await checkPassword(password, row.pw_salt, row.pw_hash))) {
    await env.DB.prepare('UPDATE students SET fails = ?, fail_since = ? WHERE username = ?')
      .bind(inWindow ? row.fails + 1 : 1, inWindow ? row.fail_since : now, username).run();
    return fail(401, 'wrong_login');
  }
  await env.DB.prepare('UPDATE students SET fails = 0, fail_since = 0, last_seen = ? WHERE username = ?').bind(now, username).run();
  const { token, expires } = await makeToken(env.SESSION_SECRET, username, now);
  return json({ token, username, expires });
}

async function getProgress(env, username) {
  const [p, s] = await env.DB.batch([
    env.DB.prepare('SELECT slot, xml FROM programs WHERE username = ?').bind(username),
    env.DB.prepare('SELECT level, one, two, three FROM stars WHERE username = ?').bind(username),
  ]);
  const programs = {};
  for (const r of p.results) programs[r.slot] = r.xml;   // null = deleted
  const stars = {};
  for (const r of s.results) stars[r.level] = { one: !!r.one, two: !!r.two, three: !!r.three };
  return json({ programs, stars });
}

async function putProgress(request, env, username, now) {
  const b = await body(request);
  if (!b || typeof b !== 'object') return fail(400, 'bad_request');
  const programs = Object.entries(b.programs || {});
  const stars = Object.entries(b.stars || {});
  if (programs.length + stars.length > MAX_SLOTS_PER_PUT) return fail(413, 'too_large');
  const stmts = [];
  for (const [slot, xml] of programs) {
    if (!SLOT_RE.test(slot)) return fail(400, 'bad_slot');
    if (xml !== null && (typeof xml !== 'string' || xml.length > MAX_XML || !xml.trim().startsWith('<xml'))) return fail(400, 'bad_program');
    stmts.push(env.DB.prepare(
      'INSERT INTO programs (username, slot, xml, updated) VALUES (?, ?, ?, ?) ' +
      'ON CONFLICT (username, slot) DO UPDATE SET xml = excluded.xml, updated = excluded.updated',
    ).bind(username, slot, xml, now));
  }
  for (const [level, s] of stars) {
    if (!LEVEL_RE.test(level) || !s || typeof s !== 'object') return fail(400, 'bad_stars');
    const three = s.three ? 1 : 0;
    const two = s.two || three ? 1 : 0;
    const one = s.one || two ? 1 : 0;
    stmts.push(env.DB.prepare(   // stars are only ever added
      'INSERT INTO stars (username, level, one, two, three) VALUES (?, ?, ?, ?, ?) ' +
      'ON CONFLICT (username, level) DO UPDATE SET one = max(one, excluded.one), two = max(two, excluded.two), ' +
      'three = max(three, excluded.three)',
    ).bind(username, level, one, two, three));
  }
  stmts.push(env.DB.prepare('UPDATE students SET last_seen = ? WHERE username = ?').bind(now, username));
  await env.DB.batch(stmts);
  return json({ ok: true });
}

// ── teacher routes ─────────────────────────────────────────────────────────────
async function addStudents(request, env) {
  const b = await body(request);
  const list = b && Array.isArray(b.students) ? b.students : null;
  if (!list || !list.length || list.length > 100) return fail(400, 'bad_request');
  for (const s of list) {
    if (!s || !parseUsername(s.username) || !B64_RE.test(s.salt || '') || !B64_RE.test(s.hash || '')) {
      return fail(400, 'bad_student');
    }
  }
  const names = list.map((s) => s.username);
  const marks = names.map(() => '?').join(',');
  const existing = (await env.DB.prepare(`SELECT username FROM students WHERE username IN (${marks})`).bind(...names).all())
    .results.map((r) => r.username);
  if (b.reset) {   // new passwords for existing students only
    const missing = names.filter((u) => !existing.includes(u));
    if (missing.length) return json({ error: 'not_found', usernames: missing }, 404);
    await env.DB.batch(list.map((s) => env.DB.prepare(
      'UPDATE students SET pw_salt = ?, pw_hash = ?, fails = 0, fail_since = 0 WHERE username = ?',
    ).bind(s.salt, s.hash, s.username)));
    return json({ ok: true, reset: names.length });
  }
  if (existing.length) return json({ error: 'exists', usernames: existing }, 409);
  await env.DB.batch(list.map((s) => {
    const { turma, number } = parseUsername(s.username);
    return env.DB.prepare('INSERT INTO students (username, turma, number, pw_salt, pw_hash) VALUES (?, ?, ?, ?, ?)')
      .bind(s.username, turma, number, s.salt, s.hash);
  }));
  return json({ ok: true, created: names.length });
}

async function listTurmas(env) {
  const r = await env.DB.prepare(
    'SELECT turma, count(*) AS students, max(last_seen) AS lastSeen FROM students GROUP BY turma ORDER BY turma',
  ).all();
  return json(r.results);
}

async function showTurma(env, turma) {
  const r = await env.DB.prepare(
    'SELECT s.username, s.number, s.last_seen AS lastSeen, ' +
    '(SELECT count(*) FROM stars t WHERE t.username = s.username AND t.one = 1) AS levels, ' +
    '(SELECT count(*) FROM stars t WHERE t.username = s.username AND t.two = 1) AS twoStars, ' +
    '(SELECT count(*) FROM stars t WHERE t.username = s.username AND t.three = 1) AS threeStars ' +
    'FROM students s WHERE s.turma = ? ORDER BY s.number',
  ).bind(turma).all();
  return json(r.results);
}

async function deleteTurma(env, turma) {
  const where = 'username IN (SELECT username FROM students WHERE turma = ?)';
  const [, , del] = await env.DB.batch([
    env.DB.prepare(`DELETE FROM programs WHERE ${where}`).bind(turma),
    env.DB.prepare(`DELETE FROM stars WHERE ${where}`).bind(turma),
    env.DB.prepare('DELETE FROM students WHERE turma = ?').bind(turma),
  ]);
  return json({ ok: true, deleted: del.meta ? del.meta.changes : undefined });
}

// ── router ─────────────────────────────────────────────────────────────────────
export async function handle(request, env, now = Date.now()) {
  if (!env.DB || !env.SESSION_SECRET || !env.TEACHER_KEY) return fail(503, 'not_configured');
  const path = new URL(request.url).pathname.replace(/\/+$/, '');
  const method = request.method;
  try {
    if (path === '/api/login' && method === 'POST') return await login(request, env, now);

    if (path === '/api/progress') {
      const username = await readToken(env.SESSION_SECRET, bearer(request), now);
      if (!username) return fail(401, 'not_logged_in');
      if (method === 'GET') return await getProgress(env, username);
      if (method === 'PUT') return await putProgress(request, env, username, now);
      return fail(405, 'method');
    }

    if (path.startsWith('/api/teacher/')) {
      if (!sameString(bearer(request), env.TEACHER_KEY)) return fail(401, 'not_teacher');
      if (path === '/api/teacher/students' && method === 'POST') return await addStudents(request, env);
      if (path === '/api/teacher/turmas' && method === 'GET') return await listTurmas(env);
      const m = /^\/api\/teacher\/turmas\/([^/]+)$/.exec(path);
      if (m) {
        const turma = decodeURIComponent(m[1]).toLowerCase();
        if (!TURMA_RE.test(turma)) return fail(400, 'bad_turma');
        if (method === 'GET') return await showTurma(env, turma);
        if (method === 'DELETE') return await deleteTurma(env, turma);
      }
    }
    return fail(404, 'not_found');
  } catch (e) {
    console.error('[api]', e);
    return fail(500, 'server_error');
  }
}
