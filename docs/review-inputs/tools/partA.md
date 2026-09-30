### Task A1: E1 — an MH-susceptible patient given its triggers develops MH (7f publishes the exposure, 7e owns the MH state; PROTOTYPED)

**Files:**
- Modify: `packages/engine-core/src/l2/neuro/pipeline.ts` (**E-FU10-1**: `NeuroState.mhExposure`, the two trigger sites)
- Modify: `packages/engine-core/src/l2/thermal/{params,mh}.ts` (the latencies; `MhExposure`, `mhOnsetT`, `mhFromExposure`)
- Modify: `packages/engine-core/src/l2/endo/pipeline.ts` (`mhAuto`; the per-pass step)
- Modify: `packages/engine-core/test/l2/neuro/pipeline.test.ts` (the 7f mark test also asserts the exposure)
- Create: `packages/engine-core/test/helpers/fu10.ts`, `packages/engine-core/test/l2/thermal/fu10-mh-exposure.test.ts`,
  `packages/engine-core/test/engine/fu10-mh-trigger.test.ts` (SLOW → `SLOW` + `SLOW_A`)
- Modify: `packages/engine-core/vite.config.ts` (one `SLOW`/`SLOW_A` entry)
- **Overlap:** FU-6 Task 4/10 and FU-7 Tasks 5–7, 14 edit `l2/neuro/pipeline.ts` — their blocks are `IDLE_RESP`, the
  `neuroResp({…})` call, the `depth({…})` call, `NeuroEnv` and `ec50Multipliers`; this task touches `NeuroState`'s field
  list and the two `mhSusceptible` blocks, which no other plan quotes (checked in both plans).

**Why (research/14 E1, ET-10a WR):** 7f marks `mhTrigger` at the succinylcholine dose (`neuro/pipeline.ts:170–180`) and
at MAC > 0.1 (`:206–210`) and **nothing reads the mark**; Stage 3's `rs.temp.mh` is created only by the instructor's
`condition mh` (`resp/pipeline.ts:691–695`). Measured on main: the susceptible patient given suxamethonium 1.5 mg/kg and
sevoflurane 2 % keeps EtCO₂ 29–30 and MH activity 0 for 90 minutes — the whole "trigger-agent" teaching case cannot run.

**Mechanism (D1–D3):** 7f publishes WHEN each trigger first reached a susceptible patient
(`ps.neuro.mhExposure = { sux?, volatile? }`); 7e's per-pass step turns the earliest exposure plus its latency into the
same `rs.temp.mh = { severity, t0 }` the instructor creates, records that the triggers made it (`mhAuto`), and never
overrides or restarts an instructor's MH.

**Measured (prototype):** EtCO₂ doubles **+14.3 min** after the triggers (band 10–30 min), MH activity 1 at +40 min,
core 41.8 °C; a volatile alone starts at **+23.5 min**; a patient who is not susceptible stays at activity 0. Stage 3's
instructor MH, its dantrolene course and FU-4's hyperthermic arrest are untouched (they share the same state and ramp).
**FU-4 check:** ET-10b–g, ET-11a–c and ET-M2 bit-identical (the state is the same object; nothing in the ramp moved).

- [ ] **Step — the edits** (each find matches exactly once in application order; the chained ones are
  marked "(chained on <task>)" and match once in the applied state):

In `packages/engine-core/src/l2/neuro/pipeline.ts`, find:

```ts
  emgBase: number | null; // ECG EMG artefact before fasciculations (engine)
```

Replace with:

```ts
  emgBase: number | null; // ECG EMG artefact before fasciculations (engine)
  /** FU-10 E1: when an MH-susceptible patient was first exposed to each trigger (s) — read by Stage 7e, which owns MH
   * (R51 §6) and turns the exposure into the MH state with the trigger's onset latency. Absent = never exposed. */
  mhExposure?: { sux?: number; volatile?: number };
```

In `packages/engine-core/src/l2/neuro/pipeline.ts`, find:

```ts
    if (ns.profile.mhSusceptible && !ns.flags.mhMarked) {
      mark(ns, d.t, 'mhTrigger');
      ns.flags.mhMarked = true;
    }```

Replace with:

```ts
    if (ns.profile.mhSusceptible) {
      ns.mhExposure = { ...ns.mhExposure, sux: ns.mhExposure?.sux ?? d.t }; // FU-10 E1: 7e reads it
      if (!ns.flags.mhMarked) {
        mark(ns, d.t, 'mhTrigger');
        ns.flags.mhMarked = true;
      }
    }```

In `packages/engine-core/src/l2/neuro/pipeline.ts`, find:

```ts
  if (ns.profile.mhSusceptible && !ns.flags.mhMarked && x.macPotent > MH_VOLATILE_MAC) {
    mark(ns, t, 'mhTrigger');
    ns.flags.mhMarked = true;
  }```

Replace with:

```ts
  if (ns.profile.mhSusceptible && x.macPotent > MH_VOLATILE_MAC && ns.mhExposure?.volatile === undefined) {
    ns.mhExposure = { ...ns.mhExposure, volatile: t }; // FU-10 E1: 7e reads it
    if (!ns.flags.mhMarked) {
      mark(ns, t, 'mhTrigger');
      ns.flags.mhMarked = true;
    }
  }```

In `packages/engine-core/src/l2/thermal/params.ts`, find:

```ts
export const DANT_GAIN = 1.6;
```

Replace with:

```ts
export const DANT_GAIN = 1.6;
/**
 * FU-10 E1 — MH from its triggers in a susceptible patient (7f publishes the exposure times; the MH state is 7e's).
 * Onset latency after each trigger: succinylcholine starts the hypermetabolism at once (the Stage 3 ramp then reaches
 * full activity over MH_ONSET_S, so EtCO2 doubles ≈ 14 min after the dose); a volatile alone starts it later. Direction:
 * Visoiu M, Young MC, Wieland K, Brandom BW, Anesth Analg 2014;118:388–396 (North American MH Registry, 477 cases: onset
 * is shorter after succinylcholine with every volatile; without succinylcholine sevoflurane is faster than isoflurane or
 * desflurane); Larach MG et al., Anesth Analg 2010;110:498–507 (clinical presentation) [VERIFY the medians]. Magnitudes
 * [ENG]: 0 s with succinylcholine; 20 min for a volatile alone (inside the ET report's 10–60 min). Severity 1 = the
 * fulminant course of the instructor's `condition mh 1` (Ali Q2: fixed vs a seeded draw; fulminant vs abortive).
 */
export const MH_SUX_LATENCY_S = 0;
export const MH_VOLATILE_LATENCY_S = 1200;
export const MH_PROFILE_SEVERITY = 1;
```

In `packages/engine-core/src/l2/thermal/mh.ts`, find:

```ts
import { DANT_GAIN, MH_ONSET_S, MH_RELAX_TAU_S } from './params.ts';
```

Replace with:

```ts
import { DANT_GAIN, MH_ONSET_S, MH_PROFILE_SEVERITY, MH_RELAX_TAU_S, MH_SUX_LATENCY_S, MH_VOLATILE_LATENCY_S } from './params.ts';
```

In `packages/engine-core/src/l2/thermal/mh.ts`, find:

```ts
/** 1 Hz (or any dt ≤ 1 s) update```

Replace with:

```ts
/** FU-10 E1: an MH-susceptible patient's trigger exposure (7f `ps.neuro.mhExposure`, times in s). */
export interface MhExposure {
  sux?: number;
  volatile?: number;
}

/** FU-10 E1: the MH onset time the exposure implies (the earliest trigger + its latency), or null (not exposed). */
export function mhOnsetT(x: MhExposure | undefined): number | null {
  const ts = [x?.sux !== undefined ? x.sux + MH_SUX_LATENCY_S : Infinity, x?.volatile !== undefined ? x.volatile + MH_VOLATILE_LATENCY_S : Infinity];
  const t0 = Math.min(...ts);
  return Number.isFinite(t0) ? t0 : null;
}

/**
 * FU-10 E1: start (or bring forward) the MH of a susceptible patient from its triggers. `owned` = the triggers already
 * started it (not the instructor's `condition mh`): until its onset a later, faster trigger may bring it forward; an
 * instructor's MH is never overridden, and an MH the instructor cleared (`condition mh 0`) is not restarted.
 */
export function mhFromExposure(mh: MhState | null, x: MhExposure | undefined, owned: boolean, t: number): { mh: MhState | null; owned: boolean } {
  const t0 = mhOnsetT(x);
  if (t0 === null) return { mh, owned };
  if (mh === null && !owned) return { mh: { severity: MH_PROFILE_SEVERITY, t0 }, owned: true };
  if (mh !== null && owned && t < mh.t0 && t0 < mh.t0) return { mh: { ...mh, t0 }, owned };
  return { mh, owned };
}

/** 1 Hz (or any dt ≤ 1 s) update```

In `packages/engine-core/src/l2/endo/pipeline.ts`, find:

```ts
import { cascade, thermalMetabolic, type Cascade } from '../thermal/metabolic.ts';
```

Replace with:

```ts
import { cascade, thermalMetabolic, type Cascade } from '../thermal/metabolic.ts';
import { mhFromExposure, type MhExposure } from '../thermal/mh.ts';
```

In `packages/engine-core/src/l2/endo/pipeline.ts`, find:

```ts
  cascade: Cascade; // cascade(th) at the last 1 Hz step: 7f reads endo.cascade.macF (R-7f-8)
```

Replace with:

```ts
  cascade: Cascade; // cascade(th) at the last 1 Hz step: 7f reads endo.cascade.macF (R-7f-8)
  mhAuto?: boolean; // FU-10 E1: the MH state was started by the patient's triggers (absent = not yet)
```

In `packages/engine-core/src/l2/endo/pipeline.ts`, find:

```ts
  th.dantE = pk?.bus?.metabolic?.dantroleneE ?? 0; // Stage 7g's dantrolene effect → the MH suppression (thermal/mh.ts)
```

Replace with:

```ts
  th.dantE = pk?.bus?.metabolic?.dantroleneE ?? 0; // Stage 7g's dantrolene effect → the MH suppression (thermal/mh.ts)
  // FU-10 E1: an MH-susceptible patient's triggers (7f's exposure times) start the MH state 7e owns (R51 §6)
  const mhx = (ctx.ps as { neuro?: { mhExposure?: MhExposure } }).neuro?.mhExposure;
  if (mhx) {
    const r = mhFromExposure(th.mh, mhx, es.mhAuto === true, tEnd);
    th.mh = r.mh;
    es.mhAuto = r.owned;
  }
```

