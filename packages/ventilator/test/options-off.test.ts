// Brief 157 (plan vent-skin-edp-ts.md V2): the device's breath behaviours are OPTIONS of the model, off by default, and
// with every option off the model is today's model BIT FOR BIT. fidelity.test.ts compares the reference scenarios with
// the original simulator at a 1e-3 tolerance (its fixture is rounded); this test pins the port's own output exactly:
// the sha256 of every reference scenario's whole 5 ms trace (Paw, Q, V, Pmus, phase, displayed Paw as Float64 bytes,
// the C1-corrected scenarios included) and its final numerics. The hash was taken on the base of this piece
// (origin/vent-v1-edp-ts-face 83354a05, before any product code changed) in the commit that added this file alone.
// If it fails on CI while this file's own first commit also fails there, the difference is the platform's floating
// point, not a regression; if it fails only after a product commit, that commit moved a trace.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createVent, loadPreset, resetPhysics, runScenario, setMode, stepVent, DT, SEED0, type VentConfig } from '../src/index.ts';

interface Trace { id: string; durS: number; setup: string }
const ref = JSON.parse(readFileSync(resolve(import.meta.dirname, 'fixtures/reference-traces.json'), 'utf8')) as { traces: Trace[] };
const PHASE = { insp: 0, pause: 1, exp: 2 } as const;
const BASE_SHA256 = '12367912c5aa73494961c08e20641b0c4ca930ed07e3b0584a9874540378b4c5';

function hashAll(off: Partial<VentConfig>): string {
  const h = createHash('sha256');
  for (const tr of ref.traces) {
    const vs = createVent();
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    new Function('S', 'setMode', 'loadPreset', 'runScenario', tr.setup)(
      vs.cfg, (m: never) => setMode(vs, m), (id: never) => loadPreset(vs, id), (id: string) => runScenario(vs, id),
    );
    Object.assign(vs.cfg, off);
    resetPhysics(vs);
    vs.seed = SEED0;
    const n = Math.round(tr.durS / DT);
    for (let i = 1; i <= n; i++) {
      stepVent(vs);
      const p = vs.p;
      h.update(Float64Array.of(p.Paw, p.Q, p.V, p.Pmus, PHASE[p.phase], p.dPaw ?? 0));
    }
    const m = vs.p.measured;
    h.update(Float64Array.of(vs.p.breathCount, m.PIP, m.PLAT, m.RR, m.VTE, m.MV, m.P01, m.autoPEEP, m.Pmean));
  }
  return h.digest('hex');
}

describe('every V2 option off is the model of 83354a05, bit for bit', () => {
  it('the options left out (the default) reproduce the base traces exactly', () => {
    expect(hashAll({})).toBe(BASE_SHA256);
  });
});
