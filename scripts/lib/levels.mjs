// Node-side level loading for the level scripts: find the YAML files, parse them,
// validate them against levels/level.schema.json. (The browser gets the same files
// as JSON through the Vite plugin in vite.config.js.)

import fs from 'fs';
import path from 'path';
import YAML from 'yaml';
import Ajv from 'ajv';
import { ROOT } from './sim.mjs';

export const LEVELS_DIR = path.join(ROOT, 'levels');

const ajv = new Ajv({ allErrors: true, allowUnionTypes: true });
const validate = ajv.compile(JSON.parse(fs.readFileSync(path.join(LEVELS_DIR, 'level.schema.json'), 'utf8')));

/** All level files, sorted: levels/<world dir>/<id>-<slug>.yaml */
export function levelFiles() {
  const out = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.name.startsWith('_') || e.name.startsWith('.')) continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.yaml')) out.push(p);
    }
  };
  walk(LEVELS_DIR);
  return out.sort();
}

/** → { level, file, schemaErrors: [string] } */
export function loadLevelFile(file) {
  const level = YAML.parse(fs.readFileSync(file, 'utf8'));
  const ok = validate(level);
  const schemaErrors = ok ? [] : validate.errors.map((e) => `${e.instancePath || '/'} ${e.message}${e.params && e.params.allowedValues ? ': ' + e.params.allowedValues.join(', ') : ''}`);
  return { level, file, schemaErrors };
}

/** The level with this id (e.g. "04-01"). */
export function findLevel(id) {
  for (const f of levelFiles()) {
    const { level } = loadLevelFile(f);
    if (level && level.id === id) return level;
  }
  throw new Error(`no level "${id}" in levels/`);
}
