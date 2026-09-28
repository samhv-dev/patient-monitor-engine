// FU-5 monitor-fidelity suite items 6–9 (research/10 §13): apnoea and resumption per skin, the paralysed apnoea on
// impedance only, circuit disconnect and oesophageal intubation, desaturation lag finger vs ear. Sources: research/05 §6
// [S2] IFU p. 41 ("***APNEA" from CO2, Resp or AGM), p. 40 (latching), p. 112–113 (cardiac overlay); research/06 §4.1–4.2
// (Saadat RESP 10 s / CO2 20 s, CAPNO/RESP selects one source); brief §4.3 (site lag: finger 15–20 s, ear ≈ 5 s).
import { describe, expect, it } from 'vitest';
import { activeIds, M, monitorRun, VENTED, type MonRun } from '../helpers/monitor.ts';

const APNOEA = ['apnoea-co2', 'apnoea-resp'];
const raised = (run: MonRun, ids: string[], from = 0, to = Infinity) => run.alarms.filter((a) => a.state === 'raised' && ids.includes(a.id) && a.t >= from && a.t < to);

describe('FU-5 fidelity 6: a 60 s apnoea, then ventilation resumes (no acknowledge)', () => {
  it.each([['philips-like', true], ['mindray-like', false], ['saadat-like', false]] as const)(
    '%s: ONE apnoea alarm, 20 ± 5 s after ventilation stops; once it stands no RR / awRR / EtCO2 LOW beside it (the falling RR and EtCO2 may alarm first); after resumption latched and silent only where the vendor latches (%s); awRR shown again',
    async (skin, latches) => {
      const run = await monitorRun({ mode: 'modeled', skin, tEnd: 300, steps: [...VENTED, [120, M.ventOff()], [180, M.vent()]] });
      const a = raised(run, APNOEA, 100);
      expect(a.map((x) => x.id)).toEqual(['apnoea-co2']);
      expect((a[0] as { t: number }).t - 120).toBeGreaterThanOrEqual(15);
      expect((a[0] as { t: number }).t - 120).toBeLessThanOrEqual(25);
      const beside = run.rows.filter((r) => r.t > (a[0] as { t: number }).t && r.t < 180 && r.active.some((x) => ['RR_LOW', 'AWRR_LOW', 'EtCO2_LOW', 'EtCO2_pctV_LOW'].includes(x.id)));
      expect(beside.map((r) => r.t)).toEqual([]);
      const end = run.rows[run.rows.length - 1] as MonRun['rows'][number];
      const e = end.active.find((x) => x.id === 'apnoea-co2');
      if (latches) expect(e).toMatchObject({ latched: true, sounding: false });
      else expect(e).toBeUndefined();
      expect(end.m.awrr).toMatchObject({ flag: 'valid' });
    },
    120_000,
  );

  it('saadat-like with the capnograph off (RESP is the RR source): RESP APNEA 10 ± 5 s after the last breath (research/06 §4.2)', async () => {
    const run = await monitorRun({ mode: 'modeled', skin: 'saadat-like', sensors: { co2: 'off' }, tEnd: 200, steps: [...VENTED, [120, M.ventOff()]] });
    const a = raised(run, APNOEA, 100);
    expect(a.map((x) => [x.id, x.text])).toEqual([['apnoea-resp', 'RESP APNEA']]);
    expect((a[0] as { t: number }).t - 120).toBeLessThanOrEqual(15);
  }, 120_000);
});

describe('FU-5 fidelity 7: paralysed apnoea with the CO2 line off (impedance only)', () => {
  it('the cardiac overlay is not counted as breathing: APNEA stays from ≤ 25 s after the stop, RR never tracks the HR, no RR HIGH', async () => {
    const run = await monitorRun({ mode: 'modeled', sensors: { co2: 'off' }, tEnd: 420, steps: [[1, M.ett()], [1, M.vent(5, 0.21)], [100, M.drug('rocuronium', 0.6, 'mg/kg')], [120, M.ventOff()]] });
    const apnoea = run.rows.filter((r) => r.t >= 145);
    expect(apnoea.every((r) => activeIds(r).includes('apnoea-resp'))).toBe(true);
    const tracking = apnoea.filter((r) => (r.m.rr?.value ?? 0) > 5 && Math.abs((r.m.rr?.value ?? 0) - (r.m.hr?.value ?? 0)) <= 0.05 * (r.m.hr?.value ?? 1));
    expect(tracking.map((r) => r.t)).toEqual([]);
    expect(raised(run, ['RR_HIGH']).map((x) => x.t)).toEqual([]);
  }, 120_000);
});

describe('FU-5 fidelity 8: disconnection and oesophageal intubation', () => {
  it('CO2 apnoea ≤ 25 s after the disconnect; EtCO2 < 5 mmHg within 6 breaths (30 s) of the oesophageal tube', async () => {
    const ev = (state: string) => ({ type: 'applyEvent', event: { kind: 'airway', state } });
    const run = await monitorRun({ mode: 'modeled', tEnd: 240, steps: [...VENTED, [60, ev('disconnected')], [120, ev('patent')], [180, ev('oesophageal')]] });
    expect(((raised(run, ['apnoea-co2'], 60)[0]?.t) ?? Infinity) - 60).toBeLessThanOrEqual(25);
    expect((run.rows.find((r) => r.t > 180 && (r.m.etco2?.value ?? 99) < 5)?.t ?? Infinity) - 180).toBeLessThanOrEqual(30);
  }, 120_000);
});

describe('FU-5 fidelity 9: desaturation lag, finger vs ear', () => {
  const run = (site?: string) => monitorRun({ mode: 'modeled', tEnd: 600, steps: [[1, M.ett()], [1, M.vent(5, 0.21)], ...(site ? [[2, M.sensor('spo2', 'on', site)] as [number, Record<string, unknown>]] : []), [120, M.ventOff()], [400, M.vent(5, 1)]] });
  const lag = (r: MonRun, from: number, below: boolean) => {
    const tt = r.rows.find((x) => x.t > from && (below ? x.sao2 < 90 : x.sao2 > 90))?.t ?? NaN;
    const ts = r.rows.find((x) => x.t > tt && x.m.spo2?.value != null && x.m.spo2.flag !== 'invalid' && (below ? x.m.spo2.value < 90 : x.m.spo2.value > 90))?.t ?? NaN;
    return ts - tt;
  };
  it('finger: displayed lag 15–25 s; DESAT 20 s after the display falls below 80; recovery lag ≤ 60 s', async () => {
    const r = await run();
    expect(lag(r, 120, true)).toBeGreaterThanOrEqual(15);
    expect(lag(r, 120, true)).toBeLessThanOrEqual(25);
    const below80 = r.rows.find((x) => x.t > 120 && (x.m.spo2?.value ?? 100) < 80)?.t ?? NaN;
    const desat = r.alarms.find((a) => a.id === 'DESAT' && a.state === 'raised')?.t ?? NaN;
    expect(desat - below80).toBeGreaterThanOrEqual(19);
    expect(desat - below80).toBeLessThanOrEqual(22);
    expect(lag(r, 400, false)).toBeLessThanOrEqual(60);
  }, 120_000);
  it('ear: displayed lag 5–12 s', async () => {
    const r = await run('ear');
    expect(lag(r, 120, true)).toBeGreaterThanOrEqual(5);
    expect(lag(r, 120, true)).toBeLessThanOrEqual(12);
  }, 120_000);
});
