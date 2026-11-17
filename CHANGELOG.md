# Changelog

## [Unreleased]
### Changed
- Random-number blocks use a seeded generator: each run still gets new numbers, but any run can be replayed exactly from its seed.
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
- Tidier top bar: **Executar / Parar / Reiniciar**, speed, **★ Níveis** with the name of what is open, and one **Ficheiro ▾** menu for programs, Open Roberta export and progress. The "Nível / mapa" dropdown is gone (★ Níveis lists the free maps too).
- **Fast-forward ×1 / ×2 / ×4**: the result is exactly the same at any speed.
- **Resizable editor / robot split**: drag the divider (double-click resets); the map shrinks to fit. By default each side gets half the screen, so the block editor has room on school laptops.
- **The running block is outlined in yellow** while the program runs (it stays on a block while the robot drives or waits).
- **The robot leaves an orange trail** showing the path it took; cleared by Executar, Reiniciar or a map change.
- Levels with a single layout give ★★ as soon as they are passed.
- The level panel shows the latest result in words (green / red) and a **Próximo nível ›** button once the level has ★.
- The simulator reopens the level or map that was open last time on this computer.
- Tab title "Simulador mBot 2" (with the open level) and a robot icon.
- **★ Níveis**: a window listing every level by world with its stars, and the free maps; any level can be opened in any order. A level opens with its toolbox (Principiante / Avançado).
- **Progress is saved**: every level keeps its own program and its stars (★ / ★★) in this browser; free maps share one program. **Guardar progresso** downloads all of it as a file and **Abrir progresso** brings it back on another computer (stars are added, never lost). **Exportar para Open Roberta** names the file after the level.
- Level rules: touching a wall always fails the run; a robot that stops with the goal unmet fails after 5 s instead of waiting for the time limit; levels can change both timings (`settle`, `stall`).
- **Levels** (first version): choose one in **★ Níveis**. Each level has an objective, goals checked as the robot runs (✓ / ✗ with the reason in Portuguese), target zones drawn on the floor, and variants where walls or lines move. **Testar todas as variantes** checks the program on every variant (★★). Three sample levels.
- `npm run levels:check`: every level's reference solution must pass all variants and its tempting-but-wrong programs must fail.
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