# Changelog

## [Unreleased]
### Changed
- The simulation runs in fixed 1/60 s steps in the browser too, so a program does exactly the same thing on a slow school laptop as on a fast computer (before, a wall-following program could crash at 30 fps but not at 60).
- Collisions use the robot's real 17.5 × 13 cm outline, turned with its heading: the robot stops touching the wall instead of 4 cm inside it, corners hit walls while turning on the spot, and the map edge counts as a wall. The outline turns red after a collision.
- Programs that went through Open Roberta load correctly even when Open Roberta stored the LED block's "todos" as an empty value.
- Blocks are generated from the live Open Roberta Lab spec: labels, dropdowns, ports (R/L, U, Q, L1–R2), hidden fields and mutations now match Open Roberta field for field (`npm run check`).
- Programs run only from the start block ("iniciar"); loose blocks are disabled.
- Robot behaviour follows Open Roberta's generated MicroPython: colour sensor sees 8 colours (no orange), signed encoders with mirrored right motor, 5 timers, ultrasonic up to 300 cm, blocking tones, for-loop end is exclusive.
- HUD shows each quad RGB probe's reading.
- On-block +/− buttons show a pointer cursor and hover highlight, with a larger tap area.
- Waits, tones and the timer sensor use the simulated clock (advances with physics), not the computer's clock.
### Added
- Open Roberta-style typed variables: declared with "+" on the start block (type Número, Booleano, Caractere, Cor or a list of these), removed with "−". The **Variáveis** category lists them, plus function parameters and loop variables.
- Open Roberta functions (**Funções**, expert): with or without a return value, typed parameters, "se … retorna …". Calls follow the definition when it changes.
- Load programs exported from Open Roberta Lab (**Carregar**).
- **Exportar para Open Roberta**: asks for the student's name (remembered on this computer) and downloads `<Nome>_livre.xml` in Open Roberta's own format with the mBot 2 configuration, ready for *Importar programa* in Open Roberta Lab. Checked against Open Roberta's server.
- Headless simulator for development: `npm run sim` runs a program without a browser and prints where the robot ended up; `npm run sim:test` checks a list of programs. On the dev server, `window.__dev` drives the real editor and run loop as text.
- Docs: decision log, roadmap, curriculum, workflow, verify-on-robot checklist.


## [1.0.0] - 2026-05-12
Initial public release.

### Features
- Open Roberta Lab toolbox cloned (Beginner + Expert) in PT-PT
- Full block codegen for actions, sensors, control flow, math, text, lists, communication
- PNG-based map system with cyan/yellow spawn detection
- Save/load programs (XML + localStorage auto-restore)