// @vitest-environment happy-dom
// The remote shows the scenario state and its manual-trigger buttons (Stage 6b).
import { afterEach, describe, expect, it } from 'vitest';
import { createInProcessHub } from '../../src/transport/in-process.ts';
import { ControllerSession } from '../../src/session/controller-session.ts';
import { HostSession } from '../../src/session/host-session.ts';
import { mountRemote } from '../../src/remote/remote-app.ts';
import { stage1Vocabulary } from '../../src/vocabulary.ts';
import { ScenarioDriver } from '../../src/scenario/driver.ts';
import { manualHost } from '../fakes/manual-host.ts';
import { waitFor } from '../helpers.ts';

const cleanup: Array<() => void> = [];
afterEach(() => {
  for (const f of cleanup.splice(0)) f();
  document.body.replaceChildren();
});

describe('remote scenario strip (DOM)', () => {
  it('shows the current state and only the manual buttons, and pressing one triggers it', async () => {
    const host = manualHost({ seed: 42 });
    let hs: HostSession | null = null;
    const driver = new ScenarioDriver({ target: host, submit: (c) => (hs as HostSession).submit(c), publish: (e) => hs?.publish(e) });
    hs = new HostSession({ session: 'REM234', target: driver.host, stateIntervalMs: 0, scenario: driver.hook, welcomeEvents: () => driver.welcomeEvents() });
    const hub = createInProcessHub();
    hs.addTransport(hub.connect());
    const panelSession = new ControllerSession({ session: 'REM234', transport: hub.connect() });
    await waitFor(() => panelSession.hostOnline);
    await panelSession.send({ type: 'scenario', action: 'load', target: 'acls-vf-witnessed' });
    const remote = mountRemote(document.body, { vocabulary: stage1Vocabulary(), vias: ['broadcastChannel'], connect: () => hub.connect() });
    remote.join('REM234', 'broadcastChannel');
    cleanup.push(() => remote.destroy(), () => panelSession.close(), () => (hs as HostSession).close(), () => driver.close());
    const strip = () => document.querySelector('.pme-scn-remote') as HTMLElement;
    await waitFor(() => !strip().hidden);
    expect(strip().querySelector('.pme-scn-state')?.textContent).toMatch(/^Stable in PACU · \d+ s$/);
    const labels = () => [...strip().querySelectorAll('button')].map((b) => b.textContent);
    expect(labels()).toEqual(['Start VF now']);
    (strip().querySelector('button') as HTMLButtonElement).click();
    await waitFor(() => driver.runner?.stateId === 'vf');
    await waitFor(() => labels().join() === 'ROSC now'); // VF: only the manual one; shocks come from the learner
  });
});
