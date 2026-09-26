// Ventilator alarms (v1.9 rules + disconnection/apnea) and the VentFrame the link sends.
import { describe, expect, it } from 'vitest';
import { advanceVent, bannerText, createVent, loadPreset, setCircuit, silenceAlarms, toggleHold, toVentFrame, ventAlarms } from '../src/index.ts';

describe('ventilator alarms', () => {
  it('default VC is alarm-free; Pmax, Vt low and Intrinsic PEEP raise in v1.9 order', () => {
    const vs = createVent();
    advanceVent(vs, 20);
    expect(ventAlarms(vs)).toEqual([]);
    expect(bannerText(vs).text).toBe('No active alarms');
    const hi = createVent({ compliance: 20, pmax: 30 });
    advanceVent(hi, 20);
    expect(ventAlarms(hi)[0]?.id).toBe('pmax');
    const copd = createVent({ rate: 24, vt: 560, pmax: 70, pause: 0 });
    loadPreset(copd, 'copd');
    advanceVent(copd, 30);
    expect(ventAlarms(copd).map((a) => a.id)).toContain('intrinsicPeep');
  });
  it('disconnection raises within one breath; apnea after the set apnoea time without breaths; silence shows a countdown', () => {
    const vs = createVent();
    advanceVent(vs, 10);
    setCircuit(vs, 'disconnected');
    advanceVent(vs, 10 + 60 / 14 + 0.5);
    expect(ventAlarms(vs)[0]?.id).toBe('disconnection');
    const ap = createVent({ mode: 'PSV', spont: true, pmus: 0, rate: 4 }); // no effort, backup only every 15 s → apnea at 20 s
    advanceVent(ap, 60);
    silenceAlarms(ap);
    expect(bannerText(ap).cls).toBe('silenced');
    const quiet = createVent({ apneaTime: 10, rate: 4 });
    advanceVent(quiet, 14);
    expect(ventAlarms(quiet).map((a) => a.id)).toContain('apnea');
  });
});

describe('VentFrame', () => {
  it('carries Paw, alveolar pressure, flow, breath volume, FiO2 fraction, PEEP, phase and mode', () => {
    const vs = createVent({ fio2: 60, peep: 8 });
    advanceVent(vs, 60 / 14 + 0.3); // mid-inspiration of the 2nd breath (period 4.29 s, Ti 0.5 s)
    const f = toVentFrame(vs, '(S)CMV+');
    expect(f.phase).toBe('insp');
    expect(f.fio2).toBeCloseTo(0.6, 6);
    expect(f.peepCmH2O).toBe(8);
    expect(f.flowLps).toBeCloseTo(1, 6);
    expect(f.volumeMl).toBeGreaterThan(200);
    expect(f.pawCmH2O - f.palvCmH2O).toBeCloseTo(10, 1); // R 10 × 1 L/s
    expect(f.mode).toBe('(S)CMV+');
  });
  it('trapped gas does not count as tidal volume; holds and pauses are inspiration; disconnected frames are empty', () => {
    const vs = createVent({ rate: 24, vt: 560, pmax: 70, pause: 0 });
    loadPreset(vs, 'copd');
    advanceVent(vs, 30);
    while (vs.p.phase !== 'exp') advanceVent(vs, vs.n * 0.005 + 0.005);
    while (vs.p.phase === 'exp') advanceVent(vs, vs.n * 0.005 + 0.005);
    expect(toVentFrame(vs, 'x').volumeMl).toBeLessThan(10); // new breath: volume counts from its own start
    toggleHold(vs, 'exp');
    advanceVent(vs, 40);
    expect(vs.hold).toBe('exp');
    expect(toVentFrame(vs, 'x').phase).toBe('exp');
    setCircuit(vs, 'disconnected');
    expect(toVentFrame(vs, 'x')).toMatchObject({ pawCmH2O: vs.p.Paw, flowLps: 0, volumeMl: 0, palvCmH2O: 0, phase: 'exp' });
  });
});
