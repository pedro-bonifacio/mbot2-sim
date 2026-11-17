#!/usr/bin/env node
// Printable mats for the physical robot (decisions 0008, 0009): for each level, two
// vector PDFs drawn from the same primitives as the sim map, at real scale.
//
//   levels/_mats/<id>-real.pdf   one page the size of the arena (print shop / plotter)
//   levels/_mats/<id>-a4.pdf     an assembly page, then the mat tiled on A4 (or --paper a3)
//
// What is printed: floor patches, lines and arcs in their colour; walls and boxes as
// grey "put an object here" areas; the start position (robot outline and arrow);
// fixed zones as dashed blue outlines. Things that move between variants are printed
// as dashed placement marks numbered by variant ("1", "2, 5"), so the teacher sets
// up the variant chosen (tape, a box) on the same mat. The map border is the mat's edge.
//
// Usage: node scripts/levels-mat.mjs [id filter] [--paper a4|a3]

import fs from 'fs';
import path from 'path';

const { ROOT } = await import('./lib/sim.mjs');
const { levelFiles, loadLevelFile, LEVELS_DIR } = await import('./lib/levels.mjs');
const { Draw, buildPdf, PT_PER_CM, PAPER, textWidth } = await import('./lib/pdf.mjs');
const { prepareLevel, testSeeds, FLOOR_COLOURS } = await import(path.join(ROOT, 'src/levels/level.js'));
const { footprintCorners } = await import(path.join(ROOT, 'src/sim/collision.js'));
const { ROBOT_LENGTH_CM } = await import(path.join(ROOT, 'src/sim/constants.js'));

const args = process.argv.slice(2);
const paperName = args.includes('--paper') ? args[args.indexOf('--paper') + 1] : 'a4';
if (!PAPER[paperName]) { console.error(`--paper must be ${Object.keys(PAPER).join(' or ')}`); process.exit(1); }
const filter = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--paper');
const OUT_DIR = path.join(LEVELS_DIR, '_mats');

// Everything printed that is not a floor item must read as white to the colour
// sensor (nearest of its 8 colours), or the robot would react to the decoration:
// light greys and a pale blue, checked below.
const WALL_FILL = [228, 228, 228], WALL_LINE = [190, 190, 190], MARK = [190, 190, 190], LABEL = [190, 190, 190];
const ZONE = [175, 200, 255], START = [190, 190, 190], NOTE = [195, 195, 195];   // greys below ~185 read as purple
const MARGIN_CM = 1;   // unprintable edge of an office printer
const TICK_CM = 6;     // a moving line is marked by this much at each end, not drawn

const nearest = (rgb) => Object.entries(FLOOR_COLOURS)
  .map(([n, c]) => [n, (c[0] - rgb[0]) ** 2 + (c[1] - rgb[1]) ** 2 + (c[2] - rgb[2]) ** 2]).sort((a, b) => a[1] - b[1])[0][0];
for (const [name, rgb] of Object.entries({ WALL_FILL, WALL_LINE, MARK, LABEL, ZONE, START, NOTE })) {
  if (nearest(rgb) !== 'white') throw new Error(`levels-mat: ${name} ${rgb} would read as ${nearest(rgb)} to the colour sensor`);
}

// ── geometry (cm, y down, angles clockwise from east as in the level format) ──

function rectCorners(it) {
  const cx = it.x + it.w / 2, cy = it.y + it.h / 2;
  const a = (it.angle || 0) * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
  return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([u, v]) => {
    const du = u * it.w / 2, dv = v * it.h / 2;
    return [cx + du * c - dv * s, cy + du * s + dv * c];
  });
}
function circlePoints(cx, cy, r, from = 0, to = 360, n = 96) {
  const span = ((to - from) % 360 + 360) % 360 || 360;
  const steps = Math.max(8, Math.ceil(n * span / 360));
  return Array.from({ length: steps + 1 }, (_, i) => {
    const a = (from + span * i / steps) * Math.PI / 180;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  });
}
function bbox(points) {
  const xs = points.map((p) => p[0]), ys = points.map((p) => p[1]);
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
}
function itemOutline(it) {
  if (it.type === 'rect') return rectCorners(it);
  if (it.type === 'circle') return circlePoints(it.cx, it.cy, it.r);
  if (it.type === 'line') return it.points;
  return circlePoints(it.cx, it.cy, it.r, it.from, it.to);
}

