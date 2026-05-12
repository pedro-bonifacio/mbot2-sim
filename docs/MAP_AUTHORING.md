# Map Authoring Guide

Maps for the mBot 2 Simulator are PNG images that define the arena: floor colours,
obstacles, and where the robot spawns.

## File location and naming

Place PNG files in `public/maps/`. The Vite dev server and build process auto-discover
all `.png` files in that directory and list them in the in-app dropdown sorted
alphabetically. Use a numeric prefix for explicit ordering:

```
public/maps/
  01-intro.png
  02-straight-line.png
  03-maze.png
  default.png
```

The `default` map (if it exists) is selected on startup; otherwise the first
alphabetically.

## Recommended dimensions

All maps use a fixed scale: **8 pixels = 1 cm** of arena space.

- **Standard canvas:** 1600×980 px (= 200×122.5 cm)
- **Minimum:** 100×100 px (= 12.5×12.5 cm)
- **Hard cap:** 2000×1500 px (= 250×187.5 cm) — maps exceeding this are rejected with an error

The canvas element is resized to match the loaded map's pixel dimensions exactly.

## Coordinate system and scale

```
(0,0) ──────────────────► +X (east)
  │
  │   8 pixels = 1 cm of arena space
  │
  ▼
 +Y (south)
```

Robot heading convention (matches `robot.theta`):
- **0°** = facing east (right)
- **90°** = facing south (down)
- **-90° / 270°** = facing north (up)
- **±180°** = facing west (left)

Heading increases clockwise when viewed on screen.

## Reserved colours

These three colours are consumed by the simulator and must **not** be used for
sensor-detectable floor markings.

| Colour  | Exact hex | RGB         | Purpose |
|---------|-----------|-------------|---------|
| Magenta | `#ff00ff` | 255, 0, 255 | Obstacle wall — robot stops on contact |
| Cyan    | `#00ffff` | 0, 255, 255 | Spawn zone body |
| Yellow  | `#ffff00` | 255, 255, 0 | Spawn direction marker |

### Collision

Only **magenta** (`#ff00ff`) triggers a collision halt. Cyan and yellow are fully
passable — the robot can spawn on the cyan zone and drive across it freely.

### Sensor visibility

Cyan and yellow pixels are **invisible to all sensors**:
- Colour sensor reads them as `white`
- Ultrasonic ray passes through them (no reflection)

This means spawn markers on a white floor have no effect on running programs.

### Floor sensor colours

To make the colour sensor read a specific value, paint the floor with the palette
swatch colour (exact or close enough — tolerance ±40 in RGB Euclidean distance):

| Sensor returns | Recommended paint hex | Notes |
|---|---|---|
| `red`    | `#cc0000` | |
| `orange` | `#ff6600` | |
| `yellow` | `#ffff00` | Reserved as spawn direction — only use away from spawn zone |
| `green`  | `#33cc00` | |
| `cyan`   | `#33ffff` | Must NOT use `#00ffff` (reserved spawn zone) |
| `blue`   | `#3366ff` | |
| `purple` | `#cc33cc` | |
| `white`  | `#ffffff` | default floor |
| `black`  | `#000000` | line tracking |

## Designing the spawn marker

1. Paint a **cyan (`#00ffff`) rectangle** exactly the size of the robot footprint —
   **140×104 px** (= 17.5×13 cm, the mBot 2 physical footprint at 8 px/cm) — at the
   desired start location. The centroid of all cyan pixels becomes the robot's starting
   position.

2. Paint a **small yellow (`#ffff00`) square** (~16×16 px = 2×2 cm) on the **outside** of
   the cyan rectangle on the side that faces the desired forward direction. The vector from
   the cyan centroid to the yellow centroid defines the spawn heading.

Examples:

```
Robot faces north (up):        Robot faces east (right):
  YYYYYYYY                       CCCCCCCCCCCCCCCCCYYYYYYY
  YYYYYYYY                       CCCCCCCCCCCCCCCCC
  CCCCCCCCCCCCCCCCC              CCCCCCCCCCCCCCCCC
  CCCCCCCCCCCCCCCCC              CCCCCCCCCCCCCCCCC
  CCCCCCCCCCCCCCCCC
  CCCCCCCCCCCCCCCCC
```

(C = cyan 140×104 px; Y = yellow 16×16 px)

If the yellow marker is missing, heading defaults to **0° (east)** and a warning
is logged.
If the cyan zone is missing, spawn defaults to the **canvas centre** and a warning
is logged.

## Tips

- **Disable anti-aliasing** when drawing reserved colour regions. Most paint tools have a
  hard-edge (no anti-aliasing) mode for bucket-fill and pencil tools. Anti-aliased edges
  near cyan/yellow produce non-reserved fringe pixels, which is fine — only the pure-colour
  core pixels count for centroid computation.
- **Magenta obstacles** can be any shape: lines, walls, filled regions. Obstacle borders
  should be at least **5 px thick** (= 0.625 cm) so the robot collision circle reliably
  contacts them. The robot stops when its bounding circle (radius 4.5 cm = 36 px) touches
  any magenta pixel.
- **Black lines** for line-tracking tasks should be **10–20 px wide** (= 1.25–2.5 cm). The
  QuadRGB sensor sub-sensors are roughly 8–16 px apart laterally at 8 px/cm.
- **Magenta perimeter border** — 5 px thick on all four edges — is the recommended default
  arena wall. This equals 0.625 cm of wall, safely detectable by the collision system.

## Regenerating the built-in maps

```bash
node scripts/generate-maps.js
```

This recreates `public/maps/default.png` and `public/maps/test-track.png` at 1600×980 px.
