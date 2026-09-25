// BUILD-PLAN Stage 3 acceptance 3–4 (airway loss, apnoea detection, M4 accumulated CO2) at engine level.
import { describe, expect, it } from 'vitest';
import { ADULT, breaths, cmd, ev3, mean, numSeries, read62, rig3, vent, type Alarm, run } from '../helpers/resp.ts';

describe('Stage 3 acceptance: airway loss, apnoea and CO2 kinetics', { timeout: 300_000 }, () => {
  it('3. disconnection: breath events stop, the capnogram is flat within one breath, awRR apnoea at 20 ± 1 s', async () => {
    const { e, ev } = rig3({ patient: ADULT, sampling: 'mainstream' });
    e.dispatch(vent(12));
    await run(e, 60);
    const t0 = e.now().simT;
    e.dispatch(ev3({ kind: 'airway', state: 'disconnected' }));
    await run(e, t0 + 40);
    expect(breaths(ev, t0 + 0.05)).toHaveLength(0);
    const flat = read62(e, 'co2', t0 + 5, t0 + 40);
    expect(Math.max(...flat)).toBeLessThan(1);
    const x = read62(e, 'co2', t0 - 10, t0 + 5);
    let lastEdge = -1;
    for (let k = 1; k < x.length; k++) if (x[k - 1]! < 20 && x[k]! >= 20) lastEdge = t0 - 10 + k / 62.5;
    const alarm = ev.find((a): a is Alarm => a.type === 'alarm' && a.id === 'apnoea-co2' && a.state === 'raised' && a.t > t0);
    expect(alarm).toBeDefined();
    expect(alarm!.t - lastEdge).toBeGreaterThanOrEqual(19.9);
    expect(alarm!.t - lastEdge).toBeLessThanOrEqual(21);
  });

  it('4. M4: the first breath after 60 s of apnoea shows the accumulated CO2 (+9–15 mmHg)', async () => {
    const { e, ev } = rig3({ patient: ADULT, sampling: 'mainstream' });
    e.dispatch(ev3({ kind: 'thermal', anaesthesia: 'general' }));
    e.dispatch(vent(12));
    e.dispatch(cmd({ type: 'setTarget', variable: 'etco2', value: 37 })); // a steady state on these settings
    await run(e, 120);
    const before = mean(numSeries(ev, 'etco2', 100, 120).map(([, v]) => v));
    e.dispatch(ev3({ kind: 'airway', state: 'disconnected' }));
    await run(e, 180);
    e.dispatch(ev3({ kind: 'airway', state: 'patent' }));
    await run(e, 192);
    const first = Math.max(...read62(e, 'co2', 180, 190.5)); // the first breath (it starts at the next 5 s cycle)
    expect(first - before).toBeGreaterThanOrEqual(9);
    expect(first - before).toBeLessThanOrEqual(15);
  });
});
