// FU-11 Task B2 (external review F19, browser audit BA08 A04/A05): the defibrillator's charge and ready tones end with
// the state that started them — disarm, shock and recharge send a toneCancel with their ids.
import { describe, expect, it } from 'vitest';
import type { EngineEvent } from '../../src/types.ts';
import { cmd, devRig } from '../helpers/device.ts';

type Tone = Extract<EngineEvent, { type: 'tone' }>;
type Cancel = Extract<EngineEvent, { type: 'toneCancel' }>;
const defib = (action: string, extra: Record<string, unknown> = {}) => cmd({ type: 'applyEvent', event: { kind: 'defib', action, ...extra } });
const tones = (ev: EngineEvent[], kind: string) => ev.filter((x): x is Tone => x.type === 'tone' && x.kind === kind);
const cancels = (ev: EngineEvent[]) => ev.filter((x): x is Cancel => x.type === 'toneCancel' && !!x.ids).flatMap((x) => x.ids ?? []);

describe('FU-11 B2: device tones end with their state', () => {
  it('disarm after ready cancels the ready tone', () => {
    const { e, ev } = devRig('zoll-like');
    e.advanceTo(1);
    e.dispatch(defib('charge', { energyJ: 10 }));
    e.advanceTo(5);
    const ready = tones(ev, 'chargeReady')[0];
    expect(ready).toBeDefined();
    e.dispatch(defib('disarm'));
    e.advanceTo(6);
    expect(cancels(ev)).toContain(ready!.id);
  });
  it('a shock cancels the ready tone and never its own shock tone; a recharge cancels the previous charge tone', () => {
    const { e, ev } = devRig('zoll-like');
    e.advanceTo(1);
    e.dispatch(defib('charge', { energyJ: 200 })); // seconds of charging
    e.advanceTo(1.5);
    e.dispatch(defib('charge', { energyJ: 150 })); // recharge while the first is still charging
    e.advanceTo(2);
    const [first, second] = tones(ev, 'charge');
    expect(cancels(ev)).toContain(first!.id);
    expect(cancels(ev)).not.toContain(second!.id);
    e.advanceTo(15);
    const ready = tones(ev, 'chargeReady')[0]!;
    e.dispatch(defib('shock'));
    e.advanceTo(16);
    const shock = tones(ev, 'shock')[0]!;
    expect(cancels(ev)).toContain(ready.id);
    expect(cancels(ev)).not.toContain(shock.id);
  });
});
