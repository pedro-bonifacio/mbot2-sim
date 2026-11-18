# Changelog

## [Unreleased]
### Added
- **Class accounts**: students log in ("👤 Entrar") with a username like `7b-12` and the password from their slip; stars and programs then follow them to any computer, saved automatically (⚠ shown when offline, sent when the connection returns). Not logged in, everything works as before. The teacher creates a class from a CSV (`number`, `names`) with `node turmas.mjs create 7B alunos.csv` on the shared drive; names never reach the server (decision 0016).
- 04-01 and 05-01 say that the front of the robot (the yellow ring) is what counts.
### Changed
- **Clearer Portuguese on every block**: no more English leftovers ("speed RPM", "turn RGB LED on", "quad rgb sensor"), PT-PT forms ("premido", "devolve", "faz", "Ação"), units in parentheses ("distância (cm)"), sensors read "ler … do ultrassom / do sensor de cor". Display only: programs and the Open Roberta export are unchanged.
- **Even spacing on blocks**: Open Roberta's hidden fields and empty labels no longer leave gaps ("mover   para").
- **Simpler beginner toolbox**: the curve blocks (a speed per wheel), volume, LED brightness, microphone, gyro, timer and encoder blocks are only in Avançado.
- A running loop stays outlined while its blocks run; the inner outline no longer flickers.
- The controller buttons sit in a compact pad left of the robot screen; screen and console are shorter, so the robot side fits an 800 px-high laptop.
- Walls are drawn as bricks, and so is everything outside the map.
- A level not touched yet starts from the program that was in the editor, so students adapt their last solution.
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
- **World 1** (10 levels, 01-01 … 01-10) and **05-14 "O robô não pára!"**, a find-the-bug level that opens with a broken program. Levels can now have a `starter:` program.
- **Yellow ring on the robot**: the point a level judges (centre or front); the target zone turns green with ✓ while the ring is inside.
- **📏 Régua**: drag on the robot view to measure in cm; from the robot it also gives the turn ("65 cm · 90° à direita").
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