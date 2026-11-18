# Curriculum

Living plan for the level content. Structural decisions are in
[`decisions/`](decisions/README.md); the data format is in [`LEVEL_FORMAT.md`](LEVEL_FORMAT.md).

---

## Principles

1. **Self-directed, ageless.** Ages 11–18, no locks, no age or class tracks ([0001](decisions/0001-self-directed-progression-no-locks.md)). The path is a suggestion.
2. **Real robot first.** Core levels only use real mBot 2 capabilities and can run on a printed mat ([0003](decisions/0003-core-levels-use-real-robot-capabilities-only.md)).
3. **Robustness over luck.** From World 4 onward, levels are checked against random variants so hard-coded distances fail ([0005](decisions/0005-randomised-level-variants.md)).
4. **One new idea per level.** Each core level introduces or combines at most one new concept; bonus/challenge levels combine freely.
5. **Clear prerequisites.** Every level states its objective and assumed concepts. Hints and guidance come from the teacher in class ([0012](decisions/0012-teacher-owns-guidance-and-sim-to-real.md)).
6. **Low floor, high ceiling.** ★ is reachable by most students; ★★★ challenges stretch the strongest.
7. **Skip what you already know.** Each world ends with a **Prova** (test) level. A fast
   student opens the Prova first; ★★ there means the world can be skipped. A slow student
   has core + bonus levels at the same difficulty to practise on.
8. **Everything leads to a random course.** Each world's Prova is a sim version of one of the
   random physical courses (below), so practice in the sim *is* preparation for evaluation.

## Stars

| Star | Meaning | Applies |
|------|---------|---------|
| ★ | Goal met on the current run | all levels |
| ★★ | Goal met on every test variant | levels with variants; otherwise awarded with ★ |
| ★★★ | Level-specific challenge (≤ N blocks, time limit, forbidden block…) | optional per level |

## Level kinds within a world

- **Core** (~6 per world) — the suggested path; introduces the world's concepts.
- **Bonus** — practice and variation at the same difficulty.
- **Challenge** — harder combination; marked as such, never required.

## Worlds (draft)

Counts are targets. Contexts depend on [0007](decisions/0007-narrative-framing.md).

| # | World | Concepts | Variants? | Target |
|---|-------|----------|-----------|--------|
| 1 | Primeiros Passos | sequence; drive/turn for distance/angle; units (cm, °, RPM) | no | 10 |
| 2 | Luz, Som e Ecrã | LEDs, tones/notes, display text, wait | no | 7 |
| 3 | Repetir | repeat loops, patterns, block-count challenges | no | 8 |
| 4 | Ultrassom | wait-until, if/else, comparison, unknown distances | yes | 10 |
| 5 | Cores e Linhas | colour sensor, colour codes, line following 1 → 2 → 4 probes, junctions | yes | 12 |
| 6 | Decisões | AND/OR, nesting, wall following, mazes | yes | 10 |
| 7 | Variáveis | counters, encoders, gyro turns, timer, accumulating values | yes | 10 |
| 8 | Controlo | proportional line/wall following, PID, timed races | yes | 8 |
| 9 | Funções e Listas | procedures, waypoint lists, sorting by colour | yes | 8 |
| 10 | Missões | open-ended capstones combining everything | yes | 10+ |

Expert toolbox needed from World 7 (variables) / 9 (procedures). The level declares
which toolbox it opens with; the student can still switch.

## Random courses (evaluation)

Evaluation is on the real robot ([0008](decisions/0008-evaluation-on-physical-robot.md)).
The teacher builds the course **at random** each time, from black tape, coloured paper and
boxes. A program only passes if it adapts: no hard-coded distances, turns or counts.
The robot has **one forward-facing ultrasonic sensor**: to see sideways it must turn and look.

