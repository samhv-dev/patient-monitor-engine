// applyEvent / attachSensor (brief §7.2) travel as WireCommands; without a scenario driver the host passes them
// to the engine, which rejects them until Stages 3/4/7 model them.
import { afterEach, describe, expect, it } from 'vitest';
import { createInProcessHub } from '../../src/transport/in-process.ts';
import { HostSession } from '../../src/session/host-session.ts';
import { ControllerSession, describe as describeCommand } from '../../src/session/controller-session.ts';
import type { WireCommand } from '../../src/protocol.ts';
import { manualHost } from '../fakes/manual-host.ts';
import { waitFor } from '../helpers.ts';

const cleanup: Array<() => void> = [];
afterEach(() => {
  for (const f of cleanup.splice(0)) f();
});

describe('clinical commands', () => {
  it('describe() names them for the log', () => {
    const shock: WireCommand = { id: 'a', issuedBy: 't', type: 'applyEvent', event: { kind: 'defib', action: 'shock', energyJ: 200 } };
    const probe: WireCommand = { id: 'b', issuedBy: 't', type: 'attachSensor', sensor: 'spo2', state: 'off' };
    expect(describeCommand(shock)).toBe('event defib shock 200');
    expect(describeCommand(probe)).toBe('sensor spo2 off');
  });

  it('a plain host forwards applyEvent to the engine, which accepts a library drug (Stage 7g)', async () => {
    const host = manualHost();
    const hub = createInProcessHub();
    const hs = new HostSession({ session: 'CLN234', target: host, stateIntervalMs: 0 });
    hs.addTransport(hub.connect());
    const s = new ControllerSession({ session: 'CLN234', transport: hub.connect() });
    cleanup.push(() => s.close(), () => hs.close());
    await waitFor(() => s.hostOnline);
    const r = await s.send({ type: 'applyEvent', event: { kind: 'drug', drugId: 'epinephrine', dose: 1, unit: 'mg', route: 'iv' } });
    expect(r.accepted).toBe(true); // Stage 7g: every library drug is modelled (l2/pk)
  });
});
