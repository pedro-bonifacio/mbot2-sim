# Open Roberta export samples

Paired programs used to build "Exportar para Open Roberta" (Roadmap Phase A,
[decision 0008](../../docs/decisions/0008-evaluation-on-physical-robot.md)).
Each program exists twice: as the sim saves it, and as Open Roberta Lab exports it after
being rebuilt block for block. Comparing each pair shows exactly how the formats differ.

```
sim/            programs saved by mbot2-sim (Blockly XML)
openroberta/    the same programs exported from Open Roberta Lab (mBot 2)
```

| File | Covers |
|------|--------|
| `01-simples` | display text, wait for key A, tone, drive/turn for, drive, wait for ultrasonic < 15, stop, LEDs, repeat, wait ms |
| `02-variavel` | a number variable (`contador`), set/get, arithmetic, if/else on the colour sensor, println |
| `03-funcao` | a function with a parameter and no return (`quadrado(lado)`), a function with a return value (`dobro(x)`), calls |

> **Superseded for fidelity checking** by the automated catalogue + `npm run or:check`
> ([decision 0011](../../docs/decisions/0011-live-open-roberta-as-fidelity-oracle.md)).
> These files remain useful as end-to-end export examples. No more manual rebuilds needed.

## How to produce the `openroberta/` files

1. In the sim choose **Avançado**, then **Carregar** `sim/NN-*.xml`.
2. In Open Roberta Lab (robot **mBot 2**, expert mode) rebuild the program block for block.
   - Variables and function parameters: type **Número**.
   - Keep the default robot configuration.
3. Export (*Editar → Exportar programa*) and save as `openroberta/NN-*.xml` (same name).

If a block can't be rebuilt exactly in Open Roberta, rebuild the closest equivalent and
note the difference here. That mismatch is a fidelity bug in the sim.

## Notes

_(add any differences found while rebuilding)_
