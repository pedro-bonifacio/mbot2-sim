import { defineConfig } from 'vite';
import fs from 'fs';
import path from 'path';

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

export default defineConfig({
  root: '.',
  publicDir: 'public',
  server: { port: 5173, open: true },
  build: { outDir: 'dist', sourcemap: true },
  plugins: [mapCataloguePlugin()],
});
