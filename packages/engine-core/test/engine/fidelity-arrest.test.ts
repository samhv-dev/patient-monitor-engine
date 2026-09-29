// FU-5 monitor-fidelity suite items 2–4 (research/10 §13): PEA, VF → CPR → ROSC and asystole, per skin where the
// vendors differ. MANUAL, the audit's arrest script (rhythm at 60 s, NIBP at 70 s, CPR 150–300 s with NIBP at 160 s,
// ROSC sinus 80 at 302 s). Sources: brief §4.3 (no pulse → SpO2 invalid after 10–30 s), research/05 §6 [S2] IFU p. 40
// (visual latching), p. 57 (non-pulsatile), p. 89, 99 (arrhythmia alarms, chaining); research/06 §4.2 (Saadat non-latching).
import { describe, expect, it } from 'vitest';
import { activeIds, M, monitorRun, VENTED, type MonRun, type Step } from '../helpers/monitor.ts';

const arrest = (rhythm: string, opts: Record<string, unknown> = {}): Step[] => [
  ...VENTED, [60, M.rhythm(rhythm, opts)], [70, M.nibp('start')], [150, M.cpr(true)], [160, M.nibp('start')], [300, M.cpr(false)],
  [302, M.rhythm('sinus', { rateBpm: 80 })],
];
const raisedAt = (run: MonRun, id: string) => run.alarms.filter((a) => a.id === id && a.state === 'raised').map((a) => a.t);
const firstRow = (run: MonRun, from: number, ok: (r: MonRun['rows'][number]) => boolean) => run.rows.find((r) => r.t > from && ok(r))?.t ?? Infinity;
const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;

describe('FU-5 fidelity 2: PEA (sinus 90 pulseless)', () => {
  it('HR = the electrical rate ± 3; PR and SpO2 invalid within 15 s; the ART pulse valid only from the fresh pre-arrest beats (≤ 6 s), then static with ABP NON-PULSATILE — philips-like keeps S/D/M of the flat line ([S2] p. 57, review ruling 3); ABPm LOW held until CPR', async () => {
    const run = await monitorRun({ mode: 'manual', steps: arrest('sinus', { rateBpm: 90, pulseless: true }), tEnd: 149 });
    const pea = run.rows.filter((r) => r.t >= 70);
    expect(Math.abs(mean(pea.map((r) => r.m.hr?.value ?? 0)) - 90)).toBeLessThanOrEqual(3);
    expect(firstRow(run, 60, (r) => r.m.pr?.flag === 'invalid') - 60).toBeLessThanOrEqual(15);
    expect(firstRow(run, 60, (r) => r.m.spo2?.flag === 'invalid') - 60).toBeLessThanOrEqual(15);
    expect(run.rows.filter((r) => r.t > 66 && r.m.prAbp?.flag === 'valid').map((r) => r.t)).toEqual([]);
    // no pulsatile S/D after the fresh beats: the kept static S/D are the flat line's 2 s max/min (e.g. 25/21 (22) with
    // the ventilator swing; 136/90 before the arrest) — review ruling 3
    expect(run.rows.filter((r) => r.t >= 70 && r.m.abpSys?.flag === 'valid' && (r.m.abpSys.value as number) - (r.m.abpDia?.value as number) > 5).map((r) => r.t)).toEqual([]);
    expect(pea.filter((r) => r.t >= 80).every((r) => activeIds(r).includes('abpNonPulsatile'))).toBe(true);
    const low = firstRow(run, 60, (r) => activeIds(r).includes('ART_M_LOW'));
    expect(low).toBeLessThan(90);
    expect(run.rows.filter((r) => r.t >= low && !activeIds(r).includes('ART_M_LOW')).map((r) => r.t)).toEqual([]);
  }, 120_000);
});

