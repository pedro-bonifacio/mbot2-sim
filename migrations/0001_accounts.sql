-- Class accounts and synced progress (decision 0016). No names: a student is
-- "<turma>-<number>", e.g. "7b-12".

CREATE TABLE students (
  username   TEXT PRIMARY KEY,          -- "7b-12"
  turma      TEXT NOT NULL,             -- "7b"
  number     INTEGER NOT NULL,
  pw_salt    TEXT NOT NULL,             -- base64
  pw_hash    TEXT NOT NULL,             -- base64 PBKDF2-SHA256
  fails      INTEGER NOT NULL DEFAULT 0,-- login failures in the current window
  fail_since INTEGER NOT NULL DEFAULT 0,-- ms; start of that window
  last_seen  INTEGER                    -- ms; last login or save
);
CREATE INDEX students_turma ON students (turma);

-- One row per level (or "livre") per student. xml NULL = program deleted.
CREATE TABLE programs (
  username TEXT NOT NULL REFERENCES students (username) ON DELETE CASCADE,
  slot     TEXT NOT NULL,
  xml      TEXT,
  updated  INTEGER NOT NULL,            -- ms, server clock
  PRIMARY KEY (username, slot)
);

CREATE TABLE stars (
  username TEXT NOT NULL REFERENCES students (username) ON DELETE CASCADE,
  level    TEXT NOT NULL,
  one      INTEGER NOT NULL DEFAULT 0,
  two      INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (username, level)
);
