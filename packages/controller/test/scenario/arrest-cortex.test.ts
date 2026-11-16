// The EEG cortex through the witnessed-VF card's four arrest courses, in MANUAL and MODELED, against a fixture of the
// cortical state every second. The card runs through the controller's own ScenarioDriver on an engine built as the demo
// builds it, the engine running 60 s before the card is loaded (VF at 120 s), the EEG on:
//   (a) nothing; (b) asystole at VF + 150 s; (c) compressions and bag ventilation from VF + 60 s;
//   (d) charge at VF + 111 s, shock at + 120 s, the card's return of circulation at + 121 s.
// The fixture stores each cortex field run-length encoded, rounded to 1e-9 (a last-ULP libm difference between runners
// cannot reach the 9th decimal except at a rounding edge). Regenerate only when a ruled physiology change says so:
//   PME_ARREST_CORTEX_WRITE=1 npx -y pnpm@9.15.9 --filter @pme/controller exec vitest run test/scenario/arrest-cortex.test.ts
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Command } from '@pme/engine-core';
import { BUILTIN_SCENARIOS } from '../../src/scenario/builtins.ts';
import { ScenarioDriver } from '../../src/scenario/driver.ts';
import { engineOptionsOf } from '../../src/scenario/patient.ts';
import { manualHost } from '../fakes/manual-host.ts';

const FIXTURE = new URL('./fixtures/arrest-cortex.json', import.meta.url);
const WRITE = process.env.PME_ARREST_CORTEX_WRITE === '1';
const PRE_S = 60;
const AFTER_S = 600;
const TICK_S = 0.02;

type Course = 'a' | 'b' | 'c' | 'd';
type Mode = 'manual' | 'modeled';
type Rle = [number, number][];
type Run = Record<string, Rle>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Pipeline = any;

const round = (v: number) => Math.round(v * 1e9) / 1e9;
function rle(values: number[]): Rle {
  const out: Rle = [];
  for (const v of values) {
    const last = out[out.length - 1];
    if (last && Object.is(last[0], v)) last[1]++;
    else out.push([v, 1]);
  }
  return out;
}

async function course(c: Course, mode: Mode): Promise<Run> {
  const doc = JSON.parse(JSON.stringify(BUILTIN_SCENARIOS['acls-vf-witnessed']));
  doc.mode = mode;
  const eo = engineOptionsOf(doc, doc.seed ?? 7);
  const host = manualHost({ ...eo, mode, truthHz: 1 } as never);
  const e = host.engine;
  const st = () => (e as unknown as { st: Pipeline }).st;
  const driver = new ScenarioDriver({ target: host });
  let n = 0;
  const cmd = (body: object, by = 'instructor'): Command => ({ id: `c${++n}`, issuedBy: by, ...body }) as unknown as Command;
  const ev = (event: object) => cmd({ type: 'applyEvent', event }, 'learner');
  e.dispatch(cmd({ type: 'device', action: { device: 'eeg', action: 'on' } }));
  const cols: Record<string, number[]> = {};
  const did = new Set<string>();
  let loaded = false;
  let vfT = -1;
  for (let tick = e.now().tick + 1; ; tick++) {
    const t = tick * TICK_S;
    e.advanceTo(t);
    if (!loaded && t >= PRE_S) {
      driver.load(doc);
      loaded = true;
    }
    driver.poll();
    if (vfT < 0 && driver.runner?.stateId === 'vf') vfT = t;
    const rel = vfT < 0 ? -1 : t - vfT;
    if (rel > AFTER_S) break;
    const once = (k: string, at: number, f: () => void) => {
      if (rel >= at && !did.has(k)) {
        did.add(k);
        f();
      }
    };
    if (vfT >= 0) {
      if (c === 'b') once('asystole', 150, () => e.dispatch(cmd({ type: 'setRhythm', rhythm: 'asystole', when: 'now' })));
      if (c === 'c')
        once('cpr', 60, () => {
          e.dispatch(ev({ kind: 'cpr', active: true, rate: 110, ventilation: '30:2' }));
          e.dispatch(ev({ kind: 'ventilation', source: 'bvm', rr: 10, vtMl: 500, fio2: 1 }));
        });
      if (c === 'd') {
        once('charge', 111, () => e.dispatch(ev({ kind: 'defib', action: 'charge', energyJ: 200 })));
        once('shock', 120, () => e.dispatch(ev({ kind: 'defib', action: 'shock', energyJ: 200 })));
        once('rosc', 121, () => {
          if (driver.runner?.stateId !== 'rosc') void driver.hook(cmd({ type: 'scenario', action: 'trigger', target: 'roscVf' }));
        });
      }
    }
    if (tick % 50 === 0 && loaded) {
      for (const [k, v] of Object.entries(st().eeg.cortex as Record<string, number>)) (cols[k] ??= []).push(round(v));
    }
    if (tick % 3000 === 0) await new Promise<void>((r) => setImmediate(r));
  }
  return Object.fromEntries(Object.entries(cols).map(([k, v]) => [k, rle(v)]));
}

const runs: Record<string, Run> = {};
const fixture: Record<string, Run> = !WRITE && existsSync(FIXTURE) ? JSON.parse(readFileSync(FIXTURE, 'utf8')) : {};

describe('the EEG cortex through the witnessed-VF arrest courses', () => {
  for (const mode of ['manual', 'modeled'] as Mode[])
    for (const c of ['a', 'b', 'c', 'd'] as Course[]) {
      const key = `${c}-${mode}`;
      it(`course ${c}, ${mode}: the cortical state every second equals the fixture`, async () => {
        runs[key] = await course(c, mode);
        if (WRITE) return;
        expect(runs[key]).toEqual(fixture[key]);
      }, 900_000);
    }
  it.runIf(WRITE)('writes the fixture', () => {
    writeFileSync(FIXTURE, `${JSON.stringify(runs)}\n`);
  });
});
