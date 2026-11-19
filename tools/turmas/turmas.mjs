#!/usr/bin/env node
// The teacher's class tool for the mBot 2 sim (decision 0016). Lives on the teacher's
// shared drive next to config.json; each class has a folder turmas/<class>/ with its
// students CSV and password file. Source: tools/turmas/ in the sim's repo (install
// with `npm run turmas:install`).
//
//   node turmas.mjs create 7B                 accounts from the CSV in turmas/7B/
//                                             (columns number, names)
//   node turmas.mjs add 7B 23 "Nome Apelido"  one more student
//   node turmas.mjs reset 7B 12               new password for a student
//   node turmas.mjs show 7B                   progress per student
//   node turmas.mjs list                      all classes on the server
//   node turmas.mjs delete 7B                 removes a class and its progress (year end)
//
// Options: --api <url> and --key <teacher key> override config.json.
// Names stay in the password files on this drive; the server only gets usernames
// ("7b-12") and password hashes.

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { fileURLToPath } from 'node:url';
import { hashPassword } from './password.js';
import {
  cleanTurma, cleanNumber, makeUsername, makePassword, decodeCsv, parseCsv, writeCsv, buildStudents,
} from './lib.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));

function die(msg) { console.error(`\n✗ ${msg}\n`); process.exit(1); }

function parseArgs(argv) {
  const args = [];
  const opts = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) opts[argv[i].slice(2)] = argv[++i];
    else args.push(argv[i]);
  }
  return { args, opts };
}

function config(opts) {
  let cfg = {};
  const file = path.join(HERE, 'config.json');
  if (fs.existsSync(file)) {
    try { cfg = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { die(`config.json is not valid JSON: ${e.message}`); }
  }
  const api = (opts.api || cfg.api || '').replace(/\/+$/, '');
  const key = opts.key || cfg.teacherKey || '';
  if (!api || !key) die(`set "api" and "teacherKey" in ${file} (see config.example.json)`);
  return { api, key };
}

async function request(cfg, method, route, body) {
  let res;
  try {
    res = await fetch(cfg.api + route, {
      method,
      headers: { authorization: `Bearer ${cfg.key}`, 'content-type': 'application/json' },
      body: body && JSON.stringify(body),
    });
  } catch (e) {
    die(`cannot reach ${cfg.api} (${e.cause ? e.cause.code || e.cause.message : e.message})`);
  }
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) die('the server refused the teacher key (check teacherKey in config.json)');
  if (res.status === 503) die('the server is not set up yet (D1 database or secrets missing)');
  return { status: res.status, data };
}

const CLASSES = path.join(HERE, 'turmas');
const isPasswords = (f) => /-passwords\.csv$/i.test(f);

/** turmas/<class>/: an existing folder in any letter case, else turmas/<CLASS>. */
function classDir(turma) {
  const want = turma.toLowerCase();
  if (fs.existsSync(CLASSES)) {
    const found = fs.readdirSync(CLASSES, { withFileTypes: true }).find((d) => d.isDirectory() && d.name.toLowerCase() === want);
    if (found) return path.join(CLASSES, found.name);
  }
  return path.join(CLASSES, turma.toUpperCase());
}

const passwordsFile = (turma) => path.join(classDir(turma), `${turma.toUpperCase()}-passwords.csv`);

/** The students CSV in the class folder (the one CSV that is not the password file). */
function studentsCsv(turma) {
  const dir = classDir(turma);
  const rel = path.relative(HERE, dir);
  if (!fs.existsSync(dir)) die(`no folder ${rel}. Create it and put the class CSV (columns number, names) in it.`);
  const csvs = fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.csv') && !isPasswords(f));
  if (!csvs.length) die(`no CSV in ${rel}. Put the class CSV (columns number, names) there.`);
  if (csvs.length > 1) die(`more than one CSV in ${rel} (${csvs.join(', ')}); leave only the class list.`);
  return path.join(dir, csvs[0]);
}

