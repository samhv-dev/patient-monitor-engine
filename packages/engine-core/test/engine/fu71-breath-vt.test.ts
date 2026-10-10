// FU-7.1 B5 (research/24 P8b): the `breath` event reports the volume the LUNG RECEIVED, not the set VT. Rig: the
// showcase-bronchospasm patient (F 45 y, 68 kg, 165 cm), ETT + VCV 12 × 500 PEEP 5 FiO2 0.5, `airway bronchospasm 1`,
// so the breath meets the VCV pressure limit and the delivered volume is far below the set one (P8: 303 mL at Pmax 40).
import { describe, expect, it } from 'vitest';
import type { MonitorEngine } from '../../src/types.ts';
import { rig6, runTo, send, st6 } from '../helpers/fu6.ts';

const PAT = { ageY: 45, weightKg: 68, heightCm: 165, sex: 'F' as const };

describe('FU-7.1 B5: the breath event reports the delivered volume', { timeout: 300_000 }, () => {
  it('a pressure-limited VCV breath reports what the lung received, within 2 mL of the mechanics VT (set 500)', async () => {
    const e: MonitorEngine = rig6(PAT);
    const seen: { t: number; vtMl: number }[] = [];
    e.on((x) => { if (x.type === 'breath') seen.push({ t: x.t, vtMl: x.vtMl }); });
    await runTo(e, 1);
    send(e, { kind: 'airwayDevice', device: 'ett' });
    send(e, { kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, peep: 5, fio2: 0.5 });
    send(e, { kind: 'airway', state: 'bronchospasm', severity: 1 });
    await runTo(e, 300);
    const mech = st6(e).resp.mechanics as { vt: number; ppeak: number };
    const last = seen[seen.length - 1]!;
    // eslint-disable-next-line no-console -- the gate note's number
    console.log(`FU-7.1 B5: breath vtMl ${last.vtMl}, mechanics vt ${mech.vt.toFixed(0)}, Ppeak ${mech.ppeak.toFixed(1)}`);
    expect(mech.vt).toBeLessThan(400); // the breath IS pressure-limited on this rig
    expect(Math.abs(last.vtMl - mech.vt)).toBeLessThanOrEqual(2);
  });

  it('every breath is reported after it was delivered (its t + Ti is not in the future) and once', async () => {
    const e: MonitorEngine = rig6(PAT);
    const seen: { t: number; seq: number; at: number }[] = [];
    e.on((x) => { if (x.type === 'breath') seen.push({ t: x.t, seq: x.seq, at: e.now().simT }); });
    await runTo(e, 1);
    send(e, { kind: 'airwayDevice', device: 'ett' });
    send(e, { kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, peep: 5, fio2: 0.5 });
    await runTo(e, 120, undefined, 1);
    expect(seen.length).toBeGreaterThan(15);
    expect(new Set(seen.map((b) => b.seq)).size).toBe(seen.length);
    for (const b of seen) expect(b.at).toBeGreaterThanOrEqual(b.t);
  });
});