describe('FU-5 fidelity 3: VF → CPR → ROSC, per skin', () => {
  it.each([['philips-like', true], ['mindray-like', false], ['saadat-like', false]] as const)(
    '%s: VFIB ≤ 5 s; no HR / EXTREME / VTAC alarm raised while VFIB stands; CPR: SpO2 not valid, PR = 110 ± 5, EtCO2 10–25; NIBP FAILED ≤ 180 s after VF onset (sim ≤ 240 s); after ROSC VFIB latched (silent) only where the vendor latches (%s)',
    async (skin, latches) => {
      const run = await monitorRun({ mode: 'manual', skin, steps: arrest('vfCoarse'), tEnd: 330 });
      const vf = raisedAt(run, 'VFIB')[0] as number;
      expect(vf - 60).toBeLessThanOrEqual(5);
      const chained = ['HR_HIGH', 'HR_LOW', 'EXTREME_TACHY', 'EXTREME_BRADY', 'VTAC'];
      expect(run.alarms.filter((a) => a.state === 'raised' && chained.includes(a.id) && a.t >= vf && a.t < 302).map((a) => `${a.id}@${a.t}`)).toEqual([]);
      const cpr = run.rows.filter((r) => r.t >= 170 && r.t <= 295);
      expect(cpr.filter((r) => r.m.spo2?.flag === 'valid').map((r) => r.t)).toEqual([]);
      expect(Math.abs(mean(cpr.filter((r) => r.m.pr?.flag !== 'invalid').map((r) => r.m.pr?.value ?? 0)) - 110)).toBeLessThanOrEqual(5);
      const et = cpr.map((r) => r.m.etco2?.value ?? -1);
      expect(Math.min(...et)).toBeGreaterThanOrEqual(10);
      expect(Math.max(...et)).toBeLessThanOrEqual(25);
      expect(run.nibp.some((x) => x.phase === 'failed' && x.t <= 240)).toBe(true);
      const end = run.rows[run.rows.length - 1] as MonRun['rows'][number];
      const v = end.active.find((a) => a.id === 'VFIB');
      if (latches) expect(v).toMatchObject({ latched: true, sounding: false, acked: false });
      else expect(v).toBeUndefined();
    },
    120_000,
  );
});

describe('FU-5 fidelity 4: asystole, per skin', () => {
  it.each([['philips-like', 4], ['mindray-like', 5], ['saadat-like', 10]] as const)(
    '%s: ASYSTOLE %i s after the rhythm stops (± 1.5 s); no HR LOW or EXTREME BRADY beside it',
    async (skin, s) => {
      const run = await monitorRun({ mode: 'manual', skin, steps: arrest('asystole'), tEnd: 149 });
      const asy = raisedAt(run, 'ASYSTOLE')[0] as number;
      expect(asy - 60).toBeGreaterThanOrEqual(s - 1.5);
      expect(asy - 60).toBeLessThanOrEqual(s + 1.5);
      expect(run.alarms.filter((a) => a.state === 'raised' && (a.id === 'HR_LOW' || a.id === 'EXTREME_BRADY') && a.t >= asy).map((a) => a.t)).toEqual([]);
    },
    120_000,
  );
});

describe('FU-5 fidelity 4b: an agonal rhythm shows ONE arrest alarm (Orchestrator ruling (FU-5 review), 2026-09-28, ruling 6)', () => {
  it.each(['philips-like', 'mindray-like', 'saadat-like'])(
    '%s: pulseless agonal rhythm 60–300 s: ASYSTOLE raised once, no EXTREME BRADY or HR LOW (was 11 EXTREME BRADY raises in Ali\'s case after FU-4, 15 ASYSTOLE raises on mindray-like)',
    async (skin) => {
      const run = await monitorRun({ mode: 'manual', skin, tEnd: 300, steps: [...VENTED, [60, M.rhythm('agonal', { pulseless: true })]] });
      expect(raisedAt(run, 'ASYSTOLE').length).toBeLessThanOrEqual(1);
      expect(run.alarms.filter((a) => a.state === 'raised' && (a.id === 'EXTREME_BRADY' || a.id === 'HR_LOW') && a.t > 60).map((a) => `${a.id}@${a.t}`)).toEqual([]);
      const red = run.alarms.filter((a) => a.level === 1 && a.t > 60);
      for (let i = 0; i + 1 < red.length; i++) if (red[i]?.state === 'raised') {
        const c = red.slice(i + 1).find((x) => x.id === red[i]?.id);
        if (c?.state === 'cleared') expect(c.t - (red[i] as { t: number }).t, `${red[i]?.id}@${red[i]?.t}`).toBeGreaterThanOrEqual(5);
      }
    },
    120_000,
  );
});
