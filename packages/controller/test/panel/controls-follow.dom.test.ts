// @vitest-environment happy-dom
// FU-1 item 6 (6a UX): the panel's and the remote's rhythm dropdown and HR field FOLLOW the host (state /
// commandApplied / rhythmSegment events) instead of keeping the last typed value; every engine rhythm has a label.
import { afterEach, describe, expect, it } from 'vitest';
import { RHYTHM_IDS } from '@pme/engine-core';
import { createInProcessHub } from '../../src/transport/in-process.ts';
import { ControllerSession } from '../../src/session/controller-session.ts';
import { HostSession } from '../../src/session/host-session.ts';
import { mountInstructorPanel } from '../../src/panel/panel.ts';
import { mountRemote } from '../../src/remote/remote-app.ts';
import { stage1Vocabulary } from '../../src/vocabulary.ts';
import { manualHost } from '../fakes/manual-host.ts';
import { waitFor } from '../helpers.ts';

let cleanup: Array<() => void> = [];
afterEach(() => {
  for (const f of cleanup.splice(0)) f();
  document.body.replaceChildren();
});

async function rig() {
  const host = manualHost();
  const hub = createInProcessHub();
  const hs = new HostSession({ session: 'FQW234', target: host, stateIntervalMs: 0 });
  hs.addTransport(hub.connect());
  const panelS = new ControllerSession({ session: 'FQW234', transport: hub.connect() });
  const other = new ControllerSession({ session: 'FQW234', transport: hub.connect() });
  await waitFor(() => panelS.hostOnline && other.hostOnline);
  const panel = mountInstructorPanel(document.body, { session: panelS, vocabulary: stage1Vocabulary() });
  const remote = mountRemote(document.body, { vocabulary: stage1Vocabulary(), vias: ['broadcastChannel'], connect: () => hub.connect(), session: 'FQW234', autoJoin: true });
  await waitFor(() => remote.session?.hostOnline === true);
  cleanup.push(() => panel.destroy(), () => remote.destroy(), () => panelS.close(), () => other.close(), () => hs.close());
  const inPanel = <T extends Element>(sel: string) => panel.el.querySelector(sel) as T;
  const inRemote = <T extends Element>(sel: string) => document.querySelector(`.pme-remote ${sel}`) as T;
  return { host, hs, panelS, other, panel, remote, inPanel, inRemote };
}

describe('controls follow the host (FU-1 item 6)', () => {
  it('a rhythm change from another controller moves both dropdowns; ControllerSession.rhythm tracks it', async () => {
    const { host, other, panelS, inPanel, inRemote } = await rig();
    await other.send({ type: 'setRhythm', rhythm: 'afib' });
    host.advance(200);
    await waitFor(() => panelS.rhythm === 'afib');
    await waitFor(() => inPanel<HTMLSelectElement>('select[name=rhythm]').value === 'afib');
    await waitFor(() => inRemote<HTMLSelectElement>('select[name=rhythm]').value === 'afib');
  });

  it('a rhythm change the host makes itself (scenario driver → HostSession.submit) is followed too', async () => {
    const { host, hs, panelS, inPanel } = await rig();
    await hs.submit({ id: 'scn-1', issuedBy: 'scenario', type: 'setRhythm', rhythm: 'vtMono' });
    host.advance(500);
    await waitFor(() => panelS.rhythm === 'vtMono');
    await waitFor(() => inPanel<HTMLSelectElement>('select[name=rhythm]').value === 'vtMono');
  });

  it('an engine rhythmSegment event (e.g. VF texture segments, coarse → fine decay) updates ControllerSession.rhythm', async () => {
    const { host, hs, panelS } = await rig();
    await hs.submit({ id: 'scn-2', issuedBy: 'scenario', type: 'setRhythm', rhythm: 'afib' });
    host.advance(300);
    await waitFor(() => panelS.rhythm === 'afib');
    host.engine.dispatch({ id: 'direct-vf', issuedBy: 'test', type: 'setRhythm', rhythm: 'vfCoarse' }); // no commandApplied
    host.advance(500);
    await waitFor(() => panelS.rhythm === 'vfCoarse'); // from the engine's own rhythmSegment
  });

  it('the HR field follows the host target from the state event, but not while the user is typing in it', async () => {
    const { host, other, inPanel, inRemote } = await rig();
    const panelHr = inPanel<HTMLInputElement>('input[name=hr-value]');
    await other.send({ type: 'setTarget', variable: 'hr', value: 120 });
    host.advance(1500); // the engine's 1 Hz state event carries the new target
    await waitFor(() => panelHr.value === '120');
    await waitFor(() => inRemote<HTMLInputElement>('input[name=hr-value]').value === '120');
    panelHr.focus();
    panelHr.value = '95';
    await other.send({ type: 'setTarget', variable: 'hr', value: 60 });
    host.advance(1500);
    await waitFor(() => inRemote<HTMLInputElement>('input[name=hr-value]').value === '60');
    expect(panelHr.value).toBe('95'); // focused: the user's edit is kept
    panelHr.blur();
    await other.send({ type: 'setTarget', variable: 'hr', value: 65 });
    host.advance(1500);
    await waitFor(() => panelHr.value === '65');
  });

  it('a typed but unsent value is kept while the host target does not change (typing HR, then the ramp, then Set)', async () => {
    const { host, hs, panelS, inPanel } = await rig();
    host.advance(1500);
    await waitFor(() => panelS.state !== null);
    const hr = inPanel<HTMLInputElement>('input[name=hr-value]');
    hr.value = '130';
    host.advance(3000); // more state events, same host target
    await new Promise((r) => setTimeout(r, 20));
    expect(hr.value).toBe('130');
    (inPanel<HTMLButtonElement>('[data-var=hr] [data-action=set]')).click();
    await waitFor(() => hs.stats.applied === 1);
  });

  it('every engine rhythm id has a clinical label (none falls back to its id)', () => {
    const v = stage1Vocabulary();
    expect(v.rhythms.map((r) => r.id)).toEqual(RHYTHM_IDS);
    for (const r of v.rhythms) expect(r.label, r.id).not.toBe(r.id);
    expect(new Set(v.rhythms.map((r) => r.label)).size).toBe(v.rhythms.length);
  });
});
