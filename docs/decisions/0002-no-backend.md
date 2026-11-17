# 0002 — No backend; progress is client-side only

- **Status:** Accepted
- **Date:** 2026-11-17
- **Area:** infra

## Context

The app is a static site (Cloudflare Pages / any static host). A level system adds
progress tracking, and teachers want some visibility into it. A backend would bring
accounts, hosting costs, GDPR obligations for minors' data, and ongoing maintenance.

## Decision

There will be no backend. All state lives in the browser:

- Per-level programs and progress are stored in `localStorage`.
- Progress can be **exported/imported** as a file or code, because school computers
  are shared and browsers get wiped.
- Anything the teacher needs reaches them through channels the school already uses
  (Teams, Moodle, email, USB). See [0008](0008-evaluation-on-physical-robot.md).

## Consequences

- No personal data leaves the student's machine, so there is no GDPR processor role.
- Progress is easy to lose or fake. Evaluation must not trust local progress state
  (see 0008).
- The deployment stays a zero-config static build.

## Alternatives considered

- **Lightweight backend (e.g. Cloudflare Workers + KV)** — rejected: accounts and
  minors' data are out of scope for this project.
