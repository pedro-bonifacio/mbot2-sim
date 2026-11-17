# Changelog

## [Unreleased]
### Changed
- Blocks are generated from the live Open Roberta Lab spec: labels, dropdowns, ports (R/L, U, Q, L1–R2), hidden fields and mutations now match Open Roberta field for field (`npm run check`).
- Programs run only from the start block ("iniciar"); loose blocks are disabled.
- Robot behaviour follows Open Roberta's generated MicroPython: colour sensor sees 8 colours (no orange), signed encoders with mirrored right motor, 5 timers, ultrasonic up to 300 cm, blocking tones, for-loop end is exclusive.
- HUD shows each quad RGB probe's reading.
### Added
- Load programs exported from Open Roberta Lab (**Carregar**).
- Docs: decision log, roadmap, curriculum, workflow, verify-on-robot checklist.


## [1.0.0] - 2026-05-12
Initial public release.

### Features
- Open Roberta Lab toolbox cloned (Beginner + Expert) in PT-PT
- Full block codegen for actions, sensors, control flow, math, text, lists, communication
- PNG-based map system with cyan/yellow spawn detection
- Save/load programs (XML + localStorage auto-restore)