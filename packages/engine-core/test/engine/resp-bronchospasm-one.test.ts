// FU-6 R6 (audit E1, E1b, I2d; D2): one bronchospasm whatever command starts it. The two entries agree, together they
// do not multiply, ending the airway event ends the spasm, and a bronchodilator shrinks the shark fin (R39-6 α bands
// stay in resp-capnogram.test.ts).
import { describe, expect, it } from 'vitest';
import { capnoAngles, mean, read62 } from '../helpers/resp.ts';
import { fineWindow, rig6, runTo, send, st6, ventRig } from '../helpers/fu6.ts';

async function spasm(cmds: Array<Record<string, unknown>>) {
  const e = rig6();
  await ventRig(e);
  await runTo(e, 300);
  for (const c of cmds) send(e, c);
  await runTo(e, 540);
  const w = await fineWindow(e, 600);
  return { e, peak: w.peak, autoPeep: st6(e).resp.lung.peepTot - 5 };
}
const AIR = { kind: 'airway', state: 'bronchospasm', severity: 1 };
const LUNG = { kind: 'lungCondition', id: 'bronchospasm', severity: 1 };

describe('FU-6 R6: one bronchospasm (was 31.8 airway vs 44.0 lung vs 66.1 both)', { timeout: 600_000 }, () => {
  it('the airway event and the lung condition give the same mechanics; both at once give one condition (unlimited arm: 44.0 / 11.9)', async () => {
    const a = await spasm([AIR]);
    const l = await spasm([LUNG]);
    const b = await spasm([AIR, LUNG]);
    console.log(`FU-6 R6 peak airway ${a.peak.toFixed(1)} lung ${l.peak.toFixed(1)} both ${b.peak.toFixed(1)}; auto-PEEP ${a.autoPeep.toFixed(1)} / ${l.autoPeep.toFixed(1)} / ${b.autoPeep.toFixed(1)}`);
    expect(Math.abs(a.peak - l.peak)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(b.peak - l.peak)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(b.autoPeep - l.autoPeep)).toBeLessThanOrEqual(0.5);
    expect(st6(b.e).resp.lungSpecs.filter((s: { id: string }) => s.id === 'bronchospasm')).toHaveLength(1);
  });
  it('ending the airway event ends the spasm (Ppeak within 2 cmH2O of baseline 2 min later); the fin shrinks with salbutamol', async () => {
    const r = await spasm([AIR]);
    const fin0 = mean(capnoAngles(read62(r.e, 'co2', 560, 600)).map((x) => x.alpha));
    send(r.e, { kind: 'drug', drugId: 'salbutamol', dose: 250, unit: 'mcg', route: 'iv' });
    await runTo(r.e, 1140);
    const fin1 = mean(capnoAngles(read62(r.e, 'co2', 1100, 1140)).map((x) => x.alpha));
    send(r.e, { kind: 'airway', state: 'patent' });
    await runTo(r.e, 1260);
    const after = await fineWindow(r.e, 1320);
    console.log(`FU-6 R6 α ${fin0.toFixed(0)} → ${fin1.toFixed(0)} after salbutamol; peak after release ${after.peak.toFixed(1)}`);
    expect(fin1).toBeLessThan(fin0 - 10);
    expect(after.peak).toBeLessThanOrEqual(16.7 + 2); // the rig's healthy peak (audit E1 baseline 16.7)
    expect(st6(r.e).resp.lungSpecs.some((s: { id: string }) => s.id === 'bronchospasm')).toBe(false);
  });
});
