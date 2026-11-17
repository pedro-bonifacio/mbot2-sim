# Open Roberta fidelity report

Catalogue: https://lab.open-roberta.org · robot mbot2 · lang pt · extracted 2026-11-17T13:01:18.282Z

Checked 91 toolbox blocks, 13 sensor-mode variants, 14 generic-sensor variants.

**Problems: 0** · intentional exceptions: 3


## Intentional exceptions

- `robControls_for` — inputs differ: OR's PT translation lists the TO input twice (renders an empty socket); the sim keeps one TO. (1)
- `robControls_for` — labels differ: Follows from the duplicate TO input above. (1)
- `robControls_forEach` — serialised field VAR: Loop variable default is Open Roberta's findLegalName("item"): the first free name. The catalogue was extracted with item…item3 already taken. (1)