// ── drawing (inside the mat form: 1 unit = 1 cm, y down) ──

function drawItem(d, it) {
  if (it.wall) {
    d.fill(WALL_FILL).stroke(WALL_LINE).width(0.25).dash().path(itemOutline(it), true).doFillStroke();
  } else if (it.type === 'rect' || it.type === 'circle') {
    d.fill(it.rgb).path(itemOutline(it), true).doFill();
  } else if (it.type === 'line') {
    d.stroke(it.rgb).width(it.width).dash().caps(1, 1).path(it.points).doStroke();
  } else {
    d.stroke(it.rgb).width(it.width).dash().caps(0, 1).path(itemOutline(it)).doStroke();
  }
}

/** First and last `len` cm of a polyline: where to put tape for a line that moves. */
function endTicks(points, len) {
  const walk = (pts) => {
    const out = [pts[0]];
    let left = len;
    for (let i = 1; i < pts.length && left > 0; i++) {
      const [ax, ay] = pts[i - 1], [bx, by] = pts[i];
      const seg = Math.hypot(bx - ax, by - ay);
      const t = Math.min(1, left / (seg || 1));
      out.push([ax + (bx - ax) * t, ay + (by - ay) * t]);
      left -= seg;
    }
    return out;
  };
  return [walk(points), walk(points.slice().reverse())];
}

/** A moving item at one variant: a light dashed outline (walls, patches) or end ticks (lines, arcs). */
function drawMark(d, it, label, row) {
  const pts = itemOutline(it);
  const b = bbox(pts);
  if (it.wall || it.type === 'rect' || it.type === 'circle') {
    d.stroke(MARK).width(0.2).dash(1.5, 1).caps(0, 0).path(pts, true).doStroke();
  } else {
    d.stroke(MARK).width(Math.max(0.3, it.width)).dash().caps(0, 0);
    for (const tick of endTicks(pts, TICK_CM)) d.path(tick).doStroke();
  }
  // Labels right of the mark, staggered in three rows so neighbours don't collide.
  const size = 1.8;
  const halfWidth = it.width ? Math.max(0.3, it.width) / 2 : 0;
  d.fill(LABEL).text(b.x1 + halfWidth + 0.6, Math.max(b.y0, 1) + 3 + (row % 3) * 2.4, size, label, { flipY: true, bold: true });
}

function drawZone(d, z) {
  const pts = z.type === 'circle' ? circlePoints(z.cx, z.cy, z.r) : rectCorners({ ...z, angle: 0 });
  d.stroke(ZONE).width(0.2).dash(1, 0.8).caps(0, 0).path(pts, true).doStroke();
  const b = bbox(pts);
  if (z.label) d.fill(LABEL).text(b.x0 + 0.6, b.y0 + 1.6, 1.1, z.label, { flipY: true });
}

function drawStart(d, spawn, label) {
  const corners = footprintCorners(spawn.x, spawn.y, spawn.theta);
  d.stroke(START).width(0.25).dash().caps(1, 1).path(corners, true).doStroke();
  const h = ROBOT_LENGTH_CM / 2;
  const tip = [spawn.x + Math.cos(spawn.theta) * h, spawn.y + Math.sin(spawn.theta) * h];
  const side = (a) => [tip[0] - Math.cos(spawn.theta + a) * 3, tip[1] - Math.sin(spawn.theta + a) * 3];
  d.path([[spawn.x, spawn.y], tip]).doStroke().path([side(0.5), tip, side(-0.5)]).doStroke();
  const b = bbox(corners);
  d.fill(LABEL).text(b.x0, b.y1 + 1.8, 1.3, label, { flipY: true });
}

/** Seeds grouped by identical value of `key(prepared)`: [{ value, seeds: [n] }]. */
function bySeed(preps, key) {
  const groups = new Map();
  preps.forEach((p, i) => {
    const v = key(p);
    const k = JSON.stringify(v);
    if (!groups.has(k)) groups.set(k, { value: v, seeds: [] });
    groups.get(k).seeds.push(i + 1);
  });
  return [...groups.values()];
}

