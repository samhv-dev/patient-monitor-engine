// Plan F2: F0's 1 Hz engine trace of the A4 MH path replayed through a /2 fixture card with design §4.1's nine phases and
// the † limits as PROPOSED there (§12 Q1 is open for the owner). The phase sequence and the entry times are PRINTED for F8
// and for the owner's ruling, never asserted: on the A4 path EtCO₂ climbs back at normal ventilation and a second dose
// follows, so the model may well enter `recrudescence`. The trace lives outside the repository (scratch/fv2-gate/base/
// golden/run1/a4-mh-trace.json); without PME_FV2_MH_TRACE the test is skipped.
//   PME_FV2_MH_TRACE=<path> npx -y pnpm@9.15.9 --filter @pme/controller test -- phase-runner-mh-trace
// Inputs per trace row, all rank 3: the `state` values and its rhythm id, `labs` ph/lactate/k, `endo` mhActivity, and the
// signals F4 will put on the state event, stood in for from the trace: pulse = no `hemo.circ.arrest`, the dantrolene
// effect from the truth tree, and the set minute ventilation as rr × VT of the state values (the trace has no ventilator
// setting; under controlled ventilation the two are equal). No beat MAP in the trace: `map` is not fed (no rule reads it).
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { PhaseRunner } from '../../src/scenario/phase-runner.ts';
import type { RunnerInputV2, ScenarioDocV2 } from '../../src/scenario/types-v2.ts';
import { validateScenario } from '../../src/scenario/validate.ts';

const TRACE = process.env.PME_FV2_MH_TRACE ?? '';

/** Design §4.1 as written; every number marked † there is the design's proposal, not a ruling. */
export const MH_V2_FIXTURE = {
  schema: 'pme-scenario/2', id: 'mh-v2-fixture', title: 'MH, design §4.1 phases (fixture)',
  phases: [
    { id: 'baseline', label: 'Baseline', initial: true, next: ['latent'] },
    { id: 'latent', label: 'Latent', enter: { all: [{ value: { var: 'mhActivity', op: '>', value: 0.01 } }, { value: { var: 'etco2', op: '<=', value: 45 } }] }, next: ['earlySigns', 'treated'] },
    {
      id: 'earlySigns', label: 'Early signs',
      enter: { all: [
        { value: { var: 'etco2', op: '>', value: 45, forS: 20 } },
        { slope: { var: 'etco2', op: '>', perMin: 0.2, overS: 120 } },
        { unchanged: { var: 'setMinuteVentilationLMin', withinPct: 5, overS: 120 } },
        { slope: { var: 'hr', op: '>', perMin: 0, overS: 120 } },
      ] },
      next: ['established', 'treated', 'arrest'],
    },
    {
      id: 'established', label: 'Established',
      enter: { any: [{ value: { var: 'tempCore', op: '>', value: 38.5, forS: 10 } }, { all: [{ value: { var: 'mhActivity', op: '>', value: 0.5 } }, { value: { var: 'ph', op: '<', value: 7.25 } }] }] },
      next: ['treated', 'arrest'],
    },
    { id: 'treated', label: 'Treated', enter: { all: [{ value: { var: 'dantroleneE', op: '>', value: 0.1 } }, { slope: { var: 'mhActivity', op: '<', perMin: 0, overS: 60 } }] }, next: ['recovering', 'recrudescence', 'arrest'] },
    { id: 'recovering', label: 'Recovering', enter: { all: [{ value: { var: 'etco2', op: '<', value: 45 } }, { slope: { var: 'etco2', op: '<', perMin: 0, overS: 60 } }, { value: { var: 'mhActivity', op: '<', value: 0.1 } }] }, next: ['recrudescence', 'arrest'] },
    { id: 'recrudescence', label: 'Recrudescence', enter: { all: [{ visited: 'treated' }, { slope: { var: 'mhActivity', op: '>', perMin: 0, overS: 120 } }] }, next: ['treated', 'established', 'arrest'] },
    { id: 'arrest', label: 'Arrest', enter: { signal: 'pulseLoss' }, next: ['rosc'] },
    { id: 'rosc', label: 'ROSC', enter: { signal: 'rosc' }, next: ['treated', 'recrudescence', 'arrest'] },
  ],
  actions: [],
};

interface Row { t: number; state: Record<string, number | string>; labs: Record<string, number>; endo: Record<string, number>; arrest: unknown; dantroleneE: number | null }
const num = (o: Record<string, unknown>, keys: string[]) => Object.fromEntries(keys.filter((k) => typeof o[k] === 'number').map((k) => [k, o[k] as number]));
const mmss = (t: number) => `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(Math.round(t % 60)).padStart(2, '0')}`;

it.skipIf(!TRACE)('the F0 A4 MH trace through the §4.1 phases: the phase sequence and entry times, printed (Q1 open)', { timeout: 120_000 }, () => {
  const v = validateScenario(MH_V2_FIXTURE);
  expect(v.ok).toBe(true);
  const trace = JSON.parse(readFileSync(TRACE, 'utf8')) as { rows: Row[]; states: [number, string][]; acts: Array<{ press: string; at: number }> };
  const r = new PhaseRunner(MH_V2_FIXTURE as unknown as ScenarioDocV2);
  r.start(0);
  for (const row of trace.rows) {
    const s = row.state;
    const values = Object.fromEntries(Object.entries(s).filter(([, x]) => typeof x === 'number')) as Record<string, number>;
    const inputs: RunnerInputV2[] = [
      { kind: 'values', rank: 3, values },
      { kind: 'values', rank: 3, values: num(row.labs, ['ph', 'lactate', 'k']) },
      // the trace holds the endo event's MH activity (rounded to 0.01); the engine's signal is unrounded
      { kind: 'signals', signals: { pulse: !row.arrest, dantroleneE: row.dantroleneE ?? 0, setMinuteVentilationLMin: typeof s.rr === 'number' && typeof s.vt === 'number' ? (s.rr * s.vt) / 1000 : null, map: Number.NaN, mhActivity: num(row.endo, ['mhActivity']).mhActivity ?? Number.NaN } },
    ];
    if (typeof s.rhythm === 'string') inputs.push({ kind: 'rhythm', id: s.rhythm });
    r.advance(row.t, inputs);
  }
  const lines = [
    `F2 MH trace replay (${trace.rows.length} rows, ${TRACE.split('/').slice(-3).join('/')}); limits: design §4.1 proposals (†, Q1 open)`,
    '/2 phases (§4.1 fixture):',
    ...r.phases.map((p) => `  ${mmss(p.t)} (${p.t.toFixed(0).padStart(4)} s)  ${p.id}${p.exitT !== undefined ? `  → left ${p.exitT.toFixed(0)} s` : ''}`),
    '/1 states on the same run (F0 trace state log):',
    ...trace.states.map(([t, id]) => `  ${mmss(t)} (${t.toFixed(1).padStart(6)} s)  ${id}`),
    'presses:',
    ...trace.acts.map((a) => `  ${a.at.toFixed(1).padStart(6)} s  ${a.press}`),
  ];
  console.log(lines.join('\n'));
  expect(r.phases[0]?.id).toBe('baseline'); // the only assertion: the replay ran
});
