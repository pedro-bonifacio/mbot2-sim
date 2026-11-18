// Pure helpers for the turmas script (decision 0016): CSV in and out, usernames,
// passwords. No file or network access here; scripts/accounts-check.mjs tests it.

import { webcrypto } from 'node:crypto';

// Passwords are animal-colour-NN, typed by 11-year-olds: no accents, no ç, nothing a
// classmate could use as an insult (no porco, burro, vaca, cabra, macaco, baleia, …),
// colours that don't change with gender, and never 69.
export const ANIMALS = [
  'gato', 'lobo', 'urso', 'pato', 'tigre', 'zebra', 'panda', 'foca', 'lontra', 'raposa',
  'mocho', 'coruja', 'coelho', 'esquilo', 'golfinho', 'pinguim', 'polvo', 'lince', 'castor',
  'gaivota', 'flamingo', 'canguru', 'koala', 'camelo', 'girafa', 'tartaruga', 'papagaio',
  'cavalo', 'texugo', 'lagarto', 'cisne', 'grilo', 'abelha', 'joaninha', 'borboleta',
  'gazela', 'morsa', 'tucano', 'colibri', 'pelicano', 'jaguar', 'puma', 'bisonte', 'alce', 'rena',
];
export const COLOURS = ['azul', 'verde', 'laranja', 'rosa', 'cinza', 'violeta', 'turquesa', 'coral'];

const TURMA_RE = /^[a-z0-9]{1,8}$/;

function randomInt(n) {   // unbiased 0…n-1
  const max = Math.floor(0x100000000 / n) * n;
  const buf = new Uint32Array(1);
  do webcrypto.getRandomValues(buf); while (buf[0] >= max);
  return buf[0] % n;
}

export function makePassword() {
  let num;
  do num = 10 + randomInt(90); while (num === 69);
  return `${ANIMALS[randomInt(ANIMALS.length)]}-${COLOURS[randomInt(COLOURS.length)]}-${num}`;
}

/** "7B" → "7b"; throws on anything that is not 1–8 letters/digits. */
export function cleanTurma(turma) {
  const t = String(turma || '').trim().toLowerCase();
  if (!TURMA_RE.test(t)) throw new Error(`class "${turma}" must be 1–8 letters or digits, e.g. 7B`);
  return t;
}

export function makeUsername(turma, number) { return `${cleanTurma(turma)}-${Number(number)}`; }

/** Text of a CSV file (Buffer): UTF-8, or Windows-1252 as Excel saves "CSV" in PT. */
export function decodeCsv(buf) {
  try { return new TextDecoder('utf-8', { fatal: true }).decode(buf); }
  catch (e) { return new TextDecoder('windows-1252').decode(buf); }
}

function splitLine(line, d) {
  const out = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') q = false;
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === d) { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

/**
 * Parses CSV text with a header row; `,` or `;` (whichever the header uses).
 * Returns { delimiter, header: [...], records: [{ column: value }] }. Blank lines skipped.
 */
export function parseCsv(text) {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) throw new Error('the CSV file is empty');
  const delimiter = (lines[0].match(/;/g) || []).length > (lines[0].match(/,/g) || []).length ? ';' : ',';
  const header = splitLine(lines[0], delimiter).map((h) => h.toLowerCase());
  const records = lines.slice(1).map((l) => {
    const cells = splitLine(l, delimiter);
    return Object.fromEntries(header.map((h, i) => [h, cells[i] ?? '']));
  });
  return { delimiter, header, records };
}

const cell = (v, d) => (/["\r\n]/.test(v) || v.includes(d) ? `"${v.replace(/"/g, '""')}"` : v);

/** CSV text (with BOM, so Excel shows accents) for rows of { number, names, username, password }. */
export function writeCsv(rows, delimiter = ',') {
  const cols = ['number', 'names', 'username', 'password'];
  const lines = [cols.join(delimiter), ...rows.map((r) => cols.map((c) => cell(String(r[c] ?? ''), delimiter)).join(delimiter))];
  return '﻿' + lines.join('\r\n') + '\r\n';
}

/** Checks a student number: whole number 1–99. */
export function cleanNumber(raw) {
  const n = Number(String(raw).trim());
  if (!Number.isInteger(n) || n < 1 || n > 99) throw new Error(`number "${raw}" must be a whole number from 1 to 99`);
  return n;
}

/**
 * Rows of { number, names } (from parseCsv) → [{ number, names, username, password }],
 * sorted by number. Throws on missing columns, bad or repeated numbers, empty names.
 */
export function buildStudents(turma, records) {
  if (records.length && !('number' in records[0] && 'names' in records[0])) {
    throw new Error(`the CSV needs the columns "number" and "names" (found: ${Object.keys(records[0]).join(', ')})`);
  }
  if (!records.length) throw new Error('the CSV has no students');
  const seen = new Set();
  const out = records.map((r, i) => {
    const line = i + 2;
    let number;
    try { number = cleanNumber(r.number); } catch (e) { throw new Error(`line ${line}: ${e.message}`); }
    if (seen.has(number)) throw new Error(`line ${line}: number ${number} appears twice`);
    seen.add(number);
    if (!r.names) throw new Error(`line ${line}: no name`);
    return { number, names: r.names, username: makeUsername(turma, number), password: makePassword() };
  });
  return out.sort((a, b) => a.number - b.number);
}