function matForm(level) {
  const seeds = testSeeds(level);
  const preps = seeds.map((s) => prepareLevel(level, s));
  const p0 = preps[0];
  const many = preps.length > 1;
  const W = p0.size.w, H = p0.size.h;
  const d = new Draw();
  d.transform(PT_PER_CM, 0, 0, -PT_PER_CM, 0, H * PT_PER_CM);   // cm, y down
  d.fill([255, 255, 255]).rect(0, 0, W, H).doFill();

  const label = (g) => g.seeds.join(', ');
  const moving = [];
  p0.items.forEach((it, i) => {
    if (it.border) return;
    const groups = bySeed(preps, (p) => p.items[i]);
    if (groups.length === 1) drawItem(d, it); else moving.push(groups);
  });
  for (const z of Object.keys(p0.zones)) {
    const groups = bySeed(preps, (p) => p.zones[z]);
    if (groups.length === 1) drawZone(d, p0.zones[z]);
  }
  const starts = bySeed(preps, (p) => p.spawn);
  for (const g of starts) drawStart(d, g.value, starts.length > 1 ? `partida (variante ${label(g)})` : 'partida');
  for (const groups of moving) {
    const sorted = groups.slice().sort((a, b) => bbox(itemOutline(a.value)).x0 - bbox(itemOutline(b.value)).x0);
    sorted.forEach((g, row) => drawMark(d, g.value, label(g), row));
  }

  const note = `${level.id} · ${level.title} · ${W} × ${H} cm${many ? ` · tracejado = posição em cada variante (1 a ${preps.length})` : ''}`;
  d.fill(NOTE).text(2, H - 1.6, 1.0, note, { flipY: true });
  return { w: W * PT_PER_CM, h: H * PT_PER_CM, draw: d, W, H, movingCount: moving.length, variants: preps.length };
}

// ── pages ──

function realPage(form) {
  return { w: form.w, h: form.h, draw: new Draw().form('Mat') };
}

function tileLayout(W, H, paper) {
  const [pw, ph] = PAPER[paper];
  const options = [[pw, ph], [ph, pw]].map(([w, h]) => {
    const uw = w - 2 * MARGIN_CM, uh = h - 2 * MARGIN_CM;
    return { w, h, uw, uh, cols: Math.ceil(W / uw - 1e-9), rows: Math.ceil(H / uh - 1e-9) };
  });
  return options.sort((a, b) => a.cols * a.rows - b.cols * b.rows)[0];
}
const colName = (c) => String.fromCharCode(65 + c);

