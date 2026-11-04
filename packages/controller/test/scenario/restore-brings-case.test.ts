// FX-12 (classroom): after "Restart patient" a "Return here" brought back the patient and the clock but not the case —
// the host's driver ran the card again (the mark holds its runner) while every controller's view had dropped the card at
// the restart's new timeline and never heard of it again: "No scenario", no card buttons, a Debrief of a free run. The
// restore now carries the case its mark holds, and every view (and a late joiner, from the sticky load) shows it.
import { describe, expect, it } from 'vitest';
import { createInProcessHub } from '../../src/transport/in-process.ts';
import { ControllerSession } from '../../src/session/controller-session.ts';
import { HostSession } from '../../src/session/host-session.ts';
import { ScenarioDriver } from '../../src/scenario/driver.ts';
import { manualHost } from '../fakes/manual-host.ts';
import { waitFor } from '../helpers.ts';
import { doc } from './fixtures.ts';

function rig() {
  const host = manualHost({ seed: 7 });
  let hs: HostSession | null = null;
  const driver = new ScenarioDriver({ target: host, submit: (c) => (hs as HostSession).submit(c), publish: (e) => hs?.publish(e) });
  hs = new HostSession({ session: 'RBC234', target: driver.host, scenario: driver.hook, welcomeEvents: () => driver.welcomeEvents(), stateIntervalMs: 0 });
  const hub = createInProcessHub();
  hs.addTransport(hub.connect());
  const ctl = new ControllerSession({ session: 'RBC234', transport: hub.connect() });
  return { host, driver, hs, hub, ctl };
}

describe('FX-12: a restore brings back the case its mark holds', () => {
  it('after a restart ended the case, "Return here" shows the case again on every controller and to a late joiner', async () => {
    const { host, driver, hs, hub, ctl } = rig();
    await waitFor(() => ctl.hostOnline);
    const card = doc([{ when: { manual: { label: 'Go' } } }]);
    expect((await ctl.send({ type: 'scenario', action: 'load', doc: card })).accepted).toBe(true);
    host.engine.advanceTo(5);
    expect((await ctl.send({ type: 'scenario', action: 'bookmark', target: 'Mark 1' })).accepted).toBe(true);
    // A restart (AppSession.restart): the run ends, a new timeline
    driver.runner = null;
    hs.newTimeline('restart');
    await waitFor(() => ctl.scenario.doc === null, 2000, 'the restart ended the case on the controller');
    expect(ctl.bookmarks).toContain('Mark 1');
    expect((await ctl.send({ type: 'scenario', action: 'restoreBookmark', target: 'Mark 1' })).accepted).toBe(true);
    await waitFor(() => ctl.scenario.doc !== null, 2000, 'the case on the controller after the restore');
    expect(ctl.scenario.doc?.id).toBe(card.id);
    expect(ctl.scenario.stateId).toBe('a');
    const running = (d: ScenarioDriver) => d.runner; // (read again: the restart above set it to null)
    expect(running(driver)?.doc.id).toBe(card.id);
    // a controller that joins now learns the case too
    const late = new ControllerSession({ session: 'RBC234', transport: hub.connect() });
    await waitFor(() => late.scenario.doc !== null, 2000, 'the late joiner learns the case');
    expect(late.scenario.doc?.id).toBe(card.id);
    expect(late.scenario.stateId).toBe('a');
    hs.close();
    ctl.close();
    late.close();
  });

  it('a mark taken with no case running ends the case on the controllers too', async () => {
    const { host, hs, ctl } = rig();
    await waitFor(() => ctl.hostOnline);
    host.engine.advanceTo(2);
    expect((await ctl.send({ type: 'scenario', action: 'bookmark', target: 'Free' })).accepted).toBe(true);
    expect((await ctl.send({ type: 'scenario', action: 'load', doc: doc([{ when: { manual: { label: 'Go' } } }]) })).accepted).toBe(true);
    await waitFor(() => ctl.scenario.doc !== null);
    expect((await ctl.send({ type: 'scenario', action: 'restoreBookmark', target: 'Free' })).accepted).toBe(true);
    await waitFor(() => ctl.scenario.doc === null, 2000, 'the case ended on the controller');
    hs.close();
    ctl.close();
  });
});
