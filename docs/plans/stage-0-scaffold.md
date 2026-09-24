# Stage 0: Scaffold, CI, Licence, NOTICES — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An empty but real pnpm monorepo that type-checks, tests, builds seven package skeletons, emits a single-file IIFE, enforces the NOTICES rule in CI, and runs a sim-time-driven sweep cursor at exactly 94.5 CSS px/s.

**Architecture:** pnpm workspace (`packages/*`, `apps/*`) with one shared strict `tsconfig.base.json`. Each package is TypeScript source consumed directly by its neighbours (`"exports": "./src/index.ts"`), tested with Vitest and built with Vite library mode; `@pme/renderer` additionally emits `dist/patient-monitor.iife.js` with the global `PatientMonitor`. The only runtime code in this stage is `@pme/engine-core`'s fixed-step `Clock` (20 ms ticks from a wall-clock accumulator) and its `sfc32` PRNG with named streams, plus the renderer's sweep geometry.

**Tech Stack:** Node 22 LTS, pnpm 9.15.9, TypeScript 5.9.3 (`strict`), Vite 6.4.3, Vitest 3.2.7, Playwright 1.63.0 (smoke only), GitHub Actions.

**Spec:** `docs/DESIGN-BRIEF.md` (§3.3 tick model, §3.5 sweep geometry, §7 API names, §8 licence/NOTICES) and `docs/BUILD-PLAN.md` ("Monorepo layout", "Toolchain", "Stage 0", "First 3 days" S0.1–S0.8). Binding rulings: `../research/00-orchestrator-rulings.md` (R1, R6, R10, R11, R12).

## Global Constraints

- All paths in this plan are relative to the repo root `/Users/samhv/Desktop/Claude/projects/patient-monitor-engine/repo`. Run every command from there unless a step says otherwise.
- Licence: **MIT**, copyright line exactly `Copyright (c) 2026 Ali Mahdavi and contributors` (README decision, R12).
- Package names exactly: `@pme/engine-core`, `@pme/renderer`, `@pme/audio`, `@pme/controller`, `@pme/skins`, `@pme/validation`, and the demo app `@pme/demo` in `apps/demo/`. IIFE global exactly `PatientMonitor`; file exactly `packages/renderer/dist/patient-monitor.iife.js`.
- TypeScript `strict` + `noUncheckedIndexedAccess`, target ES2022. `erasableSyntaxOnly` is on: **no `enum`, no `namespace`, no constructor parameter properties** (write fields explicitly).
- Imports between local files use the explicit `.ts` extension (`import { Clock } from './clock/clock.ts'`).
- Runtime dependencies: **none** in this stage. Build-only dev dependencies are the five in the root `package.json`; each gets a `NOTICES.md` row (brief §8).
- Clean-room (brief §8, R6): do not open ECGSYN, NeuroKit2's ECGSYN port, the PhysioNet ECG/PPG arrhythmia simulator, the Python Anesthesia Simulator, Barry Robinson's monitor, or any unlicensed repo.
- Tick = 20 ms; frame clamp 250 ms; timeScale 0.25–4 (brief §3.3). Sweep x = `(simT · mm_s · px_mm) mod laneWidth`, never from frame counts (brief §3.5). Default calibration 96 px/in = 3.78 px/mm → 94.5 px/s at 25 mm/s.
- RNG streams exactly: `hrv`, `ectopy`, `conduction`, `artefact`, `noise`, `measurement`, `scenario`, `outcome`, each seeded from `hash(seed, name)` (brief §3.3).
- Commit after every task with a conventional-commit subject; every commit message ends with the line `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` (use a second `-m`).
- pnpm is invoked as `pnpm`. If it is not installed, run `corepack enable` once (Node 22 ships corepack); if that is not allowed, prefix every `pnpm` with `npx -y pnpm@9.15.9`.
- The Playwright browser CDN returns **HTTP 403 from Iran** ("not available in your location", seen 2026-09-24). Locally, run the smoke test against an installed Google Chrome with `PW_SYSTEM_CHROME=1`; the full Chromium + WebKit run happens in GitHub CI.

## File map (what this stage creates)

| Path | Responsibility |
|---|---|
| `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml` | Workspace, scripts (`typecheck`, `test`, `build`, `check-notices`, `test:e2e`), pinned dev tools |
| `tsconfig.base.json`, `vitest.workspace.ts`, `.gitignore` | Shared compiler settings; root Vitest entry; ignores |
| `packages/<name>/{package.json,tsconfig.json,vite.config.ts,src/index.ts,test/version.test.ts}` ×6 | Package skeletons (`version = '0.0.0'`) |
| `packages/renderer/vite.config.ts` | ESM + IIFE build (`PatientMonitor`) |
| `packages/renderer/src/calibration.ts` | Sweep geometry (`sweepX`, `sweepPxPerS`, `DEFAULT_PX_PER_MM`) |
| `packages/engine-core/src/rng/sfc32.ts` | sfc32 PRNG, named streams, plain-data state |
| `packages/engine-core/src/clock/clock.ts` | Fixed-step accumulator clock |
| `LICENSE`, `NOTICES.md` (rows), `README.md` (licence line) | Licence and provenance |
| `scripts/check-notices.ts` (+ test in `packages/validation/test/`) | Enforces `NOTICE-ID` headers |
| `.github/pull_request_template.md`, `.github/workflows/ci.yml` | PR template ("Sources consulted", "NOTICES rows added"); CI |
| `playwright.config.ts`, `apps/demo/e2e/iife-smoke.{html,e2e.ts}` | IIFE smoke test from `file://` |
| `apps/demo/{package.json,tsconfig.json,vite.config.ts,index.html,stage0.html,src/stage0.ts}` | Multi-page demo; Stage 0 sweep page |

---

### Task 1: Initial commit of the existing documents

**Files:**
- Commit (already present, untracked): `README.md`, `NOTICES.md`, `docs/DESIGN-BRIEF.md`, `docs/BUILD-PLAN.md`, `docs/plans/stage-0-scaffold.md`, `docs/plans/stage-1-ecg-vertical-slice.md`

**Interfaces:**
- Consumes: nothing.
- Produces: the first commit on `main`; every later task commits on top of it.

- [x] **Step 1: Confirm the repo state**

Run: `git status --short && git branch --show-current`
Expected: `?? NOTICES.md`, `?? README.md`, `?? docs/` and branch `main` ("No commits yet" if you run plain `git status`). If the branch is not `main`, run `git checkout -b main`.

- [x] **Step 2: Commit the documents**