function tilePages(form, level, paper) {
  const L = tileLayout(form.W, form.H, paper);
  const k = PT_PER_CM, m = MARGIN_CM * k;
  const pages = [];
  const total = L.cols * L.rows;

  // Assembly page: the whole mat scaled down with the sheet grid.
  {
    const [w, h] = [PAPER[paper][1] * k, PAPER[paper][0] * k];   // landscape
    const d = new Draw();
    const top = h - 1.5 * k;
    d.fill([0, 0, 0]).text(m, top, 16, `Tapete do nível ${level.id} · ${level.title}`, { bold: true });
    const lines = [
      `${total} folhas ${paper.toUpperCase()} (${L.cols} colunas A–${colName(L.cols - 1)} × ${L.rows} linhas). Tamanho final ${form.W} × ${form.H} cm.`,
      'Imprime em tamanho real (100 %, sem "ajustar à página"). A barra de 10 cm em cada folha confirma a escala.',
      'Corta cada folha pela moldura cinzenta e junta-as pela ordem do esquema (A1 no canto de cima à esquerda).',
      'Cinzento cheio = parede ou caixa (põe lá um objeto). Azul claro tracejado = zona do objetivo. Retângulo cinzento com seta = partida.',
      ...(form.movingCount ? [`Marcas cinzentas com números = onde fica a parede/linha em cada variante (1 a ${form.variants}). Monta só a variante que escolheres:`,
        'uma caixa sobre a marca tracejada, ou fita-cola preta a unir as duas marcas de uma linha.'] : []),
      'As marcas são claras de propósito: o sensor de cor vê-as como branco.',
    ];
    lines.forEach((t, i) => d.fill([60, 60, 60]).text(m, top - 20 - i * 13, 9.5, t));
    const boxTop = top - 30 - lines.length * 13;
    const s = Math.min((w - 2 * m) / form.w, (boxTop - m) / form.h);
    const ox = (w - form.w * s) / 2, oy = m;
    d.save().transform(s, 0, 0, s, ox, oy).form('Mat').restore();
    d.stroke([0, 0, 0]).width(0.6).dash().rect(ox, oy, form.w * s, form.h * s).doStroke();
    d.stroke([200, 30, 30]).width(0.8);
    for (let c = 0; c < L.cols; c++) for (let r = 0; r < L.rows; r++) {
      const x0 = c * L.uw, y0 = r * L.uh;
      const tw = Math.min(L.uw, form.W - x0), th = Math.min(L.uh, form.H - y0);
      const X = ox + x0 * k * s, Y = oy + (form.H - y0 - th) * k * s;
      d.rect(X, Y, tw * k * s, th * k * s).doStroke();
      const name = `${colName(c)}${r + 1}`;
      d.fill([200, 30, 30]).text(X + (tw * k * s) / 2 - textWidth(name, 11) / 2, Y + (th * k * s) / 2 - 4, 11, name, { bold: true });
    }
    pages.push({ w, h, draw: d });
  }

  for (let r = 0; r < L.rows; r++) for (let c = 0; c < L.cols; c++) {
    const x0 = c * L.uw, y0 = r * L.uh;                       // tile's top-left on the mat, cm
    const tw = Math.min(L.uw, form.W - x0), th = Math.min(L.uh, form.H - y0);
    const w = L.w * k, h = L.h * k;
    const d = new Draw();
    const top = h - m;                                       // page y of the tile's top edge
    // Mat point (x0, y0) → page (m, top): the form's own origin is its bottom-left.
    d.save().rect(m, top - th * k, tw * k, th * k).clip()
      .transform(1, 0, 0, 1, m - x0 * k, top - (form.H - y0) * k).form('Mat').restore();
    d.stroke([150, 150, 150]).width(0.4).dash(3, 2).rect(m, top - th * k, tw * k, th * k).doStroke().dash();
    const name = `${colName(c)}${r + 1}`;
    const neighbours = [c + 1 < L.cols ? `direita: ${colName(c + 1)}${r + 1}` : '', r + 1 < L.rows ? `em baixo: ${colName(c)}${r + 2}` : ''].filter(Boolean).join(' · ');
    d.fill([0, 0, 0]).text(m, h - m + 9, 9, `${level.id} · folha ${name} (${r * L.cols + c + 1} de ${total})${neighbours ? ' · junta ' + neighbours : ''}`, { bold: true });
    // 10 cm scale bar in the bottom margin
    const by = m / 2 - 1;
    d.stroke([0, 0, 0]).width(1).dash().path([[m, by], [m + 10 * k, by]]).doStroke()
      .path([[m, by - 3], [m, by + 3]]).doStroke().path([[m + 10 * k, by - 3], [m + 10 * k, by + 3]]).doStroke();
    d.fill([0, 0, 0]).text(m + 10 * k + 6, by - 2.5, 7.5, 'esta barra mede 10 cm se imprimires em tamanho real (100 %)');
    pages.push({ w, h, draw: d });
  }
  return { pages, layout: L };
}

// ── main ──

fs.mkdirSync(OUT_DIR, { recursive: true });
let failed = 0;
for (const file of levelFiles()) {
  const { level, schemaErrors } = loadLevelFile(file);
  if (filter && !String(level.id).includes(filter)) continue;
  if (schemaErrors.length) { console.error(`${level.id}: schema errors, run npm run levels:check`); failed++; continue; }
  const form = matForm(level);
  const forms = { Mat: form };
  const real = buildPdf({ pages: [realPage(form)], forms, title: `${level.id} ${level.title} (tamanho real)` });
  const { pages, layout } = tilePages(form, level, paperName);
  const tiled = buildPdf({ pages, forms, title: `${level.id} ${level.title} (${paperName.toUpperCase()})` });
  const realPath = path.join(OUT_DIR, `${level.id}-real.pdf`), tiledPath = path.join(OUT_DIR, `${level.id}-${paperName}.pdf`);
  fs.writeFileSync(realPath, real);
  fs.writeFileSync(tiledPath, tiled);
  console.log(`${level.id} ${level.title}: ${path.relative(ROOT, realPath)} (${form.W} × ${form.H} cm), ` +
    `${path.relative(ROOT, tiledPath)} (${layout.cols} × ${layout.rows} sheets + assembly page)`);
}
process.exit(failed ? 1 : 0);
