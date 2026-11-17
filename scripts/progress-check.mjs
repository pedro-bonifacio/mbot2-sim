#!/usr/bin/env node
// Checks src/levels/progress.js (stars and per-level programs in localStorage, the
// progress file) against an in-memory localStorage. Usage: node scripts/progress-check.mjs

console.warn = () => {};   // expected warnings below (full / corrupt storage)
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => { if (String(v).length > 200000) throw new Error('QuotaExceededError'); store.set(k, String(v)); },
  removeItem: (k) => store.delete(k),
};
const P = await import('../src/levels/progress.js');

let failed = 0;
const check = (name, ok, got) => {
  if (!ok) failed++;
  process.stdout.write(`${ok ? 'ok  ' : 'FAIL'} ${name}${ok ? '' : ' — got ' + JSON.stringify(got)}\n`);
};
const reload = () => P._reloadProgress();
const XML = (n) => `<xml xmlns="https://developers.google.com/blockly/xml"><block type="robControls_start" id="${n}"/></xml>`;
const throws = (fn) => { try { fn(); return false; } catch (e) { return true; } };

// 1. the free-map program saved before this version becomes slot "livre"
store.set(P.LEGACY_PROGRAM_KEY, XML('old'));
reload();
check('old saved program is kept as the free-map program', P.getProgram(P.FREE_SLOT) === XML('old'), P.getProgram(P.FREE_SLOT));
check('no stars yet', JSON.stringify(P.getStars('04-01')) === '{"one":false,"two":false}', P.getStars('04-01'));

// 2. stars and programs survive a reload, per level
P.addStar('04-01', 'one');
P.addStar('05-01', 'two');
P.setProgram('04-01', XML('a'));
P.setProgram('05-01', XML('b'));
reload();
check('★ survives a reload', P.getStars('04-01').one && !P.getStars('04-01').two, P.getStars('04-01'));
check('★★ implies ★', P.getStars('05-01').one && P.getStars('05-01').two, P.getStars('05-01'));
check('each level keeps its own program', P.getProgram('04-01') === XML('a') && P.getProgram('05-01') === XML('b'));
check('free-map program untouched', P.getProgram(P.FREE_SLOT) === XML('old'));
P.setProgram('05-01', null);
reload();
check('Novo forgets that level\'s program only', P.getProgram('05-01') === null && P.getProgram('04-01') === XML('a'));

// 3. the progress file round-trips and merges into another browser
const file = JSON.parse(JSON.stringify(P.exportProgress('Ana')));
check('file is marked as a progress file with the name', file.kind === P.FILE_KIND && file.name === 'Ana', file);
store.clear();
reload();
P.addStar('01-01', 'one');
P.setProgram('04-01', XML('other'));
const counts = P.importProgress(file);
reload();
check('import adds stars without losing local ones', P.getStars('01-01').one && P.getStars('04-01').one && P.getStars('05-01').two);
check('import replaces programs of the levels in the file', P.getProgram('04-01') === XML('a'), P.getProgram('04-01'));
check('import reports counts', counts.stars === 2 && counts.programs === 2, counts);
P.importProgress({ kind: P.FILE_KIND, version: 1, stars: { '04-01': { one: false } }, programs: {} });
check('import never removes a star', P.getStars('04-01').one);

// 4. bad files are refused and change nothing
const before = store.get(P.PROGRESS_KEY);
check('a program XML is not a progress file', throws(() => P.importProgress({ programs: {} })));
check('a newer file version is refused', throws(() => P.importProgress({ kind: P.FILE_KIND, version: 99 })));
check('a bad level id is refused', throws(() => P.importProgress({ kind: P.FILE_KIND, version: 1, programs: { '../x': XML('x') } })));
check('a non-XML program is refused', throws(() => P.importProgress({ kind: P.FILE_KIND, version: 1, programs: { '04-01': 'alert(1)' } })));
check('refused files leave progress as it was', store.get(P.PROGRESS_KEY) === before);

// 5. storage trouble never throws
check('a full localStorage reports failure', P.setProgram('04-02', 'x'.repeat(300000)) === false);
store.set(P.PROGRESS_KEY, '{not json');
reload();
check('corrupt saved progress starts empty', P.getProgram('04-01') === null && !P.getStars('04-01').one);

process.stdout.write(`progress check: ${failed ? failed + ' failed' : 'all passed'}\n`);
process.exit(failed ? 1 : 0);
