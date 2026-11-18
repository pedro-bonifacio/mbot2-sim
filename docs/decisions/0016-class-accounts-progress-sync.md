# 0016 — Class accounts sync progress; names never reach the server

- **Status:** Accepted
- **Date:** 2026-11-18
- **Area:** infra

Supersedes [0002](0002-no-backend.md).

## Context

0002 kept all progress in the browser, with a progress file to carry it between
computers. In practice school computers are shared and get wiped, and students forget
the file, so progress is lost. The teacher wants progress to follow a student to any
computer without manual saving and loading, at no hosting cost.

## Decision

Each student gets an account made by the teacher; the sim syncs stars and per-level
programs to a small API on the same Cloudflare Pages project (Pages Functions + D1,
free tier). **No names are sent to the server.**

- **Accounts.** The teacher runs `turmas create <turma> <csv>` (a Node script on the
  teacher's shared drive, source in `tools/turmas/`). The CSV has columns `number` and
  `names`. Usernames are `<turma>-<number>` (e.g. `7b-12`); passwords are
  `animal-colour-NN` from a curated word list (nothing a student could be teased
  with). The script writes `<turma>-passwords.csv` (number, names, username, password)
  next to itself and sends the server only usernames and passwords; the server stores
  salted PBKDF2 hashes.
- **Storage.** D1 holds, per username: password hash, and per level the stars and the
  last program (Blockly XML). Nothing else: no names, emails or IP logs kept by us.
- **Sync.** Logged in, the sim saves to the server at most every 15 s and when the page
  is hidden, only what changed. Unsynced local edits win over the server copy; stars
  are only ever added. Not logged in, the sim works exactly as before (browser only).
  The progress file stays as a backup.
- **Sessions.** Login returns an HMAC-signed token valid 12 h (one school day), kept in
  the browser. "Sair" removes it and this computer's copy of the account's progress.
- **Teacher.** Class endpoints need a teacher key (a Pages secret, also in the script's
  config on the shared drive). `turmas delete <turma>` removes a class at the end of the
  school year.
- **Evaluation unchanged.** Synced stars are still not trusted for grades
  ([0008](0008-evaluation-on-physical-robot.md)).

## Consequences

- Progress survives wiped and shared computers; a student types username and password
  once per lesson.
- The server holds pseudonymous data about minors (class + number + programs). The school
  can link it to names, so it is personal data under GDPR: tell the school's data
  protection officer, delete classes at year end. Cloudflare is the processor.
- Passwords are short on purpose (about 15 bits); login failures are rate-limited per
  username. Good enough for low-value data; not good enough for anything sensitive.
- The free tier limits (100k Worker requests, 100k D1 row writes per day) allow a few
  classes saving every 15 s.
- The deploy is no longer zero-config: one D1 database and two secrets
  (`TEACHER_KEY`, `SESSION_SECRET`). See [DEPLOYMENT.md](../DEPLOYMENT.md).

## Alternatives considered

- **Anonymous recovery code** (no accounts) — the teacher prefers usernames handed out
  per class, which also makes a class overview possible later.
- **School Microsoft / Google sign-in** — needs admin consent from the school's IT and
  ties the sim to student accounts with real names.
- **Teacher's VPS** — data under the teacher's control, but backups, uptime and HTTPS
  become the teacher's job; school firewalls may block an unknown domain.
- **Auto-save to a student-picked file** (File System Access API) — Chrome/Edge only,
  the file has to be picked again every session.
