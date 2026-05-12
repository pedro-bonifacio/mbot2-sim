// Re-export robotAPI so CLAUDE.md Rule 11 is satisfied:
// "src/interpreter/api.js is the only bridge between interpreter and sim."
export { robotAPI } from '../sim/robotAPI.js';
