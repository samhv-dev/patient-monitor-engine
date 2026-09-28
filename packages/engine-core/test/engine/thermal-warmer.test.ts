// FU-4 item 1 (Task 18; G7e ruling 2): forced-air warming at a SET blanket air temperature — 32 / 38 / 43 °C, the
// Bair Hugger low / medium / high settings [TXT: device IFU] — with heat ∝ (T_air − T_periphery), which self-limits;
// absent = 43 °C, so every Stage 3/7e number is unchanged. Rig: R39-7's (resp-coupling), default adult, GA at 60 s,
// 60 sim-min, core change from induction. Targets (R45): unwarmed < 38 °C < 43 °C at 60 min (monotone in the set
// temperature); 43 °C set explicitly and the default give identical states. 4 × 61 sim-min, one yield per sim-minute
// (the helper's `run`) — SLOW.
import { describe, expect, it } from 'vitest';
import { ADULT, ev3, rig3, run, stateSeries } from '../helpers/resp.ts';

async function drop(warm: false | 'default' | 32 | 38 | 43): Promise<number> {
  const { e, ev } = rig3({ patient: ADULT });
  await run(e, 60);
  e.dispatch(ev3({ kind: 'thermal', anaesthesia: 'general', ...(warm === false ? {} : { warming: true }), ...(typeof warm === 'number' ? { warmAirC: warm } : {}) }));
  await run(e, 60 + 3600);
  const tc = stateSeries(ev, 'tempCore');
  const at = (s: number) => tc.find(([t]) => t >= 60 + s)![1];
  return at(3600) - at(0);
}

describe('FU-4 item 1: forced-air warming at a set air temperature', { timeout: 600_000 }, () => {
  it('GA 60 min: unwarmed < 38 °C < 43 °C (monotone in the set temperature); 43 °C and the default identical', async () => {
    const none = await drop(false);
    const w38 = await drop(38);
    const w43 = await drop(43);
    const def = await drop('default');
    console.log(`thermal-warmer: core Δ at 60 min — unwarmed ${none.toFixed(3)}, 38 °C ${w38.toFixed(3)}, 43 °C ${w43.toFixed(3)}, default ${def.toFixed(3)}`);
    expect(w38).toBeGreaterThan(none);
    expect(w43).toBeGreaterThan(w38);
    expect(def).toBe(w43);
  });
});
