// Breathing through the witnessed-VF card's four arrest courses (arrest-courses.ts), in MANUAL and MODELED, against a
// fixture: every second, the spontaneous drive's record, the brainstem gate's state and the ventilation and gas values
// they set; at every tick, a hash of the gate's state bit for bit (its values are sums of fixed steps, so the hash
// is the same on every runner).
// The fixture stores each second's field run-length encoded, rounded to 1e-9 (absent or not finite: null). A value
// equals the fixture within one unit of its 9th significant digit: runners differ in the last bits of the gas and
// drive values (hundreds of mmHg or mL), which a rounding to fixed decimals does not absorb.
// Regenerate only when a ruled physiology change says so:
//   PME_ARREST_BREATHING_WRITE=1 npx -y pnpm@9.15.9 --filter @pme/controller exec vitest run test/scenario/arrest-breathing.test.ts
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { COURSES, MODES, rle, round, runCourse, type Course, type Mode, type Pipeline, type Rle, type Run } from './arrest-courses.ts';

const FIXTURE = new URL('./fixtures/arrest-breathing.json', import.meta.url);
const WRITE = process.env.PME_ARREST_BREATHING_WRITE === '1';

const SPONT = ['rr', 'vt', 've', 'fatigue', 'paco2Rest', 'paco2Set', 'nextT', 'pc', 'plS', 'effort', 'muscle', 'effortRr'] as const;
/** The brainstem gate's state: seconds unperfused and the reopening gate (absent: perfused, open). */
const gateOf = (p: Pipeline): { anoxS?: number; gate?: number } => p.organs.brain.energy.brainstem;

const value = (v: number | undefined) => (v === undefined || !Number.isFinite(v) ? null : round(v));

const expand = (r: Rle) => r.flatMap(([v, n]) => Array<number | null>(n).fill(v));
const close = (a: number | null, b: number | null) => (a === null || b === null ? a === b : Math.abs(a - b) <= 2e-9 * Math.max(1, Math.abs(b)));
/** Where a run departs from the fixture: `field @ second: run ≠ fixture`, the first of each field. */
function departures(run: Run, want: Run): string[] {
  const out: string[] = [];
  for (const k of new Set([...Object.keys(run), ...Object.keys(want)])) {
    const a = expand(run[k] ?? []);
    const b = expand(want[k] ?? []);
    const i = a.length !== b.length ? Math.min(a.length, b.length) : a.findIndex((v, j) => !close(v, b[j] ?? null));
    if (i >= 0) out.push(`${k} @ ${i} s: ${a[i]} ≠ ${b[i]}`);
  }
  return out;
}

/** FNV-1a over the bytes of each tick's gate state (absent = −1). */
function hasher() {
  const f = new Float64Array(2);
  const bytes = new Uint8Array(f.buffer);
  let h = 0x811c9dc5;
  return {
    add(g: { anoxS?: number; gate?: number }) {
      f[0] = g.anoxS ?? -1;
      f[1] = g.gate ?? -1;
      for (const b of bytes) h = Math.imul(h ^ b, 0x01000193) >>> 0;
    },
    hex: () => h.toString(16).padStart(8, '0'),
  };
}

async function course(c: Course, mode: Mode): Promise<{ run: Run; gateHash: string }> {
  const cols: Record<string, Array<number | null>> = {};
  const push = (k: string, v: number | undefined) => (cols[k] ??= []).push(value(v));
  const hash = hasher();
  await runCourse(c, mode, {
    eeg: false,
    tick: (p) => hash.add(gateOf(p)),
    second: (p) => {
      const s = p.resp.spont ?? {};
      for (const k of SPONT) push(`spont.${k}`, s[k]);
      const g = gateOf(p);
      push('brainstem.anoxS', g.anoxS);
      push('brainstem.gate', g.gate);
      push('resp.vaLpm', p.resp.vaLpm);
      push('resp.etco2', p.resp.etco2);
      push('resp.co2.pf', p.resp.co2.pf);
      push('resp.o2.sa', p.resp.o2.sa);
      push('resp.o2.pao2', p.resp.o2.pao2);
    },
  });
  return { run: Object.fromEntries(Object.entries(cols).map(([k, v]) => [k, rle(v)])), gateHash: hash.hex() };
}

const runs: Record<string, { run: Run; gateHash: string }> = {};
const fixture: typeof runs = !WRITE && existsSync(FIXTURE) ? JSON.parse(readFileSync(FIXTURE, 'utf8')) : {};

describe('breathing through the witnessed-VF arrest courses', () => {
  for (const mode of MODES)
    for (const c of COURSES) {
      const key = `${c}-${mode}`;
      it(`course ${c}, ${mode}: the breathing every second and the gate's state every tick equal the fixture`, async () => {
        runs[key] = await course(c, mode);
        if (c === 'a' || c === 'b') expect(runs[key].run['brainstem.anoxS']?.some(([v]) => v !== null)).toBe(true); // the gate is exercised
        if (WRITE) return;
        expect(runs[key].gateHash).toBe(fixture[key]?.gateHash);
        expect(departures(runs[key].run, fixture[key]?.run ?? {})).toEqual([]);
      }, 900_000);
    }
  it.runIf(WRITE)('writes the fixture', () => {
    writeFileSync(FIXTURE, `${JSON.stringify(runs)}\n`);
  });
});