In `packages/engine-core/test/l2/neuro/pipeline.test.ts`, find:

```ts
    expect(kinds(ns).filter((k) => k === 'mhTrigger')).toHaveLength(1);
```

Replace with:

```ts
    expect(kinds(ns).filter((k) => k === 'mhTrigger')).toHaveLength(1);
    expect(ns.mhExposure).toEqual({ sux: 0 }); // FU-10 E1: the exposure time 7e turns into MH
```

- [ ] **Step — the tests.** Create `packages/engine-core/test/helpers/fu10.ts` (the ET rigs through the real engine;
  MODELED, seed 7, yields once per sim-minute — the file is in the prototype patch, `scratch/plans-backup/fu-10-prototype.patch`),
  `test/l2/thermal/fu10-mh-exposure.test.ts` (`mhOnsetT` and `mhFromExposure`: the earliest trigger plus its latency; a
  later suxamethonium brings a pending volatile onset forward; an instructor MH is kept and a cleared one is not
  restarted) and `test/engine/fu10-mh-trigger.test.ts` (the two engine arms above, with the measured numbers in the
  titles). Add the engine file to `SLOW` and `SLOW_A` in `packages/engine-core/vite.config.ts`.
- [ ] **Step — run.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/thermal test/l2/neuro test/l2/endo test/engine/fu10-mh-trigger.test.ts`
  → green (prototype: 155 unit tests, the engine file 27 s).
- [ ] **Step — the ET runner.** `./run.sh cli.ts ET-10 ET-11 ET-M2` → ET-10a `mhDevelops` **true** (WR → PL), every other
  MH cell unchanged. Record the rows in `<scratchpad>/fu-10/et/out/`.
- [ ] **Commit and push.**

```
git add -A packages/engine-core && git commit -m "feat(7e,7f): an MH-susceptible patient develops MH from its triggers (FU-10 E1, E-FU10-1)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" && git push -u origin fu-10-endocrine-thermal
```

---

### Task A2: E3 — a neuraxial block has its own thermoregulation (7e thermal; PROTOTYPED)

**Files:**
- Modify: `packages/engine-core/src/l2/thermal/{params,heat}.ts`
- Modify: `packages/engine-core/test/l2/temp/temp.test.ts` (**E-FU10-3**: the Stage 3 neuraxial expectation re-pinned)
- Create: `packages/engine-core/test/l2/thermal/fu10-neuraxial.test.ts`
- **Overlap:** no other in-flight plan edits `l2/thermal/**` (checked in FU-6, FU-7, FU-8, FU-9, 7k).

**Why (research/14 E3, ET-04 WR):** `heat.ts:161` gave any non-`none` anaesthesia thermoregulatory depth 1, so an awake
spinal patient got the GA thresholds (vasoconstriction 34.8, shivering 33.5 °C) plus the `NEURAXIAL_KCP` shortcut: hour-1
fall −1.07 °C (0.9 of GA, expected ≈ half), core 34.4 °C at 3 h and **no shivering at all**.

**Mechanism (D4):** the block acts on its EFFECTORS — the blocked fraction of the body (0.5 for a T10 block [ENG]) is
fully vasodilated and cannot shiver — and lowers the shivering threshold 0.5 °C (Kurz 1993); centrally the patient is
awake (depth 0), and sedation still arrives through 7f's `thermoDepth`. `NEURAXIAL_H` (the extra skin loss below the
block) stays: without it the hour-1 fall is only −0.53 °C and the patient never shivers.

**Measured (prototype):** hour 1 **−0.76 °C** (ET rig; heat model −0.78 vs GA −1.25), ratio **0.64**, core 35.31 °C at
3 h, shivering from **35.48 °C**, `depthNeur` **0**. The ratio band 0.4–0.6 is not reached → `it.fails` with 0.64 (Ali
Q3). **FU-4 check:** no GA, MH or hypothermia row moves (the neuraxial branch is the only path that changed);
`audit:physiology` unchanged.

- [ ] **Step — the edits** (each find matches exactly once in application order; the chained ones are
  marked "(chained on <task>)" and match once in the applied state):

In `packages/engine-core/src/l2/thermal/params.ts`, find:

```ts
export const NEURAXIAL_KCP = 1.8; // redistribution 0.5–1 °C, no plateau (research 03 §6.2) [ENG]
```

Replace with:

```ts
export const NEURAXIAL_KCP = 1.8; // redistribution 0.5–1 °C, no plateau (research 03 §6.2) [ENG] — FU-10 E3: no longer read (NEURAXIAL_BLOCK_FRAC)
```

In `packages/engine-core/src/l2/thermal/params.ts`, find:

```ts
export const VASOCONSTRICT_KCP = 0.5; // k_cp × once constricted [ENG]
```

Replace with:

```ts
export const VASOCONSTRICT_KCP = 0.5; // k_cp × once constricted [ENG]
/**
 * FU-10 E3 — neuraxial thermoregulation (Sessler DI, Anesthesiology 2000;92:578 and Lancet 2008;371:1791; Kurz A,
 * Sessler DI et al., Anesthesiology 1993;79:1193 [VERIFY]): the block abolishes vasoconstriction AND shivering below
 * its level only; centrally the patient keeps an unsedated patient's thresholds except that shivering starts ≈ 0.5 °C
 * lower (the warm, vasodilated legs are "felt" as warm). Redistribution is then ≈ half of general anaesthesia's
 * (Matsukawa T et al., Anesthesiology 1995;83:961: epidural −0.8 °C in hour 1 [VERIFY]). Sedation adds 7f's depth.
 * NEURAXIAL_BLOCK_FRAC: the fraction of the vasomotor/shivering effector mass below a T10 block [ENG: legs + lower trunk ≈ ½].
 */
export const NEURAXIAL_BLOCK_FRAC = 0.5;
export const NEURAXIAL_SHIVER_SHIFT_C = -0.5;
```

In `packages/engine-core/src/l2/thermal/heat.ts`, find:

```ts
  AMBIENT_C, CORE_FRACTION, EMERGE_TAU_S, GA_KCP, GA_M, HEAT_CAP_J_KG_C, M_AWAKE_W_70, MH_HEAT_X, NEURAXIAL_H,
  NEURAXIAL_KCP, PERIPH_GRADIENT_C, T_NORMAL, VASOCONSTRICT_KCP,
} from './params.ts';```

Replace with:

```ts
  AMBIENT_C, CORE_FRACTION, EMERGE_TAU_S, GA_KCP, GA_M, HEAT_CAP_J_KG_C, M_AWAKE_W_70, MH_HEAT_X, NEURAXIAL_BLOCK_FRAC, NEURAXIAL_H,
  NEURAXIAL_SHIVER_SHIFT_C, PERIPH_GRADIENT_C, T_NORMAL, VASOCONSTRICT_KCP,
} from './params.ts';```

In `packages/engine-core/src/l2/thermal/heat.ts`, find:

```ts
/** Current thresholds (depth, set point; the shivering-only shift applied). */
export function currentThresholds(st: ThermalState): Thresholds {
  const thr = thresholds(st.depth, st.setShift + st.feverShift);
  return { ...thr, shiver: thr.shiver + st.shiverShift };
}

function kcp(st: ThermalState, tc: number, thr: Thresholds): { k: number; f: number } {
  if (st.anaesthesia === 'neuraxial') return { k: st.k0 * NEURAXIAL_KCP, f: 1 }; // no vasoconstriction below the block
  const f = vasoDilation(tc, thr);
  return { k: st.k0 * (VASOCONSTRICT_KCP + (GA_KCP - VASOCONSTRICT_KCP) * f), f };
}```

Replace with:

```ts
/** Current thresholds (depth, set point; the shivering-only shifts applied: drugs, and a neuraxial block — FU-10 E3). */
export function currentThresholds(st: ThermalState): Thresholds {
  const thr = thresholds(st.depth, st.setShift + st.feverShift);
  return { ...thr, shiver: thr.shiver + st.shiverShift + (st.anaesthesia === 'neuraxial' ? NEURAXIAL_SHIVER_SHIFT_C : 0) };
}

/** FU-10 E3: the fraction of the effectors (vasomotor tone, shivering) a neuraxial block abolishes; 0 otherwise. */
const blocked = (st: ThermalState): number => (st.anaesthesia === 'neuraxial' ? NEURAXIAL_BLOCK_FRAC : 0);

function kcp(st: ThermalState, tc: number, thr: Thresholds): { k: number; f: number } {
  // FU-10 E3: below a neuraxial block the vessels are fully dilated; above it they keep their thermoregulatory tone
  const b = blocked(st);
  const f = b + (1 - b) * vasoDilation(tc, thr);
  return { k: st.k0 * (VASOCONSTRICT_KCP + (GA_KCP - VASOCONSTRICT_KCP) * f), f };
}```

In `packages/engine-core/src/l2/thermal/heat.ts`, find:

```ts
    shiverW: shiverW(st.tc, thr, st.m0, st.effKg, st.nmb),
```

Replace with:

```ts
    shiverW: shiverW(st.tc, thr, st.m0, st.effKg, st.nmb) * (1 - blocked(st)), // FU-10 E3: no shivering below a block
```

In `packages/engine-core/src/l2/thermal/heat.ts`, find:

```ts
  // depth = max(7f's thermoDepth, the Stage 3 `thermal` flag's depth) (R51 addendum 16): a Stage 3 scenario that sets
  // anaesthesia 'general' without drugs keeps its R39-7 course after 7f lands. Neuraxial: the thresholds of a sedated
  // patient (decision 4: Stage 3's "no plateau" keeps shivering out of hour 8).
  const target = Math.max(st.depthIn ?? 0, st.anaesthesia === 'none' ? 0 : 1);```

Replace with:

```ts
  // depth = max(7f's thermoDepth, the Stage 3 `thermal` flag's depth) (R51 addendum 16): a Stage 3 scenario that sets
  // anaesthesia 'general' without drugs keeps its R39-7 course after 7f lands. Neuraxial (FU-10 E3): no central depth of
  // its own — the block acts on the effectors below it (kcp, shivering) and lowers the shivering threshold; sedation
  // reaches the thresholds through 7f's depth.
  const target = Math.max(st.depthIn ?? 0, st.anaesthesia === 'general' ? 1 : 0);```

In `packages/engine-core/src/l2/thermal/heat.ts`, find:

```ts
    depth: st.anaesthesia === 'none' ? 0 : 1,```

Replace with:

```ts
    depth: st.anaesthesia === 'general' ? 1 : 0, // FU-10 E3: a neuraxial block has no central depth```

