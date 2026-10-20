// The course strip on the A3.1 tamponade record: four trends, the seven numbered moments, one pulseless band (where
// the SpO₂ line is broken), within 80 mm at the 182 mm content width.
import type { ScenarioDoc } from '@pme/controller/scenario';
import { describe, expect, it } from 'vitest';
import a31 from '../../../../../docs/showcase/kit-round-a/fa/debrief-a3-tamponade-cue-card-path-kit-round-chromium.json';
import { keyMoments } from '../debrief-moments.ts';
import { emptyRun, type RunData } from '../record.ts';
import tamponade from '../showcase/showcase-tamponade.json';
import { COURSE_W, courseSvg } from './debrief-course.ts';

const TRENDS = ['hr', 'map', 'spo2', 'etco2'] as const;
const run = (): RunData => {
  const d = structuredClone(a31.record) as unknown as RunData;
  (d.doc as ScenarioDoc).objectives = structuredClone((tamponade as unknown as ScenarioDoc).objectives);
  return d;
};
const count = (s: string, re: RegExp) => (s.match(re) ?? []).length;

describe('courseSvg on A3.1', () => {
  const d = run();
  const ms = keyMoments(d);
  const svg = courseSvg(d, ms, { trends: [...TRENDS] });

  it('four trends, seven badges (team, patient), one band labelled with its span', () => {
    expect([...svg.matchAll(/data-trend="(\w+)"/g)].map((m) => m[1])).toEqual([...TRENDS]);
    expect(count(svg, /class="db-badge /g)).toBe(7);
    expect([...svg.matchAll(/data-n="(\d+)"/g)].map((m) => Number(m[1]))).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(count(svg, /class="db-badge db-team"/g)).toBe(4);
    expect(count(svg, /class="db-badge db-patient"/g)).toBe(3);
    expect(count(svg, /<rect class="db-pulseless"/g)).toBe(1);
    expect(svg).toContain('pulseless 3 min 07 s');
  });

  it('the SpO₂ line breaks inside the pulseless band; HR is drawn across it', () => {
    const path = (k: string) => new RegExp(`data-trend="${k}"[^]*?<path d="([^"]*)"`).exec(svg)?.[1] ?? '';
    const xs = (p: string) => [...p.matchAll(/[ML]([\d.]+) /g)].map((m) => Number(m[1]));
    const end = Math.max(...d.samples.map((s) => s.t));
    const x = (t: number) => 108 + (t / end) * (COURSE_W - 108 - 10);
    const inside = (p: string) => xs(p).filter((v) => v > x(468) + 0.5 && v < x(655) - 0.5).length;
    expect(inside(path('spo2'))).toBe(0);
    expect(inside(path('hr'))).toBeGreaterThan(100);
  });

  it('at most 80 mm high at 182 mm wide; the label lists the moments', () => {
    const [, , w, h] = (/viewBox="([^"]+)"/.exec(svg)?.[1] ?? '').split(' ').map(Number);
    expect(w).toBe(COURSE_W);
    expect(((h as number) / (w as number)) * 182).toBeLessThanOrEqual(80);
    expect(svg).toContain('aria-label="The course, 00:00 to 11:');
    expect(svg).toContain('2 at 07:48, patient, Pulse lost (the model) · PEA');
  });

  it('a trend never measured is left out; no moments, no badges', () => {
    const e: RunData = { ...emptyRun('x', 70, 0), samples: Array.from({ length: 60 }, (_, t) => ({ t, hr: 80, map: null, spo2: 97, etco2: null, rr: null, temp: null, k: null, lactate: null, ph: null, glucose: null, tcore: null })) };
    const s = courseSvg(e, [], { trends: [...TRENDS], learner: true });
    expect([...s.matchAll(/data-trend="(\w+)"/g)].map((m) => m[1])).toEqual(['hr', 'spo2']);
    expect(count(s, /class="db-badge/g)).toBe(0);
    expect(s).toContain('aria-label="Your run, 00:00 to 00:59"');
  });
});
