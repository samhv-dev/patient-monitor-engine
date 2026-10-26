// A stage group the host could not keep on one tick (its engine passed the group's tick before the group's last command
// arrived: a worker round trip on a loaded instructor laptop) is applied by the host on two ticks; the commandApplied
// of each command carries the tick the host applied it on. A viewer must apply each command on THAT tick. Before the
// fix the viewer's engine re-resolved the stage group and pulled the later command back onto the group's first tick:
// the E126 haemorrhage rhythm check (`cpr off` + `setRhythm vfCoarse`, one group) started VF a tick earlier on a phone
// than on the instructor's monitor, the first shock then met a different VF and could end it differently — a phone kept
// VF (and its blank HR) for the whole post-shock CPR while the instructor's monitor counted 110 (kit round, 3 phones).
import { describe, expect, it } from 'vitest';
import type { EngineEvent } from '@pme/engine-core';
import { createInProcessHub } from '../../src/transport/in-process.ts';
import { ControllerSession } from '../../src/session/controller-session.ts';
import { HostSession } from '../../src/session/host-session.ts';
import { ViewerSync } from '../../src/session/viewer-sync.ts';
import { manualHost } from '../fakes/manual-host.ts';
import { manualViewer } from '../fakes/manual-viewer.ts';
import { waitFor } from '../helpers.ts';

const flushIo = () => new Promise((r) => setTimeout(r, 0));

describe('ViewerSync: a stage group the host split over two ticks', () => {
  it('the viewer applies each command on the tick the host applied it (the VF starts on the same sample)', async () => {
    const clock = { wall: 1_000_000 };
    const wallNow = () => clock.wall;
    const host = manualHost();
    const hub = createInProcessHub();
    const hs = new HostSession({ session: 'VSG234', target: host, wallNow, stateIntervalMs: 0 });
    hs.addTransport(hub.connect());
    const ctl = new ControllerSession({ session: 'VSG234', transport: hub.connect(), wallNow });
    await waitFor(() => ctl.hostOnline);
    const v = manualViewer();
    const sync = new ViewerSync({ session: 'VSG234', transport: hub.connect(), target: v, engineVersion: host.engine.version, wallNow });
    const vf = (e: EngineEvent[]) => e.filter((x) => x.type === 'rhythmSegment' && (x as { rhythm?: string }).rhythm === 'vfCoarse').map((x) => (x as { t: number }).t);
    const hostSeg: EngineEvent[] = [];
    const viewSeg: EngineEvent[] = [];
    host.on((e) => void hostSeg.push(e));
    v.on((e) => void viewSeg.push(e));
    const frames = async (n: number) => {
      for (let i = 0; i < n; i++) {
        clock.wall += 20;
        host.advance(20);
        if (i % 10 === 0) hs.emitState();
        await flushIo();
        sync.follow();
        v.advance(20);
      }
    };
    await waitFor(() => sync.status === 'synced');
    await frames(150);
    // The group's first command, then the host's engine runs past the group's tick (STAGE_LEAD_TICKS = 3) before the
    // second arrives — the viewer, 0.1 s behind, has not reached it yet
    const a = await ctl.send({ type: 'applyEvent', event: { kind: 'cpr', active: false }, stageGroup: 'check-1' } as never);
    await frames(4);
    const b = await ctl.send({ type: 'setRhythm', rhythm: 'vfCoarse', when: 'now', stageGroup: 'check-1' } as never);
    expect((b as { tick: number }).tick).toBeGreaterThan((a as { tick: number }).tick); // the host split the group
    await frames(200);
    expect(sync.resyncs).toBe(0);
    expect(vf(viewSeg)).toEqual(vf(hostSeg));
    expect(vf(hostSeg)).toHaveLength(1);
    const n = 2500;
    const end = Math.min(host.engine.latestSampleIndex('ecgII'), v.engine.latestSampleIndex('ecgII')) - 60;
    const x = new Float32Array(n);
    const y = new Float32Array(n);
    host.engine.readSamples('ecgII', end - n, x);
    v.engine.readSamples('ecgII', end - n, y);
    expect([...y]).toEqual([...x]);
    hs.close();
    ctl.close();
    sync.close();
  });
});
