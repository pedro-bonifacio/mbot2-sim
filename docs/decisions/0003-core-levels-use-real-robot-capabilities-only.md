# 0003 — Core (evaluated) levels use only real mBot 2 capabilities

- **Status:** Accepted
- **Date:** 2026-11-17
- **Area:** levels

## Context

The levels are where students are evaluated, and the course's end goal is programming
the physical mBot 2 through Open Roberta Lab. A level that only works because of a
simulator convenience would teach something that doesn't transfer to the real robot.

## Decision

Core levels may only require behaviour the real mBot 2 + CyberPi actually has, as
exposed by the Open Roberta blocks. Concretely:

- **Allowed:** motors/encoders, ultrasonic, quad-RGB (colour, light, line), gyro (yaw),
  timer, CyberPi buttons/joystick, display, LEDs, sound output.
- **Allowed once the sim can drive them (sliders):** ambient light sensor, microphone
  loudness. Until then, no core level depends on them.
- **Not used in core levels:** accelerometer (always 0 in the 2D sim), communication
  blocks (single robot), anything the sim adds on top of the hardware.
- Map geometry must be physically reproducible: real-scale (cm), printable or tapeable
  floor mats, realistic line widths (≥ 2 cm, like electrical tape), plain floor colours
  from the sensor palette. No decorative art on the floor, because a real sensor would read it.
- Sim-only UI aids (sensor panel, path trail, block highlighting, speed control) are
  fine. They help debugging and are not part of the solution.

Extra simulator-only features may come later as a clearly separate **"Extra"** track
that is not used for evaluation.

## Consequences

- Any core level can be run on a printed mat with the real robot, so the teacher can
  confirm a student's sim solution physically.
- Fidelity bugs become higher priority (collision footprint, encoder sign, sensor
  positions), since they decide whether sim solutions transfer.
- Some appealing level ideas (multi-robot, accelerometer) are postponed to the Extra track.

## Alternatives considered

- **Sim-first levels with free use of sim features** — rejected for evaluated levels;
  kept as a future possibility for the Extra track.