In `packages/engine-core/test/l2/temp/temp.test.ts`, find:

```ts
  it('neuraxial: smaller redistribution and no plateau (still falling below 34.5 °C in hour 8)', () => {
    const st = createTemp(36.8, 70);
    st.anaesthesia = 'neuraxial';
    const tc = run(st, 0, 8 * 3600);
    expect(36.8 - tc[59]!).toBeLessThan(1.0);
    expect(tc[419]! - tc[479]!).toBeGreaterThan(0.1); // still falling in hour 8, where GA has plateaued
    expect(tc[479]!).toBeLessThan(34.5);
  });```

Replace with:

```ts
  // FU-10 E3 (E-FU10-3, research/14 ET-04): "no plateau" meant no VASOCONSTRICTION plateau — the block abolishes the
  // legs' vasoconstriction, so the core keeps falling through the GA plateau's hours; it now stops only where shivering
  // ABOVE the block starts, below the lowered shivering threshold (35.5 °C; Kurz 1993). Before FU-10 the neuraxial state
  // took the GA thresholds (shivering 33.5 °C) and fell to 33.47 °C at 8 h with no shivering; now 35.22 °C, shivering.
  it('neuraxial: smaller redistribution, no vasoconstriction plateau; the fall stops only below the lowered shivering threshold', () => {
    const st = createTemp(36.8, 70);
    st.anaesthesia = 'neuraxial';
    const tc = run(st, 0, 8 * 3600);
    expect(36.8 - tc[59]!).toBeLessThan(1.0);
    expect(tc[59]! - tc[119]!).toBeGreaterThanOrEqual(0.3); // hour 2: still the linear phase (0.50 °C/h)
    expect(tc[479]!).toBeLessThan(35.5); // below the shivering threshold 36.0 − 0.5
    expect(st.out.shiverW).toBeGreaterThan(0); // shivering above the block defends it
  });```

- [ ] **Step — the tests.** Create `test/l2/thermal/fu10-neuraxial.test.ts`: (1) no central depth — the awake
  vasoconstriction threshold and the shivering threshold 0.5 °C lower; (2) hour-1 redistribution −0.5 to −1.1 °C
  (Matsukawa 1995) and less than GA's, shivering from ≈ 35.5 °C; (3) `it.fails` "redistribution about half of the GA
  fall: ratio 0.4–0.6 — measured 0.62" (the heat-model ratio; the ET rig reads 0.64).
- [ ] **Step — run.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/thermal test/l2/temp test/engine/thermal-warmer.test.ts` → green (41 tests).
- [ ] **Step — the ET runner.** `./run.sh cli.ts ET-04 ET-01a ET-02 ET-29 ET-30` → ET-04 shivering true, ratio 0.64
  (WR → TS on the ratio alone, with its `it.fails`); ET-01a, ET-02, ET-29, ET-30 unchanged.
- [ ] **Commit and push.** `git add -A packages/engine-core && git commit -m "feat(7e): a neuraxial block blocks its effectors and lowers the shivering threshold (FU-10 E3, E-FU10-3)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" && git push`

---

### Task A3: E5 + E6 — the thresholds read at most the GA row, and age lowers them (7e thermal; PROTOTYPED)

**Files:**
- Modify: `packages/engine-core/src/l2/thermal/{params,thresholds,heat}.ts`
- Modify: `packages/engine-core/src/l2/endo/pipeline.ts` (7e writes the patient's age into the heat model — Stage 3
  creates the state and `l2/resp/**` is not FU-10's to touch)
- Create: `packages/engine-core/test/l2/thermal/fu10-thresholds.test.ts`
- **Overlap:** none in `l2/thermal/**`; the `l2/endo/pipeline.ts` lines are FU-10's own (FU-7 does not edit that file).

**Why (research/14 E5/E6, ET-01b TW, ET-03a MI):** `thresholds()` extrapolated the awake → GA line to depth 1.5, so
2 % sevoflurane (thermoDepth 1.06) put the vasoconstriction threshold at 34.55 °C and the plateau at **6.2 h** (Sessler
3–4 h); and no threshold had an age term, so the 80-year-old differed from the 40-year-old only through MAC-age
(34.73 vs 34.82 °C at 4 h).

**Mechanism (D5):** cap the depth the thresholds read at the GA row (`THR_DEPTH_MAX`), and shift the two cold-defence
thresholds by −1 °C from 60 to 80 y (Kurz 1993 [VERIFY]). The linear-phase RATE is not touched.

**Measured (prototype):** vasoconstriction onset **4.93 h at 34.80 °C** (was 6.17 h at 34.55), the plateau flat
(hours 4–5 **−0.081** °C/h, was −0.153 — now inside the "quiet ±0.1" item), hours 2–3 unchanged at −0.291; elderly minus
adult at 4 h **−0.15 °C** (was −0.09). The same rig with the ET-29 surgical exposure (uncovered 30 min, wet prep 15 min)
plateaus at **2.85 h** and loses 0.37 °C/h with an open wound — the band's own conditions. `it.fails` kept with their
numbers: the draped rig's `vasoOnsetH` 4.93 h (band 3–4), `vasoOnsetC` 34.80 °C (band 34.3–34.7), `rateH2to3` −0.291
(band −0.3 to −0.5), ET-03a `d4h` −0.15 (band beyond 0.2). ET-03a's `dVasoOnset` stays MI: the elderly patient's lower
threshold is not crossed inside the cell's 7 h window (the shift itself is asserted in the unit test).
**FU-4 check:** ET-01a (hour 1 −1.18), ET-02 (warmed 36.18/34.55 at 3 h), ET-03b (child −1.54), ET-08a/b, ET-09a/c and
the shivering cut-off unchanged; `test/l2/thermal/shiver-cutoff.test.ts` green.

- [ ] **Step — the edits** (each find matches exactly once in application order; the chained ones are
  marked "(chained on <task>)" and match once in the applied state):

In `packages/engine-core/src/l2/thermal/params.ts`, find:

```ts
export const T_NORMAL = 36.8; // the default core the thresholds are written for (L1 tempCore default)
```

Replace with:

```ts
export const T_NORMAL = 36.8; // the default core the thresholds are written for (L1 tempCore default)
/**
 * FU-10 E5 — the depth the THRESHOLDS read is capped at the GA row. Before FU-10 `thresholds()` extrapolated the
 * awake → GA line to depth 1.5 (2.1 °C per depth unit), so 2 % sevoflurane (thermoDepth 1.06) put the vasoconstriction
 * threshold at 34.55 °C and the plateau at 6.2 h; the tables' and Sessler's GA row IS the row for ordinary clinical
 * anaesthesia (vasoconstriction 34.5 ± 0.2 °C, the plateau at 3–4 h: Sessler DI, Anesthesiology 2000;92:578–596; Kurz A,
 * Plattner O, Sessler DI et al., Anesthesiology 1993;79:465). A deeper anaesthetic lowering the threshold further is a
 * concentration–threshold slope no source in the tables gives, so it is not extrapolated (R45; calibration queue).
 */
export const THR_DEPTH_MAX = 1;
/**
 * FU-10 E6 — age lowers both thermoregulatory thresholds: ≈ 1 °C lower from 60 to 80 y under general anaesthesia
 * (Kurz A, Plattner O, Sessler DI et al., Anesthesiology 1993;79:465 [VERIFY]; Frank SM et al., Anesthesiology
 * 1992;77:252). Linear between THR_AGE_FROM_Y and THR_AGE_TO_Y, applied to the vasoconstriction and shivering
 * thresholds only (the sweating threshold has no sourced age term).
 */
