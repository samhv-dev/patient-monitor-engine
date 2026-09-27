// @vitest-environment happy-dom
// FU-2 item 4 (G-FU1 item 6): the 1 Hz `state` event carries the running rhythm, so the panel follows a rhythm change
// the ENGINE makes on its own — a shock outcome emits neither a setRhythm commandApplied nor (for asystole) a
// rhythmSegment.
import { afterEach, describe, expect, it } from 'vitest';
import { createInProcessHub } from '../../src/transport/in-process.ts';
import { ControllerSession } from '../../src/session/controller-session.ts';
import { HostSession } from '../../src/session/host-session.ts';
import { mountInstructorPanel } from '../../src/panel/panel.ts';
import { stage1Vocabulary } from '../../src/vocabulary.ts';
import { manualHost } from '../fakes/manual-host.ts';
import { waitFor } from '../helpers.ts';

let cleanup: Array<() => void> = [];
afterEach(() => {
  for (const f of cleanup.splice(0)) f();
  document.body.replaceChildren();
});

describe('controls follow an engine-initiated rhythm change (FU-2 item 4)', () => {
  it('VF → shock → asystole (zoll-like, seed 4): ControllerSession.rhythm and the panel select show asystole', async () => {
    const host = manualHost({ seed: 4, device: { skin: 'zoll-like' } });
    const outcomes: string[] = [];
    host.on((e) => {
      const s = e as { type: string; defib?: { lastShock?: { outcome: string } } };
      if (s.type === 'deviceStatus' && s.defib?.lastShock) outcomes.push(s.defib.lastShock.outcome);
    });
    const hub = createInProcessHub();
    const hs = new HostSession({ session: 'FQW235', target: host, stateIntervalMs: 0 });
    hs.addTransport(hub.connect());
    const panelS = new ControllerSession({ session: 'FQW235', transport: hub.connect() });
    await waitFor(() => panelS.hostOnline);
    const panel = mountInstructorPanel(document.body, { session: panelS, vocabulary: stage1Vocabulary() });
    cleanup.push(() => panel.destroy(), () => panelS.close(), () => hs.close());
    const select = () => panel.el.querySelector('select[name=rhythm]') as HTMLSelectElement;

    await panelS.send({ type: 'setRhythm', rhythm: 'vfCoarse' });
    await panelS.send({ type: 'applyEvent', event: { kind: 'defib', action: 'charge' } });
    host.advance(6000);
    await waitFor(() => select().value === 'vfCoarse');
    await panelS.send({ type: 'applyEvent', event: { kind: 'defib', action: 'shock' } });
    host.advance(14_000);
    expect(outcomes.at(-1)).toBe('asystole'); // the seed's drawn outcome (engine defib-engine test, seed 4)
    await waitFor(() => panelS.rhythm === 'asystole', 2000, 'session rhythm');
    await waitFor(() => select().value === 'asystole', 2000, 'panel select');
    expect(panelS.state?.rhythm).toEqual({ id: 'asystole', rateBpm: 0 });
  }, 60_000);
});
