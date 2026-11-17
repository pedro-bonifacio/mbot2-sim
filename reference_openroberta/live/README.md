# Live Open Roberta reference

Ground truth extracted from the running Open Roberta Lab (mBot 2, PT), per
[decision 0011](../../docs/decisions/0011-live-open-roberta-as-fidelity-oracle.md).

| File | What | How it's produced |
|------|------|-------------------|
| `or-mbot2-catalogue.json` | Every toolbox block with fields, dropdown options, defaults, hidden fields, PT labels, and OR's own XML serialisation; variable/procedure/start blocks; default configuration; all PT `Blockly.Msg` strings | `scripts/or-extract-catalogue.browser.js` run in lab.open-roberta.org |
| `or-mbot2-dynamic.json` | Dynamic shapes: every sensor mode, every generic-sensor type, list/if/wait mutations, variable/function blocks, and Open Roberta's block source code | browser extraction (see git history of this file's commit) |
| `or-mbot2-semantics.json` | MicroPython Open Roberta generates for each block on the mBot 2 — the reference for sim **behaviour** | server `/projectWorkflow/source`, one block per program |
| `fidelity-report.md` | Sim vs. Open Roberta, block by block | `npm run or:check > reference_openroberta/live/fidelity-report.md` |

## Refreshing

1. Open <https://lab.open-roberta.org/?loadSystem=mbot2>, switch language to Português.
2. Run `scripts/or-extract-catalogue.browser.js` in the DevTools console (or let the
   assistant do it via browser automation).
3. Replace `or-mbot2-catalogue.json`, run `npm run or:specs` (regenerates
   `src/blockly/generated/orSpecs.js`), then `npm run check`, and commit.

## Server-side validation

Open Roberta's server is the final authority on whether a program is valid. From a
page on lab.open-roberta.org (mBot 2 loaded):

```js
const M = require('program.model');
const call = (f, ...a) => new Promise(r => f(...a, r));
const imp = await call(M.loadProgramFromXML, 'probe', exportXml);         // lenient
const src = await call(M.showSourceProgram, 'probe', undefined,
                       imp.progXML, imp.confXML, '', '', 'pt');          // strict
// src.rc === 'ok' → src.sourceCode is the MicroPython that would run on the robot.
```

- Import (`/program/import`) accepts almost anything, even unknown block types.
- Source generation (`/projectWorkflow/source`) rejects unknown types, shadow blocks,
  and wrong sensor blocks. It can still fill in defaults for wrong field names
  silently, so pair it with the client-side catalogue check.
- Use the public server sparingly (it's a free Fraunhofer service). For automated
  test suites, run Open Roberta locally via its Docker images instead.

### What the server changes on import (seen 2026-11-17)

Harmless, but it means a file that went through Open Roberta is not byte-identical to
what the sim exported:

- adds a `<data>` blob (neural-network settings) to `robControls_start`;
- writes the LED blocks' `SLOT` "ALL" as `""` (the MicroPython is still "all LEDs";
  the sim's import maps it back);
- drops `return_type` from `robProcedures_ifreturn` (the client writes it; the sim
  re-derives it from the enclosing function).

The Lab's *Importar programa* always names the imported program `NEPOprog`; the file
name doesn't matter to Open Roberta. `scripts/fixtures/from-openroberta/` holds what the
server stored for each test program; `npm run or:export` checks them.

