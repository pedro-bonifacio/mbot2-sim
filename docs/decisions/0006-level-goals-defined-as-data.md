# 0006 — Goals and zones live in level data, not in map pixels

- **Status:** Accepted
- **Date:** 2026-11-17
- **Area:** levels

## Context

Maps use reserved colours (magenta/cyan/yellow) for walls and spawn. Adding goal zones,
checkpoints, and forbidden areas as more painted colours would eat into the sensor
palette, risk being read by the colour sensor, and could not be printed on a real mat
without confusing the robot ([0003](0003-core-levels-use-real-robot-capabilities-only.md)).

## Decision

Goal zones, checkpoints, and other referee-only geometry are declared in the level's
JSON file (rectangles/circles in cm) and drawn by the simulator as a translucent
overlay. Sensors never see them. The PNG holds only what physically exists on the floor
(lines, coloured patches, walls).

## Consequences

- Sensor palette and reserved colours stay unchanged.
- Printable mats come straight from the PNG. The teacher marks goal zones with tape if
  needed.
- See [`../LEVEL_FORMAT.md`](../LEVEL_FORMAT.md) for the schema.

## Alternatives considered

- **Extra reserved colours for zones** — rejected for the reasons above.
