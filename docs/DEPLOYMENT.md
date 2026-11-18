# Deployment

This guide is for teachers who want to self-host their own instance of mbot2-sim, including adding their own maps and customising the default arena.

---

## Prerequisites

- **Node.js 18 or newer** (LTS recommended)
- **npm** (comes with Node)

Check your version:
```bash
node -v   # should print v18.x.x or higher
npm -v
```

---

## Build

Clone the repository and build:

```bash
git clone https://github.com/USER/mbot2-sim.git
cd mbot2-sim
npm install
npm run build
```

This produces a `dist/` directory. Everything in `dist/` is a self-contained static site — no server-side logic, no environment variables, no API keys. You can host it on any static file server.

To preview the built site locally before deploying:
```bash
npm run preview     # serves dist/ at http://localhost:4173
```

---

## Hosting options

### Netlify drop (simplest)

1. Run `npm run build` to produce `dist/`.
2. Go to [app.netlify.com/drop](https://app.netlify.com/drop).
3. Drag the `dist/` folder onto the page.
4. Netlify generates a public URL immediately.

To update: drag a new `dist/` folder. Or connect the GitHub repo for automatic deploys on push.

---

### Cloudflare Pages

1. Push the repository to GitHub.
2. In the Cloudflare dashboard → Pages → Create a project → Connect to Git.
3. Set:
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
4. Save and deploy. Cloudflare rebuilds automatically on every push to the configured branch.

---

### GitHub Pages

Add this workflow file to `.github/workflows/deploy.yml` in your fork:

```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run build
      - uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

Then in the repository settings → Pages, set the source to the `gh-pages` branch.

---

## Adding maps

Maps are PNG files in `public/maps/`. The Vite plugin scans this directory at build time and writes `public/maps/catalogue.json`, which the app reads to populate the map dropdown.

**Steps:**

1. Create your map PNG. See [MAP_AUTHORING.md](MAP_AUTHORING.md) for the full format specification (reserved colours, spawn markers, obstacle painting, dimension limits).
2. Drop the `.png` file into `public/maps/`.
3. Use a numeric prefix for display ordering, e.g. `03-my-course.png`.
4. Run `npm run build` again (or restart the dev server with `npm run dev`).
5. Deploy the new `dist/`.

The catalogue is generated automatically — no code changes are needed to register a new map.

---

## Customising the default map

The file `public/maps/default.png` is selected on startup if it exists (otherwise the first map alphabetically). Replace it with your own PNG to change the startup arena.

To regenerate the built-in maps from scratch:
```bash
node scripts/generate-maps.js
```
This recreates `public/maps/default.png` and `public/maps/test-track.png`.

---

## Class accounts (progress sync)

Students can log in so their progress follows them to any computer
([decision 0016](decisions/0016-class-accounts-progress-sync.md)). This needs Cloudflare
Pages (the API is a Pages Function in `functions/api/`, the data a D1 database). On any
other host the sim still works; "Entrar" then says the site has no accounts.

**One-time setup** (free tier):

1. `npx wrangler login`
2. `npx wrangler d1 create mbot2-sim --jurisdiction eu` (data stays in the EU) and paste the printed `database_id` into
   `wrangler.toml` (replacing the zeros).
3. `npx wrangler d1 migrations apply mbot2-sim --remote` (creates the tables).
4. Two secrets, each a long random string (`openssl rand -base64 32`):
   `npx wrangler pages secret put TEACHER_KEY` and `npx wrangler pages secret put SESSION_SECRET`.
   Changing `SESSION_SECRET` later logs everyone out; changing `TEACHER_KEY` means updating
   the class tool's `config.json`.
5. Deploy: `npm run build && npx wrangler pages deploy` (or push, if the project is
   connected to Git).
6. `npm run turmas:install` copies the class tool to the shared drive
   (`/mnt/nas/career/professor-tic/mbot2-turmas`, or pass another folder). There, copy
   `config.example.json` to `config.json` with the site address and the `TEACHER_KEY`.
   Then `node turmas.mjs create 7B alunos-7B.csv` (see its `README.txt`).

**Development:** `npx wrangler d1 migrations apply mbot2-sim --local` once, then
`npm run build && npm run api:dev` (API with a local D1 on port 8788; secrets from
`.dev.vars`, not committed) next to `npm run dev`, which proxies `/api` to it.
`npm run accounts:check` tests the API without wrangler.

## Data kept

Not logged in, everything stays in the student's browser (`localStorage`). Logged in,
the server keeps per username (`7b-12`): a password hash, stars per level and the last
program per level. Names stay in the teacher's password files on the shared drive.
Delete a class at the end of the year: `node turmas.mjs delete 7B`.
