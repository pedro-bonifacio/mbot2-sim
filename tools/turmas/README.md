# mBot 2 sim — class accounts

Run in this folder (needs Node.js 18+). On Windows: right-click the folder → **Open in Terminal**.

| Command | What it does |
|---|---|
| `node turmas.mjs create 7B` | Creates the accounts from the CSV in `turmas/7B/` and writes `turmas/7B/7B-passwords.csv` |
| `node turmas.mjs add 7B 23 "Nome Apelido"` | Adds one student |
| `node turmas.mjs reset 7B 12` | New password for one student |
| `node turmas.mjs show 7B` | Progress per student (★, ★★, last seen) |
| `node turmas.mjs list` | All classes on the server |
| `node turmas.mjs delete 7B` | Deletes the class and its progress (end of year) |

**Class CSV** (in `turmas/7B/`, any name), with `,` or `;`:

```
number,names
1,Ana Sofia Gonçalves
2,Bruno Silva
```

Students log in with the username (`7b-12`) and password from the passwords file.