| # | Course | The teacher builds | The robot must | Tier | Sim Prova |
|---|--------|--------------------|----------------|------|-----------|
| P1 | Linha livre | black tape in any shape: curves, sharp corners | follow it to the red end patch and stop | standard | 05-12 |
| P2 | Contar e estacionar | coloured patches/stripes in a row, random spacing | stop on the Nth blue one (N given by the teacher); advanced: also show how many of each colour it crossed | standard | 05-07, 07-01 |
| P3 | Ficar no ringue | area with a black tape border | roam for 30 s without leaving | standard | 05-08 |
| P6 | Encontrar o objeto | one box anywhere in an empty area | turn to find it, drive to it, stop ~5 cm away | standard | 04-10, 07-05 |
| P5 | Corrida de obstáculos | boxes scattered at random, a finish line on the far side | reach the finish line without touching a box | advanced | 06-09 |
| P8 | Labirinto de fita | grid of black tape with junctions and dead ends | reach the green exit patch | advanced | 06-06 |
| P9 | Labirinto de caixas | maze of boxes/books | reach the exit (turns to look at each junction) | advanced | 06-08 |
| P7 | Estacionar no espaço livre | row of boxes with one gap at a random place | find the gap and park in it | advanced | 07-06 |
| P10 | Sinais de trânsito | tape line with colour patches beside it | obey them: green = left at next junction, blue = right, red = stop | advanced | 09-04 |
| P4 | Limpar a mesa | light boxes inside a black ring | push every box out without leaving the ring | advanced | 10-02 (needs pushable boxes) |
| P11 | Missão final | P10 + a box blocking the line | go round the box, find the line again, obey the signs | advanced | 10-01 |

**Tiers.** Standard courses need Worlds 1–5 (max grade 4/5); advanced ones need Worlds 6–9
(the only route to 5/5). All 4 standard + 7 advanced courses are kept;
students choose which to attempt (0008, amended 2026-11-18). Each course gets a one-page teacher sheet: materials,
what to vary, explanation questions, rubric.

## Per-world level lists

