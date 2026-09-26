# Performance gate (BUILD-PLAN Stage 8)

| Check | How | Budget |
|---|---|---|
| Worker tick time | `npx -y pnpm@9.15.9 --filter @pme/validation perf:ticks --seconds 600` → `ticks.json` (Node, same engine code) | p99 ≪ 6 ms per frame |
| Frame times 60 / 30 fps | `PW_SYSTEM_CHROME=1 npx -y pnpm@9.15.9 exec playwright test -c playwright.validation.config.ts` → `soak-<date>.json` `frames60`, `frames30` | p95 < 1.5 × frame period |
| Soak 60 min at ×1 | same run (`PME_SOAK_MIN`, default 60) on the main-thread path → `soak` | heap growth ≤ 5 MB from minute 5; sim time ≥ 95 % of wall; no apnoea alarm |
| Determinism | `pnpm validate --suites determinism` (V9) | identical hashes |
| iPad (A14+), manual | Serve the demo on the LAN (`npx -y pnpm@9.15.9 --filter @pme/demo dev --host`), open `/validation-perf.html` on the iPad, wait 2 min, photograph the stats line (render path, frame p50/p95/p99), repeat with `?fps=30`. Record the numbers in the gate note. | 8 lanes at 60 fps; worker ≤ 6 ms, main ≤ 4 ms |
| Projector PC, 30 fps | `/validation-perf.html?fps=30` on the projector machine; same stats line | no frame ≥ 50 ms |