export const THR_AGE_FROM_Y = 60;
export const THR_AGE_TO_Y = 80;
export const THR_AGE_SHIFT_C = -1;
```

In `packages/engine-core/src/l2/thermal/thresholds.ts`, find:

```ts
import {
  SHIVER_MAX_X,```

Replace with:

```ts
import {
  THR_AGE_FROM_Y, THR_AGE_SHIFT_C, THR_AGE_TO_Y, THR_DEPTH_MAX,
  SHIVER_MAX_X,```

In `packages/engine-core/src/l2/thermal/thresholds.ts`, find:

```ts
/** Thresholds at depth d with every threshold shifted by `setShiftC` (fever raises the set point). */
export function thresholds(depth: number, setShiftC: number): Thresholds {
  const d = Math.min(1.5, Math.max(0, depth));
  return {
    vaso: lerp(THR_VASO_AWAKE, VASOCONSTRICT_C, d) + setShiftC,
    vasoW: lerp(W_VASO_AWAKE, W_VASO_GA, Math.min(1, d)),
    shiver: lerp(THR_SHIVER_AWAKE, THR_SHIVER_GA, d) + setShiftC,
    sweat: lerp(THR_SWEAT_AWAKE, THR_SWEAT_GA, d) + setShiftC,
  };
}```

Replace with:

```ts
/** FU-10 E6: the age shift of the cold-defence thresholds, °C (0 up to 60 y, THR_AGE_SHIFT_C from 80 y; linear). */
export function ageShiftC(ageY: number): number {
  const f = Math.min(1, Math.max(0, (ageY - THR_AGE_FROM_Y) / (THR_AGE_TO_Y - THR_AGE_FROM_Y)));
  return THR_AGE_SHIFT_C * f;
}

/**
 * Thresholds at depth d with every threshold shifted by `setShiftC` (fever raises the set point) and the cold-defence
 * thresholds by the patient's age (FU-10 E6). The depth is capped at the GA row (FU-10 E5, THR_DEPTH_MAX).
 */
export function thresholds(depth: number, setShiftC: number, ageY = 40): Thresholds {
  const d = Math.min(THR_DEPTH_MAX, Math.max(0, depth));
  const age = ageShiftC(ageY);
  return {
    vaso: lerp(THR_VASO_AWAKE, VASOCONSTRICT_C, d) + setShiftC + age,
    vasoW: lerp(W_VASO_AWAKE, W_VASO_GA, d),
    shiver: lerp(THR_SHIVER_AWAKE, THR_SHIVER_GA, d) + setShiftC + age,
    sweat: lerp(THR_SWEAT_AWAKE, THR_SWEAT_GA, d) + setShiftC,
  };
}```

In `packages/engine-core/src/l2/thermal/heat.ts`, find:

```ts
  const thr = thresholds(st.depth, st.setShift + st.feverShift);```

Replace with:

```ts
  const thr = thresholds(st.depth, st.setShift + st.feverShift, st.ageY);```

In `packages/engine-core/src/l2/thermal/heat.ts`, find:

```ts
  effKg: number;
  env: Envelope;```

Replace with:

```ts
  effKg: number;
  ageY: number; // FU-10 E6: the thermoregulatory thresholds fall with age (Kurz 1993)
  env: Envelope;```

In `packages/engine-core/src/l2/thermal/heat.ts`, find:

```ts
export function createThermal(tCore: number, effKg: number, heightCm = 175): ThermalState {```

Replace with:

```ts
export function createThermal(tCore: number, effKg: number, heightCm = 175, ageY = 40): ThermalState {```

In `packages/engine-core/src/l2/thermal/heat.ts`, find:

```ts
    k0: (m0 - resp) / PERIPH_GRADIENT_C, h: m0 / (tp - AMBIENT_C), m0, effKg,```

Replace with:

```ts
    k0: (m0 - resp) / PERIPH_GRADIENT_C, h: m0 / (tp - AMBIENT_C), m0, effKg, ageY,```

In `packages/engine-core/src/l2/thermal/heat.ts`, find:

```ts
  const fresh = createThermal(T_NORMAL, (st.m0 / M_AWAKE_W_70) * 70);```

Replace with:

```ts
  const fresh = createThermal(T_NORMAL, (st.m0 / M_AWAKE_W_70) * 70, 175, st.ageY ?? 40);```

In `packages/engine-core/src/l2/endo/pipeline.ts`, find:

```ts
export interface EndoState {
  core: EndoCore;
  k: number; // next 1 Hz step index (time k s)
  noxious: number;
  weightKg: number;```

Replace with:

```ts
export interface EndoState {
  core: EndoCore;
  k: number; // next 1 Hz step index (time k s)
  noxious: number;
  weightKg: number;
  ageY: number; // FU-10 E6: written into the heat model's `ageY` (the thresholds fall with age; Stage 3 owns `resp`)```

In `packages/engine-core/src/l2/endo/pipeline.ts`, find:

```ts
    core: createEndoCore(resolveEndoProfile(profile), weightKg), k: 1, noxious: 0, weightKg, ecg: { tempC: 0, shiver: 0 },```

Replace with:

```ts
    core: createEndoCore(resolveEndoProfile(profile), weightKg), k: 1, noxious: 0, weightKg, ageY: profile?.ageY ?? 40, ecg: { tempC: 0, shiver: 0 },```

In `packages/engine-core/src/l2/endo/pipeline.ts`, find:

```ts
  const th = ctx.resp.temp;
  const pk = pkOf(ctx.ps);
  observeDoses(es, pk);```

Replace with:

```ts
  const th = ctx.resp.temp;
  const pk = pkOf(ctx.ps);
  th.ageY = es.ageY; // FU-10 E6: the patient's age reaches the thermoregulatory thresholds (Stage 3 creates the state)
  observeDoses(es, pk);```

- [ ] **Step — the test.** Create `test/l2/thermal/fu10-thresholds.test.ts`: (1) `thresholds(1.5, 0)` equals
  `thresholds(1, 0)` (the GA row is the floor) while depth 0.5 still interpolates; (2) `ageShiftC` 0 at 40 and 60 y,
  −0.5 at 70 y, −1 at 80 y and beyond; (3) the vasoconstriction and shivering thresholds carry the age shift and the
  sweating threshold does not; (4) an 80-year-old thermal state built through `createThermal(…, ageY)` reports the shifted
  thresholds, and a state restored from a pre-FU-10 snapshot (no `ageY`) behaves as a 40-year-old.
- [ ] **Step — run.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/thermal test/l2/temp test/l2/endo test/engine/endo-acceptance.test.ts` → green.
- [ ] **Step — the ET runner.** `./run.sh cli.ts ET-01a ET-01b ET-02 ET-03a ET-03b ET-08a ET-09a` → the rows above.
- [ ] **Commit and push.** `git add -A packages/engine-core && git commit -m "fix(7e): the thermoregulatory thresholds stop at the GA row and fall with age (FU-10 E5, E6)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" && git push`

---

### Task A4: E8 — the insulin–dextrose row moves glucose (7e adapters; PROTOTYPED)

**Files:** Modify `packages/engine-core/src/l2/endo/{params,adapters}.ts`; create
`packages/engine-core/test/l2/endo/fu10-insulin-dextrose.test.ts`.
**Overlap:** FU-7 Task 9/18 edit `adapters.ts`'s `readEndoInputs` (the `epiExoPgMl` line) and FU-9 A4 its `writeBlood`
and imports; this task edits `observeDoses` and the import line (FU-7 Task 18 also edits the import: whichever lands
second re-anchors on the merged line — the change is one added name).

**Why (research/14 E8, ET-31 IN):** the hyperkalaemia treatment row `insulinDextrose` moved K⁺ −0.88 and glucose
**0.00 for 3 h**, while the same doses given as the two separate rows gave +6.9 then −2.4 mmol/L — one treatment, two
answers. 7e observed only the `insulin` and `dextrose` agent ids (`adapters.ts:102–107`).

**Mechanism (D6):** `observeDoses` expands the combined row into its insulin and its dextrose for the GLUCOSE model
only (2.5 g per unit, the row's own regimen); 7c keeps its K⁺ curve, so the sourced hyperkalaemia time course is
untouched.

**Measured (prototype):** ET-31 `comboMax` **+6.93**, `comboMin` **−2.42** — identical to the two-row arm (IN → PL on
both graded items). `dKcombo60` −1.18 against the two-row arm's −0.84 (before: −0.88): the dextrose's own insulin
SECRETION now adds 7e's endogenous K⁺ shift on top of 7c's treatment curve. That row becomes an `it.fails` with its
number and Ali's question 4; no constant is changed (R45). **FU-4 check:** `test/engine/blood-hyperk.test.ts` and
`blood-ecg.test.ts` (the burns + suxamethonium hyperkalaemia rig, where insulin–dextrose must still lower K⁺ ≥ 1 in
30 min) green — measured 1.42.

- [ ] **Step — the edits** (each find matches exactly once in application order; the chained ones are
  marked "(chained on <task>)" and match once in the applied state):

In `packages/engine-core/src/l2/endo/params.ts`, find:

```ts
export const EPI_EXO_PG_PER_RATE_EQ = 1e6 / 68.66;
```

Replace with:

```ts
export const EPI_EXO_PG_PER_RATE_EQ = 1e6 / 68.66;
/** FU-10 E8: 7c's `insulinDextrose` row is dosed in insulin units with 25 g dextrose per 10 units (the row's regimen;
 * UK Renal Association 2020 / JBDS: 10 units soluble insulin in 50 mL 50 % glucose) [TXT]. */
export const INSDEX_DEXTROSE_G_PER_UNIT = 2.5;
```

In `packages/engine-core/src/l2/endo/adapters.ts`, find:

```ts
import { ANTINOC_GA_FALLBACK, EPI_EXO_PG_PER_RATE_EQ } from './params.ts';```

Replace with:

```ts
import { ANTINOC_GA_FALLBACK, EPI_EXO_PG_PER_RATE_EQ, INSDEX_DEXTROSE_G_PER_UNIT } from './params.ts';```

In `packages/engine-core/src/l2/endo/adapters.ts`, find:

```ts
/**
 * 7g's accepted boluses (`bus.doses`, each listed for exactly one engine pass, R51 §3) → the glucose model: dextrose
 * (7g amount unit mg) and insulin (units). Called once per engine pass. `bus.metabolic.glucoseDelta` is NOT used (7e
 * owns glucose).
 */```

Replace with:

```ts
/**
 * 7g's accepted boluses (`bus.doses`, each listed for exactly one engine pass, R51 §3) → the glucose model: dextrose
 * (7g amount unit mg) and insulin (units). Called once per engine pass. `bus.metabolic.glucoseDelta` is NOT used (7e
 * owns glucose). FU-10 E8: 7c's `insulinDextrose` row (the hyperkalaemia treatment; its K⁺ curve stays 7c's) is the same
 * insulin and dextrose to the glucose model — 10 units with 25 g, i.e. INSDEX_DEXTROSE_G_PER_UNIT per unit given.
 */```

In `packages/engine-core/src/l2/endo/adapters.ts`, find:

```ts
    else if (d.agent === 'insulin' && d.amountUnit === 'units') insulinBolus(es.core.glucose, d.amount, es.weightKg);
```

Replace with:

```ts
    else if (d.agent === 'insulin' && d.amountUnit === 'units') insulinBolus(es.core.glucose, d.amount, es.weightKg);
    else if (d.agent === 'insulinDextrose' && d.amountUnit === 'units') { // FU-10 E8
      insulinBolus(es.core.glucose, d.amount, es.weightKg);
      dextroseBolus(es.core.glucose, d.amount * INSDEX_DEXTROSE_G_PER_UNIT, es.weightKg);
    }
```

- [ ] **Step — the test.** Create `test/l2/endo/fu10-insulin-dextrose.test.ts`: through `observeDoses`, a
  `insulinDextrose` 10-unit dose raises glucose at once and then drives it below baseline, and the same doses as
  `insulin` + `dextrose` give the same course to within 0.1 mmol/L; a dose in another unit is ignored.
- [ ] **Step — run.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/endo test/l2/blood test/engine/blood-hyperk.test.ts test/engine/blood-ecg.test.ts` → green.
- [ ] **Step — the ET runner.** `./run.sh cli.ts ET-31 ET-20b ET-22` → the rows above.
- [ ] **Commit and push.** `git add -A packages/engine-core && git commit -m "fix(7e): the insulin-dextrose row reaches the glucose model (FU-10 E8)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" && git push`

---

### Task A5: E12(a) — the insulin nadir comes at its published time (7e glucose; PROTOTYPED)

**Files:** Modify `packages/engine-core/src/l2/endo/params.ts`; create
`packages/engine-core/test/engine/fu10-insulin-nadir.test.ts` (SLOW → `SLOW` + `SLOW_A`) and modify `vite.config.ts`.
**Overlap:** none (FU-8 B1 changes the insulin ROW's infusion reference in `l2/pk`, not the minimal model).

**Why (research/14 E12, ET-20a TS):** 10 units IV reached its nadir at **13.3 min**; the insulin-tolerance-test
literature puts it at 20–30 min and research/12 at 40–60. The bolus enters the insulin space at once and the remote
compartment's p2 was 0.025/min, faster than Bergman's own estimates (0.01–0.02/min).

**Mechanism:** p2 at the sourced lower end (0.016/min [VERIFY]); the steady-state insulin action (`SI`) is unchanged, so
only the LAG moves.

**Measured (prototype):** nadir **15.3 min / 3.13 mmol/L** (was 13.3 / 2.92); the counter-regulation stays in band
(adrenaline ×11.4, HR +13.4 — ET-20c PL); the diabetic insulin infusion −2.2 mmol/L/h (ET-18c PL) and D50 (ET-22) hold.
The band is still not reached → `it.fails` "nadir 20–30 min (ITT) — measured 15.3 min", with Ali's question 5, and the
gate note records that closing the rest needs the insulin's own disposition (7g's row, FU-8 B1), not a smaller p2:
p2 0.013 reaches 16.7 min but takes the adrenaline response out of its band (9.4, band 10–20).

- [ ] **Step — the edits** (each find matches exactly once in application order; the chained ones are
  marked "(chained on <task>)" and match once in the applied state):

In `packages/engine-core/src/l2/endo/params.ts`, find:

```ts
export const P2_PER_MIN = 0.025;```

Replace with:

```ts
/**
 * FU-10 E12: the remote-insulin rate constant of the minimal model. 0.025/min put the nadir of an IV insulin bolus at
 * 13 min (research/14 ET-20a; the insulin-tolerance test puts it at 20–30 min, research/12 at 40–60). Bergman's own
 * estimates in normal subjects are ≈ 0.01–0.02/min (Bergman RN, Phillips LS, Cobelli C, J Clin Invest 1981;68:1456
 * [VERIFY]) — the slower remote compartment is the mechanism, not a bigger dose or a smaller SI. SI is re-anchored so
 * the steady-state action SI·(I − Ib) is unchanged (SI_PER_MIN_PER_UU is the same; only the LAG moves).
 */
export const P2_PER_MIN = 0.016;```

- [ ] **Step — the test.** Create `test/engine/fu10-insulin-nadir.test.ts` (the ET-20 rig: awake, spontaneous, room
  air, 10 units IV): the nadir is below 3.9 mmol/L, comes later than 14 min and the adrenaline peak is 10–20 × basal;
  plus an `it.fails` "nadir at 20–30 min — measured 15.3".
- [ ] **Step — run.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/endo test/engine/fu10-insulin-nadir.test.ts test/engine/endo-acceptance.test.ts` → green.
- [ ] **Step — the ET runner.** `./run.sh cli.ts ET-20a ET-20b ET-20c ET-18c ET-21a ET-22 ET-16c ET-17` → the rows above.
- [ ] **Commit and push.** `git add -A packages/engine-core && git commit -m "fix(7e): the remote insulin compartment at its published rate constant (FU-10 E12a)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" && git push`

---

### Task A6: E10 + E13 — etomidate suppresses cortisol synthesis; adrenal insufficiency is a basal deficit (7e; PROTOTYPED)

**Files:** Modify `packages/engine-core/src/l2/endo/{params,hormones,effects,core,adapters}.ts`; create
`packages/engine-core/test/l2/endo/fu10-adrenal.test.ts` and `packages/engine-core/test/engine/fu10-adrenal.test.ts`
(SLOW → `SLOW` + `SLOW_A`); modify `vite.config.ts`.
**Overlap:** FU-7 Task 9 adds `sympDrug`/`catReserve` and Task 18 a `cortExo` argument to the SAME `stressEffects(…)`
signature and the same `stepHormones({…})` call. **Coordination:** FU-10 adds `cortBasalF` as a FIELD of
`HormoneInputs` and changes `cortResponse` to a function call — FU-7's `cortExo` is a fourth POSITIONAL argument of
`stressEffects`. Whichever lands second re-anchors on the merged line and keeps both (the merged call is
`stressEffects(c.hormones, { hr: x.betaBlock, c: x.betaBlockC }, cortResponseOf(c), x.cortExoNmolL ?? 0)`), which is
stated here so neither executor deletes the other's argument.

**Why (research/14 E10/E13, ET-34 MI, ET-15a TW):** etomidate did not touch the adrenal (cortisol at 4 h 1582 vs
propofol's 1575; `cortResponse` was set only by the adrenal profile, `core.ts:118,173`, although `hormones.ts`'s header
names etomidate). Adrenal insufficiency changed nothing at rest or after induction (MAP 73.7 in both arms), because
`cortResponse` 0.5 halved only the stress RISE.

**Mechanism (D8, D9):** (a) 7e observes an etomidate dose and keeps an 11β-hydroxylase suppression state that recovers
with t½ 8 h and multiplies the adrenal's cortisol RESPONSE; (b) the adrenal-insufficiency profile lowers the BASAL
cortisol (×0.5) and cortisol below basal costs resting systemic resistance (cortisol's permissive effect, below basal
only).

**Measured (prototype):** ET-34 cortisol at 4 h **1031 vs 1575 = 0.655** (the report's §7 item: ≤ 0.8). ET-15a:
post-induction MAP **70.19 vs 73.73**, surgical MAP **−4.4** (band beyond 5 → `it.fails` with the number), phenylephrine
**0.68** of normal (band ≤ 0.8), cortisol **233 vs 532** nmol/L. The healthy patient is untouched: ET-16a/b/c
bit-identical (cortisol peak 1544 at 5 h, `cortF5vsF0` −0.07). This is the basal deficit FU-7's hydrocortisone (D13)
reverses; the mineralocorticoid volume deficit is Task B4.
**FU-4 check:** `audit:physiology` unchanged (no healthy-patient path moves); `test/engine/endo-circ-acceptance.test.ts`
green.

- [ ] **Step — the edits** (each find matches exactly once in application order; the chained ones are
  marked "(chained on <task>)" and match once in the applied state):

In `packages/engine-core/src/l2/endo/params.ts`, find:

```ts
export const CORT_VASO_RESP = 0.3; // vasopressor responsiveness (adrenal insufficiency: ×0.5 of cortisol) [TXT]```

Replace with:

```ts
export const CORT_VASO_RESP = 0.3; // vasopressor responsiveness (adrenal insufficiency: ×0.5 of cortisol) [TXT]
/**
 * FU-10 E13 — untreated adrenal insufficiency is a BASAL deficit, not only a blunted stress rise: the resting cortisol
 * is low, so the permissive support of vascular tone is already missing before any stress (Annane D et al., Crit Care
 * Med 2017;45:2078 / Intensive Care Med 2017 (the glucocorticoid-deficiency guidelines: vasopressor-dependent
 * hypotension reversed by hydrocortisone); Miller 10e ch. 35). Before FU-10 `cortResponse` 0.5 halved only the stress
 * RISE, so the resting patient was exactly normal (research/14 ET-15a). [ENG size: a basal cortisol at half normal,
 * the same fraction the stress response already carried.]
 */
export const AI_CORT_BASAL_F = 0.5;
/**
 * FU-10 E13 — cortisol is PERMISSIVE for vascular tone: below the basal level the vessels lose part of their resting
 * resistance (the vasoplegia of glucocorticoid deficiency; Annane 2017). × on SVR = 1 − CORT_SVR_PERMISSIVE · (1 −
 * cortisol/basal), applied BELOW basal only (a high cortisol does not raise SVR: the receptor is saturated) [ENG size:
 * the ET-15a target is a lower resting/post-induction MAP that a vasopressor answers poorly].
 */
export const CORT_SVR_PERMISSIVE = 0.25;
/**
 * FU-10 E10 — one induction dose of etomidate inhibits 11β-hydroxylase, so the adrenal cannot make cortisol for hours
 * (Wagner RL, White PF et al., NEJM 1984;310:1415; Absalom A, Pledger D, Kong A, Anaesthesia 1999;54:861 [VERIFY]).
 * The suppression follows the dose with a first-order recovery (t½ chosen inside the sources' 6–12 h) and multiplies the
 * adrenal's cortisol RESPONSE (`cortResponse`), so the resting level is untouched and the surgical rise is blunted.
 * ETOM_SUPPR_MAX at the 0.3 mg/kg reference dose [ENG: the ET-34 target is cortisol ≤ 0.8 × propofol's at 4 h].
 */
export const ETOM_SUPPR_MAX = 0.6;
export const ETOM_SUPPR_REF_MG_KG = 0.3;
export const ETOM_SUPPR_T12_S = 8 * 3600;```

In `packages/engine-core/src/l2/endo/hormones.ts`, find:

```ts
  cortResponse: number; // 1 normal, 0.5 adrenal insufficiency / etomidate (tables)```

Replace with:

```ts
  cortResponse: number; // 1 normal, 0.5 adrenal insufficiency / etomidate (tables)
  /** FU-10 E13: × on the BASAL cortisol target (adrenal insufficiency: a resting deficit, not only a blunted rise). */
  cortBasalF?: number;```

In `packages/engine-core/src/l2/endo/hormones.ts`, find:

```ts
export function createHormones(): HormoneState {
  return { symp: 0, hum: 0, epi: EPI_BASAL_PG_ML, epiExo: 0, ne: NE_BASAL_PG_ML, cort: CORT_BASAL, cortDrive: 0 };
}```

Replace with:

```ts
export function createHormones(cortBasalF = 1): HormoneState {
  return { symp: 0, hum: 0, epi: EPI_BASAL_PG_ML, epiExo: 0, ne: NE_BASAL_PG_ML, cort: CORT_BASAL * cortBasalF, cortDrive: 0 };
}```

In `packages/engine-core/src/l2/endo/hormones.ts`, find:

```ts
  const cSs = CORT_BASAL * (1 + CORT_GAIN * h.cortDrive * x.cortResponse);```

Replace with:

```ts
  const cSs = CORT_BASAL * (x.cortBasalF ?? 1) * (1 + CORT_GAIN * h.cortDrive * x.cortResponse); // FU-10 E13: the basal deficit```

In `packages/engine-core/src/l2/endo/effects.ts`, find:

```ts
  EPI_SEC_SUPPRESS, EPI_SI_LOSS, G_SYMP_EES, G_SYMP_HR, G_SYMP_SVR, G_SYMP_V0, HUM_SVR, HUM_V0,
} from './params.ts';```

Replace with:

```ts
  EPI_SEC_SUPPRESS, EPI_SI_LOSS, G_SYMP_EES, G_SYMP_HR, G_SYMP_SVR, G_SYMP_V0, HUM_SVR, HUM_V0, CORT_SVR_PERMISSIVE,
} from './params.ts';```

In `packages/engine-core/src/l2/endo/effects.ts`, find:

```ts
    svrF: (1 + G_SYMP_SVR * h.symp) * (1 + EPI_BETA2_SVR * b2) * (1 + EPI_ALPHA_SVR * al),```

Replace with:

```ts
    // FU-10 E13: cortisol's permissive effect on resting vascular tone, below basal only
    svrF: (1 + G_SYMP_SVR * h.symp) * (1 + EPI_BETA2_SVR * b2) * (1 + EPI_ALPHA_SVR * al) * (1 - CORT_SVR_PERMISSIVE * Math.max(0, 1 - h.cort / CORT_BASAL)),```

In `packages/engine-core/src/l2/endo/core.ts`, find:

```ts
/** β2 bronchodilation of endogenous + 7g epinephrine and 7g's other β2 agonists (independent effects combine). */```

Replace with:

```ts
/**
 * FU-10 E10/E13: the adrenal's cortisol RESPONSE — halved by the adrenal-insufficiency profile (as before) and, on top
 * of it, suppressed by an 11β-hydroxylase inhibitor the patient has had (etomidate: `etomSuppr`, 0–1).
 */
export function cortResponseOf(c: EndoCore): number {
  return (c.profile.adrenalInsufficiency ? 0.5 : 1) * Math.max(0, 1 - ETOM_SUPPR_MAX * Math.min(1, Math.max(0, c.etomSuppr ?? 0)));
}

/** FU-10 E13: the × on the BASAL cortisol of this patient (adrenal insufficiency is a resting deficit too). */
export const cortBasalF = (p: EndoProfile): number => (p.adrenalInsufficiency ? AI_CORT_BASAL_F : 1);

/** β2 bronchodilation of endogenous + 7g epinephrine and 7g's other β2 agonists (independent effects combine). */```

In `packages/engine-core/src/l2/endo/core.ts`, find:

```ts
  const cortResponse = p.adrenalInsufficiency ? 0.5 : 1;```

Replace with:

```ts
  const cortResponse = cortResponseOf(c);```

In `packages/engine-core/src/l2/endo/core.ts`, find:

```ts
  x: EndoInputs; // the last inputs (compose reads the β-block, temperature, MH and 7g's bronchodilation from them)
  out: EndoOut;```

Replace with:

```ts
  x: EndoInputs; // the last inputs (compose reads the β-block, temperature, MH and 7g's bronchodilation from them)
  /** FU-10 E10: 11β-hydroxylase suppression left by an etomidate dose (0–1), recovering with ETOM_SUPPR_T12_S. */
  etomSuppr?: number;
  out: EndoOut;```

In `packages/engine-core/src/l2/endo/core.ts`, find:

```ts
  const c: EndoCore = {
    profile, hormones: createHormones(), glucose, cond: createConditions(), x: { ...NEUTRAL_ENDO_INPUTS, weightKg }, out: null as unknown as EndoOut,
  };```

Replace with:

```ts
  const c: EndoCore = {
    profile, hormones: createHormones(cortBasalF(profile)), glucose, cond: createConditions(), x: { ...NEUTRAL_ENDO_INPUTS, weightKg },
    etomSuppr: 0, out: null as unknown as EndoOut,
  };```

In `packages/engine-core/src/l2/endo/core.ts`, find:

```ts
import {
  EPI_BASAL_PG_ML, HYPO_EPI_THRESHOLD_MGDL, IB_UU_ML, INS_K_PER_UU, INS_N_PER_MIN, MGDL_PER_MMOL, MH_K_EFFLUX, NEUROGLYCOPENIA_MGDL,
  SYMP_HYPOGLY_PER_MGDL, VI_ML_KG,
} from './params.ts';```

Replace with:

```ts
import {
  AI_CORT_BASAL_F, ETOM_SUPPR_MAX, ETOM_SUPPR_T12_S,
  EPI_BASAL_PG_ML, HYPO_EPI_THRESHOLD_MGDL, IB_UU_ML, INS_K_PER_UU, INS_N_PER_MIN, MGDL_PER_MMOL, MH_K_EFFLUX, NEUROGLYCOPENIA_MGDL,
  SYMP_HYPOGLY_PER_MGDL, VI_ML_KG,
} from './params.ts';```

In `packages/engine-core/src/l2/endo/core.ts`, find:

```ts
  stepHormones(c.hormones, {
    noxious: x.noxious, antinoc: x.antinoc, extraSymp: cd.extraSymp + hypo + 2 * x.mhActivity,
    glucoseMgDl: g.g, mapMmHg: x.mapMmHg, mapSetMmHg: x.mapSetMmHg, sao2: x.sao2, paco2: x.paco2,
    cortResponse: c.profile.adrenalInsufficiency ? 0.5 : 1, epiExoPgMl: x.epiExoPgMl,
  }, dtS);```

Replace with:

```ts
  // FU-10 E10: an 11β-hydroxylase inhibitor's suppression recovers first-order (etomidate: 6–12 h)
  if ((c.etomSuppr ?? 0) > 0) c.etomSuppr = (c.etomSuppr ?? 0) * Math.exp((-Math.LN2 * dtS) / ETOM_SUPPR_T12_S);
  stepHormones(c.hormones, {
    noxious: x.noxious, antinoc: x.antinoc, extraSymp: cd.extraSymp + hypo + 2 * x.mhActivity,
    glucoseMgDl: g.g, mapMmHg: x.mapMmHg, mapSetMmHg: x.mapSetMmHg, sao2: x.sao2, paco2: x.paco2,
    cortResponse: cortResponseOf(c), cortBasalF: cortBasalF(c.profile), epiExoPgMl: x.epiExoPgMl,
  }, dtS);```

In `packages/engine-core/src/l2/endo/core.ts`, find:

```ts
  const st = stressEffects(c.hormones, { hr: x.betaBlock, c: x.betaBlockC }, c.profile.adrenalInsufficiency ? 0.5 : 1);
  const gp = glucoseProfile(c.profile);```

Replace with:

```ts
  const st = stressEffects(c.hormones, { hr: x.betaBlock, c: x.betaBlockC }, cortResponseOf(c));
  const gp = glucoseProfile(c.profile);```

In `packages/engine-core/src/l2/endo/adapters.ts`, find:

```ts
    else if (d.agent === 'insulinDextrose' && d.amountUnit === 'units') { // FU-10 E8```

Replace with:

```ts
    else if (d.agent === 'etomidate') { // FU-10 E10: 11β-hydroxylase suppression for hours after one induction dose
      const perKg = d.amountUnit === 'mg/kg' ? d.amount : d.amountUnit === 'mg' ? d.amount / es.weightKg : 0;
      if (perKg > 0) es.core.etomSuppr = Math.min(1, (es.core.etomSuppr ?? 0) + perKg / ETOM_SUPPR_REF_MG_KG);
    } else if (d.agent === 'insulinDextrose' && d.amountUnit === 'units') { // FU-10 E8```

In `packages/engine-core/src/l2/endo/adapters.ts`, find:

```ts
import { ANTINOC_GA_FALLBACK, EPI_EXO_PG_PER_RATE_EQ, INSDEX_DEXTROSE_G_PER_UNIT } from './params.ts';```

Replace with:

```ts
import { ANTINOC_GA_FALLBACK, EPI_EXO_PG_PER_RATE_EQ, ETOM_SUPPR_REF_MG_KG, INSDEX_DEXTROSE_G_PER_UNIT } from './params.ts';```

In `packages/engine-core/src/l2/endo/adapters.ts`, find:

```ts
type DoseLike = { agent: string; amount: number; amountUnit: string };```

Replace with:

```ts
type DoseLike = { agent: string; amount: number; amountUnit: string; mgPerKg?: number | null };```

- [ ] **Step — the tests.** Create `test/l2/endo/fu10-adrenal.test.ts`: (1) `cortResponseOf` is 1 for a normal patient,
  0.5 for the profile, 0.4 after a full etomidate dose and 0.2 for both; (2) the suppression halves in ≈ 8 h; (3)
  `cortBasalF` lowers the resting cortisol and `svrF` falls below 1 with it, while a HIGH cortisol never raises `svrF`.
  Create `test/engine/fu10-adrenal.test.ts`: etomidate 0.3 mg/kg vs propofol 2 mg/kg under 4 h of surgical stimulus →
  cortisol ratio ≤ 0.8; the adrenal-insufficiency patient's MAP after induction is lower than normal and phenylephrine
  100 µg raises it ≤ 0.8 × the normal patient's rise, with the `it.fails` for the surgical arm (−4.4 vs beyond 5 mmHg).
- [ ] **Step — run.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/endo test/engine/fu10-adrenal.test.ts test/engine/endo-acceptance.test.ts test/engine/endo-circ-acceptance.test.ts` → green.
- [ ] **Step — the ET runner.** `./run.sh cli.ts ET-34 ET-15a ET-16a ET-16b ET-16c ET-26b` → the rows above.
- [ ] **Commit and push.** `git add -A packages/engine-core && git commit -m "feat(7e): etomidate suppresses the cortisol response; adrenal insufficiency is a basal deficit (FU-10 E10, E13)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" && git push`

---

### Task A7: E7(a–c) — insulin deficiency: the omitted basal insulin, ketogenesis and the DKA potassium (7e → 7c; PROTOTYPED)

**Files:** Modify `packages/engine-core/src/types-endo.ts`, `src/l2/endo/{core,params,adapters}.ts`,
`src/l2/blood/core.ts` (**E-FU10-2**: one line), `test/l2/endo/core.test.ts` (**E-FU10-4**: the `T1` fixture);
create `packages/engine-core/test/l2/endo/fu10-insulin-deficit.test.ts` and
`packages/engine-core/test/engine/fu10-insulin-omission.test.ts` (SLOW → `SLOW` + `SLOW_A`); modify `vite.config.ts`.
**Overlap:** FU-9 A3/A5/A6 edit `l2/blood/core.ts` (citrate clearance, the COP calibration, the K⁺ set point on
total-body K) — this task adds ONE line after the `drug` K⁺ line, which FU-9's A6 block also quotes: whichever lands
second re-anchors on the merged statement (the added line is independent of the K⁺ set point itself). FU-8 A16 carries
`basalInsulin` into the scenario schema (Requests).

**Why (research/14 E7, ET-18a NE, ET-18b MI, ET-23c WR, ET-23d PL-for-the-wrong-reason):** the type 1 profile always
carried its basal insulin (`core.ts:101–104`), so the commonest teaching case — the missed dose — was not expressible;
insulin deficiency made no ketones (DKA was only 7c's instructor condition and an INPUT to 7e); and the instructor's
DKA presented HYPOkalaemic (K⁺ 3.70 against the healthy twin's 4.18), because the two DKA causes of hyperkalaemia
(insulinopenia and hyperosmolality) had no path — 7e's K⁺ term read only SECRETED insulin above basal.

**Mechanism (D7):** (a) `endo.basalInsulin: false` omits the long-acting insulin of a type 1 patient; (b) the insulin
deficit 7e already integrates (`egpDef`) drives a ketoacid production rate into 7c's pool through one new seam
(`blood.core.endoKetoMmolMin`), so the acidaemia, the anion gap, `out.dkaSeverity` and the Kussmaul drive emerge from
7c's own chemistry; (c) the deficit and hyperosmolar hyperglycaemia shift K⁺ out of the cells, with the instructor's
`dka` condition counting as insulinopenia.

**Measured (prototype), type 1 with the basal insulin omitted, 6 h:** glucose **7.2 → 32.3 mmol/L**, insulin 0,
ketoacids **99 mmol (≈ 5.8 mmol/L), `dkaSeverity` 0.28**, pH **7.41 → 7.34**, K⁺ **4.18 → 5.5**. The same patient WITH
its basal insulin is unchanged (glucose 7.2, ketones 0, K⁺ 4.17). The instructor's `dka 1`: K⁺ **4.49 vs the healthy
4.18** (was 3.70) and intubation's acidaemia adds **+0.48** (was +0.04). ET-18a/18b stay NE/MI in the published runner
(its arms carry the basal insulin; the executor adds `endo.basalInsulin: false` to its scratch copy and quotes the
numbers). Recorded for Ali: full ketoacidosis takes ≈ 8 h, slower than the guidelines' "within hours" for a missed
dose — the rate constant is [ENG] and is Ali's calibration row, not tuned here.
**FU-4 check:** `test/engine/blood-k-rhythm.test.ts`, `blood-hyperk.test.ts`, `blood-sanity-acid.test.ts` green; the
healthy and type 2 patients have `egpDef` 0, so every non-diabetic row is bit-identical (ET-16c, ET-17, ET-20a–c).

- [ ] **Step — the edits** (each find matches exactly once in application order; the chained ones are
  marked "(chained on <task>)" and match once in the applied state):

In `packages/engine-core/src/types-endo.ts`, find:

```ts
export interface EndoProfileInput {
  diabetes?: 'none' | 'type1' | 'type2';```

Replace with:

```ts
export interface EndoProfileInput {
  diabetes?: 'none' | 'type1' | 'type2';
  /** FU-10 E7: type 1 only — `false` OMITS the long-acting basal insulin (the missed-dose case: ketosis within hours).
   * Default `true` (the profile as it behaved before FU-10). FU-8 A16 carries it into `pme-scenario/1`. */
  basalInsulin?: boolean;```

In `packages/engine-core/src/l2/endo/core.ts`, find:

```ts
export interface EndoProfile {
  diabetes: 'none' | 'type1' | 'type2';```

Replace with:

```ts
export interface EndoProfile {
  diabetes: 'none' | 'type1' | 'type2';
  /** FU-10 E7: type 1 only — false omits the long-acting basal insulin (insulin-deficient: ketogenesis, K⁺ efflux). */
  basalInsulin: boolean;```

In `packages/engine-core/src/l2/endo/core.ts`, find:

```ts
export const DEFAULT_ENDO_PROFILE: EndoProfile = { diabetes: 'none', thyroid: 'normal', adrenalInsufficiency: false };```

Replace with:

```ts
export const DEFAULT_ENDO_PROFILE: EndoProfile = { diabetes: 'none', thyroid: 'normal', adrenalInsufficiency: false, basalInsulin: true };```

In `packages/engine-core/src/l2/endo/core.ts`, find:

```ts
  if (p.diabetes === 'type1') return { gb: 130, si: 1, beta: 0, glucagon: 0, basalExo: true };```

Replace with:

```ts
  if (p.diabetes === 'type1') return { gb: 130, si: 1, beta: 0, glucagon: 0, basalExo: p.basalInsulin !== false }; // FU-10 E7```

In `packages/engine-core/src/l2/endo/params.ts`, find:

```ts
export const MH_K_EFFLUX = 2.2;```

Replace with:

```ts
/**
 * FU-10 E7 — ketogenesis from the insulin DEFICIT. 7e's glucose model already integrates the deficit as `egpDef` (0–1,
 * τ 3 h: the insulinopenic release of hepatic output); unrestrained lipolysis and hepatic ketogenesis follow the same
 * deficit, so the ketoacid production rate is KETO_MMOL_MIN_MAX · egpDef per 70 kg, delivered to 7c's ketoacid pool.
 * Size [ENG]: 25 mmol/L of ketoacids in ≈ 17 L of ECF is 7c's established DKA (`DKA_KETO_MMOL_L`), and omitted basal
 * insulin in type 1 produces ketosis (β-hydroxybutyrate > 3 mmol/L) within hours (JBDS-IP perioperative diabetes 2023;
 * JBDS DKA 2023; Kitabchi AE et al., Diabetes Care 2009;32:1335) — 0.5 mmol/min at a full deficit reaches ≈ 3 mmol/L in
 * ≈ 100 min and the established pool in ≈ 8 h.
 */
export const KETO_MMOL_MIN_MAX = 0.5;
/**
 * FU-10 E11 — a fever is an added HEAT SOURCE, not only a raised set point. An anaesthetised, vasodilated patient
 * cannot defend a set point (no shivering, no vasoconstriction), so on main a septic or thyrotoxic patient under GA at
 * 21 °C stayed at 36.6–36.9 °C (research/14 ET-12, ET-13a) while the tables ask for 38.5–41 °C. Pyrogens (and thyroid
 * hormone) raise heat production directly: prostaglandin-driven thermogenesis in sepsis (Miller 10e ch. 46: fever raises
 * VO2 10–13 %/°C) and the uncoupled metabolism of thyrotoxicosis. PYROGEN_W_70: watts added at a full condition (sepsis
 * severity 1 / storm 1) for a 70 kg patient [ENG; fit target: a febrile core 38.5–41 °C under GA in a 21 °C theatre —
 * the metabolic vo2F rows already carry their own heat, this is what is left]. Scaled by body size like every heat term.
 */
export const PYROGEN_W_70 = 120;
/** FU-10 E11: the set-point shift at which the pyrogenic heat is full (the sepsis/storm rows' own shift) [ENG]. */
export const PYROGEN_SET_REF_C = 2;
/** FU-10 E7: the insulin deficit shifts K OUT of the cells (Kitabchi 2009: insulinopenia is one of DKA's two causes of
 * hyperkalaemia) — mmol/L of K set point at a full deficit [ENG: with the hyperosmolar term, DKA presents ≥ healthy]. */
export const KETO_K_EFFLUX = 1.4;
/** FU-10 E7: hyperosmolar hyperglycaemia is the other (water leaves the cells with K): mmol/L of K set point per mg/dL
 * of glucose above HYPEROSM_FROM_MGDL [ENG; Kitabchi 2009]. */
export const HYPEROSM_K_PER_MGDL = 0.002;
export const HYPEROSM_FROM_MGDL = 200;
export const MH_K_EFFLUX = 2.2;```

In `packages/engine-core/src/l2/endo/core.ts`, find:

```ts
  kShift: number; // mmol/L ENDOGENOUS K set-point shift (endogenous epinephrine β2, secreted insulin, MH efflux) → 7c```

Replace with:

```ts
  kShift: number; // mmol/L ENDOGENOUS K set-point shift (endogenous epinephrine β2, secreted insulin, MH efflux) → 7c
  /** FU-10 E7: ketoacid production from the INSULIN DEFICIT, mmol/min → 7c's ketoacid pool (`blood.core.endoKetoMmolMin`). */
  ketoMmolMin: number;```

In `packages/engine-core/src/l2/endo/core.ts`, find:

```ts
    kShift: st.kShift + INS_K_PER_UU * Math.max(0, g.i - g.iExo - IB_UU_ML) + MH_K_EFFLUX * x.mhActivity,```

Replace with:

```ts
    kShift: st.kShift + INS_K_PER_UU * Math.max(0, g.i - g.iExo - IB_UU_ML) + MH_K_EFFLUX * x.mhActivity
      // FU-10 E7: insulin deficiency and hyperosmolar hyperglycaemia drive K OUT of the cells (JBDS DKA 2023: K is often
      // high at presentation despite a total-body deficit) — the two DKA causes the old K path had no term for.
      // The instructor's `dka` condition (7c's severity) IS insulinopenia, so it carries the same efflux even though the
      // patient's own insulin is normal — without this DKA presented HYPOkalaemic (research/14 ET-23c)
      + KETO_K_EFFLUX * Math.max(g.egpDef, Math.min(1, Math.max(0, x.dkaSeverity))) + HYPEROSM_K_PER_MGDL * Math.max(0, g.g - HYPEROSM_FROM_MGDL),
    ketoMmolMin: KETO_MMOL_MIN_MAX * g.egpDef * (x.weightKg / 70),```

In `packages/engine-core/src/l2/endo/core.ts`, find:

```ts
import {
  AI_CORT_BASAL_F, ETOM_SUPPR_MAX, ETOM_SUPPR_T12_S,```

Replace with:

```ts
import {
  AI_CORT_BASAL_F, ETOM_SUPPR_MAX, ETOM_SUPPR_T12_S, HYPEROSM_FROM_MGDL, HYPEROSM_K_PER_MGDL, KETO_K_EFFLUX, KETO_MMOL_MIN_MAX,```

In `packages/engine-core/src/l2/endo/adapters.ts`, find:

```ts
  core?: { so?: { keto?: number }; fl?: { vp?: number; visf?: number; kfMult?: number }; endoKShift?: number; endoGlucoseMgDl?: number };```

Replace with:

```ts
  core?: { so?: { keto?: number }; fl?: { vp?: number; visf?: number; kfMult?: number };
    endoKShift?: number; endoGlucoseMgDl?: number; endoKetoMmolMin?: number };```

In `packages/engine-core/src/l2/endo/adapters.ts`, find:

```ts
  c.endoKShift = o.kShift;
  c.endoGlucoseMgDl = o.glucoseMgDl;```

Replace with:

```ts
  c.endoKShift = o.kShift;
  c.endoGlucoseMgDl = o.glucoseMgDl;
  c.endoKetoMmolMin = o.ketoMmolMin; // FU-10 E7: ketogenesis from the insulin deficit — 7c integrates it into its pool```

In `packages/engine-core/src/l2/blood/core.ts`, find:

```ts
  const drug = INSULIN_K_SHIFT * ef.ins + beta + ((bc as { endoKShift?: number }).endoKShift ?? 0); // Stage 7e (E-7e-3): endogenous epinephrine β2, secreted insulin, MH K efflux```

Replace with:

```ts
  const drug = INSULIN_K_SHIFT * ef.ins + beta + ((bc as { endoKShift?: number }).endoKShift ?? 0); // Stage 7e (E-7e-3): endogenous epinephrine β2, secreted insulin, MH K efflux
  // FU-10 E7 (E-FU10-2): Stage 7e's ketogenesis from the insulin deficit enters 7c's ketoacid pool, which 7c owns: the
  // acidaemia, the anion gap, `out.dkaSeverity` and the Kussmaul drive then all emerge as they do for `condition dka`
  so.keto += Math.max(0, (bc as { endoKetoMmolMin?: number }).endoKetoMmolMin ?? 0) * (dtS / 60);```

In `packages/engine-core/test/l2/endo/core.test.ts`, find:

```ts
const T1 = { diabetes: 'type1', thyroid: 'normal', adrenalInsufficiency: false } as const;```

Replace with:

```ts
const T1 = { diabetes: 'type1', thyroid: 'normal', adrenalInsufficiency: false, basalInsulin: true } as const; // FU-10 E7: the basal insulin can now be omitted```

- [ ] **Step — the tests.** Create `test/l2/endo/fu10-insulin-deficit.test.ts`: (1) `glucoseProfile` gives a type 1
  patient its basal insulin by default and none when `basalInsulin: false`; (2) after 2 h without it, `egpDef` > 0.4,
  `out.ketoMmolMin` > 0.15 and `out.kShift` > 0.5; (3) a patient on basal insulin keeps `ketoMmolMin` 0 and `kShift` 0;
  (4) the instructor's `dkaSeverity` 1 alone raises `kShift` above 1. Create
  `test/engine/fu10-insulin-omission.test.ts`: type 1 with the basal insulin omitted over 6 h — glucose above
  20 mmol/L, 7c's ketoacids above 3 mmol/L, `blood.out.dkaSeverity` > 0.15, K⁺ above the control's, and the control arm
  (basal insulin on) unchanged.
- [ ] **Step — run.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/endo test/l2/blood test/engine/fu10-insulin-omission.test.ts test/engine/blood-k-rhythm.test.ts test/engine/blood-sanity-acid.test.ts test/engine/blood-hyperk.test.ts` → green.
- [ ] **Step — the ET runner.** `./run.sh cli.ts ET-18 ET-23 ET-20a ET-20b ET-16c ET-17` → the rows above.
- [ ] **Commit and push.** `git add -A packages/engine-core && git commit -m "feat(7e,7c): insulin deficiency makes ketones and shifts potassium; the type 1 basal insulin can be omitted (FU-10 E7, E-FU10-2)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" && git push`

---

### Task A8: E11(a) — a fever is a heat source the anaesthetised patient cannot defend (7e; PROTOTYPED)

**Files:** Modify `packages/engine-core/src/l2/endo/{params,core,pipeline}.ts`, `src/l2/thermal/heat.ts`; create
`packages/engine-core/test/l2/endo/fu10-fever.test.ts` and `packages/engine-core/test/engine/fu10-fever.test.ts`
(SLOW → `SLOW` + `SLOW_A`); modify `vite.config.ts`.
**Overlap:** none (`l2/thermal/**` is FU-10's; the `l2/endo` lines are FU-10's own).

**Why (research/14 E11, ET-12 TW, ET-13a TW):** the sepsis and thyroid-storm rows raise the SET POINT (+2.2 / +1.8 °C),
but an anaesthetised, vasodilated patient has no effector to defend a set point, so under GA in a 21 °C theatre the
septic core sat at **36.86 °C** and the storm's at **36.58 °C** while the tables ask for 38.5–41 °C.

**Mechanism (D5 of the report's §3):** the inflammatory/thyrotoxic heat becomes a direct HEAT SOURCE (W), sized by the
same set-point shift the rows already declare, added to the heat balance beside the metabolic multiplier. VO₂/VCO₂ stay
the rows' own `vo2F`, so no metabolic number is counted twice.

**Measured (prototype):** the septic patient under GA reaches **38.50 °C** at 90 min (band 38.5–41, the edge);
`dEtco2` +10.1 at fixed ventilation; VO₂ 16.7 %/°C and HR 12.0 /°C (the ET cell's confounded per-°C items stay out of
their bands and keep their `it.fails` — the ET report's own HAND note explains why the rig cannot isolate them). The
thyroid storm reaches **37.61 °C at 1 h and 38.16 °C at 80 min** → `it.fails` "38.5–41 °C at 1 h — measured 37.61"
with the trade-off recorded for Ali: a source large enough to reach 38.5 °C at 1 h (170 W) takes the storm's heart rate
to 185 bpm, above its own 140–180 band (measured), so the size stays at the sepsis fit.
**FU-4 check:** ET-30 (iatrogenic overwarming to 38.31 °C with sweating from 38.0) unchanged; every non-febrile patient
has `setShiftC` 0, so `pyrogenW` is 0 and all thermal rows are bit-identical (ET-01a/b, ET-02, ET-04).

- [ ] **Step — the edits** (each find matches exactly once in application order; the chained ones are
  marked "(chained on <task>)" and match once in the applied state):

In `packages/engine-core/src/l2/endo/core.ts`, find:

```ts
  vo2F: number; // endocrine metabolic rate × (thyroid, conditions): VO2, VCO2 and heat (thermal.extraX)
  setShiftC: number; // fever set point added to the thermal thresholds```

Replace with:

```ts
  vo2F: number; // endocrine metabolic rate × (thyroid, conditions): VO2, VCO2 and heat (thermal.extraX)
  setShiftC: number; // fever set point added to the thermal thresholds
  /** FU-10 E11: pyrogenic heat production, W — a direct heat source the anaesthetised patient cannot switch off. */
  pyrogenW: number;```

In `packages/engine-core/src/l2/endo/core.ts`, find:

```ts
    vo2F: th.vo2F * cd.vo2F,
    setShiftC,```

Replace with:

```ts
    vo2F: th.vo2F * cd.vo2F,
    setShiftC,
    // FU-10 E11: the inflammatory/thyrotoxic heat source, sized by the same set-point shift the rows already declare
    pyrogenW: PYROGEN_W_70 * (x.weightKg / 70) * Math.min(1, Math.max(0, setShiftC / PYROGEN_SET_REF_C)),```

In `packages/engine-core/src/l2/endo/core.ts`, find:

```ts
  AI_CORT_BASAL_F, ETOM_SUPPR_MAX, ETOM_SUPPR_T12_S, HYPEROSM_FROM_MGDL, HYPEROSM_K_PER_MGDL, KETO_K_EFFLUX, KETO_MMOL_MIN_MAX,```

Replace with:

```ts
  AI_CORT_BASAL_F, ETOM_SUPPR_MAX, ETOM_SUPPR_T12_S, HYPEROSM_FROM_MGDL, HYPEROSM_K_PER_MGDL, KETO_K_EFFLUX, KETO_MMOL_MIN_MAX,
  PYROGEN_SET_REF_C, PYROGEN_W_70,```

In `packages/engine-core/src/l2/thermal/heat.ts`, find:

```ts
  extraX: number; // endocrine/condition metabolic heat multiplier (1 = none), written by 7e's endo core```

Replace with:

```ts
  extraX: number; // endocrine/condition metabolic heat multiplier (1 = none), written by 7e's endo core
  /** FU-10 E11: pyrogenic heat, W — a direct source (sepsis, SIRS, thyroid storm) the anaesthetised patient cannot
   * switch off, written by 7e's endo core beside `extraX`. It is heat only: VO2/VCO2 stay the rows' `vo2F`. */
  pyrogenW: number;```

In `packages/engine-core/src/l2/thermal/heat.ts`, find:

```ts
    metabolicW: basalW(st) + st.m0 * (st.extraX - 1),```

Replace with:

```ts
    metabolicW: basalW(st) + st.m0 * (st.extraX - 1) + Math.max(0, st.pyrogenW ?? 0), // FU-10 E11: the pyrogenic source```

In `packages/engine-core/src/l2/thermal/heat.ts`, find:

```ts
fluidWarmer: false, extraX: 1, dantE: 0, out: zeroOut(),```

Replace with:

```ts
fluidWarmer: false, extraX: 1, pyrogenW: 0, dantE: 0, out: zeroOut(),```

In `packages/engine-core/src/l2/endo/pipeline.ts`, find:

```ts
    th.extraX = o.vo2F; // endocrine metabolic heat (thyroid, sepsis, hypermetabolic)```

Replace with:

```ts
    th.extraX = o.vo2F; // endocrine metabolic heat (thyroid, sepsis, hypermetabolic)
    th.pyrogenW = o.pyrogenW; // FU-10 E11: the pyrogenic heat source (a fever the anaesthetised patient cannot defend)```

- [ ] **Step — the tests.** Create `test/l2/endo/fu10-fever.test.ts`: `out.pyrogenW` is 0 without a condition, rises
  with the sepsis/storm set-point shift, saturates at the reference shift and scales with body weight. Create
  `test/engine/fu10-fever.test.ts`: the septic patient under the GA flag at 21 °C passes 38 °C within 90 min while the
  healthy control cools, with the `it.fails` for the storm arm at 1 h.
- [ ] **Step — run.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/endo test/l2/thermal test/engine/fu10-fever.test.ts test/engine/endo-acceptance.test.ts test/engine/thermal-warmer.test.ts` → green.
- [ ] **Step — the ET runner.** `./run.sh cli.ts ET-12 ET-13a ET-13b ET-26a ET-26b ET-28 ET-30 ET-01a` → the rows above.
- [ ] **Commit and push.** `git add -A packages/engine-core && git commit -m "feat(7e): pyrogens are a heat source, so a septic or thyrotoxic patient is febrile under anaesthesia (FU-10 E11a)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" && git push`

---