function readPasswords(turma) {
  const file = passwordsFile(turma);
  if (!fs.existsSync(file)) return null;
  const { delimiter, records } = parseCsv(decodeCsv(fs.readFileSync(file)));
  return { file, delimiter, rows: records };
}

function savePasswords(file, rows, delimiter) {
  rows.sort((a, b) => Number(a.number) - Number(b.number));
  fs.writeFileSync(file, writeCsv(rows, delimiter));
}

async function withHashes(students) {
  return Promise.all(students.map(async (s) => ({ username: s.username, ...(await hashPassword(s.password)) })));
}

function printTable(rows) {
  for (const r of rows) console.log(`  ${String(r.number).padStart(2)}  ${r.username.padEnd(8)}  ${r.password.padEnd(22)}  ${r.names || ''}`);
}

// ── commands ───────────────────────────────────────────────────────────────────
async function create(cfg, turmaArg) {
  if (!turmaArg) die('usage: node turmas.mjs create <class>   (the CSV goes in turmas/<class>/)');
  const turma = cleanTurma(turmaArg);
  const out = passwordsFile(turmaArg);
  if (fs.existsSync(out)) die(`${path.relative(HERE, out)} already exists. To add a student use "add"; to start over use "delete" first.`);
  const csvPath = studentsCsv(turmaArg);
  let students;
  let delimiter;
  try {
    const csv = parseCsv(decodeCsv(fs.readFileSync(csvPath)));
    delimiter = csv.delimiter;
    students = buildStudents(turma, csv.records);
  } catch (e) {
    die(`${path.basename(csvPath)}: ${e.message}`);
  }
  // Write the file first: if the server then fails, nobody has these passwords yet.
  savePasswords(out, students, delimiter);
  const { status, data } = await request(cfg, 'POST', '/api/teacher/students', { students: await withHashes(students) });
  if (status !== 200) {
    fs.unlinkSync(out);
    if (status === 409) die(`these accounts already exist on the server: ${data.usernames.join(', ')}`);
    die(`server error ${status}: ${data.error || ''}`);
  }
  console.log(`\n✓ Class ${turmaArg.toUpperCase()}: ${students.length} accounts created.\n`);
  printTable(students);
  console.log(`\nPasswords saved in ${out}\n`);
}

async function add(cfg, turmaArg, numberArg, name) {
  if (!turmaArg || !numberArg || !name) die('usage: node turmas.mjs add <class> <number> "<name>"');
  cleanTurma(turmaArg);
  const number = cleanNumber(numberArg);
  const student = { number, names: name, username: makeUsername(turmaArg, number), password: makePassword() };
  const { status, data } = await request(cfg, 'POST', '/api/teacher/students', { students: await withHashes([student]) });
  if (status === 409) die(`${student.username} already exists. For a new password use "reset ${turmaArg} ${number}".`);
  if (status !== 200) die(`server error ${status}: ${data.error || ''}`);
  const pw = readPasswords(turmaArg) || { file: passwordsFile(turmaArg), delimiter: ',', rows: [] };
  fs.mkdirSync(path.dirname(pw.file), { recursive: true });
  pw.rows = pw.rows.filter((r) => Number(r.number) !== number).concat(student);
  savePasswords(pw.file, pw.rows, pw.delimiter);
  console.log('\n✓ Student added.\n');
  printTable([student]);
  console.log(`\nSaved in ${pw.file}\n`);
}

