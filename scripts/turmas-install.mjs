#!/usr/bin/env node
// Copies the teacher's class tool (tools/turmas/, decision 0016) to the shared drive,
// so it runs from any computer: node turmas.mjs … in that folder.
// Usage: npm run turmas:install [-- <folder>]. Never touches config.json or the
// class password files already there.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = process.argv[2] || '/mnt/nas/career/professor-tic/mbot2-turmas';

fs.mkdirSync(target, { recursive: true });
const copies = [
  ['tools/turmas/turmas.mjs', 'turmas.mjs'],
  ['tools/turmas/lib.js', 'lib.js'],
  ['server/password.js', 'password.js'],   // the same hashing the server checks
  ['tools/turmas/README.md', 'README.md'],
  ['tools/turmas/config.example.json', 'config.example.json'],
];
for (const [from, to] of copies) fs.copyFileSync(path.join(ROOT, from), path.join(target, to));
// lib.js and turmas.mjs are ES modules; a package.json says so to Node.
fs.writeFileSync(path.join(target, 'package.json'), '{ "type": "module", "private": true }\n');
console.log(`turmas tool installed in ${target}`);
if (!fs.existsSync(path.join(target, 'config.json'))) {
  console.log('Next: copy config.example.json to config.json there and fill in the site address and teacher key.');
}
