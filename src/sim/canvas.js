import { robot, resetRobot, robotProbePoint, ROBOT_CONSTANTS } from './robot.js';
import { PX_PER_CM, worldToScreen } from './world.js';
import { DISPLAY_SCALE, ROBOT_LENGTH_PX, ROBOT_WIDTH_PX } from './constants.js';
import { drawMap, hasMap, getMapSizeCm } from './map.js';
import { ledState, resetLeds } from './leds.js';
import { resetDisplay } from '../ui/display.js';
import { getQuadRGBWorldPositions, getQuadRGBProbeData, getUltrasonicConeRays, resetTickCache, sensorQuadRGB } from './sensors.js';

// PT-PT names for the 8 colours the quad RGB sensor can report (HUD only).
const COLOUR_NAMES = {
  '#cc0000': 'vermelho', '#ffff00': 'amarelo', '#33cc00': 'verde', '#33ffff': 'ciano',
  '#3366ff': 'azul', '#cc33cc': 'roxo', '#ffffff': 'branco', '#000000': 'preto',
};

let ctx    = null;
let canvas = null;
let lastTime = 0;
let paused   = false;
let frameHook = null;

/** Called once per animation frame (unless paused) with the frame's time in seconds. */
export function setFrameHook(fn) { frameHook = fn; }

// Level zones (decision 0006): referee-only areas drawn as a translucent overlay.
// Sensors never see them. [{ id, label?, type: 'rect'|'circle', … cm }] or null.
// A zone with a `probe` ('centre' | 'front') is judged by that point of the robot: the
// point is drawn on the robot as a yellow ring, an empty ring marks the zone's middle,
// and the zone turns green while the point is inside (and stays ✓ if `latch`).
let zoneOverlay = null;
const reachedZones = new Set();
export function setZoneOverlay(zones) { zoneOverlay = zones; reachedZones.clear(); }

const PROBE_RING_CM = 1.6;
function probeRing(xPx, yPx, dashed) {
  const r = PROBE_RING_CM * PX_PER_CM;
  ctx.save();
  ctx.beginPath();
  ctx.arc(xPx, yPx, r, 0, Math.PI * 2);
  if (dashed) {
    ctx.setLineDash([0.6 * PX_PER_CM, 0.5 * PX_PER_CM]);
    ctx.strokeStyle = 'rgba(30, 30, 30, 0.7)';
    ctx.lineWidth = 0.35 * PX_PER_CM;
    ctx.stroke();
  } else {
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 0.9 * PX_PER_CM;
    ctx.stroke();
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 0.55 * PX_PER_CM;
    ctx.stroke();
  }
  ctx.restore();
}

function inOverlayZone(z, [x, y]) {
  if (z.type === 'circle') return (x - z.cx) ** 2 + (y - z.cy) ** 2 <= z.r ** 2;
  return x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h;
}

const MAX_DT = 1 / 30;   // frame time cap: absorbs tab-suspend lag (CLAUDE.md §8)

const camera = { offsetX: 0, offsetY: 0, scale: 1 };

let isPanning    = false;
let panStartX    = 0;
let panStartY    = 0;
let panStartOffX = 0;
let panStartOffY = 0;

// ── Robot sprite ──────────────────────────────────────────────────────────────
// Loaded once at module init. Falls back to a procedural rectangle until ready.
const robotImg = new Image();
let robotSpriteLoaded = false;
robotImg.onload  = () => { robotSpriteLoaded = true; };
robotImg.onerror = () => { console.warn('[sim] robot sprite failed to load — using fallback rectangle'); };
robotImg.src = '/sprites/robot.png';

export function initSim() {
  canvas = document.getElementById('sim-canvas');
  ctx    = canvas.getContext('2d');
  lastTime = performance.now();

  canvas.addEventListener('wheel',      onWheel,    { passive: false });
  canvas.addEventListener('mousedown',  onMouseDown);
  canvas.addEventListener('mousemove',  onMouseMove);
  canvas.addEventListener('mouseup',    onMouseUp);
  canvas.addEventListener('mouseleave', onMouseUp);

  canvas.style.cursor = 'grab';
  requestAnimationFrame(loop);
  console.log('[sim] canvas initialised');
}

// The robot's trail: where its centre has been since the last Executar / Reiniciar /
// map change, so the student can see the path it took. Display only (cm, per frame).
const TRAIL_STEP_CM = 0.4;
const TRAIL_MAX = 20000;
let trail = [];

export function clearTrail() { trail = []; }

function recordTrail() {
  const last = trail[trail.length - 1];
  if (last && Math.hypot(robot.x - last[0], robot.y - last[1]) < TRAIL_STEP_CM) return;
  if (trail.length >= TRAIL_MAX) trail.splice(0, TRAIL_MAX / 4);
  trail.push([robot.x, robot.y]);
}

