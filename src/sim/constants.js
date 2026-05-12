// Single source of truth for display-scale and robot footprint constants.
// All sim code must import from here — no magic numbers in canvas/draw/sensor code.

export const DISPLAY_SCALE = 8;          // px per cm — map PNGs are authored at 8 px/cm

export const ROBOT_LENGTH_CM = 17.5;     // mBot 2 footprint: front-to-back including wheels
export const ROBOT_WIDTH_CM  = 13;       // mBot 2 footprint: left-to-right including wheels

export const ROBOT_LENGTH_PX = ROBOT_LENGTH_CM * DISPLAY_SCALE;  // 140 px
export const ROBOT_WIDTH_PX  = ROBOT_WIDTH_CM  * DISPLAY_SCALE;  // 104 px

export const CANVAS_MAX_WIDTH_PX  = 2000;  // hard cap for map validation
export const CANVAS_MAX_HEIGHT_PX = 1500;

// ── Quad RGB sensor probe geometry ───────────────────────────────────────────
// Robot-local frame: +x = forward along heading, +y = right of robot.
// Four probes arranged laterally under the front bumper.
export const QUADRGB_FORWARD_OFFSET_CM  = 6.0;
export const QUADRGB_LATERAL_OFFSETS_CM = [-1.5, -0.5, 0.5, 1.5]; // probe 1..4 (left..right)
export const QUADRGB_LIGHT_THRESHOLD    = 128; // 0..255 avg brightness; above=light surface, below=dark/line