```bash
git add README.md NOTICES.md docs/
git commit -m "docs: design brief, build plan, stage 0–1 task plans, NOTICES" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

- [x] **Step 3: Verify**

Run: `git log --oneline && git status --short`
Expected: one commit; clean working tree.

---

### Task 2: pnpm workspace and the seven package skeletons

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `vitest.workspace.ts`, `.gitignore`
- Create for each of `engine-core`, `renderer`, `audio`, `controller`, `skins`, `validation`: `packages/<name>/package.json`, `packages/<name>/tsconfig.json`, `packages/<name>/vite.config.ts`, `packages/<name>/src/index.ts`, `packages/<name>/test/version.test.ts`
- Create: `apps/demo/package.json`, `apps/demo/tsconfig.json`, `apps/demo/vite.config.ts`, `apps/demo/index.html`
- Create (generated): `pnpm-lock.yaml`

**Interfaces:**
- Consumes: nothing.
- Produces: every package exports `export const version = '0.0.0'`. Root scripts `pnpm typecheck` (= `pnpm -r typecheck`), `pnpm test` (= `pnpm -r test`), `pnpm build` (= `pnpm -r build`). Each package script: `typecheck` = `tsc -p tsconfig.json`, `test` = `vitest run --passWithNoTests`, `build` = `vite build`. `@pme/renderer`, `@pme/controller` and `@pme/validation` depend on `@pme/engine-core` (`workspace:*`).

- [x] **Step 1: Write the root files**

`package.json`:
```json
{
  "name": "pme-monorepo",
  "private": true,
  "type": "module",
  "packageManager": "pnpm@9.15.9",
  "engines": {
    "node": ">=22.12.0"
  },
  "scripts": {
    "typecheck": "pnpm -r typecheck",
    "test": "pnpm -r test",
    "build": "pnpm -r build",
    "check-notices": "node --experimental-strip-types scripts/check-notices.ts",
    "test:e2e": "playwright test"
  },
  "devDependencies": {
    "@playwright/test": "1.63.0",
    "@types/node": "22.20.4",
    "typescript": "5.9.3",
    "vite": "6.4.3",
    "vitest": "3.2.7"
  }
}
```

`pnpm-workspace.yaml`:
```yaml
packages:
  - 'packages/*'
  - 'apps/*'
```

`tsconfig.base.json` (note: `lib` is `ES2022` + `DOM` + `DOM.Iterable`; `WebWorker` is deliberately NOT listed because it conflicts with `DOM` in one program — the worker file in Stage 1 types `self` through a small local interface instead):
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "verbatimModuleSyntax": true,
    "erasableSyntaxOnly": true,
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "noEmit": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "types": []
  }
}
```

`vitest.workspace.ts`:
```ts
// Lets `pnpm exec vitest` at the repo root run every package's tests at once.
// CI uses `pnpm -r test` (one Vitest run per package) instead.
export default ['packages/*', 'apps/*'];
```

`.gitignore`:
```text
node_modules/
dist/
coverage/
.vite/
*.log
.DS_Store
playwright-report/
test-results/
packages/validation/datasets/cache/
```

- [x] **Step 2: Write the six package skeletons with one script**

Run this from the repo root (it writes 30 files; read it before running):

```bash
mk() { # $1 = package dir name, $2 = extra package.json text (dependencies block or empty)
mkdir -p packages/$1/src packages/$1/test
cat > packages/$1/package.json <<EOF
{
  "name": "@pme/$1",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "typecheck": "tsc -p tsconfig.json",
    "test": "vitest run --passWithNoTests",
    "build": "vite build"
  }$2
}
EOF
cat > packages/$1/tsconfig.json <<'EOF'
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "types": ["node"]
  },
  "include": ["src", "test", "vite.config.ts"]
}
EOF
cat > packages/$1/vite.config.ts <<'EOF'
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: { entry: 'src/index.ts', formats: ['es'], fileName: 'index' },
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
  },
});
EOF
cat > packages/$1/src/index.ts <<'EOF'
export const version = '0.0.0';
EOF
cat > packages/$1/test/version.test.ts <<EOF
import { describe, expect, it } from 'vitest';
import { version } from '../src/index.ts';

describe('@pme/$1', () => {
  it('exports its version', () => {
    expect(version).toBe('0.0.0');
  });
});
EOF
}
DEP=',
  "dependencies": {
    "@pme/engine-core": "workspace:*"
  }'
mk engine-core ""
mk renderer "$DEP"
mk audio ""
mk controller "$DEP"
mk skins ""
mk validation "$DEP"
```

- [x] **Step 3: Write the demo app skeleton**

`apps/demo/package.json`:
```json
{
  "name": "@pme/demo",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "typecheck": "tsc -p tsconfig.json",
    "test": "vitest run --passWithNoTests"
  },
  "dependencies": {
    "@pme/engine-core": "workspace:*",
    "@pme/renderer": "workspace:*"
  }
}
```

`apps/demo/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "types": ["node", "vite/client"]
  },
  "include": ["src", "e2e", "vite.config.ts"]
}
```

`apps/demo/vite.config.ts` (Stage 0 version; Task 10 adds `stage0`):
```ts
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// Multi-page demo: one page per stage (BUILD-PLAN "Monorepo layout").
const page = (name: string) => resolve(import.meta.dirname, `${name}.html`);

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: { index: page('index') },
    },
  },
});
```

