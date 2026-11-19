#!/usr/bin/env node
// Checks the progress-sync API (server/api.js, decision 0016) against an in-memory
// SQLite database posing as D1 (node:sqlite, Node 22.13+), and the turmas script's
// CSV and password helpers. The browser side is in progress-check.mjs.
// Usage: node --no-warnings scripts/accounts-check.mjs

import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import { handle, TOKEN_HOURS } from '../server/api.js';
import { hashPassword } from '../server/password.js';
import { makeUsername, makePassword, parseCsv, buildStudents } from '../tools/turmas/lib.js';

// ── a minimal D1 on SQLite: prepare().bind().first/all/run, batch() ────────────
function fakeD1() {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON;');
  for (const f of fs.readdirSync(new URL('../migrations/', import.meta.url)).filter((n) => n.endsWith('.sql')).sort()) {
    db.exec(fs.readFileSync(new URL(`../migrations/${f}`, import.meta.url), 'utf8'));
  }
  const stmt = (sql, args = []) => ({
    bind: (...a) => stmt(sql, a),
    async first() { return db.prepare(sql).get(...args) ?? null; },
    async all() { return { results: db.prepare(sql).all(...args) }; },
    async run() { const r = db.prepare(sql).run(...args); return { meta: { changes: r.changes } }; },
    _exec() {
      const p = db.prepare(sql);
      if (/^\s*select/i.test(sql)) return { results: p.all(...args) };
      return { results: [], meta: { changes: p.run(...args).changes } };
    },
  });
  return {
    prepare: (sql) => stmt(sql),
    async batch(list) {   // D1 batches are transactions
      db.exec('BEGIN');
      try { const out = list.map((s) => s._exec()); db.exec('COMMIT'); return out; }
      catch (e) { db.exec('ROLLBACK'); throw e; }
    },
  };
}

const env = { DB: fakeD1(), TEACHER_KEY: 'teacher-secret', SESSION_SECRET: 'session-secret' };
let now = Date.UTC(2026, 10, 18, 9);
async function call(method, path, body, token) {
  const headers = { 'content-type': 'application/json' };
  if (token) headers.authorization = `Bearer ${token}`;
  const res = await handle(new Request(`https://sim.test${path}`, { method, headers, body: body && JSON.stringify(body) }), env, now);
  return { status: res.status, body: await res.json() };
}

let failed = 0;
const check = (name, ok, got) => {
  if (!ok) failed++;
  process.stdout.write(`${ok ? 'ok  ' : 'FAIL'} ${name}${ok ? '' : ' — got ' + JSON.stringify(got)}\n`);
};
const XML = (n) => `<xml xmlns="https://developers.google.com/blockly/xml"><block type="robControls_start" id="${n}"/></xml>`;
const T = 'teacher-secret';

// 1. the turmas script's pieces
check('username from turma + number', makeUsername('7B', 3) === '7b-3', makeUsername('7B', 3));
const pw = Array.from({ length: 500 }, makePassword);
check('passwords look like animal-colour-NN', pw.every((p) => /^[a-z]+-[a-z]+-[1-9][0-9]$/.test(p)), pw.find((p) => !/^[a-z]+-[a-z]+-[1-9][0-9]$/.test(p)));
check('no 69 in passwords', pw.every((p) => !p.endsWith('-69')), pw.filter((p) => p.endsWith('-69')));
const csvSemi = '﻿number;names\r\n1;Ana Sofia Gonçalves\r\n2;"Silva; João"\r\n\r\n';
const rows = parseCsv(csvSemi);
check('CSV with ; and BOM (Excel PT)', rows.delimiter === ';' && rows.records.length === 2 && rows.records[1].names === 'Silva; João', rows);
check('CSV with ,', parseCsv('names,number\nRui,7\n').records[0].number === '7', parseCsv('names,number\nRui,7\n'));
let threw = null;
try { buildStudents('7B', parseCsv('number,names\n1,Ana\n1,Rui\n').records); } catch (e) { threw = e.message; }
check('duplicate numbers are refused', /1/.test(threw || ''), threw);
threw = null;
try { buildStudents('7B', parseCsv('numero,nome\n1,Ana\n').records); } catch (e) { threw = e.message; }
check('wrong headers are refused', /number/.test(threw || ''), threw);

// 2. teacher creates a class (the script hashes; the server stores)
const students = [];
for (const n of [1, 2]) students.push({ username: `7b-${n}`, ...(await hashPassword(`gato-azul-1${n}`)) });
let r = await call('POST', '/api/teacher/students', { students }, 'wrong');
check('teacher routes need the teacher key', r.status === 401, r);
r = await call('POST', '/api/teacher/students', { students }, T);
check('class created', r.status === 200 && r.body.created === 2, r);
r = await call('POST', '/api/teacher/students', { students: students.slice(0, 1) }, T);
check('creating an existing student is refused (409)', r.status === 409 && r.body.usernames[0] === '7b-1', r);