function drawTrail() {
  if (trail.length < 2) return;
  ctx.save();
  ctx.strokeStyle = 'rgba(234, 88, 12, 0.75)';
  ctx.lineWidth = Math.max(1.5 / camera.scale, 0.35 * PX_PER_CM);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.setLineDash([]);
  ctx.beginPath();
  trail.forEach(([x, y], i) => (i ? ctx.lineTo(x * PX_PER_CM, y * PX_PER_CM) : ctx.moveTo(x * PX_PER_CM, y * PX_PER_CM)));
  ctx.stroke();
  ctx.restore();
}

/** Resize canvas to match loaded map dimensions and reset camera to fit-to-view. */
export function resizeCanvas(mapInfo) {
  clearTrail();
  // mapInfo.width and mapInfo.height are in cm; convert to px for the canvas bitmap.
  canvas.width  = Math.round(mapInfo.width  * DISPLAY_SCALE);
  canvas.height = Math.round(mapInfo.height * DISPLAY_SCALE);
  resetCamera();
}

function onWheel(e) {
  e.preventDefault();
  // Convert CSS px → canvas bitmap px to keep zoom anchor at mouse position.
  const rect = canvas.getBoundingClientRect();
  const mx = (e.clientX - rect.left) * (canvas.width  / rect.width);
  const my = (e.clientY - rect.top)  * (canvas.height / rect.height);

  const factor  = e.deltaY < 0 ? 1.1 : 1 / 1.1;
  const newScale = Math.min(16, Math.max(0.5, camera.scale * factor));

  camera.offsetX = mx - (mx - camera.offsetX) * (newScale / camera.scale);
  camera.offsetY = my - (my - camera.offsetY) * (newScale / camera.scale);
  camera.scale   = newScale;
}

function onMouseDown(e) {
  if (e.button !== 0) return;
  isPanning    = true;
  panStartX    = e.clientX;
  panStartY    = e.clientY;
  panStartOffX = camera.offsetX;
  panStartOffY = camera.offsetY;
  canvas.style.cursor = 'grabbing';
}

function onMouseMove(e) {
  if (!isPanning) return;
  // Convert CSS pixel delta → canvas bitmap pixel delta to keep panning 1:1
  const rect  = canvas.getBoundingClientRect();
  const scaleX = canvas.width  / rect.width;
  const scaleY = canvas.height / rect.height;
  camera.offsetX = panStartOffX + (e.clientX - panStartX) * scaleX;
  camera.offsetY = panStartOffY + (e.clientY - panStartY) * scaleY;
}

function onMouseUp() {
  if (!isPanning) return;
  isPanning = false;
  canvas.style.cursor = 'grab';
}

export function resetCamera() {
  camera.offsetX = 0;
  camera.offsetY = 0;
  camera.scale   = 1;
}

function loop(now) {
  const dtMs = now - lastTime;
  lastTime   = now;
  const dt   = Math.min(dtMs / 1000, MAX_DT);

  // The world advances in fixed ticks owned by the run loop (src/runtime/runLoop.js);
  // this loop only hands it the frame's time and then draws.
  if (!paused && frameHook) frameHook(dt);
  recordTrail();

  // Clear per-tick sensor cache every frame so visualisations (cone, quad-RGB dots)
  // always reflect current robot position, even when no interpreter is running.
  resetTickCache();

  draw();
  requestAnimationFrame(loop);
}

