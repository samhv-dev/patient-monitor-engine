// Brief 157 (plan vent-skin-edp-ts.md V2): the device's breath behaviours are OPTIONS of the model, off by default, and
// with every option off the model is the base model BIT FOR BIT. fidelity.test.ts compares the reference scenarios with
// the original simulator at a 1e-3 tolerance (its fixture is rounded); this test compares the current model exactly
// with a frozen copy of the base's vent.ts (fixtures/vent-base-83354a05.ts, 83354a05, before any V2 product code), both
// run here in the same process: every reference scenario's whole 5 ms trace (Paw, Q, V, Pmus, phase, displayed Paw)
// and its final numerics, compared with Object.is, so the proof holds on every platform. (Brief 157's first version
// pinned the traces' sha256, 12367912…b4c5 on a Mac's Node 26; CI's Linux and Node 22 gave another hash for the same
// code, so a pinned hash proves nothing across platforms.)
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import * as cur from '../src/vent.ts';
import { SEED0, type VentConfig, type VentState } from '../src/index.ts';
import * as base from './fixtures/vent-base-83354a05.ts';

interface Trace { id: string; durS: number; setup: string }
const ref = JSON.parse(readFileSync(resolve(import.meta.dirname, 'fixtures/reference-traces.json'), 'utf8')) as { traces: Trace[] };
const PHASE = { insp: 0, pause: 1, exp: 2 } as const;
type Model = typeof base;

function trace(m: Model, tr: Trace, off: Partial<VentConfig>): number[] {
  const vs: VentState = m.createVent();
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  new Function('S', 'setMode', 'loadPreset', 'runScenario', tr.setup)(
    vs.cfg, (x: never) => m.setMode(vs, x), (id: never) => m.loadPreset(vs, id), (id: string) => m.runScenario(vs, id),
  );
  Object.assign(vs.cfg, off);
  m.resetPhysics(vs);
  vs.seed = SEED0;
  const out: number[] = [];
  const n = Math.round(tr.durS / m.DT);
  for (let i = 1; i <= n; i++) {
    m.stepVent(vs);
    const p = vs.p;
    out.push(p.Paw, p.Q, p.V, p.Pmus, PHASE[p.phase], p.dPaw ?? 0);
  }
  const k = vs.p.measured;
  out.push(vs.p.breathCount, k.PIP, k.PLAT, k.RR, k.VTE, k.MV, k.P01, k.autoPEEP, k.Pmean);
  return out;
}

function firstDifference(a: number[], b: number[]): number {
  if (a.length !== b.length) return Math.min(a.length, b.length);
  for (let i = 0; i < a.length; i++) if (!Object.is(a[i], b[i])) return i;
  return -1;
}

describe('every V2 option off is the model of 83354a05, bit for bit', () => {
  it('the reference set is the ten scenarios', () => expect(ref.traces.length).toBe(10));
  for (const [name, off] of [['left out (the default)', {}], ['set explicitly to off (backupMode off, pmaxAction cap)', { backupMode: 'off', pmaxAction: 'cap' }]] as const) {
    it(`the options ${name}: every sample of every reference scenario equals the base model's exactly`, () => {
      for (const tr of ref.traces) {
        const want = trace(base, tr, {});
        const got = trace(cur, tr, off as Partial<VentConfig>);
        const at = firstDifference(got, want);
        expect(at, `${tr.id}: first difference at value ${at} (${got[at]} vs ${want[at]})`).toBe(-1);
      }
    });
  }
});
