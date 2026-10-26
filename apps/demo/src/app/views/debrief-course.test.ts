// The course strip on the A3.1 tamponade record: four trends, the seven numbered moments, one pulseless band (the SpO₂
// line broken where the oximeter showed its dash, E126), within 80 mm at the 182 mm content width.
import type { ScenarioDoc } from '@pme/controller/scenario';
import { describe, expect, it } from 'vitest';
import a31 from '../../../../../docs/showcase/kit-round-a/fa/debrief-a3-tamponade-cue-card-path-kit-round-chromium.json';
import a4haem from '../../../../../docs/showcase/kit-round-a/debrief-a4-haemorrhage-e120-course-kit-round-chromium.json';
import a4mh from '../../../../../docs/showcase/kit-round-a/debrief-a4-mh-e119-induction-sequence-and-early-call-kit-round-chromium.json';
import { keyMoments } from '../debrief-moments.ts';
import { emptyRun, type RunData } from '../record.ts';
import tamponade from '../showcase/showcase-tamponade.json';
import { COURSE_W, courseSvg, placeBadges } from './debrief-course.ts';

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

  // E126: every line is what the monitor showed — the SpO₂ line breaks only where the oximeter showed its dash (E60
  // broke it over the whole band); here the dash is put on 468–500 s and the compression reading runs on after it
  it('the SpO₂ line breaks where the oximeter showed its dash and runs through the CPR reading; HR is drawn across the band', () => {
    const dd = run();
    for (const s of dd.samples) if (s.t >= 468 && s.t <= 500) s.spo2 = null;
    const svg2 = courseSvg(dd, keyMoments(dd), { trends: [...TRENDS] });
    const path = (k: string) => new RegExp(`data-trend="${k}"[^]*?<path d="([^"]*)"`).exec(svg2)?.[1] ?? '';
    const xs = (p: string) => [...p.matchAll(/[ML]([\d.]+) /g)].map((m) => Number(m[1]));
    const end = Math.max(...dd.samples.map((s) => s.t));
    const x = (t: number) => 108 + (t / end) * (COURSE_W - 108 - 10);
    const within = (p: string, a: number, b: number) => xs(p).filter((v) => v > x(a) + 0.5 && v < x(b) - 0.5).length;
    expect(within(path('spo2'), 468, 500)).toBe(0);
    expect(within(path('spo2'), 500, 655)).toBeGreaterThan(100);
    expect(within(path('hr'), 468, 655)).toBeGreaterThan(100);
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

// UI review #19: on the A4 haemorrhage record badges 18 and 19 ran past the plot's right edge (19 clipped, 18 under it)
// and the MH badges 9–12 touched. Badges keep apart, stay inside the plot, and sit as near their moment as they can.
describe('the key-moment badges never collide (UI review #19)', () => {
  const xs = (svg: string) => [...svg.matchAll(/<text x="([\d.]+)" y="15"/g)].map((m) => Number(m[1]));
  for (const [name, rec, n] of [['A4 haemorrhage', a4haem, 19], ['A4 MH', a4mh, 13]] as const) {
    it(`${name}: ${n} badges, 18 units apart or more, all inside the plot`, () => {
      const d = structuredClone(rec.record) as unknown as RunData;
      for (const learner of [false, true]) {
        const b = xs(courseSvg(d, keyMoments(d), { trends: [...TRENDS], learner }));
        expect(b).toHaveLength(n);
        for (let i = 1; i < b.length; i++) expect((b[i] as number) - (b[i - 1] as number), `badges ${i} and ${i + 1}`).toBeGreaterThanOrEqual(17.9);
        expect(Math.min(...b)).toBeGreaterThanOrEqual(108 + 7 - 0.05);
        expect(Math.max(...b)).toBeLessThanOrEqual(COURSE_W - 10 - 7 + 0.05);
      }
    });
  }

  it('a lone badge sits on its moment; a crowded run is centred on its moments and held inside the plot', () => {
    expect(placeBadges([200, 400], 115, 711, 18)).toEqual([200, 400]);
    expect(placeBadges([300, 300, 300], 115, 711, 18)).toEqual([282, 300, 318]);
    expect(placeBadges([705, 708, 711], 115, 711, 18)).toEqual([675, 693, 711]); // pushed left, not off the edge
    expect(placeBadges([115, 115], 115, 711, 18)).toEqual([115, 133]);
    // a later run that meets an earlier one merges with it
    const m = placeBadges([300, 310, 330, 335], 115, 711, 18);
    for (let i = 1; i < m.length; i++) expect((m[i] as number) - (m[i - 1] as number)).toBeCloseTo(18, 6);
    expect(m.reduce((a, v) => a + v, 0) / 4).toBeCloseTo((300 + 310 + 330 + 335) / 4, 6);
    // more badges than the plot holds at 18 share the width evenly
    const many = placeBadges(Array.from({ length: 50 }, () => 400), 115, 711, 18);
    expect(many[0]).toBeCloseTo(115, 6);
    expect(many.at(-1)).toBeCloseTo(711, 6);
  });
});