function draw() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.setTransform(camera.scale, 0, 0, camera.scale, camera.offsetX, camera.offsetY);

  if (hasMap()) drawMap(ctx);

  ctx.globalAlpha = hasMap() ? 0.25 : 1.0;
  drawGrid();
  ctx.globalAlpha = 1.0;

  if (zoneOverlay) drawZones();

  const mapSize = getMapSizeCm();
  if (mapSize) {
    ctx.strokeStyle = '#999';
    ctx.lineWidth   = 1 / camera.scale;
    ctx.strokeRect(0, 0, mapSize.wCm * PX_PER_CM, mapSize.hCm * PX_PER_CM);
  }

  drawTrail();

  const { xPx, yPx } = worldToScreen(robot.x, robot.y);

  // Ultrasonic cone rays — drawn before the robot so the sprite overlays them.
  const cone   = getUltrasonicConeRays();
  const coneFX = cone.ox * PX_PER_CM;
  const coneFY = cone.oy * PX_PER_CM;
  ctx.strokeStyle = 'rgba(0, 200, 255, 0.3)';
  ctx.lineWidth   = Math.max(0.5, 0.15 * PX_PER_CM) / camera.scale;
  for (let i = 0; i < 3; i++) {
    const hx = coneFX + Math.cos(cone.angles[i]) * cone.dists[i] * PX_PER_CM;
    const hy = coneFY + Math.sin(cone.angles[i]) * cone.dists[i] * PX_PER_CM;
    ctx.beginPath();
    ctx.moveTo(coneFX, coneFY);
    ctx.lineTo(hx, hy);
    ctx.stroke();
  }
  const halfRad = (ROBOT_CONSTANTS.ULTRASONIC_CONE_DEG / 2) * (Math.PI / 180);
  ctx.strokeStyle = 'rgba(0, 200, 255, 0.15)';
  ctx.lineWidth   = Math.max(0.3, 0.1 * PX_PER_CM) / camera.scale;
  ctx.beginPath();
  ctx.arc(coneFX, coneFY, cone.min * PX_PER_CM, robot.theta - halfRad, robot.theta + halfRad);
  ctx.stroke();

  // Robot sprite (or fallback rectangle if sprite not yet loaded).
  ctx.save();
  ctx.translate(xPx, yPx);
  ctx.rotate(robot.theta);
  if (robotSpriteLoaded) {
    ctx.drawImage(robotImg, -ROBOT_LENGTH_PX / 2, -ROBOT_WIDTH_PX / 2, ROBOT_LENGTH_PX, ROBOT_WIDTH_PX);
  } else {
    // Fallback until sprite loads
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(-ROBOT_LENGTH_PX / 2, -ROBOT_WIDTH_PX / 2, ROBOT_LENGTH_PX, ROBOT_WIDTH_PX);
  }
  ctx.restore();

  // Collision: outline the footprint that touched the wall (src/sim/collision.js).
  // Stays until the robot is reset, so the student sees what hit.
  if (robot.collided) {
    ctx.save();
    ctx.translate(xPx, yPx);
    ctx.rotate(robot.theta);
    ctx.strokeStyle = 'red';
    ctx.lineWidth   = Math.max(1, 0.4 * PX_PER_CM) / camera.scale;
    ctx.strokeRect(-ROBOT_LENGTH_PX / 2, -ROBOT_WIDTH_PX / 2, ROBOT_LENGTH_PX, ROBOT_WIDTH_PX);
    ctx.restore();
  }

  // LEDs — 5 dots positioned in the centre-rear of the robot body (close to centre, slightly behind).
  const ledR     = 0.7 * PX_PER_CM;  // world-space radius — scales with zoom
  const ledFront = -ROBOT_LENGTH_PX * 0.01;  // behind centre (negative = toward rear of sprite)
  const spread   = 2.0 * PX_PER_CM;
  const perpX    = -Math.sin(robot.theta);
  const perpY    =  Math.cos(robot.theta);
  for (let i = 0; i < 5; i++) {
    const offset = (i - 2) * spread;
    const lx = xPx + Math.cos(robot.theta) * ledFront + perpX * offset;
    const ly = yPx + Math.sin(robot.theta) * ledFront + perpY * offset;
    const led = ledState[i];
    ctx.beginPath();
    ctx.arc(lx, ly, ledR, 0, Math.PI * 2);
    ctx.fillStyle = led.on ? led.colour : '#333333';
    ctx.fill();
    ctx.strokeStyle = '#555';
    ctx.lineWidth   = 0.1 * PX_PER_CM;  // world-space — scales with zoom
    ctx.stroke();
  }

  // QuadRGB probe dots — four dots, one per probe, coloured with the live sampled pixel
  const probePositions = getQuadRGBWorldPositions();
  const probeData = getQuadRGBProbeData();
  const dotR = 3 / camera.scale;
  for (let i = 0; i < 4; i++) {
    const { xPx: dpx, yPx: dpy } = worldToScreen(probePositions[i].x, probePositions[i].y);
    const p = probeData[i];
    ctx.beginPath();
    ctx.arc(dpx, dpy, dotR, 0, Math.PI * 2);
    ctx.fillStyle  = 'rgb(' + p.r + ',' + p.g + ',' + p.b + ')';
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth   = 1 / camera.scale;
    ctx.stroke();
  }

  // Level probe points: the part of the robot the goals judge (see zoneOverlay).
  if (zoneOverlay) {
    const probes = new Set(zoneOverlay.map((z) => z.probe).filter(Boolean));
    for (const pr of probes) {
      const [px, py] = robotProbePoint(pr);
      probeRing(px * PX_PER_CM, py * PX_PER_CM, false);
    }
  }

  // HUD — screen space (reset transform so it's always top-left regardless of pan/zoom).
  // Font size is scaled up to compensate for CSS downscaling of the canvas, so the text
  // always appears at ~14 px visual size regardless of the native canvas resolution.
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const cssScale  = (canvas.getBoundingClientRect().width / canvas.width) || 1;
  const hudFont   = Math.round(14 / cssScale);
  const hudLine   = Math.round(20 / cssScale);
  const hudX      = Math.round(10 / cssScale);
  const hudY0     = hudLine;
  const lineCount = paused ? 5 : 4;

  // Semi-transparent background behind HUD text
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(0, 0, Math.round(420 / cssScale), hudY0 + hudLine * lineCount + Math.round(6 / cssScale));

  ctx.fillStyle = '#eee';
  ctx.font = `${hudFont}px monospace`;
  ctx.fillText(`x:${robot.x.toFixed(1)}cm  y:${robot.y.toFixed(1)}cm  θ:${(robot.theta * 180 / Math.PI).toFixed(1)}\xB0`, hudX, hudY0);
  ctx.fillText(`vL:${robot.vL} vR:${robot.vR} RPM`, hudX, hudY0 + hudLine);
  ctx.fillText(`dist:${robot.totalDistanceCm.toFixed(1)}cm`, hudX, hudY0 + hudLine * 2);
  // What the quad RGB sensor reports for each probe, left to right (L2 L1 R1 R2).
  const probeColours = ['L2', 'L1', 'R1', 'R2']
    .map(slot => `${slot}:${COLOUR_NAMES[sensorQuadRGB('COLOUR', slot)] || '?'}`).join(' ');
  ctx.fillText(probeColours, hudX, hudY0 + hudLine * 3);
  if (paused) {
    ctx.fillStyle = '#f87171';
    ctx.fillText('PAUSADO', hudX, hudY0 + hudLine * 4);
  }
}

