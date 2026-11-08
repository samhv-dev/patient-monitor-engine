// Brief 93 (audit DEV-06): the patient's drive exists while the ventilator breathes, and neuromuscular block decides
// whether it becomes effort. Rig: MODELED adult, ETT, VCV 9 × 500 (normocapnia: the drive is present), no hypnotic,
// rocuronium 0.6 mg/kg at 60 s. Under the machine the effort shows as the lungState effort the ventilator link reads, a
// capnogram cleft and a pleural swing (the effort on the lung mechanics' chest wall) while it is below the trigger, and triggered breaths once it reaches the trigger.
// The same rig hyperventilated (RR 16) has no effort at all: the drive, not the ventilator, decides. SLOW (≈ 30 s wall).
import { describe, expect, it } from 'vitest';
import { respPleural, TRIGGER_CMH2O } from '../../src/l2/resp/pipeline.ts';
import { cycleAt, ownEffortPmus } from '../../src/l2/resp/driver.ts';
import { rig6, runTo, send, st6 } from '../helpers/resp-modeled-rig.ts';

async function course(rr: number, untilS: number, each?: (e: ReturnType<typeof rig6>, u: number) => void) {
  const e = rig6();
  const efforts: [number, number][] = [];
  e.on((x) => { if (x.type === 'lungState') efforts.push([x.t, (x as unknown as { effort: number }).effort]); });
  await runTo(e, 1);
  send(e, { kind: 'airwayDevice', device: 'ett' });
  send(e, { kind: 'ventilation', source: 'ventilator', rr, vtMl: 500, peep: 5, fio2: 0.5 });
  await runTo(e, 60);
  send(e, { kind: 'drug', drugId: 'rocuronium', dose: 0.6, unit: 'mg/kg', route: 'iv' });
  await runTo(e, untilS, each ? (u) => each(e, u) : undefined, 1);
  return { e, efforts };
}

describe('respiratory effort under controlled ventilation (brief 93)', { timeout: 600_000 }, () => {
  it('first effort 12–24 min after rocuronium, first as a cleft and a pleural swing below the trigger, then triggered breaths', async () => {
    let cleftSeen = false;
    let swingSeen = false;
    let swingDrop = 0;
    let triggeredAt = -1;
    const { e, efforts } = await course(9, 1800, (eng, u) => {
      const d = st6(eng).resp.driver;
      const c = cycleAt(d, u);
      if (!c || !c.mech || c.pmusMech === undefined || c.pmusAt === undefined || c.pmusTi === undefined || !(c.pmusMech > 0)) return;
      if (c.cleft > 0) cleftSeen = true;
      if (u > 300 && c.pmusMech >= TRIGGER_CMH2O && triggeredAt < 0 && c.cleft === 0) triggeredAt = u; // after the block's onset (the awake, unparalysed patient triggers before it)
      // the effort's peak against the passive expiration 0.2 s before it starts
      const peak = c.t0 + c.pmusAt;
      const before = peak - c.pmusTi / 2 - 0.2;
      if (!swingSeen && c.cleft > 0 && before > c.t0 + c.ti + 0.3) {
        eng.advanceTo(Math.max(eng.now().simT, before));
        const p0 = respPleural(st6(eng).resp, before);
        eng.advanceTo(peak);
        const p1 = respPleural(st6(eng).resp, peak);
        // the effort is on the lung mechanics' chest wall (negative: inspiratory) and in the pleural pressure
        if (ownEffortPmus(st6(eng).resp.driver, peak) > 0 && st6(eng).resp.lung.mech.pMus < 0) { swingSeen = true; swingDrop = p0 - p1; }
      }
    });
    const first = efforts.find(([t, v]) => t > 300 && v > 0)?.[0] ?? Number.NaN;
    // eslint-disable-next-line no-console -- the PR's numbers
    console.log(`brief 93: first effort ${((first - 60) / 60).toFixed(2)} min after the dose; pleural drop ${swingDrop.toFixed(2)} mmHg; triggered from ${((triggeredAt - 60) / 60).toFixed(2)} min`);
    expect((first - 60) / 60).toBeGreaterThanOrEqual(12);
    expect((first - 60) / 60).toBeLessThanOrEqual(24);
    expect(efforts.filter(([t]) => t > 300 && t < first - 1).every(([, v]) => v === 0)).toBe(true); // nothing during the block
    expect(cleftSeen).toBe(true);
    expect(swingSeen).toBe(true);
    expect(swingDrop).toBeGreaterThan(0);
    expect(triggeredAt).toBeGreaterThan(first);
    expect(st6(e).resp.spont.muscle).toBeGreaterThan(0);
  });
  it('the same patient hyperventilated (RR 16) makes no effort although the diaphragm has recovered', async () => {
    const { efforts } = await course(16, 1800);
    const late = efforts.filter(([t]) => t > 1500);
    const last = late.length ? (late[late.length - 1] as [number, number])[1] : (efforts[efforts.length - 1] as [number, number])[1];
    expect(last).toBe(0);
  });
});