// 3. login
r = await call('POST', '/api/login', { username: '7b-1', password: 'gato-azul-99' });
check('wrong password → 401', r.status === 401, r);
r = await call('POST', '/api/login', { username: ' 7B-1 ', password: 'Gato-Azul-11 ' });
check('login (case and spaces forgiven)', r.status === 200 && r.body.username === '7b-1' && r.body.token, r);
const tok1 = r.body.token;
r = await call('GET', '/api/progress');
check('progress needs a token', r.status === 401, r);

// 4. progress
r = await call('GET', '/api/progress', null, tok1);
check('new student: empty progress', r.status === 200 && JSON.stringify(r.body) === '{"programs":{},"stars":{}}', r);
r = await call('PUT', '/api/progress', { programs: { '01-01': XML('a'), livre: XML('l') }, stars: { '01-01': { one: true } } }, tok1);
check('save programs and stars', r.status === 200, r);
r = await call('PUT', '/api/progress', { programs: { '01-01': null }, stars: { '01-01': { one: false, two: false }, '01-02': { two: true } } }, tok1);
r = await call('GET', '/api/progress', null, tok1);
check('a deleted program comes back as null', r.body.programs['01-01'] === null && r.body.programs.livre === XML('l'), r.body.programs);
check('stars are never removed; ★★ implies ★', r.body.stars['01-01'].one && r.body.stars['01-02'].one && r.body.stars['01-02'].two, r.body.stars);
r = await call('PUT', '/api/progress', { programs: {}, stars: { '01-03': { three: true } } }, tok1);
r = await call('GET', '/api/progress', null, tok1);
check('★★★ is saved and implies ★★ and ★', r.body.stars['01-03'].three && r.body.stars['01-03'].two && r.body.stars['01-03'].one && !r.body.stars['01-02'].three, r.body.stars);
r = await call('PUT', '/api/progress', { programs: { '../x': XML('x') } }, tok1);
check('bad slot refused', r.status === 400, r);
r = await call('PUT', '/api/progress', { programs: { '01-03': 'rm -rf' } }, tok1);
check('non-XML program refused', r.status === 400, r);
const tok2 = (await call('POST', '/api/login', { username: '7b-2', password: 'gato-azul-12' })).body.token;
r = await call('GET', '/api/progress', null, tok2);
check("students don't see each other's progress", Object.keys(r.body.programs).length === 0, r.body);

// 5. tokens
check('token is not accepted after expiry', await (async () => {
  now += (TOKEN_HOURS * 3600 + 1) * 1000;
  const x = await call('GET', '/api/progress', null, tok1);
  now -= (TOKEN_HOURS * 3600 + 1) * 1000;
  return x.status === 401;
})(), null);
const [b, s] = tok1.split('.');
const forged = Buffer.from(JSON.stringify({ u: '7b-2', exp: now + 1e9 })).toString('base64url') + '.' + s;
r = await call('GET', '/api/progress', null, forged);
check('forged token refused', r.status === 401 && b, r);

// 6. rate limit
for (let i = 0; i < 10; i++) await call('POST', '/api/login', { username: '7b-2', password: 'nope' });
r = await call('POST', '/api/login', { username: '7b-2', password: 'gato-azul-12' });
check('after 10 failures the right password waits (429)', r.status === 429, r);
now += 16 * 60 * 1000;
r = await call('POST', '/api/login', { username: '7b-2', password: 'gato-azul-12' });
check('…and works again after 15 min', r.status === 200, r);

// 7. reset password, class overview, delete
r = await call('POST', '/api/teacher/students', { reset: true, students: [{ username: '7b-1', ...(await hashPassword('lobo-verde-20')) }] }, T);
check('password reset', r.status === 200 && r.body.reset === 1, r);
r = await call('POST', '/api/login', { username: '7b-1', password: 'lobo-verde-20' });
check('new password works', r.status === 200, r);
r = await call('POST', '/api/teacher/students', { reset: true, students: [{ username: '7b-9', ...(await hashPassword('x')) }] }, T);
check('reset of an unknown student → 404', r.status === 404, r);
r = await call('GET', '/api/teacher/turmas/7B', null, T);
check('class overview: levels with ★ per student', r.status === 200 && r.body[0].levels === 3 && r.body[0].twoStars === 2 && r.body[0].threeStars === 1, r.body);
r = await call('GET', '/api/teacher/turmas', null, T);
check('list of classes', r.body.length === 1 && r.body[0].turma === '7b' && r.body[0].students === 2, r.body);
r = await call('DELETE', '/api/teacher/turmas/7b', null, T);
check('class deleted with its progress', r.status === 200 && r.body.deleted === 2, r);
r = await call('POST', '/api/login', { username: '7b-1', password: 'lobo-verde-20' });
check('deleted student cannot log in', r.status === 401, r);

console.log(failed ? `\n${failed} FAILED` : '\nall account checks passed');
process.exit(failed ? 1 : 0);
