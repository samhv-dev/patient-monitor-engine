// E126 (owner ruling 2026-10-26, "mimic the real monitor"): the oximeter in cardiac arrest and during chest compressions.
// Pulseless with no compressions: no value (blank on saadat-like) and the no-pulse INOP. Compressions: the pleth carries
// the circuit's compression-generated pulses at the compression rate, the value is the model's saturation read through
// them, flagged questionable, with a low-signal INOP (LOW PERF or LOW SIGNAL IQ) and never a desaturation alarm. A pause
// in compressions (the pulse check): blank again within PULSE_LOST_S. Sources: Masimo Radical-7 Operator's Manual
// LAB-5476J p. 24, 113–114; research/00 E60 check (Spittal 1993, Hassan 2015: SpO2 during CPR unreliable).
import { describe, expect, it } from 'vitest';
import { PLETH_DET_FLOOR } from '../../src/l2/pleth/pleth.ts';
import { VF_CONFIRM_S } from '../../src/l3/alarms/conditions.ts';
import { M, monitorRun, VENTED, type MonRow } from '../helpers/monitor.ts';

const at = (rows: MonRow[], t: number) => rows.find((r) => r.t >= t) as MonRow;
const ids = (r: MonRow) => r.active.map((a) => a.id);
const SPO2_INOPS = ['spo2NonPulsatile', 'spo2LowPerf', 'spo2LowSignal'];

describe('E126: SpO2 and the pleth in arrest and during CPR', () => {
  let res: ReturnType<typeof monitorRun> | undefined;
  // VF at 30 s; compressions 60–120 s; a 12 s pulse check; compressions again from 132 s
  const go = () => (res ??= monitorRun({ mode: 'modeled', skin: 'saadat-like', tEnd: 200, steps: [...VENTED, [30, M.rhythm('vfCoarse')], [60, M.cpr(true)], [120, M.cpr(false)], [132, M.cpr(true)]] }));

  it('pulseless, no compressions: no value and the no-pulse INOP; never a held number', async () => {
    const { rows } = await go();
    for (const t of [45, 55]) {
      const r = at(rows, t);
      expect(r.m.spo2?.value ?? null, `t ${t}`).toBeNull();
      expect(ids(r), `t ${t}`).toContain('spo2NonPulsatile');
    }
    expect(rows.filter((r) => r.t > 30 && r.t < 60 && r.m.spo2?.flag === 'questionable').map((r) => r.t)).toEqual([]);
  });

  it('compressions: a number from the model, questionable, with a low-signal INOP and no desaturation alarm; its median PR is the compression rate', async () => {
    const { rows } = await go();
    const cpr = rows.filter((r) => r.t >= 90 && r.t < 120);
    for (const r of cpr) {
      expect(r.m.spo2?.value, `t ${r.t}`).toBeTypeOf('number');
      expect(r.m.spo2?.flag, `t ${r.t}`).toBe('questionable');
      expect(Math.abs((r.m.spo2?.value as number) - r.sao2), `t ${r.t}`).toBeLessThanOrEqual(3);
      expect(ids(r).some((id) => id === 'spo2LowPerf' || id === 'spo2LowSignal'), `t ${r.t}`).toBe(true);
      expect(ids(r)).not.toContain('DESAT');
    }
    // the detector misses an occasional small compression (the stroke volume varies with the breaths): PR 87–111,
    // its median the compression rate
    const pr = cpr.map((r) => r.m.pr?.value as number).sort((a, b) => a - b);
    expect(Math.abs((pr[pr.length >> 1] as number) - 110)).toBeLessThanOrEqual(5);
    expect(Math.max(...cpr.map((r) => r.plethPtp))).toBeGreaterThan(0.03); // a compression waveform on the pleth
  });

  it('the pulse check (compressions paused): blank within 4–6 s, the pleth at its noise floor; compressions again bring the number back', async () => {
    const { rows } = await go();
    const first = rows.find((r) => r.t > 120 && r.m.spo2?.value == null) as MonRow;
    expect(first.t - 120).toBeGreaterThanOrEqual(3);
    expect(first.t - 120).toBeLessThanOrEqual(6);
    expect(at(rows, 130).plethPtp).toBeLessThanOrEqual(PLETH_DET_FLOOR); // unorganised noise, not a pulse (owner ruling)
    expect(at(rows, 130).plethPtp).toBeGreaterThan(0); // and not a flat line
    expect(at(rows, 160).m.spo2).toMatchObject({ flag: 'questionable' });
  });

  // Owner ruling 2026-10-26 (the Saadat B9): VF has no QRS complexes, so the HR field is empty once the VF analysis
  // stands — not the 8 s average left over, not a count of fibrillation waves or of compressions; ECG VFIB stays
  it('VF: the HR is invalid from VF_CONFIRM_S + 1 s, with and without compressions, and the VFIB alarm stays', async () => {
    const { rows } = await go();
    const inVf = rows.filter((r) => r.t >= 30 + VF_CONFIRM_S + 1 && r.t <= 200);
    expect(inVf.filter((r) => r.m.hr?.value != null).map((r) => r.t)).toEqual([]);
    for (const t of [55, 100, 125]) expect(ids(at(rows, t)), `t ${t}`).toContain('VFIB');
  });

  it('ROSC: the reading returns valid once compressions stop over a beating heart, with no low-signal INOP', async () => {
    const { rows } = await monitorRun({ mode: 'modeled', skin: 'saadat-like', tEnd: 120, steps: [...VENTED, [30, M.cpr(true)], [60, M.cpr(false)]] });
    const r = at(rows, 80);
    expect(r.m.spo2).toMatchObject({ flag: 'valid' });
    expect(ids(r).filter((id) => SPO2_INOPS.includes(id))).toEqual([]);
  });
});
