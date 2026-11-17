// Every level in levels/ (browser side), as plain objects from the YAML files via
// the level-yaml Vite plugin (vite.config.js) — without solutions. Sorted by id.
// In dev, editing a level file hot-reloads it.

const modules = import.meta.glob('/levels/**/*.yaml', { eager: true, import: 'default' });

export const LEVELS = Object.values(modules).sort((a, b) => a.id.localeCompare(b.id));

export function getLevel(id) {
  return LEVELS.find((l) => l.id === id) || null;
}
