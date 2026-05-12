// CyberPi screen overlay — 128×128 virtual px rendered on a 256×256 canvas.
// Grid: 8 cols × 8 rows for display_text.

const VIRTUAL_W = 128;
const VIRTUAL_H = 128;
const GRID_COLS = 8;
const GRID_ROWS = 8;
const CELL_W = VIRTUAL_W / GRID_COLS;  // 16 virtual px
const CELL_H = VIRTUAL_H / GRID_ROWS;  // 16 virtual px
const MAX_PRINT_LINES = GRID_ROWS;

let canvas = null;
let ctx = null;
let bgColour = '#000000';
const textGrid = Array.from({ length: GRID_ROWS }, () => Array(GRID_COLS).fill(''));
const printLines = [];

function s() { return canvas ? canvas.width / VIRTUAL_W : 2; }

export function initDisplay() {
  canvas = document.getElementById('display-canvas');
  if (!canvas) return;
  ctx = canvas.getContext('2d');
  _fill(bgColour);
}

function _fill(hex) {
  if (!ctx) return;
  ctx.fillStyle = hex;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function _redraw() {
  if (!ctx) return;
  _fill(bgColour);
  const scale = s();
  const cw = CELL_W * scale;
  const ch = CELL_H * scale;
  const fontSize = Math.max(8, Math.floor(12 * scale));
  ctx.font = `${fontSize}px monospace`;
  ctx.textBaseline = 'top';

  // Scrolling println lines (green)
  ctx.fillStyle = '#00ff00';
  printLines.forEach((line, i) => {
    ctx.fillText(line, 2, i * ch + 2);
  });

  // display_text grid (white)
  ctx.fillStyle = '#ffffff';
  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      const t = textGrid[r][c];
      if (t) ctx.fillText(t, c * cw + 2, r * ch + 2);
    }
  }
}

export function display_text(text, col, row) {
  const c = Math.max(0, Math.min(GRID_COLS - 1, Math.round(Number(col))));
  const r = Math.max(0, Math.min(GRID_ROWS - 1, Math.round(Number(row))));
  textGrid[r][c] = String(text ?? '');
  _redraw();
}

export function display_show_label(text, size, x, y) {
  if (!ctx) return;
  const scale = s();
  const fontSize = Math.max(8, Math.floor((Number(size) || 2) * 8 * scale));
  ctx.font = `${fontSize}px monospace`;
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'top';
  ctx.fillText(String(text ?? ''), Number(x) * scale, Number(y) * scale);
}

export function display_set_colour(hex) {
  bgColour = String(hex || '#000000');
  _redraw();
}

export function display_fill(colour) {
  display_set_colour(colour);
}

export function display_draw_pixel(x, y, colour) {
  if (!ctx) return;
  const scale = s();
  ctx.fillStyle = String(colour || '#ffffff');
  ctx.fillRect(Number(x) * scale, Number(y) * scale, scale, scale);
}

export function display_clear() {
  for (let r = 0; r < GRID_ROWS; r++) textGrid[r].fill('');
  printLines.length = 0;
  bgColour = '#000000';
  _redraw();
}

export function println_display(text) {
  printLines.push(String(text ?? ''));
  if (printLines.length > MAX_PRINT_LINES) printLines.shift();
  _redraw();
}

export function resetDisplay() {
  display_clear();
}
