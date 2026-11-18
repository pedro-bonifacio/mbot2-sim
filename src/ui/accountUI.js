// "👤 Entrar" in the top bar: the login box, the account menu ("Sair") and the sync
// status (decision 0016). The logic is in src/levels/sync.js.

import { ptMessages as MSG } from '../i18n/pt.js';
import {
  initSync, login, finishLogin, logout, loggedInAs, syncStatus, onSyncStatus,
  setRemoteChangeHandler, setAccountChangeHandler, setFlushHandler,
} from '../levels/sync.js';
import { flushEditor, reloadEditor } from './programIO.js';
import { appendConsoleMessage } from './console.js';

/** Before initProgramIO: switches to a logged-in account's progress if a session is saved. */
export function initAccount() {
  setFlushHandler(flushEditor);
  setRemoteChangeHandler((slots) => reloadEditor(slots));
  setAccountChangeHandler(() => reloadEditor());
  initSync();
}

/** After the editor is up: wires the top-bar button, menu, status and login box. */
export function initAccountUI() {
  const btn = document.getElementById('btn-account');
  const menu = document.getElementById('account-menu');
  const items = menu.querySelector('.menu-items');
  const statusEl = document.getElementById('sync-status');
  const dialog = document.getElementById('login-dialog');
  const form = document.getElementById('login-form');
  const user = document.getElementById('login-user');
  const pass = document.getElementById('login-pass');
  const error = document.getElementById('login-error');
  const submit = document.getElementById('login-submit');

  const setMenu = (open) => {
    items.hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
    if (open) items.querySelector('button').focus();
  };

  function render() {
    const name = loggedInAs();
    btn.textContent = name ? `👤 ${name} ▾` : MSG.ACCOUNT_LOGIN;
    btn.title = name ? MSG.ACCOUNT_MENU_TITLE : MSG.ACCOUNT_LOGIN_TITLE;
    const s = syncStatus();
    const text = { saved: MSG.SYNC_SAVED, saving: MSG.SYNC_SAVING, offline: MSG.SYNC_OFFLINE, expired: MSG.SYNC_EXPIRED }[s];
    const title = { saved: MSG.SYNC_SAVED_TITLE, saving: MSG.SYNC_SAVED_TITLE, offline: MSG.SYNC_OFFLINE_TITLE, expired: MSG.SYNC_EXPIRED_TITLE }[s];
    statusEl.hidden = !text;
    statusEl.textContent = text || '';
    statusEl.title = title || '';
    statusEl.classList.toggle('warn', s === 'offline' || s === 'expired');
  }

  function openLogin() {
    error.hidden = true;
    pass.value = '';
    submit.disabled = false;
    submit.textContent = MSG.ACCOUNT_LOGIN.replace('👤 ', '');
    dialog.showModal();
    (user.value ? pass : user).focus();
  }

  btn.addEventListener('click', () => {
    if (loggedInAs()) setMenu(items.hidden);
    else openLogin();
  });
  statusEl.addEventListener('click', () => { if (syncStatus() === 'expired') openLogin(); });
  document.addEventListener('click', (e) => { if (!menu.contains(e.target)) setMenu(false); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !items.hidden) { setMenu(false); btn.focus(); }
  });

  document.getElementById('btn-logout').addEventListener('click', async () => {
    setMenu(false);
    const name = loggedInAs();
    flushEditor();
    let done = await logout();
    if (!done && window.confirm(MSG.ACCOUNT_LOGOUT_UNSAVED)) done = await logout({ force: true });
    if (done) appendConsoleMessage(MSG.ACCOUNT_BYE.replace('%1', name));
  });

  document.getElementById('login-cancel').addEventListener('click', () => dialog.close());

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    error.hidden = true;
    submit.disabled = true;
    submit.textContent = MSG.ACCOUNT_WAIT;
    flushEditor();
    const r = await login(user.value, pass.value);
    submit.disabled = false;
    submit.textContent = MSG.ACCOUNT_LOGIN.replace('👤 ', '');
    if (!r.ok) {
      error.textContent = {
        wrong_login: MSG.ACCOUNT_WRONG, too_many_tries: MSG.ACCOUNT_TOO_MANY, not_configured: MSG.ACCOUNT_NOT_CONFIGURED,
      }[r.error] || MSG.ACCOUNT_OFFLINE;
      error.hidden = false;
      return;
    }
    dialog.close();
    pass.value = '';
    finishLogin();
    appendConsoleMessage(MSG.ACCOUNT_HELLO.replace('%1', r.username));
    render();
  });

  onSyncStatus(render);
  render();
}
