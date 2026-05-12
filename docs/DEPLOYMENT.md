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

## No backend, no environment variables

There is nothing to configure beyond the build step. This project has:

- No `.env` file
- No API keys
- No database
- No authentication

All state (the current program) is stored in `localStorage` in the student's browser. Each deployment is independent; students cannot share programs between devices unless they export/import the XML manually.
