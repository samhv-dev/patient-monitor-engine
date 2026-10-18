// A follower's beat-tone gate (beeps off above ×4) reads the session's NOMINAL speed, which ViewerSync passes to
// its clock every frame, not the steered rate (the host's ±10 %), on which a ×4 phone dropped about half its beeps.
import { ControllerSession, createInProcessHub, HostSession, ViewerSync } from '@pme/controller';
import { describe, expect, it } from 'vitest';
import { manualHost } from '../../../../packages/controller/test/fakes/manual-host.ts';
import { manualViewer } from '../../../../packages/controller/test/fakes/manual-viewer.ts';
import { beatToneAt } from '../../../../packages/renderer/src/mount.ts';

const S = 'FXB234';
const flushIo = () => new Promise((r) => setTimeout(r, 0));

describe('the follower beeps at the session speed, not its steered rate', () => {
  it('nominal ×4 steered to 4.3: the beep plays; nominal ×8: it does not', async () => {
    const clock = { wall: 1_000_000 };
    const wallNow = () => clock.wall;
    const host = manualHost();
    const hub = createInProcessHub();
    const hs = new HostSession({ session: S, target: host, wallNow, stateIntervalMs: 0 });
    hs.addTransport(hub.connect());
    const ctl = new ControllerSession({ session: S, transport: hub.connect(), wallNow });
    const v = Object.assign(manualViewer(), { nominal: 0 });
    v.setNominalRate = (k: number) => void (v.nominal = k);
    const sync = new ViewerSync({ session: S, transport: hub.connect(), target: v, engineVersion: host.engine.version, wallNow });
    const run = async (seconds: number) => {
      for (let i = 0; i < seconds * 50; i++) {
        clock.wall += 20;
        host.advance(20);
        if (i % 10 === 0) hs.emitState();
        await flushIo();
        sync.follow();
        v.advance(20);
      }
    };
    await run(1);
    expect(sync.status).toBe('synced');

    await ctl.send({ type: 'time', action: 'scale', value: 4 });
    await run(2);
    sync.follow();
    const err = 4 * (sync.lagS - 0.1); // sim s behind where it should draw (lagS is wall s behind the host; delayS 0.1)
    v.t -= 0.15 - err; // 0.15 sim s behind → steered to 4 × (1 + 0.5 × 0.15) = 4.3
    sync.follow();
    expect(v.rate).toBeCloseTo(4.3, 1);
    expect(v.nominal).toBe(4);
    expect(beatToneAt('qrs', v.rate, v.nominal)).toBe(true);
    expect(beatToneAt('qrs', v.rate)).toBe(false); // the old gate, on the steered rate: silent

    await ctl.send({ type: 'time', action: 'scale', value: 8 });
    await run(2);
    sync.follow();
    v.t += 8 * (sync.lagS - 0.1) + 0.04; // 0.04 sim s ahead → steered to 8 × (1 − 0.5 × 0.04) = 7.84 (it never steers above 8)
    sync.follow();
    expect(v.rate).toBeCloseTo(7.84, 2);
    expect(v.nominal).toBe(8);
    expect(beatToneAt('qrs', v.rate, v.nominal)).toBe(false); // off at ×8 by design (owner's decision 4)
    expect(beatToneAt('alarm', v.rate, v.nominal)).toBe(true);
    hs.close();
    ctl.close();
    sync.close();
  });
});
