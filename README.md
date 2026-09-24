# patient-monitor-engine

An open-source **simulated patient-monitor engine** for web-based ACLS/BLS and OR/anaesthesia simulators.

**Channels:** ECG (3/5/12-lead), IBP (ABP/CVP/PAP), NIBP, PR, SpO2 and pleth, EtCO2 and capnogram, temperature and RR.

**How it works:**
- Waveforms come from a coupled physiology core, in one of two modes:
  - **MANUAL**: instructor targets, ramps and fixed coupling rules;
  - **MODELED**: lumped physiology with drugs, volume and reflexes.
- They are displayed through a model of how real monitors *measure*: averaging, lags, NIBP cuff cycle, alarms.
- A pure-TypeScript engine runs in a Web Worker and drives a Canvas2D sweep renderer. Audio (Web Audio) runs on the main thread.
- It embeds as ES modules or as one IIFE file.

**Status: Stage 0 (scaffold) — see [docs/plans/](docs/plans/).** Run `pnpm i && pnpm typecheck && pnpm test && pnpm build`.

## Documents
- [docs/DESIGN-BRIEF.md](docs/DESIGN-BRIEF.md): the spec (architecture, signal models, device behaviour, API, licence policy, validation).
- [docs/BUILD-PLAN.md](docs/BUILD-PLAN.md): the staged roadmap (Stages 0–8, gates, acceptance tests, first tasks).
- Research behind both documents is outside this repo, in `../research/` (reports 00–05).

## Licence
MIT (see [LICENSE](LICENSE)). Every third-party item is listed in [NOTICES.md](NOTICES.md).
