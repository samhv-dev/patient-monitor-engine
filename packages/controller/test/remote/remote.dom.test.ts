// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest';
import { createInProcessHub } from '../../src/transport/in-process.ts';
import { HostSession } from '../../src/session/host-session.ts';
import { mountRemote } from '../../src/remote/remote-app.ts';
import { stage1Vocabulary } from '../../src/vocabulary.ts';
import { manualHost } from '../fakes/manual-host.ts';
import { waitFor } from '../helpers.ts';

afterEach(() => document.body.replaceChildren());

describe('remote controller (DOM)', () => {
  it('joins by code, shows the live readout, sends commands, and renders no canvas', async () => {
    const host = manualHost();
    const hub = createInProcessHub();
    const hs = new HostSession({ session: 'RMT234', target: host, stateIntervalMs: 0 });
    hs.addTransport(hub.connect());
    const r = mountRemote(document.body, { vocabulary: stage1Vocabulary(), vias: ['broadcastChannel'], connect: () => hub.connect() });
    (document.querySelector('input[name=code]') as HTMLInputElement).value = 'rmt-234';
    (document.querySelector('form') as HTMLFormElement).requestSubmit();
    await waitFor(() => r.session?.hostOnline === true);
    expect(document.querySelector('.pme-status')?.textContent).toBe('connected · RMT234');
    host.advance(12_000); // HR measurements start after a few beats
    await waitFor(() => /HR \d+/.test(document.querySelector('[data-v=hr]')?.textContent ?? ''));
    (document.querySelector('[data-action=rhythm]') as HTMLButtonElement).click();
    await waitFor(() => hs.stats.applied === 1);
    (document.querySelector('[data-action=pause]') as HTMLButtonElement).click();
    await waitFor(() => host.paused);
    expect(document.querySelector('canvas')).toBeNull();
    r.destroy();
    hs.close();
  });
});
