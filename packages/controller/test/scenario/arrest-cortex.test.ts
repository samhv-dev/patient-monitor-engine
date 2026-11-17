// The EEG cortex through the witnessed-VF card's four arrest courses (arrest-courses.ts), in MANUAL and MODELED with the
// EEG on, against a fixture of the cortical state every second.
// At every tick the organ model's cortex entry must equal the EEG cortex's own definition before the state existed,
// written out below on the brain's flow and the view it stepped on (bit for bit, on this runner).
// The fixture stores each cortex field run-length encoded, rounded to 1e-9 (a last-ULP libm difference between runners
// cannot reach the 9th decimal except at a rounding edge). Regenerate only when a ruled physiology change says so:
//   PME_ARREST_CORTEX_WRITE=1 npx -y pnpm@9.15.9 --filter @pme/controller exec vitest run test/scenario/arrest-cortex.test.ts
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { COURSES, MODES, rle, round, runCourse, type Course, type Mode, type Pipeline, type Run } from './arrest-courses.ts';

const FIXTURE = new URL('./fixtures/arrest-cortex.json', import.meta.url);
const WRITE = process.env.PME_ARREST_CORTEX_WRITE === '1';

const ca = (hb: number, sao2: number, pao2: number) => 1.34 * hb * sao2 + 0.003 * pao2;
/** The cortex's delivery and metabolic term as the EEG computed them before the brain had an energy state. */
function reference(p: Pipeline): { delivery: number; metabolic: number } {
  const v = p.organs.view;
  const delivery = (Math.max(0, p.organs.brain.cbfRel) * ca(v.hb, v.sao2, v.pao2)) / ca(14, 0.97, 95);
  return { delivery, metabolic: Math.max(0, Math.min(1, (20 / 50 - delivery) / (20 / 50 - 12 / 50))) };
}

async function course(c: Course, mode: Mode): Promise<Run> {
  const cols: Record<string, number[]> = {};
  let mismatches = 0;
  await runCourse(c, mode, {
    eeg: true,
    tick: (p) => {
      const ref = reference(p);
      const entry = p.organs.brain.energy.cortex;
      if (!Object.is(entry.delivery, ref.delivery) || !Object.is(entry.metabolic, ref.metabolic)) mismatches++;
    },
    second: (p) => {
      for (const [k, v] of Object.entries(p.eeg.cortex as Record<string, number>)) (cols[k] ??= []).push(round(v));
    },
  });
  expect(mismatches).toBe(0);
  return Object.fromEntries(Object.entries(cols).map(([k, v]) => [k, rle(v)]));
}

const runs: Record<string, Run> = {};
const fixture: Record<string, Run> = !WRITE && existsSync(FIXTURE) ? JSON.parse(readFileSync(FIXTURE, 'utf8')) : {};

describe('the EEG cortex through the witnessed-VF arrest courses', () => {
  for (const mode of MODES)
    for (const c of COURSES) {
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