async function reset(cfg, turmaArg, numberArg) {
  if (!turmaArg || !numberArg) die('usage: node turmas.mjs reset <class> <number>');
  cleanTurma(turmaArg);
  const number = cleanNumber(numberArg);
  const username = makeUsername(turmaArg, number);
  const password = makePassword();
  const { status, data } = await request(cfg, 'POST', '/api/teacher/students', {
    reset: true, students: await withHashes([{ username, password }]),
  });
  if (status === 404) die(`${username} does not exist on the server. To create it use "add".`);
  if (status !== 200) die(`server error ${status}: ${data.error || ''}`);
  const pw = readPasswords(turmaArg);
  let row = { number, names: '', username, password };
  if (pw) {
    const old = pw.rows.find((r) => Number(r.number) === number);
    if (old) { old.password = password; row = old; } else pw.rows.push(row);
    savePasswords(pw.file, pw.rows, pw.delimiter);
  }
  console.log('\n✓ New password.\n');
  printTable([row]);
  console.log(pw ? `\nUpdated in ${pw.file}\n` : `\n(no ${path.relative(HERE, passwordsFile(turmaArg))}; write it down)\n`);
}

const when = (ms) => (ms ? new Date(ms).toLocaleString('pt-PT', { dateStyle: 'short', timeStyle: 'short' }) : '—');

async function show(cfg, turmaArg) {
  if (!turmaArg) die('usage: node turmas.mjs show <class>');
  const turma = cleanTurma(turmaArg);
  const { status, data } = await request(cfg, 'GET', `/api/teacher/turmas/${turma}`);
  if (status !== 200) die(`server error ${status}: ${data.error || ''}`);
  if (!data.length) die(`no class ${turmaArg.toUpperCase()} on the server`);
  const names = Object.fromEntries(((readPasswords(turmaArg) || {}).rows || []).map((r) => [r.username, r.names]));
  console.log(`\nClass ${turmaArg.toUpperCase()} — levels with ★ / with ★★ / last seen\n`);
  for (const s of data) {
    console.log(`  ${String(s.number).padStart(2)}  ${s.username.padEnd(8)}  ★ ${String(s.levels).padStart(2)}  ★★ ${String(s.twoStars).padStart(2)}  ★★★ ${String(s.threeStars ?? 0).padStart(2)}  ${when(s.lastSeen).padEnd(17)}  ${names[s.username] || ''}`);
  }
  console.log('');
}

async function list(cfg) {
  const { status, data } = await request(cfg, 'GET', '/api/teacher/turmas');
  if (status !== 200) die(`server error ${status}: ${data.error || ''}`);
  if (!data.length) { console.log('\nNo classes on the server yet.\n'); return; }
  console.log('\nClass     students  last seen');
  for (const t of data) console.log(`  ${t.turma.toUpperCase().padEnd(8)}  ${String(t.students).padStart(3)}     ${when(t.lastSeen)}`);
  console.log('');
}

async function remove(cfg, turmaArg) {
  if (!turmaArg) die('usage: node turmas.mjs delete <class>');
  const turma = cleanTurma(turmaArg);
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(`This deletes class ${turmaArg.toUpperCase()} and all its progress on the server. Type the class name to confirm: `);
  rl.close();
  if (answer.trim().toLowerCase() !== turma) die('not confirmed; nothing deleted');
  const { status, data } = await request(cfg, 'DELETE', `/api/teacher/turmas/${turma}`);
  if (status !== 200) die(`server error ${status}: ${data.error || ''}`);
  console.log(`\n✓ Deleted ${data.deleted ?? ''} accounts of class ${turmaArg.toUpperCase()}.`);
  const dir = classDir(turmaArg);
  if (fs.existsSync(dir)) console.log(`  The folder ${path.relative(HERE, dir)} (names and passwords) is still there; delete it when you no longer need it.`);
  console.log('');
}

// ── main ───────────────────────────────────────────────────────────────────────
const { args, opts } = parseArgs(process.argv.slice(2));
const [cmd, ...rest] = args;
const commands = { create, add, reset, show, list, delete: remove };
if (!commands[cmd]) {
  console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split("\n").slice(1, 17).map((l) => l.replace(/^\/\/ ?/, '')).join('\n'));
  process.exit(cmd ? 1 : 0);
}
try {
  await commands[cmd](config(opts), ...rest);
} catch (e) {
  die(e.message);
}
