# Verify on the Real Robot

Things the simulator does that only the physical mBot 2 can confirm. Each item has a
tiny Open Roberta program to run and what to look for. When one is checked, record
the result here and fix the sim if it differs.

Status: ☐ unverified · ✅ confirmed · ❌ differs (fix needed)

| # | Question | Sim assumption | Test program (Open Roberta) | Status |
|---|----------|----------------|-----------------------------|--------|
| 1 | Quad RGB probe order | Left → right: **L2, L1, R1, R2** | Loop: show `ler cor … L2` on the screen. Put a black tape under the leftmost probe only. | ☐ |
| 2 | Line sensor bits | `get_line_sta` = 0–15, bit 1 = probe over dark line, **L2 = bit 3 … R2 = bit 0** | Loop: show `ler line` on the screen. Black tape under L2 only (expect 8), then R2 only (expect 1). | ☐ |
| 3 | Gyro sign | Turning **right (clockwise) increases** the Z angle | Reset gyro Z, turn right 90°, show `ler direção … Z`. | ☐ |
| 4 | Right motor direction | `motor R ligar 30` spins the right wheel **backwards** (EM2 mirrored) | Run `motor R ligar 30` for 1 s with the robot lifted. | ☐ |
| 5 | Right encoder sign | Driving forward makes encoder **R decrease** (L increases) | Reset both encoders, drive forward 20 cm, show both `grau` values. | ☐ |
| 6 | Text position | `mostrar texto` at column c, row r draws at `x = 8·c + 5`, `y = 17·r` (sim uses an 8×8 grid of 16 px cells) | Show "X" at column 3, row 2 and photograph the screen. | ☐ |
| 7 | Ultrasonic out of range | Reads **300** with nothing in front | Point at an open space, show `ler distância`. | ☐ |
| 8 | Quad RGB geometry | Probes 6 cm ahead of the wheel axle, 1 cm apart | Measure on the robot (ruler: centre to centre of the four sensors, and from the wheel axle). **Priority:** the tape-maze levels (06-05, 06-06) depend on it. | ☐ |
| 9 | Colour of an orange floor | Classified as the nearest of the 8 colours (no orange) | Show `ler cor` over an orange sheet. | ☐ |
| 10 | Exported file on the robot | A file from **Exportar para Open Roberta** imports into Open Roberta Lab and runs as in the sim (checked on OR's server, never on a robot) | In the sim, load `reference_openroberta/export-samples/openroberta/01-simples.xml`, export it, *Importar programa* in Open Roberta Lab, transfer to the robot and run: text, key A, beep, drive, turn, stop at 15 cm, green LEDs, two beeps. | ☐ |