`apps/demo/index.html` (Stage 0 version; Task 10 adds the link):
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Patient-monitor engine demos</title>
    <style>
      body { background: #000; color: #ddd; font: 16px system-ui, sans-serif; margin: 2rem; }
      a { color: #4f4; }
    </style>
  </head>
  <body>
    <h1>Patient-monitor engine demos</h1>
    <ul>
    </ul>
  </body>
</html>
```

- [x] **Step 4: Install and run the version tests (they must pass)**

Run: `pnpm install`
Expected: ends with `Done`, creates `pnpm-lock.yaml`, prints `+ typescript 5.9.3`, `+ vite 6.4.3`, `+ vitest 3.2.7`.

Run: `pnpm typecheck && pnpm test`
Expected: `Scope: 7 of 8 workspace projects`; every package `typecheck: Done`; six packages report `Tests  1 passed (1)`; `apps/demo` reports "No test files found, exiting with code 0".

- [x] **Step 5: Break one to prove the tests run**

Temporarily change `packages/skins/src/index.ts` to `export const version = '0.0.1';`, run `pnpm --filter @pme/skins test`, expect `FAIL ... expected '0.0.1' to be '0.0.0'`, then restore `'0.0.0'` and re-run to PASS.

- [x] **Step 6: Commit**

```bash
git add package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json vitest.workspace.ts .gitignore packages apps
git commit -m "build: pnpm workspace with seven package skeletons" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: Library builds and the renderer IIFE

**Files:**
- Modify: `packages/renderer/vite.config.ts` (replace whole file)
- Create: `packages/renderer/src/calibration.ts`, `packages/renderer/test/calibration.test.ts`
- Modify: `packages/renderer/src/index.ts`

**Interfaces:**
- Consumes: Task 2 skeleton.
- Produces: `pnpm build` writes `packages/<name>/dist/index.js` for every package and `packages/renderer/dist/patient-monitor.iife.js` defining the global `PatientMonitor` (= the renderer's exports). From `calibration.ts`: `DEFAULT_PX_PER_MM: number` (= 96/25.4), `SWEEP_SPEEDS_MM_S`, `type SweepSpeed`, `sweepPxPerS(mmPerS: number, pxPerMm?: number): number`, `sweepXUnwrapped(t: number, mmPerS: number, pxPerMm?: number): number`, `sweepX(t: number, mmPerS: number, pxPerMm: number, laneWidthPx: number): number`.

- [x] **Step 1: Write the failing test**

`packages/renderer/test/calibration.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { DEFAULT_PX_PER_MM, sweepPxPerS, sweepX } from '../src/calibration.ts';

describe('calibration', () => {
  it('25 mm/s at 3.78 px/mm is 94.5 CSS px/s', () => {
    expect(sweepPxPerS(25, 3.78)).toBeCloseTo(94.5, 9);
    expect(Math.abs(sweepPxPerS(25) - 94.5)).toBeLessThan(0.1);
    expect(DEFAULT_PX_PER_MM).toBeCloseTo(3.7795, 4);
  });

  it('x is a pure function of sim time and wraps at the lane width', () => {
    expect(sweepX(0, 25, 3.78, 1000)).toBe(0);
    expect(sweepX(1, 25, 3.78, 1000)).toBeCloseTo(94.5, 9);
    expect(sweepX(10, 25, 3.78, 1000)).toBeCloseTo(945, 9);
    expect(sweepX(11, 25, 3.78, 1000)).toBeCloseTo(39.5, 9);
  });
});
```

- [x] **Step 2: Run it to see it fail**

Run: `pnpm --filter @pme/renderer test`
Expected: FAIL — `Failed to load url ../src/calibration.ts` (or "Cannot find module").

- [x] **Step 3: Implement the sweep geometry**

`packages/renderer/src/calibration.ts`:
```ts
// Sweep geometry (brief §3.5). Lane x-position comes from sim time, never from frame counts:
//   x = (simT · mm_s · px_mm) mod laneWidth
// Default calibration: 96 CSS px per inch = 3.78 CSS px/mm [05 §3.1] until the user calibrates.

export const DEFAULT_PX_PER_MM = 96 / 25.4;
export const SWEEP_SPEEDS_MM_S = [6.25, 12.5, 25, 50] as const;
export type SweepSpeed = (typeof SWEEP_SPEEDS_MM_S)[number];

/** Trace speed in CSS px per sim second. 25 mm/s at 3.78 px/mm = 94.5 px/s. */
export function sweepPxPerS(mmPerS: number, pxPerMm: number = DEFAULT_PX_PER_MM): number {
  return mmPerS * pxPerMm;
}

/** Unwrapped x (CSS px) of sim time t. */
export function sweepXUnwrapped(t: number, mmPerS: number, pxPerMm: number = DEFAULT_PX_PER_MM): number {
  return t * mmPerS * pxPerMm;
}

/** Cursor x (CSS px) inside a lane of the given width. */
export function sweepX(t: number, mmPerS: number, pxPerMm: number, laneWidthPx: number): number {
  const x = sweepXUnwrapped(t, mmPerS, pxPerMm) % laneWidthPx;
  return x < 0 ? x + laneWidthPx : x;
}
```

`packages/renderer/src/index.ts`:
```ts
export const version = '0.0.0';
export * from './calibration.ts';
```

- [x] **Step 4: Run the tests**

Run: `pnpm --filter @pme/renderer test`
Expected: PASS, `Tests  3 passed (3)`.

- [x] **Step 5: Add the IIFE build**

Replace `packages/renderer/vite.config.ts`:
```ts
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'PatientMonitor', // IIFE global: window.PatientMonitor (brief §7.6)
      formats: ['es', 'iife'],
      fileName: (format) => (format === 'iife' ? 'patient-monitor.iife.js' : 'index.js'),
    },
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
  },
});
```

- [x] **Step 6: Build and check the IIFE in a bare JS context**

Run: `pnpm build`
Expected: every package prints `✓ built`; `packages/renderer/dist/` contains `index.js` and `patient-monitor.iife.js`.

Run:
```bash
node -e "const vm=require('vm');const fs=require('fs');const c={};vm.createContext(c);vm.runInContext(fs.readFileSync('packages/renderer/dist/patient-monitor.iife.js','utf8'),c);console.log('PatientMonitor.version =',c.PatientMonitor.version)"
```
Expected: `PatientMonitor.version = 0.0.0`

- [x] **Step 7: Commit**

```bash
git add packages/renderer
git commit -m "feat(renderer): sweep geometry and ESM+IIFE library build" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: `rng/` — sfc32 with named, independent streams

**Files:**
- Create: `packages/engine-core/src/rng/sfc32.ts`, `packages/engine-core/test/rng/sfc32.test.ts`
- Modify: `packages/engine-core/src/index.ts`

**Interfaces:**
- Consumes: nothing.
- Produces (all exported from `@pme/engine-core`):
  - `type StreamName = 'hrv'|'ectopy'|'conduction'|'artefact'|'noise'|'measurement'|'scenario'|'outcome'`; `STREAM_NAMES: readonly StreamName[]`
  - `type Sfc32State = [number, number, number, number]` (plain data, JSON-safe)
  - `hash53(str: string, salt?: number): [number, number]`
  - `sfc32Next(s: Sfc32State): number` (uint32, mutates `s`), `seedStream(seed: number, name: string): Sfc32State`
  - `uniform(s: Sfc32State): number` in [0,1); `normal(s: Sfc32State): number` (Box–Muller)
  - `class RandomStream { readonly state; nextU32(); next(); normal() }`
  - `interface Rng { readonly seed; stream(name: StreamName): RandomStream; getState(): Record<StreamName, Sfc32State> }`; `createRng(seed: number): Rng`
  - `createRngState(seed: number): Record<StreamName, Sfc32State>` — what the Stage 1 engine stores in its snapshot-able state.

- [x] **Step 1: Write the failing test**

`packages/engine-core/test/rng/sfc32.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { createRng, createRngState, normal, uniform } from '../../src/rng/sfc32.ts';

function draw(n: number, f: () => number): number[] {
  return Array.from({ length: n }, f);
}

describe('rng/sfc32', () => {
  it('reproduces every named stream from the seed', () => {
    const a = createRng(42);
    const b = createRng(42);
    for (const name of ['hrv', 'ectopy', 'conduction', 'noise'] as const) {
      expect(draw(1000, () => a.stream(name).nextU32())).toEqual(draw(1000, () => b.stream(name).nextU32()));
    }
  });

  it('gives different sequences for different seeds and different stream names', () => {
    const a = createRng(1);
    const b = createRng(2);
    expect(draw(10, () => a.stream('hrv').nextU32())).not.toEqual(draw(10, () => b.stream('hrv').nextU32()));
    const c = createRng(1);
    expect(draw(10, () => c.stream('hrv').nextU32())).not.toEqual(draw(10, () => c.stream('noise').nextU32()));
  });

  it('drawing from noise does not change the hrv sequence (stream independence)', () => {
    const quiet = createRng(7);
    const noisy = createRng(7);
    const ref = draw(500, () => quiet.stream('hrv').next());
    const got: number[] = [];
    for (let i = 0; i < 500; i++) {
      for (let k = 0; k < 13; k++) noisy.stream('noise').next();
      got.push(noisy.stream('hrv').next());
    }
    expect(got).toEqual(ref);
  });

  it('uniform() is in [0,1) with mean ~0.5; normal() has mean ~0 and SD ~1', () => {
    const s = createRngState(99).measurement;
    const u = draw(100_000, () => uniform(s));
    expect(Math.min(...u)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...u)).toBeLessThan(1);
    expect(u.reduce((p, x) => p + x, 0) / u.length).toBeCloseTo(0.5, 2);
    const z = draw(100_000, () => normal(s));
    const mean = z.reduce((p, x) => p + x, 0) / z.length;
    const sd = Math.sqrt(z.reduce((p, x) => p + (x - mean) ** 2, 0) / z.length);
    expect(Math.abs(mean)).toBeLessThan(0.02);
    expect(Math.abs(sd - 1)).toBeLessThan(0.02);
  });

  it('getState() is a plain JSON-safe copy', () => {
    const r = createRng(5);
    const st = r.getState();
    expect(JSON.parse(JSON.stringify(st))).toEqual(st);
    r.stream('hrv').next();
    expect(r.getState().hrv).not.toEqual(st.hrv);
  });
});
```

- [x] **Step 2: Run it to see it fail**

Run: `pnpm --filter @pme/engine-core test`
Expected: FAIL — cannot load `../../src/rng/sfc32.ts`.

- [x] **Step 3: Implement**

`packages/engine-core/src/rng/sfc32.ts`:
```ts
// sfc32 ("Small Fast Counting", Chris Doty-Humphrey, PractRand) — a public-domain 128-bit-state PRNG.
// Written from the algorithm description; no code copied. Brief §3.3: one stream per subsystem,
// each seeded from hash(seed, name), so drawing from one stream never shifts another.

/** The subsystem streams named in brief §3.3. */
export type StreamName =
  | 'hrv'
  | 'ectopy'
  | 'conduction'
  | 'artefact'
  | 'noise'
  | 'measurement'
  | 'scenario'
  | 'outcome';

export const STREAM_NAMES: readonly StreamName[] = [
  'hrv',
  'ectopy',
  'conduction',
  'artefact',
  'noise',
  'measurement',
  'scenario',
  'outcome',
];

/** Four uint32 words. Plain data so engine snapshots stay JSON-serialisable. */
export type Sfc32State = [number, number, number, number];

/** cyrb53-style string hash (public-domain construction), returning two independent 32-bit halves. */
export function hash53(str: string, salt = 0): [number, number] {
  let h1 = 0xdeadbeef ^ salt;
  let h2 = 0x41c6ce57 ^ salt;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return [h1 >>> 0, h2 >>> 0];
}

/** Advance the state in place and return the next uint32. */
export function sfc32Next(s: Sfc32State): number {
  const a = s[0];
  const b = s[1];
  const c = s[2];
  const d = s[3];
  const t = (((a + b) | 0) + d) | 0;
  s[3] = (d + 1) | 0;
  s[0] = b ^ (b >>> 9);
  s[1] = (c + (c << 3)) | 0;
  s[2] = (((c << 21) | (c >>> 11)) + t) | 0;
  return t >>> 0;
}

/** Seed one named stream from hash(seed, name), then discard 15 outputs to mix the state. */
export function seedStream(seed: number, name: string): Sfc32State {
  const [h1, h2] = hash53(`${seed >>> 0}:${name}`);
  const [h3, h4] = hash53(`${name}:${seed >>> 0}`, 0x9e3779b9);
  const s: Sfc32State = [h1, h2, h3, h4];
  for (let i = 0; i < 15; i++) sfc32Next(s);
  return s;
}

/** Uniform in [0, 1) with 32 bits of resolution. */
export function uniform(s: Sfc32State): number {
  return sfc32Next(s) / 4294967296;
}

/** Standard normal via Box–Muller (one value per call; the pair's second value is discarded). */
export function normal(s: Sfc32State): number {
  const u1 = (sfc32Next(s) + 1) / 4294967297; // (0, 1], never 0, so log() is finite
  const u2 = uniform(s);
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/** Convenience wrapper over one stream's state. */
export class RandomStream {
  readonly state: Sfc32State;
  constructor(state: Sfc32State) {
    this.state = state;
  }
  nextU32(): number {
    return sfc32Next(this.state);
  }
  next(): number {
    return uniform(this.state);
  }
  normal(): number {
    return normal(this.state);
  }
}

export interface Rng {
  readonly seed: number;
  stream(name: StreamName): RandomStream;
  /** Plain-data copy of every stream's state (for snapshots). */
  getState(): Record<StreamName, Sfc32State>;
}

export function createRng(seed: number): Rng {
  const s = seed >>> 0;
  const streams = new Map<StreamName, RandomStream>();
  for (const name of STREAM_NAMES) streams.set(name, new RandomStream(seedStream(s, name)));
  return {
    seed: s,
    stream(name) {
      const st = streams.get(name);
      if (!st) throw new Error(`unknown RNG stream: ${String(name)}`);
      return st;
    },
    getState() {
      const out = {} as Record<StreamName, Sfc32State>;
      for (const [name, st] of streams) out[name] = [...st.state] as Sfc32State;
      return out;
    },
  };
}

/** Fresh plain-data states for every stream (what the engine keeps in its snapshot-able state). */
export function createRngState(seed: number): Record<StreamName, Sfc32State> {
  const out = {} as Record<StreamName, Sfc32State>;
  for (const name of STREAM_NAMES) out[name] = seedStream(seed >>> 0, name);
  return out;
}
```

`packages/engine-core/src/index.ts`:
```ts
export const version = '0.0.0';
export * from './rng/sfc32.ts';
```

- [x] **Step 4: Run the tests**

Run: `pnpm --filter @pme/engine-core test && pnpm --filter @pme/engine-core typecheck`
Expected: PASS (`Tests  6 passed (6)` including the version test); typecheck clean.

- [x] **Step 5: Commit**

```bash
git add packages/engine-core
git commit -m "feat(engine-core): sfc32 PRNG with named independent streams" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: `clock/` — fixed 20 ms ticks from a wall-clock accumulator

**Files:**
- Create: `packages/engine-core/src/clock/clock.ts`, `packages/engine-core/test/clock/clock.test.ts`
- Modify: `packages/engine-core/src/index.ts`

**Interfaces:**
- Consumes: `createRng` (Task 4) in the test only.
- Produces (exported from `@pme/engine-core`): `TICK_MS = 20`, `TICK_S = 0.02`, `MAX_FRAME_MS = 250`, `MIN_TIME_SCALE = 0.25`, `MAX_TIME_SCALE = 4`, and
  `class Clock { readonly tickMs; get tick(): number; get simT(): number; get renderT(): number; get accumulatorMs(): number; get/set timeScale (RangeError outside 0.25–4); get paused(); advance(wallDeltaMs: number): number /* ticks to run now */; pause(); resume(); step(ticks?: number): number; setTick(tick: number): void }`.
  `renderT` = sim time including the un-ticked remainder — what a renderer draws (Stage 1 relies on it).

- [ ] **Step 1: Write the failing test (the randomised accumulator test first, BUILD-PLAN S0.4)**

`packages/engine-core/test/clock/clock.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { Clock, MAX_FRAME_MS, TICK_MS } from '../../src/clock/clock.ts';
import { createRng } from '../../src/rng/sfc32.ts';

describe('clock/Clock', () => {
  it('10,000 random 8–50 ms frames: ticks == floor(Σ(wallΔ·scale)/20 ms) and acc < 20 ms', () => {
    const rnd = createRng(2026).stream('scenario');
    const scales = [0.25, 0.5, 1, 2, 4];
    for (const scale of scales) {
      const clock = new Clock();
      clock.timeScale = scale;
      let sum = 0;
      let ticks = 0;
      for (let i = 0; i < 10_000; i++) {
        // Multiples of 1/16 ms are exact in float64, so the reference sum is exact too.
        const wallDelta = 8 + Math.floor(rnd.next() * 42 * 16) / 16;
        sum += wallDelta * scale;
        ticks += clock.advance(wallDelta);
        expect(clock.accumulatorMs).toBeGreaterThanOrEqual(0);
        expect(clock.accumulatorMs).toBeLessThan(TICK_MS);
      }
      expect(ticks).toBe(Math.floor(sum / TICK_MS));
      expect(clock.tick).toBe(ticks);
    }
  });

  it('clamps a 5 s frame to at most 250 ms × scale', () => {
    for (const scale of [0.25, 1, 4]) {
      const clock = new Clock();
      clock.timeScale = scale;
      const n = clock.advance(5000);
      expect(n * TICK_MS).toBeLessThanOrEqual(MAX_FRAME_MS * scale);
      expect(n).toBe(Math.floor((MAX_FRAME_MS * scale) / TICK_MS));
    }
  });

  it('simT and renderT follow the tick count and the accumulator', () => {
    const clock = new Clock();
    clock.advance(50);
    expect(clock.tick).toBe(2);
    expect(clock.simT).toBeCloseTo(0.04, 12);
    expect(clock.renderT).toBeCloseTo(0.05, 12);
  });

  it('pause stops time; step advances only while paused', () => {
    const clock = new Clock();
    expect(clock.step(3)).toBe(0);
    clock.pause();
    expect(clock.advance(100)).toBe(0);
    expect(clock.step(3)).toBe(3);
    expect(clock.tick).toBe(3);
    clock.resume();
    expect(clock.advance(40)).toBe(2);
  });

  it('rejects timeScale outside 0.25–4', () => {
    const clock = new Clock();
    expect(() => {
      clock.timeScale = 0.1;
    }).toThrow(RangeError);
    expect(() => {
      clock.timeScale = 5;
    }).toThrow(RangeError);
    clock.timeScale = 4;
    expect(clock.timeScale).toBe(4);
  });

  it('a 24 h run in 20 ms frames lands exactly on tick 4,320,000', () => {
    const clock = new Clock();
    for (let i = 0; i < 4_320_000; i++) clock.advance(20);
    expect(clock.tick).toBe(4_320_000);
    expect(clock.simT).toBe(86_400);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `pnpm --filter @pme/engine-core test`
Expected: FAIL — cannot load `../../src/clock/clock.ts`.

- [ ] **Step 3: Implement**

`packages/engine-core/src/clock/clock.ts`:
```ts
// Fixed-step simulation clock (brief §3.3; "Fix Your Timestep", Gaffer on Games).
// simT = tick × 20 ms. Frames feed wall time through an accumulator:
//   acc += min(wallΔ, 250 ms) × timeScale;  while (acc ≥ 20 ms) tick()
// The 250 ms clamp is [ENG]. timeScale is limited to 0.25–4 (brief §3.3).

export const TICK_MS = 20;
export const TICK_S = TICK_MS / 1000;
export const MAX_FRAME_MS = 250;
export const MIN_TIME_SCALE = 0.25;
export const MAX_TIME_SCALE = 4;

export class Clock {
  readonly tickMs = TICK_MS;
  private _tick = 0;
  private _accMs = 0;
  private _timeScale = 1;
  private _paused = false;

  /** Integer tick count since start. */
  get tick(): number {
    return this._tick;
  }
  /** Sim seconds at the last completed tick. */
  get simT(): number {
    return (this._tick * TICK_MS) / 1000;
  }
  /** Sim seconds including the not-yet-ticked remainder: the time a renderer should draw. */
  get renderT(): number {
    return (this._tick * TICK_MS + this._accMs) / 1000;
  }
  /** Accumulated sim milliseconds not yet turned into a tick (always < 20). */
  get accumulatorMs(): number {
    return this._accMs;
  }
  get timeScale(): number {
    return this._timeScale;
  }
  set timeScale(k: number) {
    if (!Number.isFinite(k) || k < MIN_TIME_SCALE || k > MAX_TIME_SCALE) {
      throw new RangeError(`timeScale must be in [${MIN_TIME_SCALE}, ${MAX_TIME_SCALE}], got ${k}`);
    }
    this._timeScale = k;
  }
  get paused(): boolean {
    return this._paused;
  }

  /** Feed one frame's wall-clock delta. Returns how many 20 ms ticks the caller must run now. */
  advance(wallDeltaMs: number): number {
    if (this._paused || !(wallDeltaMs > 0)) return 0;
    this._accMs += Math.min(wallDeltaMs, MAX_FRAME_MS) * this._timeScale;
    let n = 0;
    while (this._accMs >= TICK_MS) {
      this._accMs -= TICK_MS;
      n++;
    }
    this._tick += n;
    return n;
  }

  pause(): void {
    this._paused = true;
  }
  resume(): void {
    this._paused = false;
  }

  /** Single-step while paused. Returns the ticks to run (0 when not paused). */
  step(ticks = 1): number {
    if (!this._paused) return 0;
    const n = Math.max(0, Math.floor(ticks));
    this._tick += n;
    return n;
  }

  /** Jump to an absolute tick (used by snapshot restore). Clears the accumulator. */
  setTick(tick: number): void {
    this._tick = Math.max(0, Math.floor(tick));
    this._accMs = 0;
  }
}
```

`packages/engine-core/src/index.ts`:
```ts
export const version = '0.0.0';
export * from './clock/clock.ts';
export * from './rng/sfc32.ts';
```

- [ ] **Step 4: Run the tests**

Run: `pnpm --filter @pme/engine-core test && pnpm --filter @pme/engine-core typecheck`
Expected: PASS, `Tests  12 passed (12)`.

- [ ] **Step 5: Commit**

```bash
git add packages/engine-core
git commit -m "feat(engine-core): fixed-step clock with 250 ms clamp, time scale, pause and step" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6: LICENSE, NOTICES rows, README licence line, PR template

**Files:**
- Create: `LICENSE`, `.github/pull_request_template.md`
- Modify: `NOTICES.md` (append rows under the existing table header), `README.md` (licence line and status)

**Interfaces:**
- Consumes: the dev dependencies pinned in Task 2.
- Produces: NOTICES rows `N-001`…`N-005` (IDs that `check-notices` in Task 7 parses: a table row starting `| N-### |`). Later stages append `N-006` onward.

- [ ] **Step 1: Write `LICENSE`**

```text
MIT License

Copyright (c) 2026 Ali Mahdavi and contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

- [ ] **Step 2: Append the build-only dependency rows to `NOTICES.md`**

Append these lines directly under the existing `|---|---|---|---|---|---|` line (TypeScript and Playwright are Apache-2.0, not MIT as brief §8 says; they are build/test tools that are never redistributed, so no `LICENSES/` text is required — see the note row):

```markdown
| N-001 | Vite 6.4.3 (build only) | https://github.com/vitejs/vite | MIT | Library/app bundler; not redistributed | 2026-09-24 |
| N-002 | Vitest 3.2.7 (build only) | https://github.com/vitest-dev/vitest | MIT | Unit test runner; not redistributed | 2026-09-24 |
| N-003 | TypeScript 5.9.3 (build only) | https://github.com/microsoft/TypeScript | Apache-2.0 | Type checker; not redistributed, so no LICENSES/ text needed | 2026-09-24 |
| N-004 | @playwright/test 1.63.0 (test only) | https://github.com/microsoft/playwright | Apache-2.0 | Browser smoke tests; not redistributed | 2026-09-24 |
| N-005 | @types/node 22.20.4 (build only) | https://github.com/DefinitelyTyped/DefinitelyTyped | MIT | Node type definitions for tests and scripts | 2026-09-24 |
```

- [ ] **Step 3: Update `README.md`**

Replace the line `MIT (pending final confirmation). Every third-party item is listed in [NOTICES.md](NOTICES.md).` with:
```markdown
MIT (see [LICENSE](LICENSE)). Every third-party item is listed in [NOTICES.md](NOTICES.md).
```
Replace `**Status: design phase (2026-09-24).** There is no code yet.` with:
```markdown
**Status: Stage 0 (scaffold) — see [docs/plans/](docs/plans/).** Run `pnpm i && pnpm typecheck && pnpm test && pnpm build`.
```

- [ ] **Step 4: Write the PR template**

`.github/pull_request_template.md`:
```markdown
## What this PR does

<!-- One piece of work per PR. Name the stage and task(s), e.g. "Stage 1, Tasks 5–6". -->

## Sources consulted

<!-- Papers, manuals, datasets and web pages you read while writing this code (brief §8).
     Implementers must NOT open ECGSYN, NeuroKit2's ECGSYN port, the PhysioNet ECG/PPG arrhythmia
     simulator, the Python Anesthesia Simulator, Barry Robinson's monitor, or any unlicensed repo. -->

-

## NOTICES rows added

<!-- Every borrowed code file, data table, template or runtime/build dependency needs a NOTICES.md row
     in this same PR (brief §8). Write "none" if nothing was borrowed. -->

-

## Checks

- [ ] `pnpm typecheck && pnpm test && pnpm build && pnpm check-notices` pass locally
- [ ] Demo page for this stage runs
```

- [ ] **Step 5: Verify**

Run: `grep -c '^| N-00' NOTICES.md && head -3 LICENSE`
Expected: `5`, then `MIT License`, blank line, `Copyright (c) 2026 Ali Mahdavi and contributors`.

- [ ] **Step 6: Commit**

```bash
git add LICENSE NOTICES.md README.md .github/pull_request_template.md
git commit -m "chore: MIT licence, NOTICES rows for build tools, PR template" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 7: `check-notices` script

**Files:**
- Create: `scripts/check-notices.ts`, `packages/validation/test/check-notices.test.ts`

**Interfaces:**
- Consumes: `NOTICES.md` row format from Task 6.
- Produces: `governedFiles(root: string): string[]`, `noticeIds(noticesMd: string): Set<string>`, `checkNotices(root: string): string[]` (empty = pass). CLI: `pnpm check-notices` (= `node --experimental-strip-types scripts/check-notices.ts`) exits 1 and prints one line per problem. Governed files: `packages/*/src/vendor/**` and `packages/engine-core/templates/**`; each must carry `NOTICE-ID: N-###` on its FIRST line (any comment syntax; bytes are read as latin1 so binary files with an ASCII header work).

- [ ] **Step 1: Write the failing test**

`packages/validation/test/check-notices.test.ts`:
```ts
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkNotices, noticeIds } from '../../../scripts/check-notices.ts';

const NOTICES = `# NOTICES
| ID | Item | Source URL | Licence | How used | Added on |
|---|---|---|---|---|---|
| N-001 | vite | https://github.com/vitejs/vite | MIT | build only | 2026-09-24 |
| N-007 | vf template | https://physionet.org/content/cudb/1.0.0/ | ODC-By 1.0 | template | 2026-09-24 |
`;

function fixture(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'pme-notices-'));
  writeFileSync(join(root, 'NOTICES.md'), NOTICES);
  for (const [path, body] of Object.entries(files)) {
    const full = join(root, path);
    mkdirSync(join(full, '..'), { recursive: true });
    writeFileSync(full, body);
  }
  return root;
}

describe('scripts/check-notices', () => {
  it('parses the IDs of NOTICES.md rows', () => {
    expect([...noticeIds(NOTICES)]).toEqual(['N-001', 'N-007']);
  });

  it('passes with no governed files, or when every header matches a row', () => {
    expect(checkNotices(fixture({}))).toEqual([]);
    const root = fixture({
      'packages/engine-core/templates/vf-01.json': 'NOTICE-ID: N-007\n{"fs":500}',
      'packages/renderer/src/vendor/thing.ts': '// NOTICE-ID: N-001\nexport {};',
    });
    expect(checkNotices(root)).toEqual([]);
  });

  it('fails when a header is missing or names an unknown ID', () => {
    const root = fixture({
      'packages/engine-core/templates/vf-02.json': '{"fs":500}',
      'packages/audio/src/vendor/x.ts': '// NOTICE-ID: N-999\n',
    });
    const problems = checkNotices(root);
    expect(problems).toHaveLength(2);
    expect(problems.join('\n')).toContain('vf-02.json: first line has no');
    expect(problems.join('\n')).toContain('N-999 is not a row');
  });

  it('ignores files outside the governed folders', () => {
    expect(checkNotices(fixture({ 'packages/audio/src/tones.ts': 'export {};' }))).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `pnpm --filter @pme/validation test`
Expected: FAIL — cannot load `../../../scripts/check-notices.ts`.

- [ ] **Step 3: Implement**

`scripts/check-notices.ts`:
```ts
// Enforces the NOTICES rule (brief §8): every file under packages/*/src/vendor/** and
// packages/engine-core/templates/** must start with a `NOTICE-ID: N-###` header whose ID is a row in NOTICES.md.
// Usage: node --experimental-strip-types scripts/check-notices.ts [repoRoot]   (exit 1 on any problem)
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const HEADER_BYTES = 512;
const HEADER_RE = /NOTICE-ID:\s*(N-\d{3})/;
const ROW_RE = /^\|\s*(N-\d{3})\s*\|/gm;

function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

/** Files that must carry a NOTICE-ID header. */
export function governedFiles(root: string): string[] {
  const files: string[] = [];
  const pkgs = join(root, 'packages');
  if (existsSync(pkgs)) {
    for (const pkg of readdirSync(pkgs)) files.push(...walk(join(pkgs, pkg, 'src', 'vendor')));
  }
  files.push(...walk(join(root, 'packages', 'engine-core', 'templates')));
  return files.sort();
}

/** IDs listed as table rows in NOTICES.md. */
export function noticeIds(noticesMd: string): Set<string> {
  return new Set([...noticesMd.matchAll(ROW_RE)].map((m) => m[1] as string));
}

/** Returns a list of human-readable problems; an empty list means the check passes. */
export function checkNotices(root: string): string[] {
  const problems: string[] = [];
  const noticesPath = join(root, 'NOTICES.md');
  if (!existsSync(noticesPath)) return ['NOTICES.md is missing'];
  const md = readFileSync(noticesPath, 'utf8');
  const ids = noticeIds(md);
  const all = [...md.matchAll(ROW_RE)].map((m) => m[1] as string);
  const dupes = all.filter((id, i) => all.indexOf(id) !== i);
  for (const d of new Set(dupes)) problems.push(`NOTICES.md: duplicate row ${d}`);
  for (const file of governedFiles(root)) {
    const head = readFileSync(file).subarray(0, HEADER_BYTES).toString('latin1');
    const firstLine = head.split(/\r?\n/, 1)[0] ?? '';
    const m = HEADER_RE.exec(firstLine);
    const rel = relative(root, file);
    if (!m) problems.push(`${rel}: first line has no "NOTICE-ID: N-###" header`);
    else if (!ids.has(m[1] as string)) problems.push(`${rel}: ${m[1]} is not a row in NOTICES.md`);
  }
  return problems;
}

const invokedDirectly = process.argv[1] !== undefined && resolve(process.argv[1]) === resolve(import.meta.filename);
if (invokedDirectly) {
  const root = resolve(process.argv[2] ?? '.');
  const problems = checkNotices(root);
  if (problems.length > 0) {
    for (const p of problems) console.error(`check-notices: ${p}`);
    process.exit(1);
  }
  console.log(`check-notices: OK (${governedFiles(root).length} governed files)`);
}
```

- [ ] **Step 4: Run the tests and the CLI**

Run: `pnpm --filter @pme/validation test && pnpm --filter @pme/validation typecheck`
Expected: PASS, `Tests  5 passed (5)`.

Run: `pnpm check-notices`
Expected: `check-notices: OK (0 governed files)`, exit 0.

Negative check: `mkdir -p packages/engine-core/templates && echo 'x' > packages/engine-core/templates/tmp.bin && pnpm check-notices; echo "exit $?"` → prints `check-notices: packages/engine-core/templates/tmp.bin: first line has no "NOTICE-ID: N-###" header` and `exit 1`. Then `rm -r packages/engine-core/templates`.

- [ ] **Step 5: Commit**

```bash
git add scripts packages/validation/test/check-notices.test.ts
git commit -m "feat(tooling): check-notices enforces NOTICE-ID headers against NOTICES.md" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 8: IIFE smoke test (Playwright, `file://`, Chromium + WebKit)

**Files:**
- Create: `playwright.config.ts`, `apps/demo/e2e/iife-smoke.html`, `apps/demo/e2e/iife-smoke.e2e.ts`

**Interfaces:**
- Consumes: `packages/renderer/dist/patient-monitor.iife.js` (Task 3; run `pnpm build` first).
- Produces: `pnpm test:e2e` (projects `chromium` and `webkit`; with `PW_SYSTEM_CHROME=1`, one project `chrome` using the installed Google Chrome). E2E files end in `.e2e.ts` so Vitest never picks them up.

- [ ] **Step 1: Write the smoke page and the test**

`apps/demo/e2e/iife-smoke.html`:
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>IIFE smoke</title>
  </head>
  <body>
    <div id="pm" style="height: 300px"></div>
    <!-- Loaded from file:// on purpose: the IIFE must work without a server (brief §7.6). -->
    <script src="../../../packages/renderer/dist/patient-monitor.iife.js"></script>
  </body>
</html>
```

`apps/demo/e2e/iife-smoke.e2e.ts`:
```ts
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, test } from '@playwright/test';

const smokeUrl = pathToFileURL(resolve(import.meta.dirname, 'iife-smoke.html')).href;

test('the IIFE loads from file:// and exposes window.PatientMonitor.version', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(smokeUrl);
  const version = await page.evaluate(
    () => (window as unknown as { PatientMonitor?: { version?: string } }).PatientMonitor?.version,
  );
  expect(version).toBe('0.0.0');
  expect(errors).toEqual([]);
});
```

- [ ] **Step 2: Write the Playwright config**

`playwright.config.ts`:
```ts
import { defineConfig, devices } from '@playwright/test';

// Browser smoke checks only (BUILD-PLAN "Toolchain"). Unit tests stay in Vitest.
export default defineConfig({
  testDir: 'apps/demo/e2e',
  testMatch: '*.e2e.ts',
  reporter: 'list',
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
```

- [ ] **Step 3: Run it red first**

Run: `rm -rf packages/renderer/dist && PW_SYSTEM_CHROME=1 pnpm test:e2e`
Expected: FAIL — `expected undefined to be '0.0.0'` (the IIFE file is missing). If Playwright says Chrome is not installed, skip the local run (note it in the commit body) and rely on CI.

- [ ] **Step 4: Build and run green**

Run: `pnpm build && PW_SYSTEM_CHROME=1 pnpm test:e2e`
Expected: `1 passed`. (Anywhere the CDN is reachable: `pnpm exec playwright install chromium webkit && pnpm test:e2e` → `2 passed`.)

- [ ] **Step 5: Commit**

```bash
git add playwright.config.ts apps/demo/e2e
git commit -m "test(e2e): IIFE loads from file:// and exposes PatientMonitor.version" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 9: CI workflow

**Files:**
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: root scripts (Tasks 2, 7, 8) and the committed `pnpm-lock.yaml`.
- Produces: GitHub Actions job `build`: install (frozen lockfile) → typecheck → test → build → check-notices → Playwright Chromium + WebKit smoke → upload artefact `patient-monitor-iife`.

- [ ] **Step 1: Write the workflow**

`.github/workflows/ci.yml`:
```yaml
name: ci

on:
  push:
    branches: [main]
  pull_request:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4 # version comes from "packageManager" in package.json
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck
      - run: pnpm test
      - run: pnpm build
      - run: pnpm check-notices
      - run: pnpm exec playwright install --with-deps chromium webkit
      - run: pnpm test:e2e
      - uses: actions/upload-artifact@v4
        with:
          name: patient-monitor-iife
          path: packages/renderer/dist/patient-monitor.iife.js
          if-no-files-found: error
```

- [ ] **Step 2: Rehearse CI locally from a clean clone**

```bash
rm -rf /tmp/pme-ci && git clone "$(pwd)" /tmp/pme-ci && cd /tmp/pme-ci \
  && pnpm install --frozen-lockfile && pnpm typecheck && pnpm test && pnpm build && pnpm check-notices; echo "exit $?"; cd -
```
Expected: `exit 0`. (The clone contains only committed files, so this also proves nothing needed is git-ignored or uncommitted. Commit the workflow first if you want it in the clone; it is not needed for the rehearsal.)

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: typecheck, test, build, check-notices, IIFE smoke, upload IIFE artefact" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

- [ ] **Step 4: (If a GitHub remote exists) push a branch and open a PR — never push to `main` directly**

Only if `git remote -v` shows a remote: `git push -u origin HEAD:stage-0` and open a PR; confirm the `build` job is green and the `patient-monitor-iife` artefact is attached. If there is no remote, record "CI not yet run on GitHub" for the gate.

---

### Task 10: `stage0.html` — sim-time sweep cursor demo

**Files:**
- Create: `apps/demo/stage0.html`, `apps/demo/src/stage0.ts`
- Modify: `apps/demo/vite.config.ts`, `apps/demo/index.html`

**Interfaces:**
- Consumes: `Clock` (Task 5) from `@pme/engine-core`; `DEFAULT_PX_PER_MM`, `sweepPxPerS`, `sweepX` (Task 3) from `@pme/renderer`.
- Produces: page `stage0.html`: 1000 CSS px black lane, green cursor at `x = sweepX(clock.renderT, 25, DEFAULT_PX_PER_MM, 1000)`, buttons 0.25×/1×/4×, Pause, "30 fps throttle"; readout of `simT`, tick, scale, the expected 94.49 px/s and the measured px/s per sim second from the wall time of the last full lap.

- [ ] **Step 1: Write the page**

`apps/demo/stage0.html`:
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Stage 0: sim-time sweep</title>
    <style>
      body { background: #000; color: #ddd; font: 14px system-ui, sans-serif; margin: 16px; }
      canvas { display: block; background: #000; border: 1px solid #333; }
      button { font: inherit; margin-right: 6px; }
      button[aria-pressed='true'] { background: #2a2; color: #000; }
      #readout { font: 16px ui-monospace, monospace; margin-top: 10px; white-space: pre; }
    </style>
  </head>
  <body>
    <h1>Stage 0: sim-time sweep cursor (25 mm/s)</h1>
    <canvas id="lane"></canvas>
    <p>
      <button data-scale="0.25">0.25×</button>
      <button data-scale="1" aria-pressed="true">1×</button>
      <button data-scale="4">4×</button>
      <button id="pause">Pause</button>
      <button id="fps30" aria-pressed="false">30 fps throttle</button>
    </p>
    <div id="readout"></div>
    <p>
      Stopwatch check: at 1× the cursor moves 94.5 CSS px/s (25 mm/s at 3.78 px/mm). One full 1000 px lane
      takes 10.58 s. Tick marks are 1 s (25 mm) apart.
    </p>
    <script type="module" src="./src/stage0.ts"></script>
  </body>
</html>
```

`apps/demo/src/stage0.ts`:
```ts
import { Clock } from '@pme/engine-core';
import { DEFAULT_PX_PER_MM, sweepPxPerS, sweepX } from '@pme/renderer';

const LANE_W = 1000; // CSS px
const LANE_H = 120;
const MM_PER_S = 25;

const canvas = document.getElementById('lane') as HTMLCanvasElement;
const readout = document.getElementById('readout') as HTMLDivElement;
const dpr = window.devicePixelRatio || 1;
canvas.style.width = `${LANE_W}px`;
canvas.style.height = `${LANE_H}px`;
canvas.width = Math.round(LANE_W * dpr);
canvas.height = Math.round(LANE_H * dpr);
const ctx = canvas.getContext('2d', { alpha: false }) as CanvasRenderingContext2D;
ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

const clock = new Clock();
const pxPerS = sweepPxPerS(MM_PER_S, DEFAULT_PX_PER_MM);
let throttle30 = false;
let frameParity = 0;
let lastWall: number | null = null;
let lastWrapWall: number | null = null;
let lastLapS: number | null = null;
let prevX = 0;

function drawStatic(): void {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, LANE_W, LANE_H);
  ctx.fillStyle = '#555';
  for (let s = 0; s * pxPerS < LANE_W; s++) ctx.fillRect(Math.round(s * pxPerS), LANE_H - 12, 1, 12);
}

function frame(now: number): void {
  requestAnimationFrame(frame);
  if (throttle30 && frameParity++ % 2 === 1) return; // skip every other rAF; wall Δ still counts
  const dt = lastWall === null ? 0 : now - lastWall;
  lastWall = now;
  clock.advance(dt);
  const t = clock.renderT;
  const x = sweepX(t, MM_PER_S, DEFAULT_PX_PER_MM, LANE_W);
  if (x < prevX) {
    if (lastWrapWall !== null) lastLapS = (now - lastWrapWall) / 1000;
    lastWrapWall = now;
  }
  prevX = x;
  drawStatic();
  ctx.fillStyle = '#3f3';
  ctx.fillRect(Math.floor(x), 0, 2, LANE_H - 14);
  const measured = lastLapS === null ? '…' : `${(LANE_W / lastLapS / clock.timeScale).toFixed(2)} px/s per sim s`;
  readout.textContent =
    `simT ${t.toFixed(3)} s   tick ${clock.tick}   scale ${clock.timeScale}×   ` +
    `${throttle30 ? '30' : '60'} fps mode\n` +
    `expected ${pxPerS.toFixed(2)} px/s   last lap ${lastLapS === null ? '…' : lastLapS.toFixed(2) + ' s wall'}   measured ${measured}`;
}

for (const b of document.querySelectorAll<HTMLButtonElement>('button[data-scale]')) {
  b.addEventListener('click', () => {
    clock.timeScale = Number(b.dataset.scale);
    for (const o of document.querySelectorAll('button[data-scale]')) o.setAttribute('aria-pressed', String(o === b));
    lastWrapWall = null;
    lastLapS = null;
  });
}
const pauseBtn = document.getElementById('pause') as HTMLButtonElement;
pauseBtn.addEventListener('click', () => {
  if (clock.paused) clock.resume();
  else clock.pause();
  pauseBtn.textContent = clock.paused ? 'Resume' : 'Pause';
  lastWrapWall = null;
});
const fpsBtn = document.getElementById('fps30') as HTMLButtonElement;
fpsBtn.addEventListener('click', () => {
  throttle30 = !throttle30;
  fpsBtn.setAttribute('aria-pressed', String(throttle30));
});

drawStatic();
requestAnimationFrame(frame);
```

- [ ] **Step 2: Register the page**

`apps/demo/vite.config.ts` — change the `input` line to:
```ts
      input: { index: page('index'), stage0: page('stage0') },
```
`apps/demo/index.html` — inside `<ul>` add:
```html
      <li><a href="./stage0.html">Stage 0: sim-time sweep cursor</a></li>
```

- [ ] **Step 3: Type-check and build**

Run: `pnpm typecheck && pnpm build`
Expected: clean; `apps/demo build: dist/stage0.html`.

- [ ] **Step 4: Run it**

Run: `pnpm --filter @pme/demo dev` and open the printed URL + `/stage0.html`.
Expected: the cursor sweeps left→right and wraps; after the first full lap the readout shows `measured 94.4x–94.5x px/s per sim s`; at 4× the cursor is 4× faster and "measured" still reads ≈94.5 per sim s; Pause freezes `simT`; with "30 fps throttle" on, the measured speed is unchanged.

- [ ] **Step 5: Commit**

```bash
git add apps/demo
git commit -m "feat(demo): stage0 sim-time sweep cursor with scale, pause and 30 fps modes" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 11: Gate 0 verification (manual, with evidence)

**Files:**
- Create: `docs/gates/stage-0.md`

**Interfaces:**
- Consumes: everything above.
- Produces: the gate note the orchestrator reads (BUILD-PLAN "Definition of done" item 1).

- [ ] **Step 1: Full local run from a clean clone** — repeat Task 9 Step 2; record the exit code.

- [ ] **Step 2: Stopwatch check at 60 fps.** In Chrome, open `stage0.html` at 1×. Start a phone stopwatch when the cursor passes x = 0 and stop it after 10.0 s; the cursor must be 945 px ± 5% (898–992 px) from the left edge — use the 1 s tick marks (94.5 px apart): it must be between the 9th and the 11th mark. Also read "last lap" (expected 10.58 s ± 5%).

- [ ] **Step 3: Same check with "30 fps throttle" on.** Same tolerance. Record both "measured" values.

- [ ] **Step 4: IIFE from `file://` in Safari and Chrome.** Open `apps/demo/e2e/iife-smoke.html` by double-clicking it (after `pnpm build`). In each browser's console run `PatientMonitor.version` → `'0.0.0'`, and confirm no console errors.

- [ ] **Step 5: Write `docs/gates/stage-0.md`**

```markdown
# Gate 0 — Scaffold (date: YYYY-MM-DD)

Gate question: "Does CI go green from a clean clone, does the IIFE load from file:// in Safari and Chrome, and is sweep speed unchanged at 30 fps?"

| Check | Result |
|---|---|
| Clean clone: install, typecheck, test, build, check-notices | exit code: |
| GitHub CI run (URL or "no remote yet") | |
| Clock tests (10,000 random frames; clamp; pause/step) | |
| RNG tests (reproducible; hrv independent of noise) | |
| Stopwatch 10 s at 60 fps: cursor distance (px) / last lap (s) | |
| Stopwatch 10 s at 30 fps: cursor distance (px) / last lap (s) | |
| IIFE from file:// — Chrome: `PatientMonitor.version` | |
| IIFE from file:// — Safari: `PatientMonitor.version` | |
| Playwright smoke (local system Chrome / CI Chromium+WebKit) | |

Notes:
```
Fill every cell with the observed value.

- [ ] **Step 6: Commit**

```bash
git add docs/gates/stage-0.md
git commit -m "docs(gates): stage 0 gate evidence" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

Stop here. Stage 1 starts only after the orchestrator answers "yes" to the gate question (R11).
