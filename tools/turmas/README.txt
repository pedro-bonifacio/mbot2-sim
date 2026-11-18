mBot 2 sim — class accounts
===========================

Needs Node.js 18 or newer on the computer you run it from (node -v).
Run the commands in this folder. config.json holds the site address and the teacher key.

  node turmas.mjs create 7B alunos-7B.csv   accounts for a class
  node turmas.mjs add 7B 23 "Nome Apelido"  one more student
  node turmas.mjs reset 7B 12               new password for a student
  node turmas.mjs show 7B                   progress per student
  node turmas.mjs list                      all classes on the server
  node turmas.mjs delete 7B                 removes a class and its progress (end of year)

The class CSV has a header row with the columns "number" and "names", e.g.

  number;names
  1;Ana Sofia Gonçalves
  2;Bruno Silva

Comma or semicolon both work; Excel's "CSV" and "CSV UTF-8" both work.

"create" writes 7B-passwords.csv here (number, names, username, password). Print it
and cut it into slips. Students log in with the username (e.g. 7b-12) and password.

The server never gets the names: only "7b-12" and a hash of the password. Keep the
password files in this folder only.
