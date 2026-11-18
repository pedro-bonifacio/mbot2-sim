mBot 2 sim — class accounts
===========================

Needs Node.js 18 or newer on the computer you run it from (node -v).
Run the commands in this folder. config.json holds the site address and the teacher key.

Each class has its own folder in "turmas":

  turmas/
    7B/
      alunos-7B.csv       the class list you put there (any name ending in .csv)
      7B-passwords.csv    written by "create": number, names, username, password

To make a class: create the folder turmas/7B, put the class CSV in it, then

  node turmas.mjs create 7B

The class CSV has a header row with the columns "number" and "names", e.g.

  number;names
  1;Ana Sofia Gonçalves
  2;Bruno Silva

Comma or semicolon both work; Excel's "CSV" and "CSV UTF-8" both work.

Other commands:

  node turmas.mjs add 7B 23 "Nome Apelido"  one more student
  node turmas.mjs reset 7B 12               new password for a student
  node turmas.mjs show 7B                   progress per student
  node turmas.mjs list                      all classes on the server
  node turmas.mjs delete 7B                 removes a class and its progress (end of year)

Print 7B-passwords.csv and cut it into slips. Students log in with the username
(e.g. 7b-12) and the password.

The server never gets the names: only "7b-12" and a hash of the password. Keep the
class folders on this drive only.

Windows: in File Explorer open \\192.168.108.202\NAS\career\professor-tic\mbot2-turmas,
right-click an empty spot → "Open in Terminal", then run the commands above.
