// The witnessed-VF card's four arrest courses, in MANUAL or MODELED, run through the controller's own ScenarioDriver on
// an engine built as the demo builds it, the engine running 60 s before the card is loaded (VF at 120 s):
//   (a) nothing; (b) asystole at VF + 150 s; (c) compressions and bag ventilation from VF + 60 s;
//   (d) charge at VF + 111 s, shock at + 120 s, the card's return of circulation at + 121 s.
// The course calls `tick` after every engine tick and `second` once a second from the card's load, each with the
// engine's pipeline state, until VF + 600 s. Recorded values are rounded to 1e-9 and stored run-length encoded.
import type { Command } from '@pme/engine-core';
import { BUILTIN_SCENARIOS } from '../../src/scenario/builtins.ts';
import { ScenarioDriver } from '../../src/scenario/driver.ts';
import { engineOptionsOf } from '../../src/scenario/patient.ts';
import { manualHost } from '../fakes/manual-host.ts';

export type Course = 'a' | 'b' | 'c' | 'd';
export type Mode = 'manual' | 'modeled';
export const COURSES: Course[] = ['a', 'b', 'c', 'd'];
export const MODES: Mode[] = ['manual', 'modeled'];
export type Rle = [number | null, number][];
export type Run = Record<string, Rle>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Pipeline = any;

const PRE_S = 60;
const AFTER_S = 600;
const TICK_S = 0.02;

export const round = (v: number) => Math.round(v * 1e9) / 1e9;
export function rle(values: Array<number | null>): Rle {
  const out: Rle = [];
  for (const v of values) {
    const last = out[out.length - 1];
    if (last && Object.is(last[0], v)) last[1]++;
    else out.push([v, 1]);
  }
  return out;
}

export interface CourseHooks {
  eeg: boolean;
  tick?: (p: Pipeline) => void;
  second: (p: Pipeline) => void;
}

export async function runCourse(c: Course, mode: Mode, hooks: CourseHooks): Promise<void> {
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
  if (hooks.eeg) e.dispatch(cmd({ type: 'device', action: { device: 'eeg', action: 'on' } }));
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
    hooks.tick?.(st());
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
          if (driver.runner?.stateId !== 'rosc') void driver.hook(cmd({ type: 'scenario', action: 'trigger', target: 'roscVf' }) as never);
        });
      }
    }
    if (tick % 50 === 0 && loaded) hooks.second(st());
    if (tick % 3000 === 0) await new Promise<void>((r) => setImmediate(r));
  }
}