function drawGrid() {
  const step = 10 * PX_PER_CM;  // grid line every 10 cm
  const mapSize = getMapSizeCm();
  const maxX = mapSize ? mapSize.wCm * PX_PER_CM : 400 * PX_PER_CM;
  const maxY = mapSize ? mapSize.hCm * PX_PER_CM : 400 * PX_PER_CM;

  ctx.strokeStyle = '#ddd';
  ctx.lineWidth   = 1 / camera.scale;
  for (let x = 0; x <= maxX; x += step) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, maxY); ctx.stroke();
  }
  for (let y = 0; y <= maxY; y += step) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(maxX, y); ctx.stroke();
  }
}

function drawZones() {
  const s = PX_PER_CM;
  ctx.save();
  ctx.lineWidth = 2 / camera.scale;
  ctx.setLineDash([8 / camera.scale, 6 / camera.scale]);
  ctx.font = `${Math.max(12, 2 * s) / camera.scale}px sans-serif`;
  ctx.textBaseline = 'top';
  for (const z of zoneOverlay) {
    const inside = z.probe ? inOverlayZone(z, robotProbePoint(z.probe)) : false;
    if (inside && z.latch) reachedZones.add(z.id);
    const done = inside || reachedZones.has(z.id);
    ctx.beginPath();
    if (z.type === 'circle') ctx.arc(z.cx * s, z.cy * s, z.r * s, 0, Math.PI * 2);
    else ctx.rect(z.x * s, z.y * s, z.w * s, z.h * s);
    ctx.fillStyle = done ? 'rgba(22, 163, 74, 0.30)' : 'rgba(40, 110, 255, 0.16)';
    ctx.fill();
    ctx.strokeStyle = done ? 'rgba(21, 128, 61, 0.95)' : 'rgba(40, 110, 255, 0.85)';
    ctx.stroke();
    const [lx, ly] = z.type === 'circle' ? [(z.cx - z.r) * s, (z.cy - z.r) * s] : [z.x * s, z.y * s];
    ctx.fillStyle = done ? 'rgba(21, 100, 50, 0.95)' : 'rgba(20, 70, 200, 0.95)';
    ctx.fillText((done ? '✓ ' : '') + (z.label || z.id), lx + 4 / camera.scale, ly + 4 / camera.scale);
    if (z.probe && !done) {
      const [cx, cy] = z.type === 'circle' ? [z.cx, z.cy] : [z.x + z.w / 2, z.y + z.h / 2];
      probeRing(cx * s, cy * s, true);
    }
  }
  ctx.restore();
}

export function pauseSim()   { paused = true; }
export function resumeSim()  { paused = false; }
export function togglePause(){ paused = !paused; }
export function isPaused()   { return paused; }

export function resetSim() {
  reachedZones.clear();
  clearTrail();
  resetRobot();
  resetLeds();
  resetDisplay();
}
