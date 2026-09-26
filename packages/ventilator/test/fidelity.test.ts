// Port fidelity: every reference scenario captured from the ORIGINAL simulator in headless Chrome
// (scripts/capture-reference.mjs → test/fixtures/reference-traces.json) runs on the TypeScript port with the
// same setup string, and the 50 Hz traces and final numerics must match.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createVent, loadPreset, resetPhysics, runScenario, setMode, stepVent, DT, SEED0, type VentState } from '../src/index.ts';

interface Trace { id: string; durS: number; setup: string; rows: number[][]; measured: Record<string, number>; breaths: number }
const ref = JSON.parse(readFileSync(resolve(import.meta.dirname, 'fixtures/reference-traces.json'), 'utf8')) as { traces: Trace[] };
const PHASE = { insp: 0, pause: 1, exp: 2 } as const;
/**
 * Correction C1 (VC cycles on the breath's own volume) changes three reference scenarios from the first VC breath
 * that starts on trapped gas: they are compared bit-for-bit UP TO that time (s); the corrected behaviour after it
 * is asserted in vent-corrections.test.ts. Every other scenario is compared whole.
 */
export const CORRECTED_FROM_S: Record<string, number> = { 'vc-decel-copd-rr20': 3.26, 'scn-breath-stack': 1.08, 'vc-spont-variability': 3.26 };

/** Run a reference scenario on the port: the SAME setup string, with S/setMode/loadPreset/runScenario bound to the port. */
export function runReference(tr: Trace): { vs: VentState; rows: number[][] } {
  const vs = createVent();
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  new Function('S', 'setMode', 'loadPreset', 'runScenario', tr.setup)(
    vs.cfg, (m: never) => setMode(vs, m), (id: never) => loadPreset(vs, id), (id: string) => runScenario(vs, id),
  );
  resetPhysics(vs);
  vs.seed = SEED0;
  const rows: number[][] = [];
  const n = Math.round(tr.durS / DT);
  for (let i = 1; i <= n; i++) {
    stepVent(vs);
    const p = vs.p;
    if (i % 4 === 0) rows.push([p.Paw, p.Q, p.V, p.Pmus, PHASE[p.phase], p.dPaw ?? 0]);
  }
  return { vs, rows };
}

export function maxErr(a: number[][], b: number[][], col: number, until = Infinity): number {
  let e = 0;
  for (let i = 0; i < Math.min(a.length, b.length, Math.round(until * 50)); i++) e = Math.max(e, Math.abs((a[i]![col] as number) - (b[i]![col] as number)));
  return e;
}

describe('port fidelity against the original v1.9 simulator', () => {
  it.each(ref.traces.map((t) => [t.id, t] as const))('%s', (id, tr) => {
    const { vs, rows } = runReference(tr);
    const until = CORRECTED_FROM_S[id] ?? Infinity;
    expect(rows.length).toBe(tr.rows.length);
    const tol = [1e-3, 1e-3, 1e-3, 1e-3, 0, 1e-3]; // Paw, flow L/s, volume mL, Pmus, phase, displayed Paw (fixture rounded to 0.001)
    tol.forEach((tl, col) => expect(maxErr(rows, tr.rows, col, until)).toBeLessThanOrEqual(tl));
    if (until === Infinity) {
      expect(vs.p.breathCount).toBe(tr.breaths);
      for (const k of ['PIP', 'PLAT', 'RR', 'VTE', 'MV', 'autoPEEP', 'Pmean'] as const) expect(vs.p.measured[k]).toBeCloseTo(tr.measured[k]!, 2);
    }
  });
});