Kinds: **C** core (the suggested path), **B** bonus (same difficulty, more practice),
**D** challenge (harder, never required), **P** Prova (the world's test; ★★ = may skip the
world). For now a Prova is `kind: challenge` with a title starting "Prova:". Titles are working titles. Ages 11–18: Worlds 1–3 are quick for older students
(they start with the Prova); Worlds 8–10 are where the strongest are stretched.
"Needs" marks sim features that do not exist yet (see [Sim features needed](#sim-features-needed)).

### World 1 — Primeiros Passos (sequence, distance, angle, RPM) · no variants · **built 2026-11-18**

| id | k | Title | Idea | Needs |
|----|---|-------|------|-------|
| 01-01 | C | Primeiros passos | drive 50 cm into the box | |
| 01-02 | C | Marcha-atrás | reverse into a box behind you | |
| 01-03 | C | Virar | turn 90° and drive into a box on the side | |
| 01-04 | C | Em L | drive, turn, drive: an L-shaped route | |
| 01-05 | C | Contra o relógio | same route, tight time limit: raise the RPM | |
| 01-06 | C | Dar a volta | go round the end of a wall: a U-turn with two turns (curves are expert-only, 0015) | |
| 01-07 | B | Ida e volta | drive to a box and come back to the start | |
| 01-08 | B | Slalom | weave between three boxes | |
| 01-09 | D | Garagem | turn into a garage 20 cm wide: precision | |
| 01-10 | P | Percurso em Z | a Z through three corners between two angled boxes (★★★ ≤ 8 blocks later) | ★★★ |

### World 2 — Luz, Som e Ecrã (LEDs, tones, display, wait) · no variants

| id | k | Title | Idea | Needs |
|----|---|-------|------|-------|
| 02-01 | C | Acender os LEDs | all LEDs green | |
| 02-02 | C | Bip | play 440 Hz for 200 ms | goal: tone played |
| 02-03 | C | O meu nome | write your name on the display | |
| 02-04 | C | Semáforo | green → yellow → red with waits | goal: sequence |
| 02-05 | C | Contagem decrescente | 3, 2, 1, "Partida!" on the display, then drive | goal: sequence |
| 02-06 | B | Entrega | drive to the box, beep, LEDs blue, display "Entregue" | goal: tone played |
| 02-07 | D | Música | play a short tune (notes) while the LEDs change | goal: sequence |

### World 3 — Repetir (repeat, patterns, fewest blocks) · no variants

| id | k | Title | Idea | Needs |
|----|---|-------|------|-------|
| 03-01 | C | Quadrado | a square with `repeat 4` (back at the start) | |
| 03-02 | C | Polígonos | a hexagon: work out the angle (360 / 6) | |
| 03-03 | C | Ziguezague | a long zigzag corridor: repeat a pair of moves | |
| 03-04 | C | Esperar pelo botão | press A to start each lap of the square | key in tests |
| 03-05 | C | Repetições dentro de repetições | four squares in a row (nested repeat) | |
| 03-06 | B | Pisca-pisca | LEDs blink 10 times while driving | goal: sequence |
| 03-07 | D | Estrela | a five-pointed star: the 144° puzzle | |
| 03-08 | P | Escadaria | a staircase corridor, ★★★ with ≤ 5 blocks | ★★★ |

### World 4 — Ultrassom (wait until, if/else, unknown distances) · variants from here

| id | k | Title | Idea | Needs |
|----|---|-------|------|-------|
| 04-01 | C | Parar antes da parede | drive until < 10 cm (exists) | |
| 04-02 | C | Afastar da parede | start close, reverse until > 30 cm | |
| 04-03 | C | Corredor com curva | until wall, turn, until wall (both lengths random) | |
| 04-04 | C | Porta aberta ou fechada | a box blocks the door or not: if blocked go round, else straight through | |
| 04-05 | C | Perto ou longe | wall near or far: display "PERTO" or "LONGE" | goal text from variant |
| 04-06 | C | Espiral | repeat 4: until wall, turn left (corridor lengths random) | |
| 04-07 | B | Vai e volta | to the wall, turn 180°, to the other wall | |
| 04-08 | B | Travagem a tempo | same as 04-01 at 150 RPM: brake earlier | |
| 04-09 | D | Rodar até ver | turn on the spot until a box is seen, then drive to it | |
| 04-10 | P | Encontrar o objeto | P6 simple: the box is anywhere around you | |

### World 5 — Cores e Linhas (colour, line following, junctions)

| id | k | Title | Idea | Needs |
|----|---|-------|------|-------|
| 05-01 | C | Parar na linha | stop on the black line, LEDs green (exists) | |
| 05-02 | C | Da mesma cor | drive onto a patch (red/green/blue): LEDs the same colour | goal colour from variant |
| 05-03 | C | Seguir a borda | follow a straight line's edge with one probe | |
| 05-04 | C | Curvas suaves | follow a curvy line with two probes | layout choice |
| 05-05 | C | Curvas de 90° | sharp corners need the outer probes | layout choice |
| 05-06 | C | Fim da linha | follow until the red patch, stop | |
| 05-07 | C | Contar riscas | stop on the 3rd black stripe, random spacing (repeat 3: until black, until white) | |
| 05-08 | C | Ficar no ringue | P3: bounce inside a black border for 30 s | goal: survive |
| 05-09 | B | Cruzamento | follow the line straight through a crossing | |
| 05-10 | B | Linha tracejada | follow a line with gaps | |
| 05-13 | B | O segundo verde | stop on the 2nd green patch, random spacing, red patches in between (no variables: repeat 2) | |
| 05-14 | B | O robô não pára! | find the bug: opens with a `repeat forever` whose stop never lasts (a real student program) | **built** |
| 05-11 | D | Volta rápida | a line lap, ★★★ under N seconds | ★★★ |
| 05-12 | P | Linha livre | P1: a random track, to the red end | layout choice |

### World 6 — Decisões (AND/OR, nesting, junctions, mazes)

| id | k | Title | Idea | Needs |
|----|---|-------|------|-------|
| 06-01 | C | Parede ou linha | stop at whichever comes first (OR) | |
| 06-02 | C | Só no verde | stop when on green AND close to the wall | |
| 06-03 | C | Junção em T | follow the line, turn left at the T | |
| 06-04 | C | Desviar da caixa | a box on the line: go round, find the line again | |
| 06-05 | C | Mão esquerda | a small tape maze with the left-hand rule | maze generator |
| 06-06 | C | Labirinto de fita | P8 full | maze generator |
| 06-07 | C | Espreitar | at the wall, look left and right, go to the free side | |
| 06-08 | C | Labirinto de caixas | P9 | maze generator |
| 06-09 | P | Corrida de obstáculos | P5: random boxes, reach the finish line | box scatter |
| 06-10 | D | Labirinto sem becos | a maze with loops: left-hand rule fails, find another way | maze generator |

### World 7 — Variáveis (counters, encoders, gyro, timers) · expert toolbox

| id | k | Title | Idea | Needs |
|----|---|-------|------|-------|
| 07-01 | C | Contador | count the stripes until the wall, show the number | goal text from variant |
| 07-02 | C | Fita métrica | drive to the wall, show the distance covered (encoder) | goal: number ± tolerance |
| 07-03 | C | Giroscópio | exact 90° turns with the gyro on a slippery route | |
| 07-04 | C | Cronómetro | show how long the trip to the wall took | goal: number ± tolerance |
| 07-05 | C | O mais perto | scan 360°, remember the closest angle, go there (P6 full) | |
| 07-06 | C | Estacionar no espaço livre | P7: drive along the boxes, look every 10 cm, park in the gap | |
| 07-07 | B | Espiral crescente | each side 5 cm longer than the last | |
| 07-08 | B | Contar cores | count red and blue patches, show both | goal text from variant |
| 07-11 | D | Código de barras | 1–4 red stripes at the start say which green patch to stop on: count them, then count greens | |
| 07-09 | D | Abrandar ao chegar | speed = distance: smooth stop at 10 cm | |
| 07-10 | P | Contar e estacionar | P2 advanced | goal text from variant |

### World 8 — Controlo (proportional, PID, races)

| id | k | Title | Idea | Needs |
|----|---|-------|------|-------|
| 08-01 | C | Travagem suave | speed proportional to distance | |
| 08-02 | C | Seguidor proporcional | turn by (left − right) reflected light | layout choice |
| 08-03 | C | Andar a direito | gyro heading hold over a long run | |
| 08-04 | C | PID | add I and D: faster on a curvy track | layout choice |
| 08-05 | B | Corrida | line race, ★★★ time | ★★★ |
| 08-06 | D | Labirinto rápido | P9 against the clock | ★★★ |
| 08-07 | D | Limpar a mesa | P4: push the boxes out of the ring | pushable boxes |
| 08-08 | P | Volta mais rápida | a random track under a time limit | layout choice |

### World 9 — Funções e Listas (procedures, lists, memory)

| id | k | Title | Idea | Needs |
|----|---|-------|------|-------|
| 09-01 | C | Função virar | one function used at every junction | |
| 09-02 | C | Polígono(n) | a function with a parameter draws any polygon | |
| 09-03 | C | Lista de ordens | follow a list of [distance, angle] steps | |
| 09-04 | C | Sinais de trânsito | P10: one function per sign | layout choice |
| 09-05 | C | Ordenar por cor | read the patches, then go back to the red one | |
| 09-06 | C | Memorizar o caminho | solve a maze, then come back using the saved turns | maze generator |
| 09-07 | D | Caminho mais curto | solve, simplify the turn list (LBR → U-turns removed), run it again shorter | maze generator |
| 09-08 | P | Sinais aleatórios | P10 with random signs | layout choice |

### World 10 — Missões (capstones, open-ended)

| id | k | Title | Idea | Needs |
|----|---|-------|------|-------|
| 10-01 | P | Missão final | P11: signs + a box blocking the line | layout choice |
| 10-02 | C | Limpar a mesa | P4 | pushable boxes |
| 10-03 | C | Resgate | find the box hidden in a maze, come back to the start | maze generator |
| 10-04 | C | Entregas | a line network: A = go to red, B = go to blue | key in tests |
| 10-05 | C | Regresso a casa | after any random route, return to the start (encoders + gyro) | |
| 10-06 | D | Labirinto às escuras | a box maze with no junction marks, as fast as possible | ★★★ |
| 10-07 | B | Espetáculo | free: a dance with lights and music (no goal; shown in class) | |

**"Find the bug" levels** (`starter:` program, built 2026-11-18): when a student makes
an instructive mistake, save the program and turn it into a bonus level. Good candidates
per world: a turn in the wrong direction (W1), a wait missing between LED changes (W2),
a repeat count off by one (W3), a threshold that is too small for the speed (W4),
the never-ending stop (05-14), a counter never reset (W7), a function that never returns (W9).

## Sim features needed

In build order (most levels unblocked first):

1. **Goal values from variants:** `displayShows` text and `ledColour` colour as expressions of
   variant params (04-05, 05-02, 07-01, 07-08, 07-10), and **numbers with tolerance**
   (07-02, 07-04).
2. **Layout choice:** a `choices` param that picks one of several hand-drawn item lists
   (random line tracks: 05-04/05/12, 08-x, 09-04/08, 10-01).
3. **Generators:** a seeded **maze** (tape or walls, grid size, cell cm) and **box scatter**
   (count, size, minimum gap, keep a path open): 06-05/06/08/09/10, 09-06/07, 10-03.
4. **Event goals:** `tonePlayed`, `sequence` (display/LED states in order), `survive`
   (pass at the time limit if still inside a zone): Worlds 2, 3 and 05-08.
5. **★★★ challenges:** block count and time limit (01-10, 03-08, 05-11, 08-05/06).
6. **Keys in tests:** a level can press A/B at given times in the ★★ run (03-04, 10-04).
7. **Pushable boxes** (P4, 08-07, 10-02): new sim physics, approved 2026-11-18.
