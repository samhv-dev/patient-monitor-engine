# NOTICES

This file lists every borrowed code file, data table, recorded template, dataset-derived artefact and runtime or build dependency.

**Rules** (see `docs/DESIGN-BRIEF.md` §8):
- A row is added in the same PR that introduces the item.
- Files under `packages/*/src/vendor/**` and `packages/engine-core/templates/**` must carry a `NOTICE-ID: N-###` header that matches a row here. CI enforces this.
- Apache-2.0 items also need their licence text in `LICENSES/` and a statement of changes.

| ID | Item | Source URL | Licence | How used | Added on |
|---|---|---|---|---|---|
| N-001 | Vite 6.4.3 (build only) | https://github.com/vitejs/vite | MIT | Library/app bundler; not redistributed | 2026-09-24 |
| N-002 | Vitest 3.2.7 (build only) | https://github.com/vitest-dev/vitest | MIT | Unit test runner; not redistributed | 2026-09-24 |
| N-003 | TypeScript 5.9.3 (build only) | https://github.com/microsoft/TypeScript | Apache-2.0 | Type checker; not redistributed, so no LICENSES/ text needed | 2026-09-24 |
| N-004 | @playwright/test 1.63.0 (test only) | https://github.com/microsoft/playwright | Apache-2.0 | Browser smoke tests; not redistributed | 2026-09-24 |
| N-005 | @types/node 22.20.4 (build only) | https://github.com/DefinitelyTyped/DefinitelyTyped | MIT | Node type definitions for tests and scripts | 2026-09-24 |
| N-006 | cyrb53 string hash (`packages/engine-core/src/vendor/cyrb53.ts`) | https://github.com/bryc/code/blob/master/jshash/experimental/cyrb53.js | Public domain; MIT as the author's stated fallback (https://github.com/bryc/code/blob/master/LICENSE.md) | Seeds the per-subsystem sfc32 streams from (seed, stream name); verbatim algorithm, retyped in TypeScript, returns the two 32-bit halves | 2026-09-24 |
| N-007 | ws 8.21.3 (relay runtime, Node only) | https://github.com/websockets/ws | MIT | WebSocket server for `packages/controller/relay`; never bundled into browser builds | 2026-09-24 |
| N-008 | @types/ws 8.18.1 (build only) | https://github.com/DefinitelyTyped/DefinitelyTyped | MIT | Type definitions for ws | 2026-09-24 |
| N-009 | happy-dom 20.14.5 (test only) | https://github.com/capricorn86/happy-dom | MIT | DOM for the panel/remote unit tests; not redistributed | 2026-09-24 |
| N-010 | ajv 8.20.0 (browser runtime, `@pme/controller/scenario` entry only) | https://github.com/ajv-validator/ajv | MIT | Validates `pme-scenario/1` documents against `packages/controller/scenarios/pme-scenario-1.schema.json`; bundled into the scenario entry, never into the root entry or the IIFE | 2026-09-25 |
| N-011 | fast-uri 3.1.8 (ajv runtime dependency) | https://github.com/fastify/fast-uri | BSD-3-Clause (text in `LICENSES/fast-uri-3.1.8.txt`) | URI resolution inside ajv; bundled with it, unmodified | 2026-09-25 |
| N-012 | fast-deep-equal 3.1.3, json-schema-traverse 1.0.0, require-from-string 2.0.2 (ajv runtime dependencies) | https://github.com/epoberezkin/fast-deep-equal · https://github.com/epoberezkin/json-schema-traverse · https://github.com/floatdrop/require-from-string | MIT | Used inside ajv; bundled with it where reachable, unmodified | 2026-09-25 |
