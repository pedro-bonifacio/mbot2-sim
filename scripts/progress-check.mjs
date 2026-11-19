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
check('no stars yet', JSON.stringify(P.getStars('04-01')) === '{"one":false,"two":false,"three":false}', P.getStars('04-01'));

// 2. stars and programs survive a reload, per level
P.addStar('04-01', 'one');
P.addStar('05-01', 'two');
P.setProgram('04-01', XML('a'));
P.setProgram('05-01', XML('b'));
reload();
check('★ survives a reload', P.getStars('04-01').one && !P.getStars('04-01').two, P.getStars('04-01'));
check('★★ implies ★', P.getStars('05-01').one && P.getStars('05-01').two, P.getStars('05-01'));
P.addStar('05-02', 'three');
check('★★★ implies ★★ and ★', P.getStars('05-02').one && P.getStars('05-02').two && P.getStars('05-02').three, P.getStars('05-02'));
store.clear();
reload();
P.addStar('04-01', 'one');
P.addStar('05-01', 'two');
P.setProgram(P.FREE_SLOT, XML('old'));
P.setProgram('04-01', XML('a'));
P.setProgram('05-01', XML('b'));
check('★★ alone is not ★★★', !P.getStars('05-01').three, P.getStars('05-01'));
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

// 6. accounts (decision 0016): own cache per account, pending changes, server copy
store.clear();
P.useAccount(null);
P.setProgram('01-01', XML('guest'));
P.addStar('01-01', 'one');
check('guest progress is never pending', !P.hasPending());
P.useAccount('7b-1');
check('an account starts without the guest progress', P.getProgram('01-01') === null && !P.getStars('01-01').one);
P.setProgram('01-02', XML('mine'));
P.addStar('01-02', 'two');
let pend = P.pendingChanges();
check('changes in an account are pending', pend.programs['01-02'] === XML('mine') && pend.stars['01-02'].two, pend);
reload();
check('pending survives a reload', P.hasPending(), P.pendingChanges());
P.setProgram('01-02', XML('mine2'));   // edited while the save was on its way
P.markSynced(pend);
pend = P.pendingChanges();
check('synced entries drop out; a program edited meanwhile stays pending',
  !pend.stars['01-02'] && pend.programs['01-02'] === XML('mine2'), pend);
let changed = P.applyRemote({
  programs: { '01-02': XML('server'), '01-03': XML('server3'), livre: null },
  stars: { '01-03': { two: true }, '01-02': { one: false, two: false } },
});
check('server copy fills levels, but not over pending local edits',
  P.getProgram('01-02') === XML('mine2') && P.getProgram('01-03') === XML('server3'), [P.getProgram('01-02'), P.getProgram('01-03')]);
check('server stars are added, local ones kept', P.getStars('01-03').two && P.getStars('01-02').two);
P.applyRemote({ stars: { '01-05': { three: true } }, programs: {} });
check('a server ★★★ arrives with ★★ and ★', P.getStars('01-05').three && P.getStars('01-05').two && P.getStars('01-05').one, P.getStars('01-05'));
check('applyRemote reports changed slots only', JSON.stringify(changed) === '["01-03"]', changed);
check('server copy is not pending', !P.pendingChanges().programs['01-03']);
P.setProgram('01-04', XML('x'));
P.markSynced(P.pendingChanges());
changed = P.applyRemote({ programs: { '01-04': null }, stars: {} });
check('a program deleted on another computer goes here too', P.getProgram('01-04') === null && changed[0] === '01-04', changed);
P.useAccount('7b-2');
check('another account sees none of it', P.getProgram('01-01') === null && !P.getStars('01-03').one);
P.forgetAccount('7b-1');
P.useAccount('7b-1');
check('"Sair" removes the account copy from this computer', P.getProgram('01-02') === null && !P.hasPending());
P.useAccount(null);
check('guest progress is untouched by the account', P.getProgram('01-01') === XML('guest') && P.getStars('01-01').one && !P.getStars('01-02').one);

process.stdout.write(`progress check: ${failed ? failed + ' failed' : 'all passed'}\n`);
process.exit(failed ? 1 : 0);
