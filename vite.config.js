import { defineConfig } from 'vite';
import fs from 'fs';
import path from 'path';
import YAML from 'yaml';
import Ajv from 'ajv';

function mapCataloguePlugin() {
  function writeCatalogue(root) {
    const mapsDir = path.resolve(root, 'public/maps');
    if (!fs.existsSync(mapsDir)) fs.mkdirSync(mapsDir, { recursive: true });
    const pngs = fs.readdirSync(mapsDir)
      .filter(f => f.toLowerCase().endsWith('.png'))
      .sort((a, b) => a.localeCompare(b, 'pt-PT'));
    fs.writeFileSync(path.join(mapsDir, 'catalogue.json'), JSON.stringify(pngs));
    return pngs;
  }

  return {
    name: 'map-catalogue',
    configResolved(config) {
      writeCatalogue(config.root);
    },
    handleHotUpdate({ file, server }) {
      const sep = path.sep;
      if (file.includes(`${sep}public${sep}maps${sep}`) && file.toLowerCase().endsWith('.png')) {
        writeCatalogue(server.config.root);
        server.ws.send({ type: 'full-reload' });
      }
    },
  };
}

// Level files (levels/**/*.yaml, decision 0009) become JSON modules for the browser:
// validated against levels/level.schema.json (errors show in Vite's overlay), and
// without `solution` / `antiSolutions` / `challenge.solution`, so the answers never reach the page.
function levelYamlPlugin() {
  let validate = null;
  return {
    name: 'level-yaml',
    configResolved(config) {
      const schema = JSON.parse(fs.readFileSync(path.resolve(config.root, 'levels/level.schema.json'), 'utf8'));
      validate = new Ajv({ allErrors: true, allowUnionTypes: true }).compile(schema);
    },
    transform(code, id) {
      if (!id.endsWith('.yaml') || !id.includes(`${path.sep}levels${path.sep}`)) return null;
      const level = YAML.parse(code);
      if (!validate(level)) {
        throw new Error(`${path.basename(id)}: ${validate.errors.map((e) => `${e.instancePath || '/'} ${e.message}`).join('; ')}`);
      }
      const { solution, antiSolutions, ...forBrowser } = level;
      if (forBrowser.challenge) {
        const { solution: challengeSolution, ...challenge } = forBrowser.challenge;
        forBrowser.challenge = challenge;
      }
      return { code: `export default ${JSON.stringify(forBrowser)};`, map: null };
    },
  };
}

export default defineConfig({
  root: '.',
  publicDir: 'public',
  // /api (decision 0016) runs in `npm run api:dev` (wrangler, local D1) during development.
  server: { port: 5173, open: true, proxy: { '/api': 'http://localhost:8788' } },
  build: { outDir: 'dist', sourcemap: true },
  plugins: [mapCataloguePlugin(), levelYamlPlugin()],
});
